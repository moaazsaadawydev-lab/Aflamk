export interface ImageProfileConfig {
  width?: number;
  height?: number;
  quality: number;
  folder: string;
  fit: 'cover' | 'contain' | 'inside' | 'fill';
}

export interface ImageProcessedEventPayload {
  entityId: string;
  mediaUrl: string;
  profileType: string;
}

export interface ProcessedImageResult {
  buffer: Buffer;
  config: ImageProfileConfig;
}

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}
