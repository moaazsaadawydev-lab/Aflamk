import { Injectable, Logger } from '@nestjs/common';
import { ImageProcessorService } from '../Media/image-processor.service';
import { ProcessMediaEventDto } from '@booking-ticket-system/DTOs';
import { MinioService } from '@booking-ticket-system/Storage';

@Injectable()
export class MediaService {
  constructor(
    private readonly imageProcessor: ImageProcessorService,
    // private readonly storageStrategy: LocalStorageDriver,
    private readonly minioService: MinioService,
  ) {}

  async processAndSaveProfilePhoto(data: any) {
    const rawBuffer = await this.minioService.getBuffer(data.tempObjectKey);

    const { buffer } = await this.imageProcessor.processImageByProfile(
      rawBuffer,
      data.profileType,
    );

    const filename = `avatar/${data.profileType}-${data.entityId}-${Date.now()}.webp`;
    await this.minioService.uploadBuffer(buffer, filename, 'image/webp');

    await this.minioService.deleteObject(data.tempObjectKey);

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
