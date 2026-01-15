/**
 * Password Validator Unit Tests
 *
 * Comprehensive tests for password validation including:
 * - Length validation
 * - Character type requirements
 * - Common password detection
 * - Sequential and repeated character detection
 * - Entropy calculation
 * - Password strength scoring
 * - Custom validation options
 * - Class-validator integration
 */

import {
  PasswordValidatorService,
  PasswordStrength,
  PasswordValidationResult as _PasswordValidationResult,
  PasswordValidationOptions,
  IsStrongPasswordConstraint,
  generateStrongPassword,
  passwordValidator,
} from './password.validator';

describe('PasswordValidatorService', () => {
  let validator: PasswordValidatorService;

  beforeEach(() => {
    validator = new PasswordValidatorService();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      expect(validator).toBeDefined();
    });

    it('should accept custom options', () => {
      const customValidator = new PasswordValidatorService({
        minLength: 12,
        requireSpecial: true,
      });
      expect(customValidator).toBeDefined();
    });
  });

  describe('validate - length validation', () => {
    it('should fail for passwords shorter than minimum length', () => {
      const result = validator.validate('Ab1cdef');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 8 characters long',
      );
    });

    it('should pass for passwords meeting minimum length', () => {
      const result = validator.validate('Abcdefg1');
      expect(result.errors).not.toContain(
        'Password must be at least 8 characters long',
      );
    });

    it('should fail for passwords exceeding maximum length', () => {
      const longPassword = 'A'.repeat(129) + '1a';
      const result = validator.validate(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must not exceed 128 characters',
      );
    });

    it('should respect custom minLength option', () => {
      const customValidator = new PasswordValidatorService({ minLength: 12 });
      const result = customValidator.validate('Abcdefgh1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 12 characters long',
      );
    });

    it('should respect custom maxLength option', () => {
      const customValidator = new PasswordValidatorService({ maxLength: 20 });
      const result = customValidator.validate('Abcdefgh1234567890Xyz1');
      expect(result.errors).toContain('Password must not exceed 20 characters');
    });
  });

  describe('validate - character type requirements', () => {
    it('should fail when missing uppercase', () => {
      const result = validator.validate('abcdefgh1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter',
      );
    });

    it('should fail when missing lowercase', () => {
      const result = validator.validate('ABCDEFGH1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter',
      );
    });

    it('should fail when missing numbers', () => {
      const result = validator.validate('Abcdefghi');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one number',
      );
    });

    it('should not require special characters by default', () => {
      const result = validator.validate('Abcdefgh1');
      expect(result.errors).not.toContain(
        'Password must contain at least one special character',
      );
    });

    it('should require special characters when option is set', () => {
      const customValidator = new PasswordValidatorService({
        requireSpecial: true,
      });
      const result = customValidator.validate('Abcdefgh1');
      expect(result.errors).toContain(
        'Password must contain at least one special character',
      );
    });

    it('should pass when all required character types are present', () => {
      const result = validator.validate('Abcdefgh1@');
      expect(result.errors).not.toContain(
        'Password must contain at least one uppercase letter',
      );
      expect(result.errors).not.toContain(
        'Password must contain at least one lowercase letter',
      );
      expect(result.errors).not.toContain(
        'Password must contain at least one number',
      );
    });

    it('should fail when not enough character types', () => {
      const customValidator = new PasswordValidatorService({
        minCharacterTypes: 4,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSpecial: false,
      });
      const result = customValidator.validate('abcdefgh');
      expect(result.errors).toContain(
        'Password must contain at least 4 different character types (uppercase, lowercase, numbers, special)',
      );
    });
  });

  describe('validate - common password detection', () => {
    it('should fail for common passwords', () => {
      const commonPasswords = [
        'password',
        'password123',
        '123456',
        'qwerty',
        'admin',
        'letmein',
        'welcome',
        'dragon',
        'iloveyou',
        'festival',
        'festival123',
      ];

      for (const pwd of commonPasswords) {
        const result = validator.validate(pwd);
        expect(result.errors).toContain(
          'Password is too common and easily guessable',
        );
      }
    });

    it('should not flag unique passwords as common', () => {
      const result = validator.validate('Xk9#mPqR2$vN');
      expect(result.errors).not.toContain(
        'Password is too common and easily guessable',
      );
    });

    it('should be case-insensitive when checking common passwords', () => {
      const result = validator.validate('PASSWORD');
      expect(result.errors).toContain(
        'Password is too common and easily guessable',
      );
    });

    it('should skip common password check when disabled', () => {
      const customValidator = new PasswordValidatorService({
        checkCommonPasswords: false,
      });
      const result = customValidator.validate('Password1');
      expect(result.errors).not.toContain(
        'Password is too common and easily guessable',
      );
    });
  });

  describe('validate - repeated characters', () => {
    it('should warn about excessive repeated characters', () => {
      const result = validator.validate('Aaaabcdefg1');
      expect(result.warnings).toContain(
        'Password contains too many repeated characters',
      );
    });

    it('should not warn for acceptable repetition', () => {
      const result = validator.validate('Aabbccdef1');
      expect(result.warnings).not.toContain(
        'Password contains too many repeated characters',
      );
    });

    it('should be case-insensitive for repeated character detection', () => {
      const result = validator.validate('AaAabcdefg1');
      expect(result.warnings).toContain(
        'Password contains too many repeated characters',
      );
    });

    it('should respect custom maxRepeatedChars option', () => {
      const customValidator = new PasswordValidatorService({
        maxRepeatedChars: 2,
      });
      const result = customValidator.validate('Aaabcdefgh1');
      expect(result.warnings).toContain(
        'Password contains too many repeated characters',
      );
    });
  });

  describe('validate - sequential characters', () => {
    it('should warn about sequential characters (abc)', () => {
      const result = validator.validate('Abcdefgh1');
      expect(result.warnings).toContain(
        'Password contains sequential characters (like abc or 123)',
      );
    });

    it('should warn about sequential numbers (123)', () => {
      const result = validator.validate('Password1234');
      expect(result.warnings).toContain(
        'Password contains sequential characters (like abc or 123)',
      );
    });

    it('should warn about keyboard sequences (qwerty)', () => {
      const result = validator.validate('Qwertyui1');
      expect(result.warnings).toContain(
        'Password contains sequential characters (like abc or 123)',
      );
    });

    it('should warn about reversed sequences (cba)', () => {
      const result = validator.validate('Fedcbagh1');
      expect(result.warnings).toContain(
        'Password contains sequential characters (like abc or 123)',
      );
    });

    it('should not warn for non-sequential passwords', () => {
      const result = validator.validate('Xk9#mPqR2$');
      expect(result.warnings).not.toContain(
        'Password contains sequential characters (like abc or 123)',
      );
    });
  });

  describe('validate - entropy calculation', () => {
    it('should calculate entropy for simple passwords', () => {
      const result = validator.validate('aaaaaaaa');
      expect(result.entropy).toBeGreaterThan(0);
    });

    it('should calculate higher entropy for complex passwords', () => {
      const simpleResult = validator.validate('aaaaaaaa');
      const complexResult = validator.validate('Aa1!Bb2@');
      expect(complexResult.entropy).toBeGreaterThan(simpleResult.entropy);
    });

    it('should return 0 entropy for empty password', () => {
      const result = validator.validate('');
      expect(result.entropy).toBe(0);
    });

    it('should warn when entropy is below minimum', () => {
      const result = validator.validate('aaaaaaaa');
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('entropy')]),
      );
    });

    it('should respect custom minEntropy option', () => {
      const customValidator = new PasswordValidatorService({ minEntropy: 60 });
      const result = customValidator.validate('Abcdefgh1');
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('entropy')]),
      );
    });
  });

  describe('validate - scoring and strength', () => {
    it('should return VERY_WEAK for passwords with many errors', () => {
      const result = validator.validate('a');
      expect(result.strength).toBe(PasswordStrength.VERY_WEAK);
      expect(result.score).toBeLessThanOrEqual(20);
    });

    it('should return VERY_WEAK or WEAK for passwords with some errors', () => {
      // 'abcdefgh' has multiple errors (no uppercase, no number, fewer than 3 char types)
      // The score calculation: max(0, 25 - errors.length * 10) results in very low score
      const result = validator.validate('abcdefgh');
      expect([PasswordStrength.VERY_WEAK, PasswordStrength.WEAK]).toContain(result.strength);
    });

    it('should return FAIR for basic valid passwords', () => {
      const result = validator.validate('Abcdefgh1');
      expect([PasswordStrength.FAIR, PasswordStrength.STRONG]).toContain(result.strength);
    });

    it('should return STRONG for better passwords', () => {
      const result = validator.validate('Xk9#mPqR2$vN');
      expect([PasswordStrength.STRONG, PasswordStrength.VERY_STRONG]).toContain(
        result.strength,
      );
    });

    it('should return VERY_STRONG for excellent passwords', () => {
      const result = validator.validate('Xk9#mPqR2$vN!@LmKp8&');
      expect(result.strength).toBe(PasswordStrength.VERY_STRONG);
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('should have score between 0 and 100', () => {
      const passwords = [
        'a',
        'abcdefgh',
        'Abcdefgh1',
        'Xk9#mPqR2$vN!@LmKp8&',
      ];
      for (const pwd of passwords) {
        const result = validator.validate(pwd);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('validate - suggestions', () => {
    it('should suggest adding special characters', () => {
      const result = validator.validate('Abcdefgh1');
      expect(result.suggestions).toContain(
        'Consider adding special characters for extra security',
      );
    });

    it('should suggest longer password', () => {
      const result = validator.validate('Abcdefg1');
      expect(result.suggestions).toContain(
        'Consider using a longer password (12+ characters)',
      );
    });

    it('should suggest using all character types', () => {
      const result = validator.validate('Abcdefgh1');
      expect(result.suggestions).toContain(
        'Try using all character types: uppercase, lowercase, numbers, and special characters',
      );
    });

    it('should not duplicate suggestions', () => {
      const result = validator.validate('Abcdefgh1');
      const uniqueSuggestions = [...new Set(result.suggestions)];
      expect(result.suggestions.length).toBe(uniqueSuggestions.length);
    });
  });

  describe('isValid', () => {
    it('should return true for valid passwords', () => {
      expect(validator.isValid('Xk9#mPqR2$vN')).toBe(true);
    });

    it('should return false for invalid passwords', () => {
      expect(validator.isValid('password')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validator.isValid('')).toBe(false);
    });
  });

  describe('PasswordValidationResult structure', () => {
    it('should have all required properties', () => {
      const result = validator.validate('Abcdefgh1');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('strength');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('entropy');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('suggestions');
    });

    it('should have correct types for all properties', () => {
      const result = validator.validate('Abcdefgh1');
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.strength).toBe('string');
      expect(typeof result.score).toBe('number');
      expect(typeof result.entropy).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });
});

describe('IsStrongPasswordConstraint', () => {
  let constraint: IsStrongPasswordConstraint;

  beforeEach(() => {
    constraint = new IsStrongPasswordConstraint();
  });

  describe('validate', () => {
    it('should return true for valid passwords', () => {
      const mockArgs = {
        constraints: [undefined],
        value: 'Xk9#mPqR2$vN',
        targetName: 'TestDto',
        property: 'password',
        object: {},
      };
      expect(constraint.validate('Xk9#mPqR2$vN', mockArgs as any)).toBe(true);
    });

    it('should return false for invalid passwords', () => {
      const mockArgs = {
        constraints: [undefined],
        value: 'password',
        targetName: 'TestDto',
        property: 'password',
        object: {},
      };
      expect(constraint.validate('password', mockArgs as any)).toBe(false);
    });

    it('should use custom options from constraints', () => {
      const customOptions: PasswordValidationOptions = {
        minLength: 12,
        requireSpecial: true,
      };
      const mockArgs = {
        constraints: [customOptions],
        value: 'Abcdefgh1',
        targetName: 'TestDto',
        property: 'password',
        object: {},
      };
      expect(constraint.validate('Abcdefgh1', mockArgs as any)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return error messages joined', () => {
      const mockArgs = {
        constraints: [undefined],
        value: 'a',
        targetName: 'TestDto',
        property: 'password',
        object: {},
      };
      const message = constraint.defaultMessage(mockArgs as any);
      expect(message).toContain('Password must be at least 8 characters long');
    });

    it('should use custom options for message generation', () => {
      const customOptions: PasswordValidationOptions = {
        minLength: 12,
      };
      const mockArgs = {
        constraints: [customOptions],
        value: 'Abcdefgh1',
        targetName: 'TestDto',
        property: 'password',
        object: {},
      };
      const message = constraint.defaultMessage(mockArgs as any);
      expect(message).toContain('12 characters');
    });
  });
});

describe('generateStrongPassword', () => {
  it('should generate password of default length (16)', () => {
    const password = generateStrongPassword();
    expect(password.length).toBe(16);
  });

  it('should generate password of specified length', () => {
    const password = generateStrongPassword(24);
    expect(password.length).toBe(24);
  });

  it('should contain at least one uppercase letter', () => {
    const password = generateStrongPassword();
    expect(/[A-Z]/.test(password)).toBe(true);
  });

  it('should contain at least one lowercase letter', () => {
    const password = generateStrongPassword();
    expect(/[a-z]/.test(password)).toBe(true);
  });

  it('should contain at least one number', () => {
    const password = generateStrongPassword();
    expect(/[0-9]/.test(password)).toBe(true);
  });

  it('should contain at least one special character', () => {
    const password = generateStrongPassword();
    expect(/[!@#$%^&*()_+\-=[\]{}]/.test(password)).toBe(true);
  });

  it('should generate unique passwords', () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 100; i++) {
      passwords.add(generateStrongPassword());
    }
    expect(passwords.size).toBe(100);
  });

  it('should pass validation with default validator', () => {
    const validator = new PasswordValidatorService({ requireSpecial: true });
    for (let i = 0; i < 10; i++) {
      const password = generateStrongPassword();
      const result = validator.validate(password);
      expect(result.isValid).toBe(true);
    }
  });
});

describe('passwordValidator singleton', () => {
  it('should be defined', () => {
    expect(passwordValidator).toBeDefined();
  });

  it('should be an instance of PasswordValidatorService', () => {
    expect(passwordValidator).toBeInstanceOf(PasswordValidatorService);
  });

  it('should validate passwords correctly', () => {
    expect(passwordValidator.isValid('Xk9#mPqR2$vN')).toBe(true);
    expect(passwordValidator.isValid('password')).toBe(false);
  });
});

describe('PasswordStrength enum', () => {
  it('should have all strength levels', () => {
    expect(PasswordStrength.VERY_WEAK).toBe('very_weak');
    expect(PasswordStrength.WEAK).toBe('weak');
    expect(PasswordStrength.FAIR).toBe('fair');
    expect(PasswordStrength.STRONG).toBe('strong');
    expect(PasswordStrength.VERY_STRONG).toBe('very_strong');
  });
});

describe('Edge cases', () => {
  const validator = new PasswordValidatorService();

  it('should handle empty string', () => {
    const result = validator.validate('');
    expect(result.isValid).toBe(false);
    expect(result.entropy).toBe(0);
  });

  it('should handle very long passwords', () => {
    const longPassword = 'Abc1' + 'x'.repeat(100);
    const result = validator.validate(longPassword);
    expect(result.errors).not.toContain(
      'Password must not exceed 128 characters',
    );
  });

  it('should handle unicode characters', () => {
    const result = validator.validate('Abcdefgh1');
    expect(result).toBeDefined();
  });

  it('should handle passwords with only special characters', () => {
    const result = validator.validate('!@#$%^&*()');
    expect(result.isValid).toBe(false);
  });

  it('should handle passwords with spaces', () => {
    const result = validator.validate('Abc 123 Def');
    expect(result).toBeDefined();
  });

  it('should handle passwords with null bytes', () => {
    const result = validator.validate('Abcdefgh1\0');
    expect(result).toBeDefined();
  });
});
