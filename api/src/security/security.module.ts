import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IpWhitelistGuard } from './guards/ip-whitelist.guard';
import { ApiKeyGuard } from './guards/api-key.guard';

/**
 * Security Module
 *
 * Provides additional security guards:
 * - IP Whitelist Guard: Restrict access by IP address
 * - API Key Guard: Validate API keys for service-to-service communication
 *
 * Note: Rate limiting is now handled by the ThrottlerModule in api/src/throttler
 * which provides advanced features like:
 * - Redis-backed distributed rate limiting
 * - Multiple rate limit tiers (Global, Auth, Payment, Public)
 * - Custom tracking by IP, User ID, or API Key
 * - Automatic blocking after excessive violations
 */
@Module({
  imports: [ConfigModule],
  providers: [IpWhitelistGuard, ApiKeyGuard],
  exports: [IpWhitelistGuard, ApiKeyGuard],
})
export class SecurityModule {}
