import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ExperienceType, SeatType, ShowtimeStatus } from '@booking-ticket-system/Utils';

export class SeatPricingInputDto {
  @Transform(({ obj }) => obj.seat_type ?? obj.seatType)
  @IsEnum(SeatType)
  seatType!: SeatType;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price!: number;
}

export class CreateShowtimeDto {
  @Transform(({ obj }) => obj.movie_id ?? obj.movieId)
  @IsUUID('4')
  movieId!: string;

  @Transform(({ obj }) => obj.auditorium_id ?? obj.auditoriumId)
  @IsUUID('4')
  auditoriumId!: string;

  @Transform(({ obj }) => obj.start_time ?? obj.startTime)
  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @Transform(({ obj }) => obj.end_time ?? obj.endTime)
  @IsString()
  @IsNotEmpty()
  endTime!: string;

  @Transform(({ obj }) => obj.experience_type ?? obj.experienceType)
  @IsEnum(ExperienceType)
  experienceType!: ExperienceType;

  @Transform(({ obj }) =>
    obj.base_price !== undefined
      ? Number(obj.base_price)
      : obj.basePrice !== undefined
        ? Number(obj.basePrice)
        : undefined,
  )
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice!: number;

  @IsOptional()
  @IsEnum(ShowtimeStatus)
  status?: ShowtimeStatus;

  @Transform(({ obj }) => obj.custom_pricings ?? obj.customPricings)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatPricingInputDto)
  customPricings?: SeatPricingInputDto[];
}

export class UpdateShowtimeDto {
  @Transform(({ obj }) => obj.movie_id ?? obj.movieId)
  @IsOptional()
  @IsUUID('4')
  movieId?: string;

  @Transform(({ obj }) => obj.auditorium_id ?? obj.auditoriumId)
  @IsOptional()
  @IsUUID('4')
  auditoriumId?: string;

  @Transform(({ obj }) => obj.start_time ?? obj.startTime)
  @IsOptional()
  @IsString()
  startTime?: string;

  @Transform(({ obj }) => obj.end_time ?? obj.endTime)
  @IsOptional()
  @IsString()
  endTime?: string;

  @Transform(({ obj }) => obj.experience_type ?? obj.experienceType)
  @IsOptional()
  @IsEnum(ExperienceType)
  experienceType?: ExperienceType;

  @Transform(({ obj }) =>
    obj.base_price !== undefined
      ? Number(obj.base_price)
      : obj.basePrice !== undefined
        ? Number(obj.basePrice)
        : undefined,
  )
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice?: number;

  @IsOptional()
  @IsEnum(ShowtimeStatus)
  status?: ShowtimeStatus;
}

export class ListShowtimesQueryDto {
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

  @Transform(({ obj }) => obj.movie_id ?? obj.movieId)
  @IsOptional()
  @IsUUID('4')
  movieId?: string;

  @Transform(({ obj }) => obj.cinema_id ?? obj.cinemaId)
  @IsOptional()
  @IsUUID('4')
  cinemaId?: string;

  @Transform(({ obj }) => obj.auditorium_id ?? obj.auditoriumId)
  @IsOptional()
  @IsUUID('4')
  auditoriumId?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @Transform(({ obj }) => obj.start_date ?? obj.startDate)
  @IsOptional()
  @IsString()
  startDate?: string;

  @Transform(({ obj }) => obj.end_date ?? obj.endDate)
  @IsOptional()
  @IsString()
  endDate?: string;

  @Transform(({ obj }) => obj.experience_type ?? obj.experienceType)
  @IsOptional()
  @IsEnum(ExperienceType)
  experienceType?: ExperienceType;

  @IsOptional()
  @IsEnum(ShowtimeStatus)
  status?: ShowtimeStatus;
}

export class GroupedShowtimesQueryDto {
  @Transform(({ obj }) => obj.movie_id ?? obj.movieId)
  @IsUUID('4')
  movieId!: string;

  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsOptional()
  @IsString()
  city?: string;
}

export class SetShowtimeSeatPricingsDto {
  @Transform(({ obj }) => obj.showtime_id ?? obj.showtimeId)
  @IsOptional()
  @IsUUID('4')
  showtimeId?: string;

  @Transform(({ obj }) => {
    if (Array.isArray(obj)) return obj;
    return obj?.pricings ?? obj?.custom_pricings ?? obj?.customPricings ?? [];
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatPricingInputDto)
  pricings!: SeatPricingInputDto[];
}
