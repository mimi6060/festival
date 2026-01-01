import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LinkNfcDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  nfcTagId: string;
}
