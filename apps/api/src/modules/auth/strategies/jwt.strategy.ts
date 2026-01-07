/**
 * JWT Strategy for Passport Authentication
 *
 * Validates JWT tokens from the Authorization header OR httpOnly cookies
 * and extracts user information for request context.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService, JwtPayload } from '../auth.service';

/**
 * Custom extractor that tries:
 * 1. Authorization header (Bearer token)
 * 2. access_token cookie
 */
const extractJwtFromHeaderOrCookie = (req: Request): string | null => {
  // First try Authorization header
  const headerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (headerToken) {
    return headerToken;
  }

  // Then try cookie
  if (req.cookies?.access_token) {
    return req.cookies.access_token as string;
  }

  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService
  ) {
    super({
      jwtFromRequest: extractJwtFromHeaderOrCookie,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Validate the JWT payload and return the user
   * This is called automatically by Passport after token verification
   */
  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);

    if (!user) {
      throw new UnauthorizedException('Invalid token or user not found');
    }

    return user;
  }
}
