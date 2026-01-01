import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

export const IP_WHITELIST_KEY = 'ip_whitelist';

/**
 * Decorator to specify allowed IP addresses for a route
 * Use for webhook endpoints that should only accept requests from specific IPs
 *
 * @example
 * @IpWhitelist(['192.168.1.1', '10.0.0.1'])
 * @Post('webhook')
 * handleWebhook() { ... }
 */
export const IpWhitelist = (ips: string[]) =>
  Reflect.metadata(IP_WHITELIST_KEY, ips);

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IpWhitelistGuard.name);
  private readonly globalWhitelist: string[];

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    // Load global whitelist from config (e.g., Stripe webhook IPs)
    const whitelistConfig = this.configService.get<string>('WEBHOOK_IP_WHITELIST') || '';
    this.globalWhitelist = whitelistConfig
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);
  }

  canActivate(context: ExecutionContext): boolean {
    // Get route-specific whitelist
    const routeWhitelist = this.reflector.get<string[]>(
      IP_WHITELIST_KEY,
      context.getHandler(),
    );

    // Combine global and route-specific whitelists
    const allowedIps = [...this.globalWhitelist, ...(routeWhitelist || [])];

    // If no whitelist defined, allow all (guard not active for this route)
    if (allowedIps.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const clientIp = this.extractIpAddress(request);

    // Check if client IP is in whitelist
    const isAllowed = this.isIpAllowed(clientIp, allowedIps);

    if (!isAllowed) {
      this.logger.warn(
        `IP whitelist violation: ${clientIp} attempted to access ${request.method} ${request.url}`,
      );
      throw new ForbiddenException('Access denied from this IP address');
    }

    return true;
  }

  /**
   * Extracts client IP from request, handling proxies
   */
  private extractIpAddress(request: any): string {
    // Check for forwarded headers (when behind a proxy)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = forwarded.split(',').map((ip: string) => ip.trim());
      return ips[0];
    }

    // Check for real IP header
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    // Fallback to direct connection IP
    return request.ip || request.connection?.remoteAddress || '';
  }

  /**
   * Checks if an IP is allowed, supporting CIDR notation
   */
  private isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
    // Normalize IP (handle IPv6-mapped IPv4)
    const normalizedClientIp = this.normalizeIp(clientIp);

    for (const allowedIp of allowedIps) {
      if (allowedIp.includes('/')) {
        // CIDR notation
        if (this.isIpInCidr(normalizedClientIp, allowedIp)) {
          return true;
        }
      } else {
        // Exact match
        if (this.normalizeIp(allowedIp) === normalizedClientIp) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Normalizes IP address (handles IPv6-mapped IPv4)
   */
  private normalizeIp(ip: string): string {
    // Handle IPv6-mapped IPv4 (::ffff:192.168.1.1)
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    return ip;
  }

  /**
   * Checks if an IP is within a CIDR range
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    try {
      const [rangeIp, bits] = cidr.split('/');
      const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);

      const ipLong = this.ipToLong(ip);
      const rangeLong = this.ipToLong(rangeIp);

      return (ipLong & mask) === (rangeLong & mask);
    } catch {
      return false;
    }
  }

  /**
   * Converts IP address to long integer
   */
  private ipToLong(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  }
}
