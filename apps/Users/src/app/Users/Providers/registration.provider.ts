import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RegisterDto, VerifyEmailDto } from '@booking-ticket-system/DTOs';
import { OutboxMessage, Users } from '@booking-ticket-system/Entities';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  Country,
  ImageProfileType,
  NotificationType,
  UserGender,
} from '@booking-ticket-system/Utils';
import * as bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'crypto';
import { VERIFICATION_CODE_EXPIRY_MS } from '@booking-ticket-system/Constants';
import { OutboxPublisherService } from '../../outbox/outbox-publisher.service';

@Injectable()
export class RegistrationProvider {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly outboxService: OutboxPublisherService,
  ) {}

  async register(registerDto: any): Promise<any> {
    const normalizedEmail = registerDto.email.trim().toLowerCase();

    const userExists = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (userExists) {
      throw new RpcException('Invalid Email or Password');
    }

    if (registerDto.age < 18) {
      throw new RpcException('You must be at least 18 years old');
    }

    const code = randomInt(100000, 1000000).toString();

    const [passwordHash, verificationCodeHash] = await Promise.all([
      bcrypt.hash(registerDto.password, await bcrypt.genSalt(10)),
      bcrypt.hash(code, await bcrypt.genSalt(10)),
    ]);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userId = randomUUID();
      Logger.log('dto', registerDto);
      const tempKey = registerDto.tempObjectKey;
      const avatarKey = tempKey ? `avatars/${userId}.webp` : null;

      const user = queryRunner.manager.create(Users, {
        id: userId,
        name: registerDto.name,
        email: normalizedEmail,
        password: passwordHash,
        age: registerDto.age,
        gender: registerDto.gender as UserGender,
        country: registerDto.country as Country,
        avatarKey: avatarKey,
        verificationCode: verificationCodeHash,
        verificationCodeExpiresAt: new Date(
          Date.now() + VERIFICATION_CODE_EXPIRY_MS,
        ),
      });

      await queryRunner.manager.save(user);

      await queryRunner.manager.save(
        queryRunner.manager.create(OutboxMessage, {
          eventType: 'user_created',
          payload: {
            email: user.email,
            name: user.name,
            code,
            dto: {
              UserId: user.id,
              title: 'Welcome to Aflamak',
              body: `Hi ${user.name}, we are happy to have you in our community`,
              type: NotificationType.ALERT_MESSAGE,
            },
          },
        }),
      );

      if (tempKey) {
        await queryRunner.manager.save(
          queryRunner.manager.create(OutboxMessage, {
            eventType: 'process_profile_photo',
            payload: {
              userId: user.id,
              tempObjectKey: tempKey,
              finalKey: `avatars/${user.id}.webp`,
              profileType: ImageProfileType.AVATAR,
              cropX: registerDto.cropX ?? (registerDto as any).crop_x,
              cropY: registerDto.cropY ?? (registerDto as any).crop_y,
              cropWidth: registerDto.cropWidth ?? (registerDto as any).crop_width,
              cropHeight: registerDto.cropHeight ?? (registerDto as any).crop_height,
              cropZoom: registerDto.cropZoom ?? (registerDto as any).crop_zoom,
            },
          }),
        );
      }

      await queryRunner.commitTransaction();

      this.outboxService.publishPendingMessages().catch((err) => {
        Logger.error(`Immediate publish attempt failed: ${err.message}`);
      });

      return {
        id: user.id,
        message: 'Account created successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarKey: user.avatarKey,
          gender: user.gender,
          country: user.country,
          age: user.age,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: verifyEmailDto.email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('User is already verified');
    }

    const isCodeMatch = await bcrypt.compare(
      String(verifyEmailDto.code),
      user.verificationCode,
    );

    if (!isCodeMatch) {
      throw new BadRequestException('Invalid verification code');
    }

    if (user.verificationCodeExpiresAt < new Date()) {
      throw new BadRequestException('Verification code expired');
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiresAt = null;

    await this.userRepository.save(user);

    return { message: 'Email verified successfully' };
  }
}
