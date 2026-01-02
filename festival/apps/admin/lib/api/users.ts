import { get, post, patch, del } from '../api-client';
import type { PaginatedResponse } from './festivals';

// Types
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

export type UserRole = 'USER' | 'STAFF' | 'CASHIER' | 'SECURITY' | 'ORGANIZER' | 'ADMIN' | 'SUPER_ADMIN';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'PENDING_VERIFICATION';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  emailVerified?: boolean;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  usersByRole: Record<UserRole, number>;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// API Functions

/**
 * Get list of users with optional filtering and pagination
 */
export async function getUsers(params?: UserQueryParams): Promise<PaginatedResponse<User>> {
  const queryParams: Record<string, string> = {};

  if (params?.page) queryParams.page = params.page.toString();
  if (params?.limit) queryParams.limit = params.limit.toString();
  if (params?.role) queryParams.role = params.role;
  if (params?.status) queryParams.status = params.status;
  if (params?.search) queryParams.search = params.search;
  if (params?.sortBy) queryParams.sortBy = params.sortBy;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
  if (params?.emailVerified !== undefined) queryParams.emailVerified = params.emailVerified.toString();

  return get<PaginatedResponse<User>>('/users', queryParams);
}

/**
 * Get a single user by ID
 */
export async function getUser(id: string): Promise<User> {
  return get<User>(`/users/${id}`);
}

/**
 * Create a new user
 */
export async function createUser(data: CreateUserData): Promise<User> {
  return post<User>('/users', data);
}

/**
 * Update an existing user
 */
export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  return patch<User>(`/users/${id}`, data);
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<void> {
  return del<void>(`/users/${id}`);
}

/**
 * Ban a user
 */
export async function banUser(id: string, reason?: string): Promise<User> {
  return post<User>(`/users/${id}/ban`, { reason });
}

/**
 * Unban a user
 */
export async function unbanUser(id: string): Promise<User> {
  return post<User>(`/users/${id}/unban`);
}

/**
 * Change user role
 */
export async function changeUserRole(id: string, role: UserRole): Promise<User> {
  return patch<User>(`/users/${id}/role`, { role });
}

/**
 * Reset user password (admin action)
 */
export async function resetUserPassword(id: string): Promise<{ temporaryPassword: string }> {
  return post<{ temporaryPassword: string }>(`/users/${id}/reset-password`);
}

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(id: string): Promise<void> {
  return post<void>(`/users/${id}/send-verification`);
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<UserStats> {
  return get<UserStats>('/users/stats');
}

/**
 * Get user activity log
 */
export async function getUserActivity(id: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<UserActivity>> {
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = params.page.toString();
  if (params?.limit) queryParams.limit = params.limit.toString();

  return get<PaginatedResponse<UserActivity>>(`/users/${id}/activity`, queryParams);
}

/**
 * Export users to CSV
 */
export async function exportUsers(params?: UserQueryParams): Promise<Blob> {
  const queryParams: Record<string, string> = {};

  if (params?.role) queryParams.role = params.role;
  if (params?.status) queryParams.status = params.status;
  if (params?.search) queryParams.search = params.search;

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api'}/users/export?${queryString}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('admin_access_token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to export users');
  }

  return response.blob();
}
