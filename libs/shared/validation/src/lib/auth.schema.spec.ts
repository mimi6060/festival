/**
 * Unit tests for auth validation schemas
 */

import {
  loginSchema,
  loginWith2FASchema,
  registerSchema,
  registerApiSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  enable2FASchema,
  verify2FASetupSchema,
  disable2FASchema,
  use2FARecoverySchema,
  logoutSchema,
  revokeSessionSchema,
  passwordSchema,
  simplePasswordSchema,
} from './auth.schema';

describe('auth.schema', () => {
  describe('passwordSchema', () => {
    it('should accept valid strong password', () => {
      const result = passwordSchema.safeParse('SecureP@ss123');
      expect(result.success).toBe(true);
    });

    it('should reject password too short', () => {
      const result = passwordSchema.safeParse('Abc1!');
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = passwordSchema.safeParse('securep@ss123');
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = passwordSchema.safeParse('SECUREP@SS123');
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = passwordSchema.safeParse('SecureP@ssword');
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const result = passwordSchema.safeParse('SecurePass123');
      expect(result.success).toBe(false);
    });

    it('should reject password exceeding max length', () => {
      const longPassword = 'A'.repeat(129) + 'a1!';
      const result = passwordSchema.safeParse(longPassword);
      expect(result.success).toBe(false);
    });
  });

  describe('simplePasswordSchema', () => {
    it('should accept any non-empty password', () => {
      const result = simplePasswordSchema.safeParse('password');
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const result = simplePasswordSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject password exceeding max length', () => {
      const longPassword = 'a'.repeat(129);
      const result = simplePasswordSchema.safeParse(longPassword);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should accept login with rememberMe', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        rememberMe: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rememberMe).toBe(true);
      }
    });

    it('should default rememberMe to false', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rememberMe).toBe(false);
      }
    });

    it('should reject invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('should normalize email to lowercase', () => {
      const result = loginSchema.safeParse({
        email: 'User@Example.COM',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });
  });

  describe('loginWith2FASchema', () => {
    it('should accept login with 2FA code', () => {
      const result = loginWith2FASchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        twoFactorCode: '123456',
      });
      expect(result.success).toBe(true);
    });

    it('should accept login without 2FA code', () => {
      const result = loginWith2FASchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid 2FA code (not 6 digits)', () => {
      const result = loginWith2FASchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        twoFactorCode: '12345',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric 2FA code', () => {
      const result = loginWith2FASchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        twoFactorCode: 'abcdef',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    const validRegistration = {
      email: 'newuser@example.com',
      password: 'SecureP@ss123',
      confirmPassword: 'SecureP@ss123',
      firstName: 'Jean',
      lastName: 'Dupont',
      acceptTerms: true as const,
    };

    it('should accept valid registration', () => {
      const result = registerSchema.safeParse(validRegistration);
      expect(result.success).toBe(true);
    });

    it('should accept registration with phone number', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        phoneNumber: '+33612345678',
      });
      expect(result.success).toBe(true);
    });

    it('should accept registration with marketing consent', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        acceptMarketing: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.acceptMarketing).toBe(true);
      }
    });

    it('should reject mismatched passwords', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        confirmPassword: 'DifferentP@ss123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject registration without accepting terms', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        acceptTerms: false,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty first name', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        firstName: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty last name', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        lastName: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject first name with invalid characters', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        firstName: 'Jean123',
      });
      expect(result.success).toBe(false);
    });

    it('should accept accented characters in name', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        firstName: 'Jean-Pierre',
        lastName: "D'Artagnan",
      });
      expect(result.success).toBe(true);
    });

    it('should reject too long first name', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        firstName: 'A'.repeat(51),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerApiSchema', () => {
    it('should accept valid API registration', () => {
      const result = registerApiSchema.safeParse({
        email: 'newuser@example.com',
        password: 'SecureP@ss123',
        firstName: 'Jean',
        lastName: 'Dupont',
      });
      expect(result.success).toBe(true);
    });

    it('should not require confirmPassword', () => {
      const result = registerApiSchema.safeParse({
        email: 'newuser@example.com',
        password: 'SecureP@ss123',
        firstName: 'Jean',
        lastName: 'Dupont',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should accept valid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should accept valid reset data', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'valid-reset-token',
        password: 'NewSecureP@ss123',
        confirmPassword: 'NewSecureP@ss123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'valid-reset-token',
        password: 'NewSecureP@ss123',
        confirmPassword: 'DifferentP@ss123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty token', () => {
      const result = resetPasswordSchema.safeParse({
        token: '',
        password: 'NewSecureP@ss123',
        confirmPassword: 'NewSecureP@ss123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject weak new password', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'valid-reset-token',
        password: 'weak',
        confirmPassword: 'weak',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should accept valid password change', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'currentPassword123',
        newPassword: 'NewSecureP@ss123',
        confirmNewPassword: 'NewSecureP@ss123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject mismatched new passwords', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'currentPassword123',
        newPassword: 'NewSecureP@ss123',
        confirmNewPassword: 'DifferentP@ss123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject same current and new password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'SecureP@ss123',
        newPassword: 'SecureP@ss123',
        confirmNewPassword: 'SecureP@ss123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('refreshTokenSchema', () => {
    it('should accept valid refresh token', () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: 'valid-refresh-token',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty refresh token', () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('verifyEmailSchema', () => {
    it('should accept valid token', () => {
      const result = verifyEmailSchema.safeParse({
        token: 'valid-verification-token',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const result = verifyEmailSchema.safeParse({
        token: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('resendVerificationSchema', () => {
    it('should accept valid email', () => {
      const result = resendVerificationSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('enable2FASchema', () => {
    it('should accept valid password', () => {
      const result = enable2FASchema.safeParse({
        password: 'currentPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const result = enable2FASchema.safeParse({
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('verify2FASetupSchema', () => {
    it('should accept valid code and secret', () => {
      const result = verify2FASetupSchema.safeParse({
        code: '123456',
        secret: 'ABCDEFGHIJKLMNOP',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid code format', () => {
      const result = verify2FASetupSchema.safeParse({
        code: '12345',
        secret: 'ABCDEFGHIJKLMNOP',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric code', () => {
      const result = verify2FASetupSchema.safeParse({
        code: 'abcdef',
        secret: 'ABCDEFGHIJKLMNOP',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('disable2FASchema', () => {
    it('should accept valid password and code', () => {
      const result = disable2FASchema.safeParse({
        password: 'currentPassword123',
        code: '123456',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('use2FARecoverySchema', () => {
    it('should accept valid recovery data', () => {
      const result = use2FARecoverySchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        recoveryCode: 'ABCD1234EFGH',
      });
      expect(result.success).toBe(true);
    });

    it('should reject short recovery code', () => {
      const result = use2FARecoverySchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        recoveryCode: 'ABC',
      });
      expect(result.success).toBe(false);
    });

    it('should reject long recovery code', () => {
      const result = use2FARecoverySchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        recoveryCode: 'A'.repeat(21),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('logoutSchema', () => {
    it('should accept logout with allDevices', () => {
      const result = logoutSchema.safeParse({
        allDevices: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allDevices).toBe(true);
      }
    });

    it('should default allDevices to false', () => {
      const result = logoutSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allDevices).toBe(false);
      }
    });
  });

  describe('revokeSessionSchema', () => {
    it('should accept valid UUID sessionId', () => {
      const result = revokeSessionSchema.safeParse({
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = revokeSessionSchema.safeParse({
        sessionId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });
  });
});
