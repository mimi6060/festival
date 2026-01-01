import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict access to specific roles.
 * Uses Prisma's UserRole enum for type safety.
 * Must be used with RolesGuard.
 *
 * Available roles from Prisma schema:
 * - ADMIN: Full system access
 * - ORGANIZER: Festival management
 * - STAFF: Staff operations
 * - CASHIER: Payment operations
 * - SECURITY: Access control
 * - USER: Regular user
 *
 * @example
 * ```typescript
 * @Roles('ADMIN', 'ORGANIZER')
 * @Get('admin/users')
 * getUsers() {
 *   return this.usersService.findAll();
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
