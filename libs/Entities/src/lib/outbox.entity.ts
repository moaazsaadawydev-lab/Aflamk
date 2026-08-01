import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { OutboxStatus } from '@booking-ticket-system/Utils';

@Entity('outbox_messages')
export class OutboxMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  eventType!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;

  @Column({ type: 'enum', enum: OutboxStatus, default: OutboxStatus.PENDING })
  status!: OutboxStatus;

  @Column({ default: 0 })
  retryCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt!: Date | null;
}
