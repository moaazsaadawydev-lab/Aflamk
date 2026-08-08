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
    const filename = `avatar/${data.profileType}-${data.entityId}.webp`;
    const alreadyProcessed = await this.minioService.objectExists(filename);

    if (!alreadyProcessed) {
      const rawBuffer = await this.minioService.getBuffer(data.tempObjectKey);

      const { buffer } = await this.imageProcessor.processImageByProfile(
        rawBuffer,
        data.profileType,
      );

      await this.minioService.uploadBuffer(buffer, filename, 'image/webp');
      this.logger.log(`Processed and uploaded: ${filename}`);
    } else {
      this.logger.log(`Skipping reprocessing, already exists: ${filename}`);
    }

    await this.minioService.deleteObject(data.tempObjectKey).catch(() => {
      this.logger.warn(`Temp object already removed: ${data.tempObjectKey}`);
    });

    const mediaUrl = await this.minioService.getPresignedUrl(
      filename,
      3600 * 24 * 7,
    );

    return {
      entityId: data.entityId,
      profileType: data.profileType,
      mediaUrl,
    };
  }
}
