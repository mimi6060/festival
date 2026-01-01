import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nfcTagId?: string;
}
