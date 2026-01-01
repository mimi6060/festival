import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that validates user credentials using Passport Local strategy.
 * Used for the login endpoint.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
