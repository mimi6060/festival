/**
 * Validation Error Messages
 * Bilingual error messages (FR/EN) for Zod schemas
 */

export type SupportedLocale = 'fr' | 'en';

export interface ValidationMessages {
  required: string;
  invalidType: string;
  tooShort: (min: number) => string;
  tooLong: (max: number) => string;
  invalidEmail: string;
  invalidPhone: string;
  invalidFrenchPhone: string;
  invalidUrl: string;
  invalidUuid: string;
  invalidDate: string;
  invalidIban: string;
  invalidBic: string;
  invalidPostalCode: string;
  invalidSlug: string;
  invalidNfcId: string;
  invalidPin: string;
  passwordTooWeak: string;
  passwordsMismatch: string;
  positiveNumber: string;
  negativeNumber: string;
  minValue: (min: number) => string;
  maxValue: (max: number) => string;
  integerRequired: string;
  invalidCurrency: string;
  dateInPast: string;
  dateInFuture: string;
  endDateBeforeStart: string;
  invalidTimeFormat: string;
  invalidEnum: (values: string[]) => string;
  arrayTooShort: (min: number) => string;
  arrayTooLong: (max: number) => string;
  uniqueItems: string;
}

const frenchMessages: ValidationMessages = {
  required: 'Ce champ est requis',
  invalidType: 'Type invalide',
  tooShort: (min) => `Minimum ${min} caracteres requis`,
  tooLong: (max) => `Maximum ${max} caracteres autorises`,
  invalidEmail: 'Adresse email invalide',
  invalidPhone: 'Numero de telephone invalide',
  invalidFrenchPhone: 'Numero de telephone francais invalide',
  invalidUrl: 'URL invalide',
  invalidUuid: 'Identifiant UUID invalide',
  invalidDate: 'Date invalide',
  invalidIban: 'IBAN invalide',
  invalidBic: 'Code BIC/SWIFT invalide',
  invalidPostalCode: 'Code postal invalide',
  invalidSlug: 'Slug invalide (lettres minuscules, chiffres et tirets uniquement)',
  invalidNfcId: 'Identifiant NFC invalide',
  invalidPin: 'Code PIN invalide (4 chiffres requis)',
  passwordTooWeak:
    'Le mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule, un chiffre et un caractere special',
  passwordsMismatch: 'Les mots de passe ne correspondent pas',
  positiveNumber: 'Le nombre doit etre positif',
  negativeNumber: 'Le nombre doit etre negatif',
  minValue: (min) => `La valeur doit etre superieure ou egale a ${min}`,
  maxValue: (max) => `La valeur doit etre inferieure ou egale a ${max}`,
  integerRequired: 'Un nombre entier est requis',
  invalidCurrency: 'Code devise invalide (format ISO 4217)',
  dateInPast: 'La date doit etre dans le passe',
  dateInFuture: 'La date doit etre dans le futur',
  endDateBeforeStart: 'La date de fin doit etre posterieure a la date de debut',
  invalidTimeFormat: 'Format de temps invalide (HH:mm attendu)',
  invalidEnum: (values) => `Valeur invalide. Valeurs acceptees: ${values.join(', ')}`,
  arrayTooShort: (min) => `Minimum ${min} element(s) requis`,
  arrayTooLong: (max) => `Maximum ${max} element(s) autorise(s)`,
  uniqueItems: 'Les elements doivent etre uniques',
};

const englishMessages: ValidationMessages = {
  required: 'This field is required',
  invalidType: 'Invalid type',
  tooShort: (min) => `Minimum ${min} characters required`,
  tooLong: (max) => `Maximum ${max} characters allowed`,
  invalidEmail: 'Invalid email address',
  invalidPhone: 'Invalid phone number',
  invalidFrenchPhone: 'Invalid French phone number',
  invalidUrl: 'Invalid URL',
  invalidUuid: 'Invalid UUID identifier',
  invalidDate: 'Invalid date',
  invalidIban: 'Invalid IBAN',
  invalidBic: 'Invalid BIC/SWIFT code',
  invalidPostalCode: 'Invalid postal code',
  invalidSlug: 'Invalid slug (lowercase letters, numbers and hyphens only)',
  invalidNfcId: 'Invalid NFC identifier',
  invalidPin: 'Invalid PIN code (4 digits required)',
  passwordTooWeak:
    'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character',
  passwordsMismatch: 'Passwords do not match',
  positiveNumber: 'Number must be positive',
  negativeNumber: 'Number must be negative',
  minValue: (min) => `Value must be greater than or equal to ${min}`,
  maxValue: (max) => `Value must be less than or equal to ${max}`,
  integerRequired: 'An integer is required',
  invalidCurrency: 'Invalid currency code (ISO 4217 format)',
  dateInPast: 'Date must be in the past',
  dateInFuture: 'Date must be in the future',
  endDateBeforeStart: 'End date must be after start date',
  invalidTimeFormat: 'Invalid time format (HH:mm expected)',
  invalidEnum: (values) => `Invalid value. Accepted values: ${values.join(', ')}`,
  arrayTooShort: (min) => `Minimum ${min} item(s) required`,
  arrayTooLong: (max) => `Maximum ${max} item(s) allowed`,
  uniqueItems: 'Items must be unique',
};

const messagesByLocale: Record<SupportedLocale, ValidationMessages> = {
  fr: frenchMessages,
  en: englishMessages,
};

let currentLocale: SupportedLocale = 'fr';

/**
 * Set the current validation locale
 */
export function setValidationLocale(locale: SupportedLocale): void {
  currentLocale = locale;
}

/**
 * Get the current validation locale
 */
export function getValidationLocale(): SupportedLocale {
  return currentLocale;
}

/**
 * Get validation messages for the current locale
 */
export function getMessages(): ValidationMessages {
  return messagesByLocale[currentLocale];
}

/**
 * Get validation messages for a specific locale
 */
export function getMessagesForLocale(locale: SupportedLocale): ValidationMessages {
  return messagesByLocale[locale];
}

/**
 * Shorthand accessor for current messages
 */
export const m = (): ValidationMessages => getMessages();
