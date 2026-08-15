import {
  Inject,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { Request, Response } from 'express';
import {
  LoginDto,
  VerifyEmailDto,
  ChangePasswordDto,
} from '@booking-ticket-system/DTOs';
import { Users } from '@booking-ticket-system/Entities';
import { ChangePasswordRateLimitGuard } from '../../guards/change-password-rate-limit.guard';

@Injectable()
export class AuthProvider implements OnModuleInit {
  private usersService: any;

  constructor(@Inject('USER_SERVICE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.usersService = this.client.getService('UsersService');
  }

  async login(
    body: LoginDto,
    userAgent: string,
    ipAddress: string,
    response: Response,
  ) {
    const result: any = await lastValueFrom(
      this.usersService.Login({
        email: body.email,
        password: body.password,
        user_agent: userAgent,
        ip_address: ipAddress,
      }),
    );

    const accessToken = result.accessToken || result.access_token;
    const refreshToken = result.refreshToken || result.refresh_token;

    if (refreshToken) {
      response.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth/users/refresh',
      });
    }

    return {
      accessToken,
    };
  }

  async verifyEmail(body: VerifyEmailDto) {
    return await lastValueFrom(this.usersService.VerifyEmail(body));
  }

  async changePassword(
    user: Users,
    body: ChangePasswordDto,
    userAgent: string,
    ipAddress: string,
  ) {
    try {
      const result: any = await lastValueFrom(
        this.usersService.ChangePassword({
          user_id: user?.id,
          old_password: body.oldPassword,
          new_password: body.newPassword,
          confirm_password: body.confirmPassword,
          user_agent: userAgent,
          ip_address: ipAddress,
        }),
      );

      ChangePasswordRateLimitGuard.clearFailedAttempts(user?.id, ipAddress);

      return {
        success: true,
        message:
          result?.message ||
          'Password updated successfully. Please log in again.',
      };
    } catch (error: any) {
      ChangePasswordRateLimitGuard.recordFailedAttempt(user?.id, ipAddress);
      throw error;
    }
  }

  async refresh(refreshToken: string, response: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokens: any = await lastValueFrom(
      this.usersService.RefreshToken({ refresh_token: refreshToken }),
    );

    const newAccessToken = tokens.accessToken || tokens.access_token;
    const newRefreshToken = tokens.refreshToken || tokens.refresh_token;

    response.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/users/refresh',
    });

    return {
      accessToken: newAccessToken,
    };
  }
}
