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
  ForgotPasswordDto,
  ResetPasswordDto,
  RequestEmailChangeDto,
  ConfirmEmailChangeDto,
  FreezeAccountDto,
  RollbackEmailDto,
} from '@booking-ticket-system/DTOs';
import { Users } from '@booking-ticket-system/Entities';
import { ChangePasswordRateLimitGuard } from '@booking-ticket-system/Guards';

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

      return {
        success: true,
        message:
          result?.message ||
          'Password updated successfully. Please log in again.',
      };
    } catch (error: any) {
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

  async forgotPassword(body: ForgotPasswordDto) {
    const result: any = await lastValueFrom(
      this.usersService.ForgotPassword({
        email: body.email,
      }),
    );

    return {
      success: result?.success ?? true,
      message:
        result?.message || 'Password reset code has been sent to your email.',
    };
  }

  async resetPassword(body: ResetPasswordDto) {
    const result: any = await lastValueFrom(
      this.usersService.ResetPassword({
        email: body.email,
        otp: body.otp,
        new_password: body.newPassword,
        confirm_password: body.confirmPassword,
        newPassword: body.newPassword,
        confirmPassword: body.confirmPassword,
      }),
    );

    return {
      success: result?.success ?? true,
      message:
        result?.message ||
        'Password has been reset successfully. Please log in with your new password.',
    };
  }

  async requestChangeEmail(user: Users, body: RequestEmailChangeDto) {
    const result: any = await lastValueFrom(
      this.usersService.RequestChangeEmail({
        user_id: user?.id,
        current_password: body.currentPassword,
        new_email: body.newEmail,
      }),
    );

    return {
      success: result?.success ?? true,
      message: result?.message || 'Verification code sent to your new email.',
    };
  }

  async confirmChangeEmail(
    user: Users,
    body: ConfirmEmailChangeDto,
    response: Response,
  ) {
    const result: any = await lastValueFrom(
      this.usersService.ConfirmChangeEmail({
        user_id: user?.id,
        code: body.code,
      }),
    );

    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/users/refresh',
    });

    return {
      success: result?.success ?? true,
      message:
        result?.message ||
        'Email changed successfully. Please log in again with your new email.',
    };
  }

  async freezeAccount(body: FreezeAccountDto, response: Response) {
    const result: any = await lastValueFrom(
      this.usersService.FreezeAccount({
        token: body.token,
      }),
    );

    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/users/refresh',
    });

    return {
      success: result?.success ?? true,
      message:
        result?.message ||
        'Account has been frozen and all active sessions revoked.',
    };
  }

  async rollbackEmail(body: RollbackEmailDto, response: Response) {
    const result: any = await lastValueFrom(
      this.usersService.RollbackEmail({
        token: body.token,
      }),
    );

    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/users/refresh',
    });

    return {
      success: result?.success ?? true,
      message:
        result?.message ||
        'Account email has been rolled back successfully. All sessions revoked. Please reset your password.',
    };
  }
}
