import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Passport Local strategy for validating user credentials (email/password).
 * Used for the login endpoint.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email', // Use 'email' instead of 'username'
      passwordField: 'password',
    });
  }

  /**
   * Validates user credentials.
   * Called automatically by Passport during local authentication.
   */
  async validate(email: string, password: string): Promise<AuthenticatedUser> {
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }
}
