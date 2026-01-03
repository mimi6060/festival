import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class ValidatePromoCodeDto {
  @ApiProperty({
    description: 'Code promo à valider',
    example: 'SUMMER2026',
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: 'Montant total de la commande',
    example: 150,
  })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({
    description: 'ID du festival (optionnel)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  festivalId?: string;
}

export class ApplyPromoCodeDto {
  @ApiProperty({
    description: 'Code promo à appliquer',
    example: 'SUMMER2026',
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: 'Montant total avant réduction',
    example: 150,
  })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({
    description: 'ID du festival',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  festivalId?: string;
}
