import { IsNotEmpty, IsString } from 'class-validator';

export class RollbackEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Rollback token is required' })
  token!: string;
}
