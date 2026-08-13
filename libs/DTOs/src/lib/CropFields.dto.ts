import { IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CropFieldsDto {
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? Number(value)
      : undefined,
  )
  @IsNumber()
  cropX?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? Number(value)
      : undefined,
  )
  @IsNumber()
  cropY?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? Number(value)
      : undefined,
  )
  @IsNumber()
  cropWidth?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? Number(value)
      : undefined,
  )
  @IsNumber()
  cropHeight?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? Number(value)
      : undefined,
  )
  @IsNumber()
  cropZoom?: number;
}
