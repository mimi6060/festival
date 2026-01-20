/**
 * Auth DTO Validation Tests
 *
 * Tests for DTO validation including:
 * - ChangePasswordDto with confirmPassword matching
 * - Password strength requirements
 */

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ChangePasswordDto, RegisterDto, ResetPasswordDto } from './auth.dto';

describe('Auth DTOs', () => {
  // ==========================================================================
  // ChangePasswordDto Tests
  // ==========================================================================

  describe('ChangePasswordDto', () => {
    it('should pass validation with valid data', async () => {
      // Arrange
      const dto = plainToClass(ChangePasswordDto, {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
        confirmPassword: 'NewPassword456!',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should fail validation when confirmPassword does not match newPassword', async () => {
      // Arrange
      const dto = plainToClass(ChangePasswordDto, {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
        confirmPassword: 'DifferentPassword789!',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const confirmPasswordError = errors.find((e) => e.property === 'confirmPassword');
      expect(confirmPasswordError).toBeDefined();
      expect(confirmPasswordError?.constraints).toHaveProperty('matchPassword');
    });

    it('should fail validation when currentPassword is empty', async () => {
      // Arrange
      const dto = plainToClass(ChangePasswordDto, {
        currentPassword: '',
        newPassword: 'NewPassword456!',
        confirmPassword: 'NewPassword456!',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const currentPasswordError = errors.find((e) => e.property === 'currentPassword');
      expect(currentPasswordError).toBeDefined();
    });

    it('should fail validation when newPassword is too short', async () => {
      // Arrange
      const dto = plainToClass(ChangePasswordDto, {
        currentPassword: 'OldPassword123!',
        newPassword: 'Short1!',
        confirmPassword: 'Short1!',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const newPasswordError = errors.find((e) => e.property === 'newPassword');
      expect(newPasswordError).toBeDefined();
      expect(newPasswordError?.constraints).toHaveProperty('minLength');
    });

    it('should fail validation when newPassword lacks uppercase letter', async () => {
      // Arrange
      const dto = plainToClass(ChangePasswordDto, {
        currentPassword: 'OldPassword123!',
        newPassword: 'newpassword123!',
        confirmPassword: 'newpassword123!',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const newPasswordError = errors.find((e) => e.property === 'newPassword');
      expect(newPasswordError).toBeDefined();
      expect(newPasswordError?.constraints).toHaveProperty('matches');
    });

    it('should fail validation when newPassword lacks lowercase letter', async () => {
      // Arrange
      const dto = plainToClass(ChangePasswordDto, {
        currentPassword: 'OldPassword123!',
        newPassword: 'NEWPASSWORD123!',
        confirmPassword: 'NEWPASSWORD123!',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const newPasswordError = errors.find((e) => e.property === 'newPassword');
      expect(newPasswordError).toBeDefined();
      expect(newPasswordError?.constraints).toHaveProperty('matches');
    });

    it('should fail validation when newPassword lacks number', async () => {
      // Arrange
      const dto = plainToClass(ChangePasswordDto, {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPasswordNoNum!',
        confirmPassword: 'NewPasswordNoNum!',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const newPasswordError = errors.find((e) => e.property === 'newPassword');
      expect(newPasswordError).toBeDefined();
      expect(newPasswordError?.constraints).toHaveProperty('matches');
    });

    it('should fail validation when confirmPassword is empty', async () => {
      // Arrange
      const dto = plainToClass(ChangePasswordDto, {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
        confirmPassword: '',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const confirmPasswordError = errors.find((e) => e.property === 'confirmPassword');
      expect(confirmPasswordError).toBeDefined();
    });

    it('should fail validation with multiple errors when multiple fields are invalid', async () => {
      // Arrange
      const dto = plainToClass(ChangePasswordDto, {
        currentPassword: '',
        newPassword: 'short',
        confirmPassword: 'different',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ==========================================================================
  // RegisterDto Tests (password strength)
  // ==========================================================================

  describe('RegisterDto password strength', () => {
    it('should pass validation with strong password', async () => {
      // Arrange
      const dto = plainToClass(RegisterDto, {
        email: 'test@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should fail when password lacks uppercase', async () => {
      // Arrange
      const dto = plainToClass(RegisterDto, {
        email: 'test@example.com',
        password: 'weakpassword123',
        firstName: 'John',
        lastName: 'Doe',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
    });

    it('should fail when password lacks lowercase', async () => {
      // Arrange
      const dto = plainToClass(RegisterDto, {
        email: 'test@example.com',
        password: 'WEAKPASSWORD123',
        firstName: 'John',
        lastName: 'Doe',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
    });

    it('should fail when password lacks number', async () => {
      // Arrange
      const dto = plainToClass(RegisterDto, {
        email: 'test@example.com',
        password: 'WeakPassword!',
        firstName: 'John',
        lastName: 'Doe',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
    });

    it('should fail when password is too short', async () => {
      // Arrange
      const dto = plainToClass(RegisterDto, {
        email: 'test@example.com',
        password: 'Pass1!',
        firstName: 'John',
        lastName: 'Doe',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints).toHaveProperty('minLength');
    });
  });

  // ==========================================================================
  // ResetPasswordDto Tests (password strength)
  // ==========================================================================

  describe('ResetPasswordDto password strength', () => {
    it('should pass validation with valid data', async () => {
      // Arrange
      const dto = plainToClass(ResetPasswordDto, {
        token: 'valid-reset-token',
        newPassword: 'NewStrongPass123!',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should fail when newPassword is weak', async () => {
      // Arrange
      const dto = plainToClass(ResetPasswordDto, {
        token: 'valid-reset-token',
        newPassword: 'weak',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const passwordError = errors.find((e) => e.property === 'newPassword');
      expect(passwordError).toBeDefined();
    });

    it('should fail when token is empty', async () => {
      // Arrange
      const dto = plainToClass(ResetPasswordDto, {
        token: '',
        newPassword: 'NewStrongPass123!',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const tokenError = errors.find((e) => e.property === 'token');
      expect(tokenError).toBeDefined();
    });
  });
});
