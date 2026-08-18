import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { UserStatus } from '@booking-ticket-system/Utils';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus, {
    message: 'Status must be one of: ACTIVE, SUSPENDED, BLOCKED, DELETED',
  })
  @IsNotEmpty({ message: 'Status is required' })
  status!: UserStatus;

  @IsString({ message: 'Reason must be a string' })
  @IsOptional()
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string;

  @IsISO8601({}, { message: 'Suspended until must be a valid ISO 8601 date string' })
  @IsOptional()
  suspendedUntil?: string;
}
