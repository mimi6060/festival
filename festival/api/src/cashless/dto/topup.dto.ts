import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  Max,
} from 'class-validator';

export class TopupDto {
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(500)
  amount: number;

  @IsNotEmpty()
  @IsUUID()
  festivalId: string;

  @IsNotEmpty()
  @IsString()
  successUrl: string;

  @IsNotEmpty()
  @IsString()
  cancelUrl: string;
}
