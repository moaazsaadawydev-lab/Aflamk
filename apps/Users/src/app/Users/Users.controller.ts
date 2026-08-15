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
      throw new RpcException('User ID is required for profile update');
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
      throw new RpcException('Refresh token missing from request payload');
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
      throw new RpcException('User ID is required for password change');
    }
    if (!oldPassword || !newPassword) {
      throw new RpcException('Old password and new password are required');
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
}

