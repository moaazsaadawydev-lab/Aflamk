import { Injectable, Logger } from '@nestjs/common';
import { ImageProcessorService } from '../Media/image-processor.service';
import { ProcessMediaEventDto } from '@booking-ticket-system/DTOs';
import { MinioService } from '@booking-ticket-system/Storage';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly imageProcessor: ImageProcessorService,
    private readonly minioService: MinioService,
  ) {}

  async processAndSaveProfilePhoto(data: any) {
    const tempKey = data.tempKey || data.tempObjectKey;
    const userId = data.userId || data.entityId;
    const finalKey = data.finalKey || `avatars/${userId}.webp`;

    if (!tempKey) {
      this.logger.warn(`No tempKey provided for media processing.`);
      return;
    }

    const alreadyProcessed = await this.minioService.objectExists(finalKey);

    if (!alreadyProcessed) {
      const rawBuffer = await this.minioService.getBuffer(tempKey);

      const { buffer } = await this.imageProcessor.processImageByProfile(
        rawBuffer,
        data.profileType || 'avatar',
        data.crop,
      );

      await this.minioService.uploadBuffer(buffer, finalKey, 'image/webp');
      this.logger.log(`Processed and uploaded: ${finalKey}`);
    } else {
      this.logger.log(`Skipping reprocessing, already exists: ${finalKey}`);
    }

    await this.minioService.deleteObject(tempKey).catch(() => {
      this.logger.warn(`Temp object already removed: ${tempKey}`);
    });

    return {
      userId,
      finalKey,
    };
  }
}

