/**
 * Unit tests for user validation schemas
 */

import {
  userRoleSchema,
  userStatusSchema,
  notificationPreferencesSchema,
  updateNotificationPreferencesSchema,
  userPreferencesSchema,
  updateUserPreferencesSchema,
  updateProfileSchema,
  updateFrenchPhoneSchema,
  updateEmailSchema,
  verifyNewEmailSchema,
  avatarUploadSchema,
  userFiltersSchema,
  userListQuerySchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  suspendUserSchema,
  deleteAccountSchema,
  inviteUserSchema,
  acceptInvitationSchema,
} from './user.schema';

describe('user.schema', () => {
  // ============================================================================
  // Enums
  // ============================================================================

  describe('userRoleSchema', () => {
    it('should accept all valid roles', () => {
      const roles = ['admin', 'organizer', 'staff', 'artist', 'attendee'];
      roles.forEach((role) => {
        const result = userRoleSchema.safeParse(role);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid role', () => {
      const result = userRoleSchema.safeParse('superadmin');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = userRoleSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('userStatusSchema', () => {
    it('should accept all valid statuses', () => {
      const statuses = ['active', 'inactive', 'suspended', 'pending_verification'];
      statuses.forEach((status) => {
        const result = userStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const result = userStatusSchema.safeParse('banned');
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Notification Preferences Schema
  // ============================================================================

  describe('notificationPreferencesSchema', () => {
    it('should accept valid preferences', () => {
      const result = notificationPreferencesSchema.safeParse({
        email: true,
        push: true,
        sms: false,
        marketing: false,
        festivalUpdates: true,
        ticketReminders: true,
        paymentAlerts: true,
      });
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const result = notificationPreferencesSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe(true);
        expect(result.data.push).toBe(true);
        expect(result.data.sms).toBe(false);
        expect(result.data.marketing).toBe(false);
        expect(result.data.festivalUpdates).toBe(true);
        expect(result.data.ticketReminders).toBe(true);
        expect(result.data.paymentAlerts).toBe(true);
      }
    });

    it('should override defaults with provided values', () => {
      const result = notificationPreferencesSchema.safeParse({
        email: false,
        marketing: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe(false);
        expect(result.data.marketing).toBe(true);
      }
    });
  });

  describe('updateNotificationPreferencesSchema', () => {
    it('should accept partial preferences', () => {
      const result = updateNotificationPreferencesSchema.safeParse({
        email: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateNotificationPreferencesSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // User Preferences Schema
  // ============================================================================

  describe('userPreferencesSchema', () => {
    it('should accept valid preferences', () => {
      const result = userPreferencesSchema.safeParse({
        language: 'fr',
        timezone: 'Europe/Paris',
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        notifications: {
          email: true,
          push: true,
          sms: false,
          marketing: false,
          festivalUpdates: true,
          ticketReminders: true,
          paymentAlerts: true,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const result = userPreferencesSchema.safeParse({
        language: 'fr',
        notifications: {},
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timezone).toBe('Europe/Paris');
        expect(result.data.currency).toBe('EUR');
        expect(result.data.dateFormat).toBe('DD/MM/YYYY');
      }
    });

    it('should transform currency to uppercase', () => {
      const result = userPreferencesSchema.safeParse({
        language: 'en',
        currency: 'usd',
        notifications: {},
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('USD');
      }
    });

    it('should accept all date formats', () => {
      const formats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
      formats.forEach((dateFormat) => {
        const result = userPreferencesSchema.safeParse({
          language: 'fr',
          dateFormat,
          notifications: {},
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid date format', () => {
      const result = userPreferencesSchema.safeParse({
        language: 'fr',
        dateFormat: 'invalid',
        notifications: {},
      });
      expect(result.success).toBe(false);
    });

    it('should validate timezone', () => {
      const result = userPreferencesSchema.safeParse({
        language: 'fr',
        timezone: 'Invalid/Timezone',
        notifications: {},
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid IANA timezone', () => {
      const result = userPreferencesSchema.safeParse({
        language: 'fr',
        timezone: 'America/New_York',
        notifications: {},
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateUserPreferencesSchema', () => {
    it('should accept empty object', () => {
      const result = updateUserPreferencesSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept partial update', () => {
      const result = updateUserPreferencesSchema.safeParse({
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Update Profile Schema
  // ============================================================================

  describe('updateProfileSchema', () => {
    it('should accept valid profile update', () => {
      const result = updateProfileSchema.safeParse({
        firstName: 'Jean',
        lastName: 'Dupont',
        phoneNumber: '+33612345678',
        bio: 'Festival enthusiast',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object (all optional)', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should trim first and last name', () => {
      const result = updateProfileSchema.safeParse({
        firstName: '  Jean  ',
        lastName: '  Dupont  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Jean');
        expect(result.data.lastName).toBe('Dupont');
      }
    });

    it('should accept accented characters in names', () => {
      const result = updateProfileSchema.safeParse({
        firstName: 'Jean-Pierre',
        lastName: "D'Artagnan",
      });
      expect(result.success).toBe(true);
    });

    it('should reject names with numbers', () => {
      const result = updateProfileSchema.safeParse({
        firstName: 'Jean123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject names with special characters', () => {
      const result = updateProfileSchema.safeParse({
        firstName: 'Jean@Pierre',
      });
      expect(result.success).toBe(false);
    });

    it('should reject firstName too long (>50 chars)', () => {
      const result = updateProfileSchema.safeParse({
        firstName: 'A'.repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty firstName', () => {
      const result = updateProfileSchema.safeParse({
        firstName: '',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid avatarUrl', () => {
      const result = updateProfileSchema.safeParse({
        avatarUrl: 'https://example.com/avatar.png',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty string for avatarUrl (to clear)', () => {
      const result = updateProfileSchema.safeParse({
        avatarUrl: '',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid avatarUrl', () => {
      const result = updateProfileSchema.safeParse({
        avatarUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should reject bio too long (>500 chars)', () => {
      const result = updateProfileSchema.safeParse({
        bio: 'A'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid birthDate', () => {
      const result = updateProfileSchema.safeParse({
        birthDate: '1990-05-15',
      });
      expect(result.success).toBe(true);
    });

    it('should reject user under 13 years old', () => {
      const today = new Date();
      const underageDate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
      const result = updateProfileSchema.safeParse({
        birthDate: underageDate.toISOString().split('T')[0],
      });
      expect(result.success).toBe(false);
    });

    it('should accept user exactly 13 years old', () => {
      const today = new Date();
      const thirteenYearsAgo = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
      const result = updateProfileSchema.safeParse({
        birthDate: thirteenYearsAgo.toISOString().split('T')[0],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid birthDate format', () => {
      const result = updateProfileSchema.safeParse({
        birthDate: '15-05-1990',
      });
      expect(result.success).toBe(false);
    });

    it('should accept preferences in profile update', () => {
      const result = updateProfileSchema.safeParse({
        preferences: {
          language: 'en',
          dateFormat: 'MM/DD/YYYY',
        },
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // French Phone Schema
  // ============================================================================

  describe('updateFrenchPhoneSchema', () => {
    it('should accept valid French mobile number', () => {
      const result = updateFrenchPhoneSchema.safeParse({
        phoneNumber: '0612345678',
      });
      expect(result.success).toBe(true);
    });

    it('should accept French number with international prefix', () => {
      const result = updateFrenchPhoneSchema.safeParse({
        phoneNumber: '+33612345678',
      });
      expect(result.success).toBe(true);
    });

    it('should accept French number with spaces', () => {
      const result = updateFrenchPhoneSchema.safeParse({
        phoneNumber: '06 12 34 56 78',
      });
      expect(result.success).toBe(true);
    });

    it('should accept French number with dots', () => {
      const result = updateFrenchPhoneSchema.safeParse({
        phoneNumber: '06.12.34.56.78',
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-French number format', () => {
      const result = updateFrenchPhoneSchema.safeParse({
        phoneNumber: '+1234567890',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Update Email Schema
  // ============================================================================

  describe('updateEmailSchema', () => {
    it('should accept valid email update', () => {
      const result = updateEmailSchema.safeParse({
        email: 'newemail@example.com',
        password: 'currentPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should normalize email to lowercase', () => {
      const result = updateEmailSchema.safeParse({
        email: 'NewEmail@EXAMPLE.COM',
        password: 'currentPassword123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('newemail@example.com');
      }
    });

    it('should reject invalid email', () => {
      const result = updateEmailSchema.safeParse({
        email: 'invalid-email',
        password: 'currentPassword123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = updateEmailSchema.safeParse({
        email: 'newemail@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Verify New Email Schema
  // ============================================================================

  describe('verifyNewEmailSchema', () => {
    it('should accept valid token', () => {
      const result = verifyNewEmailSchema.safeParse({
        token: 'valid-verification-token',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const result = verifyNewEmailSchema.safeParse({
        token: '',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Avatar Upload Schema
  // ============================================================================

  describe('avatarUploadSchema', () => {
    it('should accept valid JPEG upload', () => {
      const result = avatarUploadSchema.safeParse({
        contentType: 'image/jpeg',
        size: 1024 * 1024,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid PNG upload', () => {
      const result = avatarUploadSchema.safeParse({
        contentType: 'image/png',
        size: 1024 * 1024,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid WebP upload', () => {
      const result = avatarUploadSchema.safeParse({
        contentType: 'image/webp',
        size: 1024 * 1024,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid GIF upload', () => {
      const result = avatarUploadSchema.safeParse({
        contentType: 'image/gif',
        size: 1024 * 1024,
      });
      expect(result.success).toBe(true);
    });

    it('should reject unsupported content type', () => {
      const result = avatarUploadSchema.safeParse({
        contentType: 'image/svg+xml',
        size: 1024,
      });
      expect(result.success).toBe(false);
    });

    it('should reject file too large (>5MB)', () => {
      const result = avatarUploadSchema.safeParse({
        contentType: 'image/jpeg',
        size: 6 * 1024 * 1024,
      });
      expect(result.success).toBe(false);
    });

    it('should accept file exactly 5MB', () => {
      const result = avatarUploadSchema.safeParse({
        contentType: 'image/jpeg',
        size: 5 * 1024 * 1024,
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // User Filters Schema
  // ============================================================================

  describe('userFiltersSchema', () => {
    it('should accept empty filters', () => {
      const result = userFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept all filter options', () => {
      const result = userFiltersSchema.safeParse({
        role: 'attendee',
        status: 'active',
        search: 'dupont',
        createdAfter: new Date('2025-01-01'),
        createdBefore: new Date('2025-12-31'),
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should coerce date strings to Date objects', () => {
      const result = userFiltersSchema.safeParse({
        createdAfter: '2025-01-01',
        createdBefore: '2025-12-31',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAfter).toBeInstanceOf(Date);
        expect(result.data.createdBefore).toBeInstanceOf(Date);
      }
    });

    it('should reject invalid festivalId', () => {
      const result = userFiltersSchema.safeParse({
        festivalId: 'not-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // User List Query Schema
  // ============================================================================

  describe('userListQuerySchema', () => {
    it('should accept empty query with defaults', () => {
      const result = userListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe('createdAt');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should accept all query options', () => {
      const result = userListQuerySchema.safeParse({
        page: 2,
        limit: 50,
        sortBy: 'email',
        sortOrder: 'asc',
        role: 'organizer',
        status: 'active',
        search: 'jean',
      });
      expect(result.success).toBe(true);
    });

    it('should coerce page and limit from strings', () => {
      const result = userListQuerySchema.safeParse({
        page: '3',
        limit: '25',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(25);
      }
    });

    it('should reject page less than 1', () => {
      const result = userListQuerySchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const result = userListQuerySchema.safeParse({ limit: 150 });
      expect(result.success).toBe(false);
    });

    it('should accept all valid sortBy options', () => {
      const sortOptions = ['createdAt', 'email', 'firstName', 'lastName', 'role'];
      sortOptions.forEach((sortBy) => {
        const result = userListQuerySchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid sortBy', () => {
      const result = userListQuerySchema.safeParse({ sortBy: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject search too long (>100 chars)', () => {
      const result = userListQuerySchema.safeParse({ search: 'A'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Admin Create User Schema
  // ============================================================================

  describe('adminCreateUserSchema', () => {
    const validUser = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'Jean',
      lastName: 'Dupont',
    };

    it('should accept valid user creation', () => {
      const result = adminCreateUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const result = adminCreateUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('attendee');
        expect(result.data.status).toBe('active');
        expect(result.data.sendWelcomeEmail).toBe(true);
      }
    });

    it('should accept all optional fields', () => {
      const result = adminCreateUserSchema.safeParse({
        ...validUser,
        role: 'organizer',
        status: 'pending_verification',
        phoneNumber: '+33612345678',
        sendWelcomeEmail: false,
      });
      expect(result.success).toBe(true);
    });

    it('should normalize email to lowercase', () => {
      const result = adminCreateUserSchema.safeParse({
        ...validUser,
        email: 'NewUser@EXAMPLE.COM',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('newuser@example.com');
      }
    });

    it('should trim names', () => {
      const result = adminCreateUserSchema.safeParse({
        ...validUser,
        firstName: '  Jean  ',
        lastName: '  Dupont  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Jean');
        expect(result.data.lastName).toBe('Dupont');
      }
    });

    it('should reject password too short (<8 chars)', () => {
      const result = adminCreateUserSchema.safeParse({
        ...validUser,
        password: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password too long (>128 chars)', () => {
      const result = adminCreateUserSchema.safeParse({
        ...validUser,
        password: 'A'.repeat(129),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = adminCreateUserSchema.safeParse({
        ...validUser,
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid name characters', () => {
      const result = adminCreateUserSchema.safeParse({
        ...validUser,
        firstName: 'Jean123',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Admin Update User Schema
  // ============================================================================

  describe('adminUpdateUserSchema', () => {
    it('should accept empty object', () => {
      const result = adminUpdateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept partial update', () => {
      const result = adminUpdateUserSchema.safeParse({
        role: 'staff',
        status: 'suspended',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all update fields', () => {
      const result = adminUpdateUserSchema.safeParse({
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        role: 'organizer',
        status: 'active',
        phoneNumber: '+33698765432',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = adminUpdateUserSchema.safeParse({
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const result = adminUpdateUserSchema.safeParse({
        role: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Suspend User Schema
  // ============================================================================

  describe('suspendUserSchema', () => {
    it('should accept valid suspension', () => {
      const result = suspendUserSchema.safeParse({
        reason: 'Violation of terms of service',
      });
      expect(result.success).toBe(true);
    });

    it('should default notifyUser to true', () => {
      const result = suspendUserSchema.safeParse({
        reason: 'Violation of terms of service',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifyUser).toBe(true);
      }
    });

    it('should accept suspension with duration', () => {
      const result = suspendUserSchema.safeParse({
        reason: 'Temporary suspension for review',
        duration: 7,
        notifyUser: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject reason too short (<10 chars)', () => {
      const result = suspendUserSchema.safeParse({
        reason: 'Short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject reason too long (>500 chars)', () => {
      const result = suspendUserSchema.safeParse({
        reason: 'A'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should reject duration less than 1 day', () => {
      const result = suspendUserSchema.safeParse({
        reason: 'Valid reason for suspension',
        duration: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject duration greater than 365 days', () => {
      const result = suspendUserSchema.safeParse({
        reason: 'Valid reason for suspension',
        duration: 400,
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Delete Account Schema
  // ============================================================================

  describe('deleteAccountSchema', () => {
    it('should accept valid delete request', () => {
      const result = deleteAccountSchema.safeParse({
        password: 'currentPassword123',
        confirmation: 'DELETE' as const,
      });
      expect(result.success).toBe(true);
    });

    it('should accept delete request with reason', () => {
      const result = deleteAccountSchema.safeParse({
        password: 'currentPassword123',
        confirmation: 'DELETE' as const,
        reason: 'No longer attending festivals',
      });
      expect(result.success).toBe(true);
    });

    it('should reject wrong confirmation text', () => {
      const result = deleteAccountSchema.safeParse({
        password: 'currentPassword123',
        confirmation: 'delete',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = deleteAccountSchema.safeParse({
        password: '',
        confirmation: 'DELETE' as const,
      });
      expect(result.success).toBe(false);
    });

    it('should reject reason too long (>500 chars)', () => {
      const result = deleteAccountSchema.safeParse({
        password: 'currentPassword123',
        confirmation: 'DELETE' as const,
        reason: 'A'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Invite User Schema
  // ============================================================================

  describe('inviteUserSchema', () => {
    const validInvite = {
      email: 'newstaff@example.com',
      role: 'staff',
    };

    it('should accept valid invitation', () => {
      const result = inviteUserSchema.safeParse(validInvite);
      expect(result.success).toBe(true);
    });

    it('should default expiresIn to 7 days', () => {
      const result = inviteUserSchema.safeParse(validInvite);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expiresIn).toBe(7);
      }
    });

    it('should accept invitation with all options', () => {
      const result = inviteUserSchema.safeParse({
        ...validInvite,
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        message: 'Welcome to the team!',
        expiresIn: 14,
      });
      expect(result.success).toBe(true);
    });

    it('should normalize email to lowercase', () => {
      const result = inviteUserSchema.safeParse({
        ...validInvite,
        email: 'NewStaff@EXAMPLE.COM',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('newstaff@example.com');
      }
    });

    it('should reject expiresIn less than 1', () => {
      const result = inviteUserSchema.safeParse({
        ...validInvite,
        expiresIn: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject expiresIn greater than 30', () => {
      const result = inviteUserSchema.safeParse({
        ...validInvite,
        expiresIn: 60,
      });
      expect(result.success).toBe(false);
    });

    it('should reject message too long (>500 chars)', () => {
      const result = inviteUserSchema.safeParse({
        ...validInvite,
        message: 'A'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Accept Invitation Schema
  // ============================================================================

  describe('acceptInvitationSchema', () => {
    const validAccept = {
      token: 'valid-invitation-token',
      password: 'NewSecureP@ss123',
      firstName: 'Jean',
      lastName: 'Dupont',
    };

    it('should accept valid invitation acceptance', () => {
      const result = acceptInvitationSchema.safeParse(validAccept);
      expect(result.success).toBe(true);
    });

    it('should trim names', () => {
      const result = acceptInvitationSchema.safeParse({
        ...validAccept,
        firstName: '  Jean  ',
        lastName: '  Dupont  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Jean');
        expect(result.data.lastName).toBe('Dupont');
      }
    });

    it('should reject empty token', () => {
      const result = acceptInvitationSchema.safeParse({
        ...validAccept,
        token: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password too short (<8 chars)', () => {
      const result = acceptInvitationSchema.safeParse({
        ...validAccept,
        password: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty firstName', () => {
      const result = acceptInvitationSchema.safeParse({
        ...validAccept,
        firstName: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject names with invalid characters', () => {
      const result = acceptInvitationSchema.safeParse({
        ...validAccept,
        firstName: 'Jean123',
      });
      expect(result.success).toBe(false);
    });

    it('should accept accented names', () => {
      const result = acceptInvitationSchema.safeParse({
        ...validAccept,
        firstName: 'Jean-Pierre',
        lastName: "O'Connor",
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should trim whitespace from firstName', () => {
      const result = updateProfileSchema.safeParse({
        firstName: '   Jean   ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Jean');
      }
    });

    it('should handle unicode in bio', () => {
      const result = updateProfileSchema.safeParse({
        bio: 'Festival lover! Music is life.',
      });
      expect(result.success).toBe(true);
    });

    it('should handle special French characters in names', () => {
      const result = adminCreateUserSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        firstName: 'Jean-Luc',
        lastName: "D'Alembert",
      });
      expect(result.success).toBe(true);
    });

    it('should handle very long email within limit', () => {
      const longLocalPart = 'a'.repeat(64);
      const result = adminCreateUserSchema.safeParse({
        email: `${longLocalPart}@example.com`,
        password: 'password123',
        firstName: 'Jean',
        lastName: 'Dupont',
      });
      expect(result.success).toBe(true);
    });
  });
});
