/**
 * User Types
 * Types for user management, authentication, and authorization
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * User roles in the system
 */
export enum UserRole {
  ADMIN = 'admin',
  ORGANIZER = 'organizer',
  STAFF = 'staff',
  VOLUNTEER = 'volunteer',
  ATTENDEE = 'attendee',
}

/**
 * User account status
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Base user interface
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * User with password (internal use only)
 */
export interface UserWithPassword extends User {
  passwordHash: string;
}

/**
 * Public user profile (safe to expose)
 */
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * Authenticated user session
 */
export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}

/**
 * JWT token payload
 */
export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a new user
 */
export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

/**
 * DTO for updating a user
 */
export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

/**
 * DTO for admin updating a user
 */
export interface AdminUpdateUserDto extends UpdateUserDto {
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
}

/**
 * DTO for user login
 */
export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * DTO for user registration
 */
export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  acceptTerms: boolean;
}

/**
 * DTO for password reset request
 */
export interface ForgotPasswordDto {
  email: string;
}

/**
 * DTO for password reset
 */
export interface ResetPasswordDto {
  token: string;
  password: string;
  confirmPassword: string;
}

/**
 * DTO for changing password
 */
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * DTO for refreshing tokens
 */
export interface RefreshTokenDto {
  refreshToken: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid UserRole
 */
export function isUserRole(value: unknown): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

/**
 * Check if value is a valid UserStatus
 */
export function isUserStatus(value: unknown): value is UserStatus {
  return Object.values(UserStatus).includes(value as UserStatus);
}

/**
 * Check if user is an admin
 */
export function isAdmin(user: User): boolean {
  return user.role === UserRole.ADMIN;
}

/**
 * Check if user is an organizer or higher
 */
export function isOrganizerOrHigher(user: User): boolean {
  return [UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role);
}

/**
 * Check if user is staff or higher
 */
export function isStaffOrHigher(user: User): boolean {
  return [UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF].includes(
    user.role
  );
}

/**
 * Check if user account is active
 */
export function isActiveUser(user: User): boolean {
  return user.status === UserStatus.ACTIVE;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get user's full name
 */
export function getUserFullName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

/**
 * Get user's initials
 */
export function getUserInitials(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

/**
 * Convert User to UserProfile
 */
export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
  };
}
