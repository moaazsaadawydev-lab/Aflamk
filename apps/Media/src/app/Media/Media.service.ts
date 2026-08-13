import { Injectable, Logger } from '@nestjs/common';
import { ImageProcessorService } from '../Media/image-processor.service';
import { ProcessMediaEventDto } from '@booking-ticket-system/DTOs';
import { MinioService } from '@booking-ticket-system/Storage';
import { ImageProfileType } from '@booking-ticket-system/Utils';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly imageProcessor: ImageProcessorService,
    private readonly minioService: MinioService,
  ) {}

  async processAndSaveProfilePhoto(data: any) {
    Logger.log('media data', data);
    const tempKey = data.tempObjectKey;
    const userId = data.userId;
    const finalKey = data.finalKey;

    if (!tempKey) {
      this.logger.warn(`No tempKey provided for media processing.`);
      return;
    }

    const alreadyProcessed = await this.minioService.objectExists(finalKey);

    if (!alreadyProcessed) {
      const rawBuffer = await this.minioService.getBuffer(tempKey);

      const crop =
        data.cropX !== undefined ||
        data.cropY !== undefined ||
        data.cropWidth !== undefined ||
        data.cropHeight !== undefined ||
        data.cropZoom !== undefined
          ? {
              cropX: data.cropX,
              cropY: data.cropY,
              cropWidth: data.cropWidth,
              cropHeight: data.cropHeight,
              cropZoom: data.cropZoom,
              x: data.cropX,
              y: data.cropY,
              width: data.cropWidth,
              height: data.cropHeight,
              zoom: data.cropZoom,
            }
          : data.crop;

      const { buffer } = await this.imageProcessor.processImageByProfile(
        rawBuffer,
        data.profileType || ImageProfileType.AVATAR,
        crop,
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

  async processUserProfilePhotoUpdate(data: any) {
    const tempKey = data.tempKey;
    const finalKey = data.finalKey;
    const oldAvatarKey = data.oldAvatarKey;
    const userId = data.userId;

    if (!tempKey) {
      this.logger.warn(`No tempKey provided for profile photo update.`);
      return;
    }

    const tempExists = await this.minioService.objectExists(tempKey);
    if (!tempExists) {
      this.logger.log(
        `Idempotency Guard: tempKey ${tempKey} does not exist. Already processed or removed.`,
      );
      return { skipped: true };
    }

    const rawBuffer = await this.minioService.getBuffer(tempKey);

    const { buffer } = await this.imageProcessor.processImageByProfile(
      rawBuffer,
      data.profileType || ImageProfileType.AVATAR,
      data.crop,
    );

    await this.minioService.uploadBuffer(buffer, finalKey, 'image/webp');
    this.logger.log(
      `Processed and uploaded updated profile photo: ${finalKey}`,
    );

    await this.minioService.deleteObject(tempKey).catch(() => null);

    if (oldAvatarKey) {
      const oldExists = await this.minioService.objectExists(oldAvatarKey);
      if (oldExists) {
        await this.minioService.deleteObject(oldAvatarKey).catch(() => null);
        this.logger.log(`Deleted old avatar key: ${oldAvatarKey}`);
      }
    }

    return {
      userId,
      finalKey,
    };
  }
}
