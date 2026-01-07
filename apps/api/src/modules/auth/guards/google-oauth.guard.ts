/**
 * Google OAuth Guard
 *
 * Triggers the Google OAuth authentication flow.
 */

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isEnabled = this.configService.get<boolean>('GOOGLE_OAUTH_ENABLED');
    if (!isEnabled) {
      return false;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err || new Error('Google authentication failed');
    }
    return user;
  }
}
