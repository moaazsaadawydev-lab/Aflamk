import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class ConfirmEmailChangeDto {
  @IsString()
  @IsNotEmpty({ message: 'Verification code is required' })
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must contain only numbers' })
  code!: string;
}
