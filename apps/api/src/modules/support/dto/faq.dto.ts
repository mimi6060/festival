import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  MinLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ===== FAQ Category DTOs =====

export class CreateFaqCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Billetterie' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ description: 'Display order', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number;
}

export class UpdateFaqCategoryDto extends PartialType(CreateFaqCategoryDto) {}

export class FaqCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  order!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: () => [FaqItemResponseDto] })
  items?: FaqItemResponseDto[];
}

// ===== FAQ Item DTOs =====

export class CreateFaqItemDto {
  @ApiProperty({ description: 'Category ID' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({
    description: 'Question',
    example: 'Comment puis-je acheter un billet ?',
  })
  @IsString()
  @MinLength(5)
  question!: string;

  @ApiProperty({
    description: 'Answer',
    example: 'Vous pouvez acheter un billet en ligne sur notre site...',
  })
  @IsString()
  @MinLength(10)
  answer!: string;

  @ApiPropertyOptional({ description: 'Display order', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFaqItemDto extends PartialType(CreateFaqItemDto) {}

export class FaqItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  question!: string;

  @ApiProperty()
  answer!: string;

  @ApiProperty()
  order!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

// ===== Query DTOs =====

export class FaqQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter active items only', default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;
}
