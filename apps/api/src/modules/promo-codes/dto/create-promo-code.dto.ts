import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  Length,
  IsUUID,
} from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreatePromoCodeDto {
  @ApiProperty({
    description: 'Code promo unique',
    example: 'SUMMER2026',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @Length(3, 50)
  code!: string;

  @ApiProperty({
    description: 'Type de réduction',
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiProperty({
    description: 'Valeur de la réduction (pourcentage ou montant fixe)',
    example: 20,
  })
  @IsNumber()
  @Min(0)
  @Max(100000)
  discountValue!: number;

  @ApiProperty({
    description: "Nombre maximum d'utilisations (null = illimité)",
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @ApiProperty({
    description: 'Montant minimum pour appliquer le code',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiProperty({
    description: "Date d'expiration du code",
    example: '2026-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    description: 'Code actif ou non',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'ID du festival (null = valable pour tous les festivals)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiProperty({
    description: "Indique si ce code peut etre combine avec d'autres codes promo",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  stackable?: boolean;
}
