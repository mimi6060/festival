import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

/**
 * User entity representing a user in the system.
 * Excludes sensitive data like password hash and refresh token.
 */
@Exclude()
export class UserEntity {
  @Expose()
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @Expose()
  @ApiProperty({
    description: 'User email address',
    example: 'jean.dupont@example.com',
  })
  email!: string;

  @Expose()
  @ApiProperty({
    description: 'First name',
    example: 'Jean',
  })
  firstName!: string;

  @Expose()
  @ApiProperty({
    description: 'Last name',
    example: 'Dupont',
  })
  lastName!: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+33612345678',
  })
  phone!: string | null;

  @Expose()
  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.USER,
  })
  role!: UserRole;

  @Expose()
  @ApiProperty({
    description: 'User account status',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Expose()
  @ApiProperty({
    description: 'Whether email has been verified',
    example: true,
  })
  emailVerified!: boolean;

  @Expose()
  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;

  @Expose()
  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt!: Date;

  @Expose()
  @ApiPropertyOptional({
    description: 'Last login date',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastLoginAt!: Date | null;

  // Excluded sensitive fields
  @Exclude()
  passwordHash!: string;

  @Exclude()
  refreshToken!: string | null;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  /**
   * Get the full name of the user
   */
  @Expose()
  @ApiProperty({
    description: 'Full name',
    example: 'Jean Dupont',
  })
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Check if user is an admin
   */
  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * Check if user is active
   */
  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  /**
   * Check if user is banned
   */
  get isBanned(): boolean {
    return this.status === UserStatus.BANNED;
  }
}

/**
 * User activity log entry.
 */
export interface UserActivityEntry {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  performedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}
