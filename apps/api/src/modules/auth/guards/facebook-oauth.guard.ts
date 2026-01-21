/**
 * Facebook OAuth Guard
 *
 * Triggers the Facebook OAuth authentication flow.
 */

import { Injectable, ExecutionContext, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookOAuthGuard extends AuthGuard('facebook') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isEnabled =
      this.configService.get<string>('FACEBOOK_OAUTH_ENABLED') === 'true' ||
      this.configService.get<boolean>('FACEBOOK_OAUTH_ENABLED') === true;

    if (!isEnabled) {
      throw new BadRequestException(
        'Facebook OAuth is not configured. Please contact the administrator or use email/password login.'
      );
    }

    const clientId = this.configService.get<string>('FACEBOOK_CLIENT_ID');
    const clientSecret = this.configService.get<string>('FACEBOOK_CLIENT_SECRET');

    if (!clientId || clientId === 'disabled' || !clientSecret || clientSecret === 'disabled') {
      throw new BadRequestException(
        'Facebook OAuth credentials are not configured. Please use email/password login.'
      );
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err || new Error('Facebook authentication failed');
    }
    return user;
  }
}
