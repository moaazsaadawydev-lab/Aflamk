import {
  BadRequestException,
  Controller,
  Logger,
  UseInterceptors,
} from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  GrpcMethod,
  MessagePattern,
  Payload,
  RmqContext,
  RpcException,
} from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import {
  LoginDto,
  RegisterDto,
  VerifyEmailDto,
  UpdateUserProfileDto,
} from '@booking-ticket-system/DTOs';
import { SanitizeUserInterceptor } from '@booking-ticket-system/Common';
import { UsersService } from './Users.Service';

@Controller()
@UseInterceptors(SanitizeUserInterceptor)
export class UsersController {
  constructor(private readonly appService: UsersService) {}

  @GrpcMethod('UsersService', 'Register')
  async register(data: any) {
    const createdUser = await this.appService.register(data);

    return createdUser;
  }

  @GrpcMethod('UsersService', 'VerifyEmail')
  verifyEmail(verifyEmailDto: VerifyEmailDto) {
    return this.appService.verifyEmail(verifyEmailDto);
  }

  @GrpcMethod('UsersService', 'Login')
  async login(@Payload() data: any) {
    const loginDto: LoginDto = {
      email: data.email,
      password: data.password,
      userAgent: data.userAgent || data.user_agent,
      ipAddress: data.ipAddress || data.ip_address,
    };
    const result = await this.appService.login(loginDto);

    return result;
  }

  @GrpcMethod('UsersService', 'CurrentUser')
  getProfile(@Payload() data: { id: string }) {
    return this.appService.getProfile(data.id);
  }

  @GrpcMethod('UsersService', 'UpdateProfile')
  async updateProfile(
    @Payload()
    data: {
      userId?: string;
      user_id?: string;
      id?: string;
      name?: string;
      country?: any;
      age?: number;
      tempKey?: string;
      temp_key?: string;
      cropX?: number;
      crop_x?: number;
      cropY?: number;
      crop_y?: number;
      cropWidth?: number;
      crop_width?: number;
      cropHeight?: number;
      crop_height?: number;
      cropZoom?: number;
      crop_zoom?: number;
    },
  ) {
    Logger.log('data', data);
    const userId = data.userId || data.user_id || data.id;

    if (!userId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'User ID is required for profile update',
      });
    }

    const updateDto: UpdateUserProfileDto = {
      name: data.name,
      country: data.country,
      age: data.age ? Number(data.age) : undefined,
      tempKey: data.tempKey || data.temp_key,
      cropX: data.cropX ?? data.crop_x,
      cropY: data.cropY ?? data.crop_y,
      cropWidth: data.cropWidth ?? data.crop_width,
      cropHeight: data.cropHeight ?? data.crop_height,
      cropZoom: data.cropZoom ?? data.crop_zoom,
    };

    return await this.appService.updateProfile(userId, updateDto);
  }

  @GrpcMethod('UsersService', 'RefreshToken')
  refreshToken(data: any) {
    const token = data?.refresh_token || data?.refreshToken;

    if (!token) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Refresh token missing from request payload',
      });
    }

    return this.appService.refresh(token);
  }

  @GrpcMethod('UsersService', 'ChangePassword')
  async changePassword(@Payload() data: any) {
    const userId = data.userId || data.user_id;
    const oldPassword = data.oldPassword || data.old_password;
    const newPassword = data.newPassword || data.new_password;
    const confirmPassword = data.confirmPassword || data.confirm_password;
    const userAgent = data.userAgent || data.user_agent;
    const ipAddress = data.ipAddress || data.ip_address;

    if (!userId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'User ID is required for password change',
      });
    }
    if (!oldPassword || !newPassword) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Old password and new password are required',
      });
    }

    return await this.appService.changePassword({
      userId,
      oldPassword,
      newPassword,
      confirmPassword,
      userAgent,
      ipAddress,
    });
  }

  @GrpcMethod('UsersService', 'ForgotPassword')
  async forgotPassword(@Payload() data: { email?: string }) {
    if (!data?.email) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Email is required',
      });
    }

    return await this.appService.forgotPassword(data.email);
  }

  @GrpcMethod('UsersService', 'ResetPassword')
  async resetPassword(@Payload() data: any) {
    const email = data?.email;
    const otp = data?.otp;
    const newPassword = data?.newPassword || data?.new_password;
    const confirmPassword = data?.confirmPassword || data?.confirm_password;

    if (!email) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Email is required',
      });
    }

    if (!otp) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Verification code is required',
      });
    }

    if (!newPassword) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'New password is required',
      });
    }

    return await this.appService.resetPassword({
      email,
      otp,
      newPassword,
      confirmPassword,
    });
  }

  @GrpcMethod('UsersService', 'RequestChangeEmail')
  async requestChangeEmail(@Payload() data: any) {
    const userId = data?.userId || data?.user_id;
    const currentPassword = data?.currentPassword || data?.current_password;
    const newEmail = data?.newEmail || data?.new_email;
    Logger.log(data);

    return await this.appService.requestChangeEmail({
      userId,
      currentPassword,
      newEmail,
    });
  }

  @GrpcMethod('UsersService', 'ConfirmChangeEmail')
  async confirmChangeEmail(@Payload() data: any) {
    const userId = data?.userId || data?.user_id;
    const code = data?.code;

    return await this.appService.confirmChangeEmail({
      userId,
      code,
    });
  }

  @GrpcMethod('UsersService', 'FreezeAccount')
  async freezeAccount(@Payload() data: any) {
    const token = data?.token;
    return await this.appService.freezeAccount(token);
  }

  @GrpcMethod('UsersService', 'RollbackEmail')
  async rollbackEmail(@Payload() data: any) {
    const token = data?.token;
    return await this.appService.rollbackEmail(token);
  }

  @GrpcMethod('UsersService', 'ResendVerificationCode')
  async resendVerificationCode(@Payload() data: any) {
    const email = data?.email;
    return await this.appService.resendVerificationCode(email);
  }
}
