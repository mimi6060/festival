/**
 * GitHub OAuth Guard
 *
 * Triggers the GitHub OAuth authentication flow.
 */

import { Injectable, ExecutionContext, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GitHubOAuthGuard extends AuthGuard('github') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isEnabled =
      this.configService.get<string>('GITHUB_OAUTH_ENABLED') === 'true' ||
      this.configService.get<boolean>('GITHUB_OAUTH_ENABLED') === true;

    if (!isEnabled) {
      throw new BadRequestException(
        'GitHub OAuth is not configured. Please contact the administrator or use email/password login.'
      );
    }

    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET');

    if (!clientId || clientId === 'disabled' || !clientSecret || clientSecret === 'disabled') {
      throw new BadRequestException(
        'GitHub OAuth credentials are not configured. Please use email/password login.'
      );
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err || new Error('GitHub authentication failed');
    }
    return user;
  }
}
