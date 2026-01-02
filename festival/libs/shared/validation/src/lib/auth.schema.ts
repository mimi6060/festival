/**
 * Authentication Validation Schemas
 * Schemas for login, registration, password management
 */

import { z } from 'zod';
import { m } from './messages';
import { emailSchema, PATTERNS } from './common.schema';

// ============================================================================
// Password Validation
// ============================================================================

/**
 * Password strength requirements
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

/**
 * Password validation with strength requirements
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { message: m().tooShort(PASSWORD_MIN_LENGTH) })
  .max(PASSWORD_MAX_LENGTH, { message: m().tooLong(PASSWORD_MAX_LENGTH) })
  .refine((password) => /[A-Z]/.test(password), {
    message: m().passwordTooWeak,
  })
  .refine((password) => /[a-z]/.test(password), {
    message: m().passwordTooWeak,
  })
  .refine((password) => /\d/.test(password), {
    message: m().passwordTooWeak,
  })
  .refine((password) => /[!@#$%^&*(),.?":{}|<>]/.test(password), {
    message: m().passwordTooWeak,
  });

/**
 * Simple password schema (for login - no strength check)
 */
export const simplePasswordSchema = z
  .string()
  .min(1, { message: m().required })
  .max(PASSWORD_MAX_LENGTH);

// ============================================================================
// Login Schema
// ============================================================================

/**
 * Login request validation
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: simplePasswordSchema,
  rememberMe: z.boolean().optional().default(false),
});

/**
 * Login with 2FA token
 */
export const loginWith2FASchema = loginSchema.extend({
  twoFactorCode: z
    .string()
    .length(6, { message: m().tooShort(6) })
    .regex(/^\d{6}$/, { message: m().invalidType })
    .optional(),
});

// ============================================================================
// Registration Schema
// ============================================================================

/**
 * User registration validation
 */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, { message: m().required }),
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
    phoneNumber: z
      .string()
      .regex(PATTERNS.PHONE_INTERNATIONAL, { message: m().invalidPhone })
      .optional(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: m().required }),
    }),
    acceptMarketing: z.boolean().optional().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: m().passwordsMismatch,
    path: ['confirmPassword'],
  });

/**
 * Registration without password confirmation (for API)
 */
export const registerApiSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
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
  phoneNumber: z
    .string()
    .regex(PATTERNS.PHONE_INTERNATIONAL, { message: m().invalidPhone })
    .optional(),
});

// ============================================================================
// Password Reset Schemas
// ============================================================================

/**
 * Request password reset (forgot password)
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Reset password with token
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, { message: m().required }),
    password: passwordSchema,
    confirmPassword: z.string().min(1, { message: m().required }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: m().passwordsMismatch,
    path: ['confirmPassword'],
  });

/**
 * Change password (authenticated user)
 */
export const changePasswordSchema = z
  .object({
    currentPassword: simplePasswordSchema,
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, { message: m().required }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: m().passwordsMismatch,
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Le nouveau mot de passe doit etre different de l\'ancien',
    path: ['newPassword'],
  });

// ============================================================================
// Token Schemas
// ============================================================================

/**
 * Refresh token validation
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, { message: m().required }),
});

/**
 * Email verification token
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, { message: m().required }),
});

/**
 * Resend verification email
 */
export const resendVerificationSchema = z.object({
  email: emailSchema,
});

// ============================================================================
// 2FA Schemas
// ============================================================================

/**
 * Enable 2FA
 */
export const enable2FASchema = z.object({
  password: simplePasswordSchema,
});

/**
 * Verify 2FA setup
 */
export const verify2FASetupSchema = z.object({
  code: z
    .string()
    .length(6, { message: m().tooShort(6) })
    .regex(/^\d{6}$/, { message: m().invalidType }),
  secret: z.string().min(1, { message: m().required }),
});

/**
 * Disable 2FA
 */
export const disable2FASchema = z.object({
  password: simplePasswordSchema,
  code: z
    .string()
    .length(6, { message: m().tooShort(6) })
    .regex(/^\d{6}$/, { message: m().invalidType }),
});

/**
 * 2FA recovery code
 */
export const use2FARecoverySchema = z.object({
  email: emailSchema,
  password: simplePasswordSchema,
  recoveryCode: z
    .string()
    .min(8, { message: m().tooShort(8) })
    .max(20, { message: m().tooLong(20) }),
});

// ============================================================================
// Session Schemas
// ============================================================================

/**
 * Logout schema
 */
export const logoutSchema = z.object({
  allDevices: z.boolean().optional().default(false),
});

/**
 * Revoke session
 */
export const revokeSessionSchema = z.object({
  sessionId: z.string().uuid({ message: m().invalidUuid }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Login = z.infer<typeof loginSchema>;
export type LoginWith2FA = z.infer<typeof loginWith2FASchema>;
export type Register = z.infer<typeof registerSchema>;
export type RegisterApi = z.infer<typeof registerApiSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type RefreshToken = z.infer<typeof refreshTokenSchema>;
export type VerifyEmail = z.infer<typeof verifyEmailSchema>;
export type ResendVerification = z.infer<typeof resendVerificationSchema>;
export type Enable2FA = z.infer<typeof enable2FASchema>;
export type Verify2FASetup = z.infer<typeof verify2FASetupSchema>;
export type Disable2FA = z.infer<typeof disable2FASchema>;
export type Use2FARecovery = z.infer<typeof use2FARecoverySchema>;
export type Logout = z.infer<typeof logoutSchema>;
export type RevokeSession = z.infer<typeof revokeSessionSchema>;
