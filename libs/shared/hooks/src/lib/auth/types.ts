/**
 * Auth Hooks Types
 * Type definitions for authentication and authorization hooks
 */

import { UserRole, UserStatus, User } from '@festival/shared/types';

/**
 * Auth state
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Register data
 */
export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

/**
 * Auth response from API
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Update password (logged in)
 */
export interface UpdatePassword {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * RBAC Permission
 */
export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  scope?: 'own' | 'festival' | 'all';
}

/**
 * Role permissions mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    { resource: '*', action: 'manage', scope: 'all' },
  ],
  [UserRole.ORGANIZER]: [
    { resource: 'festival', action: 'manage', scope: 'own' },
    { resource: 'ticket', action: 'manage', scope: 'festival' },
    { resource: 'cashless', action: 'manage', scope: 'festival' },
    { resource: 'program', action: 'manage', scope: 'festival' },
    { resource: 'staff', action: 'manage', scope: 'festival' },
    { resource: 'user', action: 'read', scope: 'festival' },
    { resource: 'analytics', action: 'read', scope: 'festival' },
  ],
  [UserRole.STAFF]: [
    { resource: 'ticket', action: 'read', scope: 'festival' },
    { resource: 'ticket', action: 'update', scope: 'festival' },
    { resource: 'cashless', action: 'read', scope: 'festival' },
    { resource: 'cashless', action: 'create', scope: 'festival' },
    { resource: 'program', action: 'read', scope: 'festival' },
  ],
  [UserRole.ARTIST]: [
    { resource: 'program', action: 'read', scope: 'own' },
    { resource: 'profile', action: 'manage', scope: 'own' },
  ],
  [UserRole.ATTENDEE]: [
    { resource: 'ticket', action: 'read', scope: 'own' },
    { resource: 'cashless', action: 'read', scope: 'own' },
    { resource: 'cashless', action: 'create', scope: 'own' },
    { resource: 'program', action: 'read', scope: 'all' },
    { resource: 'profile', action: 'manage', scope: 'own' },
  ],
};

/**
 * Auth hook options
 */
export interface UseAuthOptions {
  redirectOnLogin?: string;
  redirectOnLogout?: string;
  persistSession?: boolean;
}

/**
 * Require auth options
 */
export interface UseRequireAuthOptions {
  redirectTo?: string;
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: Permission;
}
