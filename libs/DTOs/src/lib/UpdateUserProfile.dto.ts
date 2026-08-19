import { IsOptional, IsString, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { Country } from '@booking-ticket-system/Utils';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(Country)
  country?: Country;

  @IsOptional()
  @IsDateString({}, { message: 'birthDate must be a valid date string (YYYY-MM-DD)' })
  birthDate?: string;

  @IsOptional()
  @IsString()
  tempKey?: string;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? Number(value) : undefined))
  @IsNumber({}, { message: 'cropX must be a number' })
  cropX?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? Number(value) : undefined))
  @IsNumber({}, { message: 'cropY must be a number' })
  cropY?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? Number(value) : undefined))
  @IsNumber({}, { message: 'cropWidth must be a number' })
  cropWidth?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? Number(value) : undefined))
  @IsNumber({}, { message: 'cropHeight must be a number' })
  cropHeight?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? Number(value) : undefined))
  @IsNumber({}, { message: 'cropZoom must be a number' })
  cropZoom?: number;
}
