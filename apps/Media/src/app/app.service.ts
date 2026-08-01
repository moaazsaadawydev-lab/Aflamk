import { Injectable, Logger } from '@nestjs/common';
import { ImageProcessorService } from './image-processor.service';
import { LocalStorageDriver } from './Storage/local-storage.driver';
import { ProcessMediaEventDto } from '@booking-ticket-system/DTOs';
import * as fs from 'fs-extra';

@Injectable()
export class AppService {
  constructor(
    private readonly imageProcessor: ImageProcessorService,
    private readonly storageStrategy: LocalStorageDriver,
  ) {}

  async processAndSaveProfilePhoto(data: ProcessMediaEventDto) {
    if (!(await fs.pathExists(data.tempFilePath))) {
      throw new Error(`Temp file not found at path: ${data.tempFilePath}`);
    }
    const rawBuffer = await fs.readFile(data.tempFilePath);

    const { buffer, config } = await this.imageProcessor.processImageByProfile(
      rawBuffer,
      data.profileType,
    );

    const filename = `${data.profileType}-${data.entityId}-${Date.now()}.webp`;
    const uploadResult = await this.storageStrategy.upload(
      buffer,
      filename,
      config.folder,
    );

    await fs.remove(data.tempFilePath);

    return {
      entityId: data.entityId,
      profileType: data.profileType,
      mediaUrl: uploadResult.url,
    };
  }
}
