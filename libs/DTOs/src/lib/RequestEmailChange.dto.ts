import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestEmailChangeDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsEmail({}, { message: 'Invalid email address format' })
  @IsNotEmpty({ message: 'New email is required' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  newEmail!: string;
}
