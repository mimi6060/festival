import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsNumber,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuItemDto {
  @ApiProperty({
    description: 'Name of the menu item',
    example: 'Cheeseburger Deluxe',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the menu item',
    example: 'Juicy beef patty with cheddar cheese, lettuce, tomato, and special sauce',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Price of the item in the festival currency',
    example: 12.50,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({
    description: 'Category of the menu item',
    example: 'Burgers',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description: 'URL of the menu item image',
    example: 'https://example.com/burger.jpg',
  })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the item is currently available',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean = true;
}
