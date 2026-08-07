import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { IMAGE_PROFILES } from './config/image-profiles.config';
import { ProcessedImageResult } from '@booking-ticket-system/Interfaces';
import { ImageProfileType } from '@booking-ticket-system/Utils';

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

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

      if (crop && crop.width && crop.height) {
        pipeline = pipeline.extract({
          left: Math.round(crop.x),
          top: Math.round(crop.y),
          width: Math.round(crop.width),
          height: Math.round(crop.height),
        });
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
