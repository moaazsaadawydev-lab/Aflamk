import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsNumber,
  IsOptional,
  ValidateIf,
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

  @IsNumber()
  @IsNotEmpty()
  age!: number;

  @IsString()
  @IsNotEmpty()
  gender!: string;

  @ValidateIf((o) => o.hasFile === true)
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  @IsNumber({}, { message: 'cropX must be a number' })
  @IsOptional()
  cropX?: number;

  @ValidateIf((o) => o.hasFile === true)
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  @IsNumber({}, { message: 'cropY must be a number' })
  @IsOptional()
  cropY?: number;

  @ValidateIf((o) => o.hasFile === true)
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  @IsNumber({}, { message: 'cropWidth must be a number' })
  @IsOptional()
  cropWidth?: number;

  @ValidateIf((o) => o.hasFile === true)
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  @IsNumber({}, { message: 'cropHeight must be a number' })
  @IsOptional()
  cropHeight?: number;
}
