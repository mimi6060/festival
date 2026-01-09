import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { TwoFactorService } from './two-factor.service';
import {
  VerifyTwoFactorDto,
  TwoFactorSetupResponseDto,
  TwoFactorStatusDto,
} from './dto/two-factor.dto';

@ApiTags('Two-Factor Authentication')
@Controller('auth/2fa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get 2FA status for current user' })
  @ApiResponse({
    status: 200,
    description: '2FA status',
    type: TwoFactorStatusDto,
  })
  async getStatus(@CurrentUser('id') userId: string): Promise<TwoFactorStatusDto> {
    return this.twoFactorService.getStatus(userId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiResponse({
    status: 201,
    description: '2FA setup information including QR code',
    type: TwoFactorSetupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '2FA is already enabled',
  })
  async generateSecret(@CurrentUser('id') userId: string): Promise<TwoFactorSetupResponseDto> {
    return this.twoFactorService.generateSecret(userId);
  }

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify code and enable 2FA' })
  @ApiResponse({
    status: 200,
    description: '2FA enabled successfully',
    type: TwoFactorStatusDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid verification code',
  })
  async enableTwoFactor(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyTwoFactorDto
  ): Promise<TwoFactorStatusDto> {
    return this.twoFactorService.enableTwoFactor(userId, dto.code);
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA (requires verification code)' })
  @ApiResponse({
    status: 200,
    description: '2FA disabled successfully',
    type: TwoFactorStatusDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid verification code',
  })
  async disableTwoFactor(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyTwoFactorDto
  ): Promise<TwoFactorStatusDto> {
    return this.twoFactorService.disableTwoFactor(userId, dto.code);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA code (for login flow)' })
  @ApiResponse({
    status: 200,
    description: 'Code verification result',
  })
  async verifyCode(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyTwoFactorDto
  ): Promise<{ valid: boolean }> {
    const valid = await this.twoFactorService.verifyCode(userId, dto.code);
    return { valid };
  }
}
