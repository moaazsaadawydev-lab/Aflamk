import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { OutboxMessage } from '@booking-ticket-system/Entities';
import { OutboxStatus } from '@booking-ticket-system/Utils';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private readonly MAX_RETRIES = 5;
  private readonly RECONNECT_DELAY_MS = 5000;

  private client: Client;
  private isShuttingDown = false;

  constructor(
    @InjectRepository(OutboxMessage)
    private readonly outboxRepo: Repository<OutboxMessage>,
    @Inject('MEDIA_SERVICE')
    private readonly mediaRmqClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationRmqClient: ClientProxy,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.publishPendingMessages();
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.client) {
      await this.client.end().catch(() => null);
    }
  }

  private async connectListener() {
    const connectionString = `postgresql://${this.config.get<string>('DATABASE_USER')}:${this.config.get<string>('DATABASE_PASSWORD')}@${this.config.get<string>('DATABASE_HOST')}:${this.config.get<number>('DATABASE_PORT')}/${this.config.get<string>('USERS_DATABASE_NAME')}`;
    this.client = new Client({ connectionString });

    this.client.on('error', (err) => {
      this.logger.error(`Postgres LISTEN connection error: ${err.message}`);
      this.scheduleReconnect();
    });

    this.client.on('end', () => {
      if (!this.isShuttingDown) {
        this.logger.warn('Postgres LISTEN connection closed unexpectedly');
        this.scheduleReconnect();
      }
    });

    try {
      await this.client.connect();
      await this.client.query('LISTEN outbox_channel');

      this.client.on('notification', async () => {
        await this.publishPendingMessages();
      });

      this.logger.log('Listening on outbox_channel');
    } catch (err) {
      this.logger.error(`Failed to connect LISTEN client: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isShuttingDown) return;

    setTimeout(async () => {
      this.logger.log('Attempting to reconnect LISTEN client...');
      await this.connectListener();
    }, this.RECONNECT_DELAY_MS);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async publishPendingMessages() {
    const pendingMessages = await this.outboxRepo.find({
      where: { status: OutboxStatus.PENDING },
      take: 20,
      order: { createdAt: 'ASC' },
    });

    if (pendingMessages.length === 0) return;

    for (const message of pendingMessages) {
      try {
        const client =
          message.eventType === 'process_profile_photo'
            ? this.mediaRmqClient
            : this.notificationRmqClient;

        client.emit(message.eventType, message.payload);

        message.status = OutboxStatus.PUBLISHED;
        message.publishedAt = new Date();
        await this.outboxRepo.save(message);
      } catch (error) {
        message.retryCount += 1;
        message.status =
          message.retryCount >= this.MAX_RETRIES
            ? OutboxStatus.FAILED
            : OutboxStatus.PENDING;

        await this.outboxRepo.save(message);
        this.logger.error(
          `Failed to publish outbox message ${message.id}: ${error.message}`,
        );
      }
    }
  }
}
