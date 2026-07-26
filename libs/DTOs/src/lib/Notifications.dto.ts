import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { NotificationType } from '@booking-ticket-system/Utils';

export class NotificationDto {
  @IsUUID()
  @IsNotEmpty()
  UserId!: string;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;
}
