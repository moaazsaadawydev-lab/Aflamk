import { Controller, Inject, Logger } from '@nestjs/common';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { MediaService } from './Media.service';
import { ProcessMediaEventDto } from '@booking-ticket-system/DTOs';
import { firstValueFrom } from 'rxjs';

@Controller()
export class MediaController {
  constructor(
    private readonly MediaService: MediaService,
    @Inject('USERS_SERVICE') private readonly rmqClient: ClientProxy,
  ) {}

  @EventPattern('process_profile_photo')
  async handleProcessImage(@Payload() data: any) {
    try {
      const result = await this.MediaService.processAndSaveProfilePhoto(data);

      await firstValueFrom(
        this.rmqClient.emit('profile_photo_processed_success', result),
      );
    } catch (error) {
      Logger.error(`Error processing media: ${error.message}`);
    }
  }
}
