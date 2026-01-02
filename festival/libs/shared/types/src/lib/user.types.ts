// User-related types

import { BaseEntity } from './common.types';

export enum UserRole {
  ADMIN = 'admin',
  ORGANIZER = 'organizer',
  STAFF = 'staff',
  ARTIST = 'artist',
  ATTENDEE = 'attendee',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  phoneNumber?: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  phoneNumber?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  preferences?: Partial<UserPreferences>;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'password'>;
  expiresIn: number;
}
