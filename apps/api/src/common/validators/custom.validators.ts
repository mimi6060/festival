import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// ============================================
// Phone Number Validators
// ============================================

/**
 * Validates international phone number format (E.164)
 *
 * @example
 * @IsPhoneE164()
 * phone: string;
 */
@ValidatorConstraint({ name: 'isPhoneE164', async: false })
export class IsPhoneE164Constraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {return false;}
    // E.164 format: + followed by 1-15 digits
    return /^\+[1-9]\d{1,14}$/.test(value);
  }

  defaultMessage(): string {
    return 'Phone number must be in E.164 format (e.g., +33612345678)';
  }
}

export function IsPhoneE164(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPhoneE164Constraint,
    });
  };
}

// ============================================
// URL Validators
// ============================================

/**
 * Validates that a string is a valid HTTPS URL
 *
 * @example
 * @IsSecureUrl()
 * websiteUrl: string;
 */
@ValidatorConstraint({ name: 'isSecureUrl', async: false })
export class IsSecureUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {return false;}
    try {
      const url = new URL(value);
      return url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'URL must be a valid HTTPS URL';
  }
}

export function IsSecureUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSecureUrlConstraint,
    });
  };
}

// ============================================
// Slug Validators
// ============================================

/**
 * Validates a URL-safe slug
 *
 * @example
 * @IsSlug()
 * slug: string;
 */
@ValidatorConstraint({ name: 'isSlug', async: false })
export class IsSlugConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {return false;}
    // Slug: lowercase letters, numbers, hyphens, 3-100 chars
    return /^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$/.test(value) && !value.includes('--');
  }

  defaultMessage(): string {
    return 'Slug must be 3-100 characters, lowercase alphanumeric with hyphens, no consecutive hyphens';
  }
}

export function IsSlug(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSlugConstraint,
    });
  };
}

// ============================================
// Currency Validators
// ============================================

/**
 * Validates ISO 4217 currency code
 *
 * @example
 * @IsCurrencyCode()
 * currency: string;
 */
const VALID_CURRENCY_CODES = [
  'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL',
  'MXN', 'PLN', 'SEK', 'NOK', 'DKK', 'CZK', 'HUF', 'RON', 'BGN', 'HRK',
];

@ValidatorConstraint({ name: 'isCurrencyCode', async: false })
export class IsCurrencyCodeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {return false;}
    return VALID_CURRENCY_CODES.includes(value.toUpperCase());
  }

  defaultMessage(): string {
    return 'Currency must be a valid ISO 4217 code (EUR, USD, GBP, etc.)';
  }
}

export function IsCurrencyCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCurrencyCodeConstraint,
    });
  };
}

// ============================================
// Amount Validators
// ============================================

/**
 * Validates a monetary amount (positive, max 2 decimal places)
 *
 * @example
 * @IsMonetaryAmount({ max: 10000 })
 * amount: number;
 */
@ValidatorConstraint({ name: 'isMonetaryAmount', async: false })
export class IsMonetaryAmountConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'number') {return false;}
    const constraints = args.constraints[0] || {};
    const { min = 0, max = 1000000 } = constraints;

    // Must be positive
    if (value < min) {return false;}
    if (value > max) {return false;}

    // Max 2 decimal places
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    return decimalPlaces <= 2;
  }

  defaultMessage(args: ValidationArguments): string {
    const constraints = args.constraints[0] || {};
    const { min = 0, max = 1000000 } = constraints;
    return `Amount must be between ${min} and ${max} with max 2 decimal places`;
  }
}

export function IsMonetaryAmount(
  constraints?: { min?: number; max?: number },
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [constraints || {}],
      validator: IsMonetaryAmountConstraint,
    });
  };
}

// ============================================
// Date Range Validators
// ============================================

/**
 * Validates that a date is in the future
 *
 * @example
 * @IsFutureDate()
 * eventDate: Date;
 */
@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (!(value instanceof Date) && typeof value !== 'string') {return false;}
    const date = value instanceof Date ? value : new Date(value);
    return date > new Date();
  }

  defaultMessage(): string {
    return 'Date must be in the future';
  }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}

/**
 * Validates that a date is after another property's date
 *
 * @example
 * @IsAfterDate('startDate')
 * endDate: Date;
 */
@ValidatorConstraint({ name: 'isAfterDate', async: false })
export class IsAfterDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];

    if (!value || !relatedValue) {return true;} // Let @IsNotEmpty handle required

    const date = value instanceof Date ? value : new Date(value as string);
    const relatedDate =
      relatedValue instanceof Date ? relatedValue : new Date(relatedValue as string);

    return date > relatedDate;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must be after ${relatedPropertyName}`;
  }
}

export function IsAfterDate(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsAfterDateConstraint,
    });
  };
}

// ============================================
// NFC Tag Validators
// ============================================

/**
 * Validates NFC tag UID format
 *
 * @example
 * @IsNfcTagUid()
 * nfcUid: string;
 */
@ValidatorConstraint({ name: 'isNfcTagUid', async: false })
export class IsNfcTagUidConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {return false;}
    // NFC UID: 4, 7, or 10 bytes in hex (8, 14, or 20 hex chars)
    return /^[0-9A-Fa-f]{8}$|^[0-9A-Fa-f]{14}$|^[0-9A-Fa-f]{20}$/.test(value);
  }

  defaultMessage(): string {
    return 'NFC UID must be 8, 14, or 20 hexadecimal characters';
  }
}

export function IsNfcTagUid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNfcTagUidConstraint,
    });
  };
}

// ============================================
// GPS Coordinate Validators
// ============================================

/**
 * Validates latitude value (-90 to 90)
 *
 * @example
 * @IsLatitude()
 * lat: number;
 */
@ValidatorConstraint({ name: 'isLatitude', async: false })
export class IsLatitudeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'number') {return false;}
    return value >= -90 && value <= 90;
  }

  defaultMessage(): string {
    return 'Latitude must be between -90 and 90';
  }
}

export function IsLatitude(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsLatitudeConstraint,
    });
  };
}

/**
 * Validates longitude value (-180 to 180)
 *
 * @example
 * @IsLongitude()
 * lng: number;
 */
@ValidatorConstraint({ name: 'isLongitude', async: false })
export class IsLongitudeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'number') {return false;}
    return value >= -180 && value <= 180;
  }

  defaultMessage(): string {
    return 'Longitude must be between -180 and 180';
  }
}

export function IsLongitude(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsLongitudeConstraint,
    });
  };
}

// ============================================
// Color Validators
// ============================================

/**
 * Validates hex color code
 *
 * @example
 * @IsHexColor()
 * brandColor: string;
 */
@ValidatorConstraint({ name: 'isHexColor', async: false })
export class IsHexColorConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {return false;}
    // Hex color: #RGB or #RRGGBB
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
  }

  defaultMessage(): string {
    return 'Color must be a valid hex color code (e.g., #FF0000 or #F00)';
  }
}

export function IsHexColor(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsHexColorConstraint,
    });
  };
}

// ============================================
// File Validators
// ============================================

/**
 * Validates file extension
 *
 * @example
 * @IsFileExtension(['jpg', 'png', 'gif'])
 * imagePath: string;
 */
@ValidatorConstraint({ name: 'isFileExtension', async: false })
export class IsFileExtensionConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string') {return false;}
    const [allowedExtensions] = args.constraints;
    const ext = value.split('.').pop()?.toLowerCase();
    return ext !== undefined && allowedExtensions.includes(ext);
  }

  defaultMessage(args: ValidationArguments): string {
    const [allowedExtensions] = args.constraints;
    return `File must have one of these extensions: ${allowedExtensions.join(', ')}`;
  }
}

export function IsFileExtension(
  extensions: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [extensions],
      validator: IsFileExtensionConstraint,
    });
  };
}

// ============================================
// Conditional Validators
// ============================================

/**
 * Validates that if one property is set, another must also be set
 *
 * @example
 * @RequiredWith('startDate')
 * endDate: Date;
 */
@ValidatorConstraint({ name: 'requiredWith', async: false })
export class RequiredWithConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];

    // If related property has value, this property must also have value
    if (relatedValue !== undefined && relatedValue !== null && relatedValue !== '') {
      return value !== undefined && value !== null && value !== '';
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} is required when ${relatedPropertyName} is provided`;
  }
}

export function RequiredWith(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: RequiredWithConstraint,
    });
  };
}

// ============================================
// IBAN Validator
// ============================================

/**
 * Validates IBAN format (simplified validation)
 *
 * @example
 * @IsIBAN()
 * iban: string;
 */
@ValidatorConstraint({ name: 'isIBAN', async: false })
export class IsIBANConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {return false;}
    // IBAN: 2 letter country code, 2 check digits, up to 30 alphanumeric
    const normalized = value.replace(/\s/g, '').toUpperCase();
    return /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(normalized);
  }

  defaultMessage(): string {
    return 'IBAN must be a valid international bank account number';
  }
}

export function IsIBAN(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsIBANConstraint,
    });
  };
}
