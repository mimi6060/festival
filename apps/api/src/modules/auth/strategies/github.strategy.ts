/**
 * GitHub OAuth Strategy
 *
 * Handles authentication via GitHub OAuth2.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { AuthService } from '../auth.service';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {
    const clientID = configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = configService.get<string>('GITHUB_CLIENT_SECRET');
    const callbackURL =
      configService.get<string>('GITHUB_CALLBACK_URL') ||
      `${configService.get<string>('API_URL')}/api/auth/github/callback`;

    super({
      clientID: clientID || 'disabled',
      clientSecret: clientSecret || 'disabled',
      callbackURL,
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: Error | null, user?: unknown) => void
  ): Promise<void> {
    try {
      const { emails, displayName, username, photos, id } = profile;

      // GitHub may not return emails if user hasn't made them public
      // We need to handle this case
      let email: string | null = null;
      if (emails && emails.length > 0) {
        email = emails[0].value;
      }

      if (!email) {
        return done(
          new UnauthorizedException(
            'No email associated with this GitHub account. Please make your email public on GitHub.'
          ),
          undefined
        );
      }

      // Parse display name or use username
      let firstName = displayName || username || 'User';
      let lastName = '';

      if (displayName?.includes(' ')) {
        const parts = displayName.split(' ');
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      }

      const avatarUrl = photos?.[0]?.value || null;

      const user = await this.authService.validateOAuthUser({
        email,
        firstName,
        lastName,
        avatarUrl,
        provider: 'github',
        providerId: id,
      });

      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
