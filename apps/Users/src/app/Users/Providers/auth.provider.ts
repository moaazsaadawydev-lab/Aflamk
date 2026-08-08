import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginDto } from '@booking-ticket-system/DTOs';
import { Users } from '@booking-ticket-system/Entities';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  AccessPayloadType,
  RefreshPayloadType,
} from '@booking-ticket-system/Types';

@Injectable()
export class AuthProvider {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
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
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
  }> {
    let refreshTokenPayload:
      | RefreshPayloadType
      | (RefreshPayloadType & { iat: number; exp: number });
    try {
      refreshTokenPayload =
        await this.jwtService.verifyAsync<RefreshPayloadType>(refreshToken, {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        });
    } catch (error) {
      throw new RpcException('1. Refresh token expired or invalid');
    }

    const user = await this.userRepository.findOne({
      where: { id: refreshTokenPayload.id },
    });

    if (!user) {
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
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}
