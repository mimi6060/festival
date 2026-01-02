import {
  IsString,
  IsOptional,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArtistDto {
  @ApiProperty({ description: 'Artist name' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Music genre' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  genre?: string;

  @ApiPropertyOptional({ description: 'Artist biography' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio?: string;

  @ApiPropertyOptional({ description: 'Profile image URL' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Spotify profile URL' })
  @IsOptional()
  @IsUrl()
  spotifyUrl?: string;

  @ApiPropertyOptional({ description: 'Instagram profile URL' })
  @IsOptional()
  @IsUrl()
  instagramUrl?: string;

  @ApiPropertyOptional({ description: 'Official website URL' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;
}
