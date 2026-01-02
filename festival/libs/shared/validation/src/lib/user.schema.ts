/**
 * User Validation Schemas
 * Schemas for user profile management and preferences
 */

import { z } from 'zod';
import { m } from './messages';
import {
  emailSchema,
  phoneSchema,
  frenchPhoneSchema,
  urlSchema,
  uuidSchema,
  localeSchema,
  timezoneSchema,
  PATTERNS,
} from './common.schema';

// ============================================================================
// Enums
// ============================================================================

/**
 * User role enumeration
 */
export const userRoleSchema = z.enum([
  'admin',
  'organizer',
  'staff',
  'artist',
  'attendee',
]);

/**
 * User status enumeration
 */
export const userStatusSchema = z.enum([
  'active',
  'inactive',
  'suspended',
  'pending_verification',
]);

// ============================================================================
// Notification Preferences
// ============================================================================

/**
 * Notification preferences schema
 */
export const notificationPreferencesSchema = z.object({
  email: z.boolean().default(true),
  push: z.boolean().default(true),
  sms: z.boolean().default(false),
  marketing: z.boolean().default(false),
  festivalUpdates: z.boolean().default(true),
  ticketReminders: z.boolean().default(true),
  paymentAlerts: z.boolean().default(true),
});

/**
 * Update notification preferences
 */
export const updateNotificationPreferencesSchema = notificationPreferencesSchema.partial();

// ============================================================================
// User Preferences
// ============================================================================

/**
 * User preferences schema
 */
export const userPreferencesSchema = z.object({
  language: localeSchema,
  timezone: timezoneSchema,
  currency: z.string().length(3).toUpperCase().default('EUR'),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).default('DD/MM/YYYY'),
  notifications: notificationPreferencesSchema,
});

/**
 * Update user preferences
 */
export const updateUserPreferencesSchema = z.object({
  language: localeSchema.optional(),
  timezone: timezoneSchema.optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  notifications: updateNotificationPreferencesSchema.optional(),
});

// ============================================================================
// Profile Schemas
// ============================================================================

/**
 * Update user profile schema
 */
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, { message: m().required })
    .max(50, { message: m().tooLong(50) })
    .regex(PATTERNS.NAME, { message: m().invalidType })
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(1, { message: m().required })
    .max(50, { message: m().tooLong(50) })
    .regex(PATTERNS.NAME, { message: m().invalidType })
    .trim()
    .optional(),
  phoneNumber: phoneSchema,
  avatarUrl: urlSchema.optional().or(z.literal('')),
  bio: z.string().max(500, { message: m().tooLong(500) }).optional(),
  birthDate: z
    .string()
    .regex(PATTERNS.DATE_ISO, { message: m().invalidDate })
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        const parsed = new Date(date);
        const now = new Date();
        const minAge = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate());
        return parsed <= minAge;
      },
      { message: 'Vous devez avoir au moins 13 ans' }
    ),
  preferences: updateUserPreferencesSchema.optional(),
});

/**
 * Update French phone specifically
 */
export const updateFrenchPhoneSchema = z.object({
  phoneNumber: frenchPhoneSchema,
});

/**
 * Update email address (requires verification)
 */
export const updateEmailSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: m().required }),
});

/**
 * Verify new email address
 */
export const verifyNewEmailSchema = z.object({
  token: z.string().min(1, { message: m().required }),
});

// ============================================================================
// Avatar Schema
// ============================================================================

/**
 * Avatar upload validation
 */
export const avatarUploadSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'], {
    errorMap: () => ({ message: 'Format d\'image non supporte (JPEG, PNG, WebP, GIF uniquement)' }),
  }),
  size: z.number().max(5 * 1024 * 1024, {
    message: 'Taille maximale du fichier: 5 Mo',
  }),
});

// ============================================================================
// User Search & Filters
// ============================================================================

/**
 * User search filters
 */
export const userFiltersSchema = z.object({
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  search: z.string().max(100).optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  festivalId: uuidSchema.optional(),
});

/**
 * User listing query
 */
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'email', 'firstName', 'lastName', 'role']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  search: z.string().max(100).optional(),
});

// ============================================================================
// Admin User Management
// ============================================================================

/**
 * Admin create user schema
 */
export const adminCreateUserSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, { message: m().tooShort(8) })
    .max(128, { message: m().tooLong(128) }),
  firstName: z
    .string()
    .min(1, { message: m().required })
    .max(50, { message: m().tooLong(50) })
    .regex(PATTERNS.NAME, { message: m().invalidType })
    .trim(),
  lastName: z
    .string()
    .min(1, { message: m().required })
    .max(50, { message: m().tooLong(50) })
    .regex(PATTERNS.NAME, { message: m().invalidType })
    .trim(),
  role: userRoleSchema.default('attendee'),
  status: userStatusSchema.default('active'),
  phoneNumber: phoneSchema,
  sendWelcomeEmail: z.boolean().default(true),
});

/**
 * Admin update user schema
 */
export const adminUpdateUserSchema = z.object({
  email: emailSchema.optional(),
  firstName: z
    .string()
    .min(1, { message: m().required })
    .max(50, { message: m().tooLong(50) })
    .regex(PATTERNS.NAME, { message: m().invalidType })
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(1, { message: m().required })
    .max(50, { message: m().tooLong(50) })
    .regex(PATTERNS.NAME, { message: m().invalidType })
    .trim()
    .optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  phoneNumber: phoneSchema,
});

/**
 * Ban/Suspend user schema
 */
export const suspendUserSchema = z.object({
  reason: z.string().min(10, { message: m().tooShort(10) }).max(500, { message: m().tooLong(500) }),
  duration: z
    .number()
    .int()
    .min(1)
    .max(365)
    .optional()
    .describe('Suspension duration in days (null for permanent)'),
  notifyUser: z.boolean().default(true),
});

/**
 * Delete user account schema
 */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, { message: m().required }),
  confirmation: z.literal('DELETE', {
    errorMap: () => ({ message: 'Tapez DELETE pour confirmer' }),
  }),
  reason: z.string().max(500).optional(),
});

// ============================================================================
// User Invitation
// ============================================================================

/**
 * Invite user schema
 */
export const inviteUserSchema = z.object({
  email: emailSchema,
  role: userRoleSchema,
  festivalId: uuidSchema.optional(),
  message: z.string().max(500).optional(),
  expiresIn: z.number().int().min(1).max(30).default(7).describe('Invitation expiry in days'),
});

/**
 * Accept invitation schema
 */
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, { message: m().required }),
  password: z
    .string()
    .min(8, { message: m().tooShort(8) })
    .max(128, { message: m().tooLong(128) }),
  firstName: z
    .string()
    .min(1, { message: m().required })
    .max(50, { message: m().tooLong(50) })
    .regex(PATTERNS.NAME, { message: m().invalidType })
    .trim(),
  lastName: z
    .string()
    .min(1, { message: m().required })
    .max(50, { message: m().tooLong(50) })
    .regex(PATTERNS.NAME, { message: m().invalidType })
    .trim(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type UpdateNotificationPreferences = z.infer<typeof updateNotificationPreferencesSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type UpdateEmail = z.infer<typeof updateEmailSchema>;
export type AvatarUpload = z.infer<typeof avatarUploadSchema>;
export type UserFilters = z.infer<typeof userFiltersSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type AdminCreateUser = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUser = z.infer<typeof adminUpdateUserSchema>;
export type SuspendUser = z.infer<typeof suspendUserSchema>;
export type DeleteAccount = z.infer<typeof deleteAccountSchema>;
export type InviteUser = z.infer<typeof inviteUserSchema>;
export type AcceptInvitation = z.infer<typeof acceptInvitationSchema>;
