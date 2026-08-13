import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { IMAGE_PROFILES } from './config/image-profiles.config';
import {
  ProcessedImageResult,
  CropOptions,
} from '@booking-ticket-system/Interfaces';
import { ImageProfileType } from '@booking-ticket-system/Utils';

@Injectable()
export class ImageProcessorService {
  async processImageByProfile(
    fileBuffer: Buffer,
    profileType: ImageProfileType,
    crop?: CropOptions,
  ): Promise<ProcessedImageResult> {
    try {
      const profile =
        IMAGE_PROFILES[profileType] || IMAGE_PROFILES[ImageProfileType.AVATAR];

      let pipeline = sharp(fileBuffer);
      const metadata = await pipeline.metadata();

      const imgWidth = metadata.width || 0;
      const imgHeight = metadata.height || 0;

      const cropX = crop?.cropX ?? crop?.x;
      const cropY = crop?.cropY ?? crop?.y;
      const cropWidth = crop?.cropWidth ?? crop?.width;
      const cropHeight = crop?.cropHeight ?? crop?.height;

      if (
        typeof cropX === 'number' &&
        typeof cropY === 'number' &&
        typeof cropWidth === 'number' &&
        typeof cropHeight === 'number' &&
        cropWidth > 0 &&
        cropHeight > 0 &&
        imgWidth > 0 &&
        imgHeight > 0
      ) {
        const left = Math.max(0, Math.min(Math.round(cropX), imgWidth - 1));
        const top = Math.max(0, Math.min(Math.round(cropY), imgHeight - 1));
        const width = Math.max(
          1,
          Math.min(Math.round(cropWidth), imgWidth - left),
        );
        const height = Math.max(
          1,
          Math.min(Math.round(cropHeight), imgHeight - top),
        );

        pipeline = pipeline.extract({ left, top, width, height });
      }

      const targetWidth = profile.width;
      const targetHeight = profile.height;

      if (profile.width || profile.height) {
        pipeline = pipeline.resize({
          width: profile.width,
          height: profile.height,
          fit: profile.fit,
          position: 'top',
          withoutEnlargement: true,
        });
      }

      if (profileType === ImageProfileType.AVATAR) {
        const circleShape = Buffer.from(
          `<svg width="${targetWidth}" height="${targetHeight}">
            <circle cx="${targetWidth / 2}" cy="${
              targetHeight / 2
            }" r="${targetWidth / 2}" fill="#fff"/>
          </svg>`,
        );

        pipeline = pipeline.composite([
          {
            input: circleShape,
            blend: 'dest-in',
          },
        ]);
      }
      const processedBuffer = await pipeline
        .webp({ quality: profile.quality })
        .toBuffer();

      return {
        buffer: processedBuffer,
        config: profile,
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to process image. Invalid image file.',
      );
    }
  }
}
