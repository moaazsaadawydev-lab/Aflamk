import { IsNumber, IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  email!: string;

  @IsString()
  code!: string;
}
