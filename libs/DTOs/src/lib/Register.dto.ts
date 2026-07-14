import { IsString, IsNotEmpty, IsEmail, IsNumber } from 'class-validator';

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
}
