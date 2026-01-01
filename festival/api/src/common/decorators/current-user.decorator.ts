import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  id: string;
  email: string;
  role: string;
  festivalId?: string;
}

/**
 * Decorator to extract the current authenticated user from the request
 * Can optionally extract a specific property from the user object
 *
 * @example
 * ```typescript
 * // Get the full user object
 * @Get('profile')
 * getProfile(@CurrentUser() user: CurrentUserPayload) {
 *   return user;
 * }
 *
 * // Get only the user ID
 * @Get('my-tickets')
 * getMyTickets(@CurrentUser('id') userId: string) {
 *   return this.ticketsService.findByUser(userId);
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
