import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsBoolean,
  IsUUID,
  Min,
} from 'class-validator';

// ============= FAQ Category DTOs =============

export class CreateFaqCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

export class UpdateFaqCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

// ============= FAQ Item DTOs =============

export class CreateFaqItemDto {
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  answer: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateFaqItemDto {
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  question?: string;

  @IsString()
  @IsOptional()
  answer?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
