/**
 * Password Validator for Festival Platform
 *
 * Provides comprehensive password strength validation following OWASP guidelines:
 * - Minimum length enforcement
 * - Complexity requirements (uppercase, lowercase, numbers, special chars)
 * - Common password detection
 * - Password breach detection (via API or local list)
 * - Entropy calculation
 *
 * @module PasswordValidator
 * @security Critical - Password security is essential for user account protection
 */

import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

/**
 * Password strength levels
 */
export enum PasswordStrength {
  VERY_WEAK = 'very_weak',
  WEAK = 'weak',
  FAIR = 'fair',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  /** Overall validity */
  isValid: boolean;
  /** Password strength level */
  strength: PasswordStrength;
  /** Numeric score (0-100) */
  score: number;
  /** Estimated entropy in bits */
  entropy: number;
  /** List of validation errors */
  errors: string[];
  /** List of warnings (non-blocking) */
  warnings: string[];
  /** Suggestions for improvement */
  suggestions: string[];
}

/**
 * Password validation options
 */
export interface PasswordValidationOptions {
  /** Minimum password length (default: 8) */
  minLength?: number;
  /** Maximum password length (default: 128) */
  maxLength?: number;
  /** Require uppercase letters */
  requireUppercase?: boolean;
  /** Require lowercase letters */
  requireLowercase?: boolean;
  /** Require numbers */
  requireNumbers?: boolean;
  /** Require special characters */
  requireSpecial?: boolean;
  /** Minimum required character types (1-4) */
  minCharacterTypes?: number;
  /** Check against common passwords */
  checkCommonPasswords?: boolean;
  /** Maximum allowed repeated characters */
  maxRepeatedChars?: number;
  /** Maximum allowed sequential characters */
  maxSequentialChars?: number;
  /** Minimum entropy in bits */
  minEntropy?: number;
}

/**
 * Default validation options following OWASP recommendations
 */
const defaultOptions: PasswordValidationOptions = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: false,
  minCharacterTypes: 3,
  checkCommonPasswords: true,
  maxRepeatedChars: 3,
  maxSequentialChars: 3,
  minEntropy: 40,
};

/**
 * Common weak passwords list (subset - full list would be loaded from file)
 */
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '123456',
  '12345678',
  '123456789',
  'qwerty',
  'qwerty123',
  'abc123',
  'letmein',
  'welcome',
  'admin',
  'login',
  'passw0rd',
  'master',
  'dragon',
  'iloveyou',
  'monkey',
  'shadow',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'soccer',
  'michael',
  'jennifer',
  'jordan',
  'hunter',
  'harley',
  'ranger',
  'buster',
  'thomas',
  'robert',
  'summer',
  'charlie',
  'ashley',
  'jessica',
  'trustno1',
  'access',
  'mustang',
  'batman',
  'superman',
  'killer',
  'pepper',
  'ginger',
  'joshua',
  'maggie',
  'bailey',
  'whatever',
  'starwars',
  'corvette',
  'festival',
  'festival123',
  'festival2024',
  'festival2025',
  'festival2026',
  'concert',
  'music',
  'event',
]);

/**
 * Sequential character patterns to detect
 */
const SEQUENTIAL_PATTERNS = [
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];

/**
 * Password Validator Service
 */
export class PasswordValidatorService {
  private readonly options: PasswordValidationOptions;

  constructor(options?: Partial<PasswordValidationOptions>) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Validate a password and return detailed results
   */
  validate(password: string): PasswordValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Length validation
    if (password.length < (this.options.minLength ?? 8)) {
      errors.push(
        `Password must be at least ${this.options.minLength} characters long`,
      );
    }
    if (password.length > (this.options.maxLength ?? 128)) {
      errors.push(
        `Password must not exceed ${this.options.maxLength} characters`,
      );
    }

    // Character type checks
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    // eslint-disable-next-line no-useless-escape
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password);

    const charTypes = [hasUppercase, hasLowercase, hasNumbers, hasSpecial].filter(
      Boolean,
    ).length;

    if (this.options.requireUppercase && !hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (this.options.requireLowercase && !hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (this.options.requireNumbers && !hasNumbers) {
      errors.push('Password must contain at least one number');
    }
    if (this.options.requireSpecial && !hasSpecial) {
      errors.push('Password must contain at least one special character');
    }

    if (charTypes < (this.options.minCharacterTypes ?? 3)) {
      errors.push(
        `Password must contain at least ${this.options.minCharacterTypes} different character types (uppercase, lowercase, numbers, special)`,
      );
    }

    // Common password check
    if (this.options.checkCommonPasswords) {
      if (COMMON_PASSWORDS.has(password.toLowerCase())) {
        errors.push('Password is too common and easily guessable');
      }
    }

    // Repeated characters check
    const repeatedChars = this.findRepeatedChars(password);
    if (repeatedChars > (this.options.maxRepeatedChars ?? 3)) {
      warnings.push('Password contains too many repeated characters');
      suggestions.push('Avoid repeating the same character more than 3 times');
    }

    // Sequential characters check
    const sequentialChars = this.findSequentialChars(password);
    if (sequentialChars > (this.options.maxSequentialChars ?? 3)) {
      warnings.push('Password contains sequential characters (like abc or 123)');
      suggestions.push('Avoid using sequential patterns');
    }

    // Entropy calculation
    const entropy = this.calculateEntropy(password);
    if (entropy < (this.options.minEntropy ?? 40)) {
      warnings.push(
        `Password entropy (${entropy.toFixed(1)} bits) is below recommended minimum`,
      );
      suggestions.push('Use a longer password with more varied characters');
    }

    // Calculate score and strength
    const score = this.calculateScore(password, errors, warnings);
    const strength = this.getStrengthLevel(score);

    // Add suggestions based on analysis
    if (!hasSpecial) {
      suggestions.push('Consider adding special characters for extra security');
    }
    if (password.length < 12) {
      suggestions.push('Consider using a longer password (12+ characters)');
    }
    if (charTypes < 4) {
      suggestions.push('Try using all character types: uppercase, lowercase, numbers, and special characters');
    }

    return {
      isValid: errors.length === 0,
      strength,
      score,
      entropy,
      errors,
      warnings,
      suggestions: [...new Set(suggestions)], // Remove duplicates
    };
  }

  /**
   * Quick validation - returns true/false only
   */
  isValid(password: string): boolean {
    return this.validate(password).isValid;
  }

  /**
   * Calculate password entropy in bits
   */
  private calculateEntropy(password: string): number {
    if (!password || password.length === 0) {
      return 0;
    }

    // Calculate character pool size
    let poolSize = 0;
    if (/[a-z]/.test(password)) {poolSize += 26;}
    if (/[A-Z]/.test(password)) {poolSize += 26;}
    if (/[0-9]/.test(password)) {poolSize += 10;}
    // eslint-disable-next-line no-useless-escape
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {poolSize += 32;}
    // eslint-disable-next-line no-useless-escape
    if (/[^a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {poolSize += 100;}

    // Calculate entropy: E = L * log2(R) where L = length, R = pool size
    return password.length * Math.log2(poolSize || 1);
  }

  /**
   * Find maximum consecutive repeated characters
   */
  private findRepeatedChars(password: string): number {
    let maxRepeated = 1;
    let current = 1;

    for (let i = 1; i < password.length; i++) {
      if (password[i].toLowerCase() === password[i - 1].toLowerCase()) {
        current++;
        maxRepeated = Math.max(maxRepeated, current);
      } else {
        current = 1;
      }
    }

    return maxRepeated;
  }

  /**
   * Find maximum consecutive sequential characters
   */
  private findSequentialChars(password: string): number {
    const lowerPassword = password.toLowerCase();
    let maxSequential = 0;

    for (const pattern of SEQUENTIAL_PATTERNS) {
      const reversed = pattern.split('').reverse().join('');
      for (let len = pattern.length; len >= 3; len--) {
        for (let i = 0; i <= pattern.length - len; i++) {
          const substr = pattern.substring(i, i + len);
          const reversedSubstr = reversed.substring(
            pattern.length - i - len,
            pattern.length - i,
          );

          if (
            lowerPassword.includes(substr) ||
            lowerPassword.includes(reversedSubstr)
          ) {
            maxSequential = Math.max(maxSequential, len);
          }
        }
      }
    }

    return maxSequential;
  }

  /**
   * Calculate overall password score (0-100)
   */
  private calculateScore(
    password: string,
    errors: string[],
    warnings: string[],
  ): number {
    if (errors.length > 0) {
      return Math.max(0, 25 - errors.length * 10);
    }

    let score = 50; // Base score for valid password

    // Length bonus
    score += Math.min(20, password.length - 8);

    // Character variety bonus
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    // eslint-disable-next-line no-useless-escape
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password);

    score += [hasUppercase, hasLowercase, hasNumbers, hasSpecial].filter(Boolean)
      .length * 5;

    // Entropy bonus
    const entropy = this.calculateEntropy(password);
    score += Math.min(15, entropy / 4);

    // Warning penalty
    score -= warnings.length * 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get strength level from score
   */
  private getStrengthLevel(score: number): PasswordStrength {
    if (score >= 80) {return PasswordStrength.VERY_STRONG;}
    if (score >= 60) {return PasswordStrength.STRONG;}
    if (score >= 40) {return PasswordStrength.FAIR;}
    if (score >= 20) {return PasswordStrength.WEAK;}
    return PasswordStrength.VERY_WEAK;
  }
}

/**
 * Class-validator constraint for password validation
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint
  implements ValidatorConstraintInterface
{
  private validator: PasswordValidatorService;

  constructor() {
    this.validator = new PasswordValidatorService();
  }

  validate(password: string, args: ValidationArguments): boolean {
    const options = args.constraints[0] as PasswordValidationOptions | undefined;
    const validator = options
      ? new PasswordValidatorService(options)
      : this.validator;
    return validator.isValid(password);
  }

  defaultMessage(args: ValidationArguments): string {
    const options = args.constraints[0] as PasswordValidationOptions | undefined;
    const validator = options
      ? new PasswordValidatorService(options)
      : this.validator;
    const result = validator.validate(args.value as string);
    return result.errors.join('. ');
  }
}

/**
 * Decorator for strong password validation
 *
 * @example
 * class RegisterDto {
 *   @IsStrongPassword()
 *   password: string;
 * }
 *
 * @example
 * class RegisterDto {
 *   @IsStrongPassword({ minLength: 12, requireSpecial: true })
 *   password: string;
 * }
 */
export function IsStrongPassword(
  options?: PasswordValidationOptions,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsStrongPasswordConstraint,
    });
  };
}

/**
 * Utility function to generate a strong random password
 */
export function generateStrongPassword(length = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}';
  const allChars = uppercase + lowercase + numbers + special;

  // Ensure at least one of each type
  const password = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  // Fill remaining length with random characters
  for (let i = password.length; i < length; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle the password
  return password.sort(() => Math.random() - 0.5).join('');
}

/**
 * Export singleton instance for convenience
 */
export const passwordValidator = new PasswordValidatorService();
