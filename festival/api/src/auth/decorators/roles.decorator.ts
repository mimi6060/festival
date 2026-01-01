import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles are allowed to access a route.
 * Can be applied to controllers or individual route handlers.
 *
 * @example
 * @Roles('ADMIN', 'ORGANIZER')
 * @Get('admin-only')
 * getAdminData() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
