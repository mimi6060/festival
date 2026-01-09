import { IsString, Length, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTwoFactorDto {
  @ApiProperty({
    description: '6-digit TOTP code from authenticator app',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code: string;
}

export class TwoFactorSetupResponseDto {
  @ApiProperty({ description: 'TOTP secret (base32 encoded)' })
  secret: string;

  @ApiProperty({ description: 'QR code as data URL (base64 PNG)' })
  qrCode: string;

  @ApiProperty({ description: 'Manual entry key for authenticator apps' })
  manualEntryKey: string;
}

export class TwoFactorStatusDto {
  @ApiProperty({ description: 'Whether 2FA is enabled for the user' })
  enabled: boolean;
}
