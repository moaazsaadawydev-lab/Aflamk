import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Country } from '@booking-ticket-system/Utils';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(Country)
  country?: Country;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;
}
