import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  LoginDto,
  RegisterDto,
  VerifyEmailDto,
} from '@booking-ticket-system/DTOs';
import { OutboxMessage, Users } from '@booking-ticket-system/Entities';
import { QueryDeepPartialEntity, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  Country,
  ImageProfileType,
  NotificationType,
  UserGender,
} from '@booking-ticket-system/Utils';
import * as bcrypt from 'bcryptjs';
import { randomInt, createHash } from 'crypto';
import { VERIFICATION_CODE_EXPIRY_MS } from '@booking-ticket-system/Constants';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  AccessPayloadType,
  RefreshPayloadType,
} from '@booking-ticket-system/Types';
import { DataSource } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: any): Promise<any> {
    const normalizedEmail = registerDto.email.trim().toLowerCase();

    const userExists = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (userExists) {
      throw new RpcException('This Email is already used');
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
      const user = queryRunner.manager.create(Users, {
        name: registerDto.name,
        email: normalizedEmail,
        password: passwordHash,
        age: registerDto.age,
        gender: registerDto.gender as UserGender,
        country: registerDto.country as Country,
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

      if (registerDto.tempFilePath) {
        Logger.log(registerDto.cropFields);
        await queryRunner.manager.save(
          queryRunner.manager.create(OutboxMessage, {
            eventType: 'process_profile_photo',
            payload: {
              entityId: user.id,
              tempFilePath: registerDto.tempFilePath,
              profileType: ImageProfileType.AVATAR,
              crop: registerDto.cropFields,
            },
          }),
        );
      }

      await queryRunner.commitTransaction();

      return { message: 'User created successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateAvatar(userId: string, mediaUrl: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.avatarKey = mediaUrl;

    await this.userRepository.save(user);

    return { message: 'Avatar updated successfully' };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
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

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.isVerified) {
      throw new BadRequestException('User is not verified');
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      throw new BadRequestException('Invalid password');
    }

    const accessPayload: AccessPayloadType = {
      id: user.id,
      role: user.role,
    };

    const refreshPayload: RefreshPayloadType = {
      id: user.id,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRE_IN',
        ) as any,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRE_IN',
        ) as any,
      }),
    ]);

    const salt = await bcrypt.genSalt(10);
    const refreshTokenHash = await bcrypt.hash(refreshToken, salt);

    user.refreshToken = refreshTokenHash;

    await this.userRepository.save(user);

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async refresh(refreshToken: string) {
    let refreshTokenPayload:
      | RefreshPayloadType
      | (RefreshPayloadType & { iat: number; exp: number });
    try {
      refreshTokenPayload =
        await this.jwtService.verifyAsync<RefreshPayloadType>(refreshToken, {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        });
    } catch (error) {
      Logger.log('1. Refresh token expired or invalid', error);
      throw new RpcException('1. Refresh token expired or invalid');
    }

    const user = await this.userRepository.findOne({
      where: { id: refreshTokenPayload.id },
    });

    if (!user) {
      Logger.log('2. User not found');
      throw new RpcException('2. User not found');
    }

    const accessPayload: AccessPayloadType = { id: user.id, role: user.role };
    const refreshPayload: RefreshPayloadType = { id: user.id };

    const [accessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRE_IN',
        ) as any,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRE_IN',
        ) as any,
      }),
    ]);

    const salt = await bcrypt.genSalt(10);
    user.refreshToken = await bcrypt.hash(newRefreshToken, salt);
    await this.userRepository.save(user);
    return {
      message: 'Success',
      accessToken: accessToken,
      refreshToken: newRefreshToken,
    };
  }
}
