import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class LogoutDto {
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  @IsOptional()
  userId?: string;

  @IsString({ message: 'Session ID must be a string' })
  @IsOptional()
  sessionId?: string;
}
