import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEmail,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsOptional()
  @IsDateString({}, { message: 'birthDate must be a valid date string (YYYY-MM-DD)' })
  birthDate?: string;

  @IsString()
  @IsNotEmpty()
  gender!: string;

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
