import { Module } from '@nestjs/common';
import { MediaController } from './Media.controller';
import { MediaService } from './Media.service';
import { ImageProcessorService } from './image-processor.service';
import { LocalStorageDriver } from '../Storage/local-storage.driver';

@Module({
  imports: [],
  controllers: [MediaController],
  providers: [MediaService, ImageProcessorService, LocalStorageDriver],
})
export class MediaModule {}
