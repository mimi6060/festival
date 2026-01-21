/**
 * Facebook OAuth Strategy
 *
 * Handles authentication via Facebook OAuth2.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {
    const clientID = configService.get<string>('FACEBOOK_CLIENT_ID');
    const clientSecret = configService.get<string>('FACEBOOK_CLIENT_SECRET');
    const callbackURL =
      configService.get<string>('FACEBOOK_CALLBACK_URL') ||
      `${configService.get<string>('API_URL')}/api/auth/facebook/callback`;

    super({
      clientID: clientID || 'disabled',
      clientSecret: clientSecret || 'disabled',
      callbackURL,
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: unknown) => void
  ): Promise<void> {
    try {
      const { emails, name, photos, id } = profile;

      if (!emails || emails.length === 0) {
        return done(new UnauthorizedException('No email provided by Facebook'), undefined);
      }

      const email = emails[0].value;
      const firstName = name?.givenName || 'User';
      const lastName = name?.familyName || '';
      const avatarUrl = photos?.[0]?.value || null;

      const user = await this.authService.validateOAuthUser({
        email,
        firstName,
        lastName,
        avatarUrl,
        provider: 'facebook',
        providerId: id,
      });

      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
