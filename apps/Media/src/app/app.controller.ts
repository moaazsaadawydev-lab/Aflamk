import { Controller, Inject, Logger } from '@nestjs/common';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';
import { ProcessMediaEventDto } from '@booking-ticket-system/DTOs';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    @Inject('USERS_SERVICE') private readonly rmqClient: ClientProxy,
  ) {}

  @EventPattern('process_profile_photo')
  async handleProcessImage(@Payload() data: any) {
    try {
      const result = await this.appService.processAndSaveProfilePhoto(
        data,
        data.crop?.x,
        data.crop?.y,
        data.crop?.width,
        data.crop?.height,
      );

      this.rmqClient.emit('profile_photo_processed_success', result);
    } catch (error) {
      this.logger.error(`Error processing media: ${error.message}`);
    }
  }
}
