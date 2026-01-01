import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum Platform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export class RegisterPushTokenDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging token',
    example: 'dXkJ8x9...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Device platform',
    enum: Platform,
    example: Platform.IOS,
  })
  @IsEnum(Platform)
  platform: Platform;
}
