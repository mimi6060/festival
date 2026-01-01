import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';

/**
 * Interface representing the authenticated user payload from JWT.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  firstName: string;
  lastName: string;
}

/**
 * Parameter decorator to extract the current authenticated user from the request.
 * Must be used with JwtAuthGuard.
 *
 * @example
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return user;
 * }
 *
 * // Or get specific property
 * @Get('my-id')
 * @UseGuards(JwtAuthGuard)
 * getMyId(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
