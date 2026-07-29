import { Controller, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import {
  EventPattern,
  GrpcMethod,
  Payload,
  RpcException,
} from '@nestjs/microservices';
import {
  LoginDto,
  RegisterDto,
  VerifyEmailDto,
} from '@booking-ticket-system/DTOs';
import { ImageProcessedEventPayload } from '@booking-ticket-system/Interfaces';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @GrpcMethod('UsersService', 'Register')
  async register(data: RegisterDto) {
    const createdUser = await this.appService.register(data);

    return createdUser;
  }

  @EventPattern('profile_photo_processed_success')
  async handleProfilePhotoProcessed(
    @Payload() data: ImageProcessedEventPayload,
  ) {
    if (data.profileType === 'avatar') {
      await this.appService.updateAvatar(data.entityId, data.mediaUrl);
    }
  }

  @GrpcMethod('UsersService', 'VerifyEmail')
  verifyEmail(verifyEmailDto: VerifyEmailDto) {
    return this.appService.verifyEmail(verifyEmailDto);
  }

  @GrpcMethod('UsersService', 'Login')
  async login(loginDto: LoginDto) {
    const result = await this.appService.login(loginDto);

    Logger.log('2. Tokens: ', result);

    return result;
  }

  @GrpcMethod('UsersService', 'CurrentUser')
  getProfile(@Payload() data: { id: string }) {
    return this.appService.getProfile(data.id);
  }

  @GrpcMethod('UsersService', 'RefreshToken')
  refreshToken(data: any) {
    Logger.log('5. Data: ', data);
    const token = data?.refresh_token || data?.refreshToken;

    Logger.log('4. Refresh token: ', token);

    if (!token) {
      throw new RpcException('1. Refresh token missing from request payload');
    }

    return this.appService.refresh(token);
  }
}
