import { Controller } from '@nestjs/common';
import { AppService } from './app.service';
import { EventPattern, GrpcMethod, Payload } from '@nestjs/microservices';
import { RegisterDto, VerifyEmailDto } from '@booking-ticket-system/DTOs';
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
}
