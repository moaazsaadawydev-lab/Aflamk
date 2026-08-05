import { Controller } from '@nestjs/common';
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
import { UsersService } from './Users.Service';

@Controller()
export class UsersController {
  constructor(private readonly appService: UsersService) {}

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

    return result;
  }

  @GrpcMethod('UsersService', 'CurrentUser')
  getProfile(@Payload() data: { id: string }) {
    return this.appService.getProfile(data.id);
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
