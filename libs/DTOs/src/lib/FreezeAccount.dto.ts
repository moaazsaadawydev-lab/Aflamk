import { IsNotEmpty, IsString } from 'class-validator';

export class FreezeAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Freeze token is required' })
  token!: string;
}
