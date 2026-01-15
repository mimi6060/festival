import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { TwoFactorSetupResponseDto, TwoFactorStatusDto } from './dto/two-factor.dto';

@Injectable()
export class TwoFactorService {
  private readonly appName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.appName = this.configService.get<string>('APP_NAME', 'Festival Platform');
  }

  /**
   * Generate a new 2FA secret and QR code for the user
   */
  async generateSecret(userId: string): Promise<TwoFactorSetupResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    // Generate a new secret
    const secret = authenticator.generateSecret();

    // Create the otpauth URL for QR code
    const otpauthUrl = authenticator.keyuri(user.email, this.appName, secret);

    // Generate QR code as data URL
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Store the secret temporarily (not enabled yet)
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return {
      secret,
      qrCode,
      manualEntryKey: secret,
    };
  }

  /**
   * Verify the TOTP code and enable 2FA
   */
  async enableTwoFactor(userId: string, code: string): Promise<TwoFactorStatusDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Please generate a 2FA secret first');
    }

    // Verify the code
    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { enabled: true };
  }

  /**
   * Disable 2FA for the user
   */
  async disableTwoFactor(userId: string, code: string): Promise<TwoFactorStatusDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Verify the code before disabling
    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Disable 2FA and remove secret
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    return { enabled: false };
  }

  /**
   * Verify a TOTP code during login
   */
  async verifyCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    return authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });
  }

  /**
   * Check if 2FA is enabled for a user
   */
  async getStatus(userId: string): Promise<TwoFactorStatusDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    return { enabled: user?.twoFactorEnabled || false };
  }

  /**
   * Check if user has 2FA enabled (for login flow)
   */
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    return user?.twoFactorEnabled || false;
  }
}
