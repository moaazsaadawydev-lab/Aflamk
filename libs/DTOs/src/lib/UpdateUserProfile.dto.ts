import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsNumber } from 'class-validator';
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
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

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
