import { Controller, Inject, Logger } from '@nestjs/common';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { MediaService } from './Media.service';
import { ProcessMediaEventDto } from '@booking-ticket-system/DTOs';

@Controller()
export class MediaController {
  constructor(
    private readonly appService: MediaService,
    @Inject('USERS_SERVICE') private readonly rmqClient: ClientProxy,
  ) {}

  @EventPattern('process_profile_photo')
  async handleProcessImage(@Payload() data: ProcessMediaEventDto) {
    Logger.log('The photo has been sent for processing');
    try {
      const result = await this.appService.processAndSaveProfilePhoto(data);

      this.rmqClient.emit('profile_photo_processed_success', result);
    } catch (error) {
      Logger.error(`Error processing media: ${error.message}`);
    }
  }
}
