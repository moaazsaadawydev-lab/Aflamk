import { BadRequestException, Controller, Logger } from '@nestjs/common';
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
} from '@booking-ticket-system/DTOs';
import { UsersService } from './Users.Service';

@Controller()
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly appService: UsersService) {}

  @GrpcMethod('UsersService', 'Register')
  async register(data: any) {
    const createdUser = await this.appService.register(data);

    return createdUser;
  }

  @EventPattern('profile_photo_processed_success')
  async handleProfilePhotoProcessed(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      if (data.profileType === 'avatar') {
        await this.appService.updateAvatar(data.entityId, data.mediaUrl);
      }

      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(
        `Failed to update avatar for user ${data.entityId}: ${error.message}`,
      );

      if (error instanceof BadRequestException) {
        channel.ack(originalMsg); // نقفلها كخسارة معروفة، مش نسيبها تلف للأبد
        return;
      }

      const isRedelivered = originalMsg.fields.redelivered;
      channel.nack(originalMsg, false, !isRedelivered);
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
