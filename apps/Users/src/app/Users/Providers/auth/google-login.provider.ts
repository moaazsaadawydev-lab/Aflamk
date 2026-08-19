import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '@booking-ticket-system/Entities';
import {
  AuthProviderType,
  UserRole,
  UserStatus,
} from '@booking-ticket-system/Utils';
import {
  AuthTokensResponse,
  GoogleLoginPayload,
} from '@booking-ticket-system/Interfaces';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { randomUUID } from 'crypto';
import { SessionService } from '../../Services/session.service';

@Injectable()
export class GoogleLoginProvider {
  private readonly logger = new Logger(GoogleLoginProvider.name);

  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly sessionService: SessionService,
  ) {}

  async execute(payload: GoogleLoginPayload): Promise<AuthTokensResponse> {
    const {
      googleId,
      email,
      name,
      avatarUrl,
      birthDate,
      userAgent,
      ipAddress,
    } = payload;

    if (!email || !googleId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Google ID and Email are required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Search for existing user by googleId or email
    let user = await this.userRepository.findOne({
      where: [{ googleId }, { email: normalizedEmail }],
    });

    if (!user) {
      // Scenario A: User does not exist, auto-provision
      const parsedBirthDate = birthDate ? new Date(birthDate) : null;

      user = this.userRepository.create({
        id: randomUUID(),
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId,
        avatarUrl: avatarUrl || null,
        birthDate: parsedBirthDate,
        password: null,
        provider: AuthProviderType.GOOGLE,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        statusChangedAt: new Date(),
      });

      await this.userRepository.save(user);
      this.logger.log(
        `Auto-provisioned new Google user: ${user.email} (${user.id})`,
      );
    } else {
      // Scenario B & C: User exists
      let needsSave = false;

      if (!user.googleId) {
        user.googleId = googleId;
        user.provider = AuthProviderType.GOOGLE;
        needsSave = true;
        this.logger.log(
          `Linked googleId to existing user: ${user.email} (${user.id})`,
        );
      }

      if (!user.avatarUrl && avatarUrl) {
        user.avatarUrl = avatarUrl;
        needsSave = true;
      }

      // Check status lifecycle
      if (user.status === UserStatus.UNVERIFIED) {
        user.status = UserStatus.ACTIVE;
        user.statusChangedAt = new Date();
        needsSave = true;
      } else {
        await this.sessionService.validateAndResolveUserStatus(user);
      }

      if (needsSave) {
        await this.userRepository.save(user);
      }
    }

    // 2. Create Session & Tokens
    return await this.sessionService.createSession(user, userAgent, ipAddress);
  }
}
