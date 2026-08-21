import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MovieAgeRating, MovieStatus } from '@booking-ticket-system/Utils';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @Transform(({ obj }) =>
    obj.duration_minutes !== undefined
      ? Number(obj.duration_minutes)
      : obj.durationMinutes !== undefined
        ? Number(obj.durationMinutes)
        : undefined,
  )
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @Transform(({ obj }) => obj.release_date ?? obj.releaseDate)
  @IsString()
  @IsNotEmpty()
  releaseDate!: string;

  @Transform(({ obj }) => obj.age_rating ?? obj.ageRating)
  @IsEnum(MovieAgeRating)
  ageRating!: MovieAgeRating;

  @IsOptional()
  @IsEnum(MovieStatus)
  status?: MovieStatus;

  @Transform(({ obj }) => obj.original_language ?? obj.originalLanguage)
  @IsString()
  @IsNotEmpty()
  originalLanguage!: string;

  @Transform(({ obj }) => obj.spoken_languages ?? obj.spokenLanguages)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  spokenLanguages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subtitles?: string[];

  @Transform(({ obj }) => obj.poster_url ?? obj.posterUrl)
  @IsOptional()
  @IsString()
  posterUrl?: string;

  @Transform(({ obj }) => obj.banner_url ?? obj.bannerUrl)
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @Transform(({ obj }) => obj.trailer_url ?? obj.trailerUrl)
  @IsOptional()
  @IsString()
  trailerUrl?: string;

  @Transform(({ obj }) => obj.gallery_urls ?? obj.galleryUrls)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryUrls?: string[];

  @IsArray()
  @IsString({ each: true })
  directors!: string[];

  @IsArray()
  @IsString({ each: true })
  cast!: string[];

  @Transform(({ obj }) => obj.genre_ids ?? obj.genreIds)
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  genreIds?: string[];
}

export class UpdateMovieDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ obj }) =>
    obj.duration_minutes !== undefined
      ? Number(obj.duration_minutes)
      : obj.durationMinutes !== undefined
        ? Number(obj.durationMinutes)
        : undefined,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @Transform(({ obj }) => obj.release_date ?? obj.releaseDate)
  @IsOptional()
  @IsString()
  releaseDate?: string;

  @Transform(({ obj }) => obj.age_rating ?? obj.ageRating)
  @IsOptional()
  @IsEnum(MovieAgeRating)
  ageRating?: MovieAgeRating;

  @IsOptional()
  @IsEnum(MovieStatus)
  status?: MovieStatus;

  @Transform(({ obj }) => obj.original_language ?? obj.originalLanguage)
  @IsOptional()
  @IsString()
  originalLanguage?: string;

  @Transform(({ obj }) => obj.spoken_languages ?? obj.spokenLanguages)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  spokenLanguages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subtitles?: string[];

  @Transform(({ obj }) => obj.poster_url ?? obj.posterUrl)
  @IsOptional()
  @IsString()
  posterUrl?: string;

  @Transform(({ obj }) => obj.banner_url ?? obj.bannerUrl)
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @Transform(({ obj }) => obj.trailer_url ?? obj.trailerUrl)
  @IsOptional()
  @IsString()
  trailerUrl?: string;

  @Transform(({ obj }) => obj.gallery_urls ?? obj.galleryUrls)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryUrls?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  directors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cast?: string[];

  @Transform(({ obj }) => obj.genre_ids ?? obj.genreIds)
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  genreIds?: string[];
}

export class ListMoviesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(MovieStatus)
  status?: MovieStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @Transform(({ obj }) => obj.genre_id ?? obj.genreId)
  @IsOptional()
  @IsUUID('4')
  genreId?: string;

  @Transform(({ obj }) => obj.genre_slug ?? obj.genreSlug)
  @IsOptional()
  @IsString()
  genreSlug?: string;
}
