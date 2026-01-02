/**
 * Authentication & Authorization Constants
 * @module @festival/constants/auth
 */

/**
 * User roles for RBAC (Role-Based Access Control)
 * Hierarchical: SUPER_ADMIN > ADMIN > ORGANIZER > STAFF > VENDOR > USER
 */
export const ROLES = {
  /** Platform super administrator - full system access */
  SUPER_ADMIN: 'SUPER_ADMIN',
  /** Platform administrator - manages all festivals */
  ADMIN: 'ADMIN',
  /** Festival organizer - manages their own festivals */
  ORGANIZER: 'ORGANIZER',
  /** Festival staff - limited access to festival operations */
  STAFF: 'STAFF',
  /** Vendor/merchant at festival */
  VENDOR: 'VENDOR',
  /** Regular user/attendee */
  USER: 'USER',
  /** Guest/unauthenticated */
  GUEST: 'GUEST',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Role hierarchy levels (higher number = more privileges)
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.SUPER_ADMIN]: 100,
  [ROLES.ADMIN]: 90,
  [ROLES.ORGANIZER]: 70,
  [ROLES.STAFF]: 50,
  [ROLES.VENDOR]: 40,
  [ROLES.USER]: 10,
  [ROLES.GUEST]: 0,
} as const;

/**
 * Granular permissions for fine-grained access control
 */
export const PERMISSIONS = {
  // Festival permissions
  FESTIVAL_CREATE: 'festival:create',
  FESTIVAL_READ: 'festival:read',
  FESTIVAL_UPDATE: 'festival:update',
  FESTIVAL_DELETE: 'festival:delete',
  FESTIVAL_PUBLISH: 'festival:publish',
  FESTIVAL_MANAGE_STAFF: 'festival:manage_staff',

  // Ticket permissions
  TICKET_CREATE: 'ticket:create',
  TICKET_READ: 'ticket:read',
  TICKET_UPDATE: 'ticket:update',
  TICKET_DELETE: 'ticket:delete',
  TICKET_VALIDATE: 'ticket:validate',
  TICKET_REFUND: 'ticket:refund',

  // User permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_BAN: 'user:ban',
  USER_MANAGE_ROLES: 'user:manage_roles',

  // Payment permissions
  PAYMENT_READ: 'payment:read',
  PAYMENT_REFUND: 'payment:refund',
  PAYMENT_EXPORT: 'payment:export',

  // Cashless permissions
  CASHLESS_READ: 'cashless:read',
  CASHLESS_TOPUP: 'cashless:topup',
  CASHLESS_PAY: 'cashless:pay',
  CASHLESS_REFUND: 'cashless:refund',
  CASHLESS_TRANSFER: 'cashless:transfer',
  CASHLESS_MANAGE: 'cashless:manage',

  // Analytics permissions
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',
  ANALYTICS_REALTIME: 'analytics:realtime',

  // System permissions
  SYSTEM_SETTINGS: 'system:settings',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_AUDIT: 'system:audit',
  SYSTEM_BACKUP: 'system:backup',

  // Content permissions
  CONTENT_CREATE: 'content:create',
  CONTENT_READ: 'content:read',
  CONTENT_UPDATE: 'content:update',
  CONTENT_DELETE: 'content:delete',
  CONTENT_PUBLISH: 'content:publish',

  // Vendor permissions
  VENDOR_MANAGE: 'vendor:manage',
  VENDOR_SALES: 'vendor:sales',
  VENDOR_INVENTORY: 'vendor:inventory',

  // Zone/Access permissions
  ZONE_MANAGE: 'zone:manage',
  ZONE_ACCESS: 'zone:access',
  ZONE_VALIDATE: 'zone:validate',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Default permissions by role
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS) as Permission[],
  [ROLES.ADMIN]: [
    PERMISSIONS.FESTIVAL_CREATE,
    PERMISSIONS.FESTIVAL_READ,
    PERMISSIONS.FESTIVAL_UPDATE,
    PERMISSIONS.FESTIVAL_DELETE,
    PERMISSIONS.FESTIVAL_PUBLISH,
    PERMISSIONS.FESTIVAL_MANAGE_STAFF,
    PERMISSIONS.TICKET_CREATE,
    PERMISSIONS.TICKET_READ,
    PERMISSIONS.TICKET_UPDATE,
    PERMISSIONS.TICKET_DELETE,
    PERMISSIONS.TICKET_VALIDATE,
    PERMISSIONS.TICKET_REFUND,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_BAN,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.PAYMENT_EXPORT,
    PERMISSIONS.CASHLESS_READ,
    PERMISSIONS.CASHLESS_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.ANALYTICS_REALTIME,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_DELETE,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.VENDOR_MANAGE,
    PERMISSIONS.ZONE_MANAGE,
    PERMISSIONS.ZONE_ACCESS,
    PERMISSIONS.ZONE_VALIDATE,
  ],
  [ROLES.ORGANIZER]: [
    PERMISSIONS.FESTIVAL_CREATE,
    PERMISSIONS.FESTIVAL_READ,
    PERMISSIONS.FESTIVAL_UPDATE,
    PERMISSIONS.FESTIVAL_PUBLISH,
    PERMISSIONS.FESTIVAL_MANAGE_STAFF,
    PERMISSIONS.TICKET_CREATE,
    PERMISSIONS.TICKET_READ,
    PERMISSIONS.TICKET_UPDATE,
    PERMISSIONS.TICKET_VALIDATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_EXPORT,
    PERMISSIONS.CASHLESS_READ,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.VENDOR_MANAGE,
    PERMISSIONS.ZONE_MANAGE,
    PERMISSIONS.ZONE_ACCESS,
  ],
  [ROLES.STAFF]: [
    PERMISSIONS.FESTIVAL_READ,
    PERMISSIONS.TICKET_READ,
    PERMISSIONS.TICKET_VALIDATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.CASHLESS_READ,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.ZONE_ACCESS,
    PERMISSIONS.ZONE_VALIDATE,
  ],
  [ROLES.VENDOR]: [
    PERMISSIONS.FESTIVAL_READ,
    PERMISSIONS.CASHLESS_PAY,
    PERMISSIONS.VENDOR_SALES,
    PERMISSIONS.VENDOR_INVENTORY,
  ],
  [ROLES.USER]: [
    PERMISSIONS.FESTIVAL_READ,
    PERMISSIONS.TICKET_READ,
    PERMISSIONS.CASHLESS_TOPUP,
    PERMISSIONS.CASHLESS_PAY,
    PERMISSIONS.CASHLESS_TRANSFER,
    PERMISSIONS.CONTENT_READ,
  ],
  [ROLES.GUEST]: [
    PERMISSIONS.FESTIVAL_READ,
    PERMISSIONS.CONTENT_READ,
  ],
} as const;

/**
 * Token expiration times
 */
export const TOKEN_EXPIRY = {
  /** Access token - short lived for security */
  ACCESS_TOKEN: '15m',
  ACCESS_TOKEN_MS: 15 * 60 * 1000,

  /** Refresh token - longer lived for convenience */
  REFRESH_TOKEN: '7d',
  REFRESH_TOKEN_MS: 7 * 24 * 60 * 60 * 1000,

  /** Password reset token */
  PASSWORD_RESET: '1h',
  PASSWORD_RESET_MS: 60 * 60 * 1000,

  /** Email verification token */
  EMAIL_VERIFICATION: '24h',
  EMAIL_VERIFICATION_MS: 24 * 60 * 60 * 1000,

  /** Magic link token */
  MAGIC_LINK: '15m',
  MAGIC_LINK_MS: 15 * 60 * 1000,

  /** QR code scan token (for ticket validation) */
  QR_SCAN: '5m',
  QR_SCAN_MS: 5 * 60 * 1000,

  /** Session inactivity timeout */
  SESSION_IDLE: '30m',
  SESSION_IDLE_MS: 30 * 60 * 1000,

  /** Remember me duration */
  REMEMBER_ME: '30d',
  REMEMBER_ME_MS: 30 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Password policy configuration
 */
export const PASSWORD_POLICY = {
  /** Minimum password length */
  MIN_LENGTH: 8,
  /** Maximum password length */
  MAX_LENGTH: 128,
  /** Require uppercase letter */
  REQUIRE_UPPERCASE: true,
  /** Require lowercase letter */
  REQUIRE_LOWERCASE: true,
  /** Require number */
  REQUIRE_NUMBER: true,
  /** Require special character */
  REQUIRE_SPECIAL: true,
  /** Number of previous passwords to check against */
  HISTORY_COUNT: 5,
  /** Minimum days before password change allowed */
  MIN_AGE_DAYS: 0,
  /** Maximum days before password must be changed (0 = never) */
  MAX_AGE_DAYS: 90,
  /** Special characters allowed */
  SPECIAL_CHARS: '!@#$%^&*(),.?":{}|<>[]\\-_=+;\'`~',
} as const;

/**
 * Security/rate limiting for auth
 */
export const AUTH_SECURITY = {
  /** Maximum login attempts before lockout */
  MAX_LOGIN_ATTEMPTS: 5,
  /** Lockout duration in milliseconds */
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,
  /** Lockout duration human readable */
  LOCKOUT_DURATION: '15m',
  /** Maximum concurrent sessions per user */
  MAX_SESSIONS: 5,
  /** OTP/2FA code length */
  OTP_LENGTH: 6,
  /** OTP validity in seconds */
  OTP_VALIDITY_SECONDS: 300,
  /** Bcrypt salt rounds */
  BCRYPT_ROUNDS: 12,
  /** JWT algorithm */
  JWT_ALGORITHM: 'HS256',
  /** Minimum time between password reset requests (ms) */
  PASSWORD_RESET_COOLDOWN_MS: 60 * 1000,
} as const;

/**
 * OAuth/Social login providers
 */
export const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  APPLE: 'apple',
  TWITTER: 'twitter',
} as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[keyof typeof OAUTH_PROVIDERS];

/**
 * Account status
 */
export const ACCOUNT_STATUS = {
  /** Active account */
  ACTIVE: 'ACTIVE',
  /** Pending email verification */
  PENDING: 'PENDING',
  /** Suspended by admin */
  SUSPENDED: 'SUSPENDED',
  /** Banned from platform */
  BANNED: 'BANNED',
  /** Deleted/deactivated by user */
  DELETED: 'DELETED',
  /** Locked due to security */
  LOCKED: 'LOCKED',
} as const;

export type AccountStatus = (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS];
