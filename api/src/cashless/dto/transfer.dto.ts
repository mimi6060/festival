import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class TransferDto {
  @IsNotEmpty()
  @IsUUID()
  toAccountId: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsUUID()
  festivalId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
