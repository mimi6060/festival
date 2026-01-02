import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Users module for user management.
 *
 * Features:
 * - User listing with pagination and filters (Admin)
 * - User search by email/name (Admin)
 * - User profile viewing (Admin or self)
 * - User profile updating (Admin or self)
 * - User deactivation (Admin)
 * - Role management (Admin)
 * - Ban/Unban functionality (Admin)
 * - Activity history (Admin)
 *
 * All admin actions are logged for audit purposes.
 */
@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
