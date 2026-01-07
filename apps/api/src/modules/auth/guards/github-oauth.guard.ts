/**
 * GitHub OAuth Guard
 *
 * Triggers the GitHub OAuth authentication flow.
 */

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GitHubOAuthGuard extends AuthGuard('github') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isEnabled = this.configService.get<boolean>('GITHUB_OAUTH_ENABLED');
    if (!isEnabled) {
      return false;
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
