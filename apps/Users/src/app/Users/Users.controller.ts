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
    },
  ) {
    const userId = data.userId || data.user_id || data.id;

    if (!userId) {
      throw new RpcException('User ID is required for profile update');
    }

    const updateDto: UpdateUserProfileDto = {
      name: data.name,
      country: data.country,
      age: data.age ? Number(data.age) : undefined,
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
}
