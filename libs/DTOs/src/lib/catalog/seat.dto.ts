import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SeatType } from '@booking-ticket-system/Utils';

export class SeatDefinitionInputDto {
  @Transform(({ obj }) => obj.row_label ?? obj.rowLabel)
  @IsString()
  @IsNotEmpty()
  rowLabel!: string;

  @Transform(({ obj }) =>
    obj.seat_number !== undefined
      ? Number(obj.seat_number)
      : obj.seatNumber !== undefined
        ? Number(obj.seatNumber)
        : undefined,
  )
  @IsInt()
  @Min(1)
  seatNumber!: number;

  @Transform(({ obj }) =>
    obj.grid_row !== undefined
      ? Number(obj.grid_row)
      : obj.gridRow !== undefined
        ? Number(obj.gridRow)
        : undefined,
  )
  @IsInt()
  @Min(1)
  gridRow!: number;

  @Transform(({ obj }) =>
    obj.grid_column !== undefined
      ? Number(obj.grid_column)
      : obj.gridColumn !== undefined
        ? Number(obj.gridColumn)
        : undefined,
  )
  @IsInt()
  @Min(1)
  gridColumn!: number;

  @Transform(({ obj }) => obj.seat_type ?? obj.seatType)
  @IsEnum(SeatType)
  seatType!: SeatType;

  @Transform(({ obj }) => obj.is_operational ?? obj.isOperational)
  @IsOptional()
  @IsBoolean()
  isOperational?: boolean;
}

export class GenerateSeatLayoutDto {
  @Transform(({ obj }) => obj.auditorium_id ?? obj.auditoriumId)
  @IsUUID('4')
  auditoriumId!: string;

  @Transform(({ obj }) =>
    obj.total_rows !== undefined
      ? Number(obj.total_rows)
      : obj.totalRows !== undefined
        ? Number(obj.totalRows)
        : undefined,
  )
  @IsInt()
  @Min(1)
  totalRows!: number;

  @Transform(({ obj }) =>
    obj.total_columns !== undefined
      ? Number(obj.total_columns)
      : obj.totalColumns !== undefined
        ? Number(obj.totalColumns)
        : undefined,
  )
  @IsInt()
  @Min(1)
  totalColumns!: number;

  @Transform(({ obj }) => obj.custom_seats ?? obj.customSeats)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatDefinitionInputDto)
  customSeats?: SeatDefinitionInputDto[];
}

export class UpdateSeatDto {
  @Transform(({ obj }) => obj.seat_type ?? obj.seatType)
  @IsOptional()
  @IsEnum(SeatType)
  seatType?: SeatType;

  @Transform(({ obj }) => obj.is_operational ?? obj.isOperational)
  @IsOptional()
  @IsBoolean()
  isOperational?: boolean;
}

export class BatchSeatUpdateItemDto {
  @IsUUID('4')
  id!: string;

  @Transform(({ obj }) => obj.seat_type ?? obj.seatType)
  @IsOptional()
  @IsEnum(SeatType)
  seatType?: SeatType;

  @Transform(({ obj }) => obj.is_operational ?? obj.isOperational)
  @IsOptional()
  @IsBoolean()
  isOperational?: boolean;
}

export class BatchUpdateSeatsDto {
  @Transform(({ obj }) => obj.auditorium_id ?? obj.auditoriumId)
  @IsUUID('4')
  auditoriumId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchSeatUpdateItemDto)
  seats!: BatchSeatUpdateItemDto[];
}
