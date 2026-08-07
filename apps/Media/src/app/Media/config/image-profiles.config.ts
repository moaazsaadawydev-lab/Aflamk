import { ImageProfileConfig } from '@booking-ticket-system/Interfaces';
import { ImageProfileType } from '@booking-ticket-system/Utils';

export const IMAGE_PROFILES: Record<ImageProfileType, ImageProfileConfig> = {
  [ImageProfileType.AVATAR]: {
    width: 300,
    height: 300,
    quality: 80,
    folder: 'avatars',
    fit: 'cover',
  },
  [ImageProfileType.MOVIE_THUMBNAIL]: {
    width: 500,
    height: 750,
    quality: 85,
    folder: 'movies/thumbnails',
    fit: 'cover',
  },
  [ImageProfileType.MOVIE_COVER]: {
    width: 1920,
    height: 1080,
    quality: 80,
    folder: 'movies/covers',
    fit: 'inside',
  },
};
