/**
 * User Test Fixtures
 *
 * Predefined user data for unit and integration tests.
 * These fixtures represent various user scenarios and roles.
 */

import { UserRole, UserStatus } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface UserFixture {
  id: string;
  email: string;
  passwordHash: string;
  plainPassword: string; // For testing login
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  refreshToken: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

// ============================================================================
// Password Fixtures
// ============================================================================

/**
 * Valid password that meets all requirements
 * - At least 8 characters
 * - Contains uppercase, lowercase, and number
 */
export const VALID_PASSWORD = 'ValidPass123!';

/**
 * BCrypt hash for VALID_PASSWORD (cost factor 12)
 * Generated with: bcrypt.hash('ValidPass123!', 12)
 */
export const VALID_PASSWORD_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.P7mQE7fLbNhzW.';

/**
 * Weak passwords for validation testing
 */
export const WEAK_PASSWORDS = {
  tooShort: '12345',
  noUppercase: 'password123!',
  noLowercase: 'PASSWORD123!',
  noNumber: 'Passwordabc!',
  onlyNumbers: '12345678',
  empty: '',
};

// ============================================================================
// User Fixtures by Role
// ============================================================================

export const adminUser: UserFixture = {
  id: 'admin-uuid-00000000-0000-0000-0000-000000000001',
  email: 'admin@festival.test',
  passwordHash: VALID_PASSWORD_HASH,
  plainPassword: VALID_PASSWORD,
  firstName: 'Admin',
  lastName: 'User',
  phone: '+33612345678',
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  refreshToken: 'admin-refresh-token',
  lastLoginAt: new Date('2024-01-01T10:00:00Z'),
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

export const organizerUser: UserFixture = {
  id: 'organizer-uuid-00000000-0000-0000-0000-000000000002',
  email: 'organizer@festival.test',
  passwordHash: VALID_PASSWORD_HASH,
  plainPassword: VALID_PASSWORD,
  firstName: 'Festival',
  lastName: 'Organizer',
  phone: '+33622345678',
  role: UserRole.ORGANIZER,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  refreshToken: 'organizer-refresh-token',
  lastLoginAt: new Date('2024-01-02T10:00:00Z'),
  createdAt: new Date('2023-02-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T10:00:00Z'),
};

export const staffUser: UserFixture = {
  id: 'staff-uuid-00000000-0000-0000-0000-000000000003',
  email: 'staff@festival.test',
  passwordHash: VALID_PASSWORD_HASH,
  plainPassword: VALID_PASSWORD,
  firstName: 'Staff',
  lastName: 'Member',
  phone: '+33632345678',
  role: UserRole.STAFF,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  refreshToken: 'staff-refresh-token',
  lastLoginAt: new Date('2024-01-03T10:00:00Z'),
  createdAt: new Date('2023-03-01T00:00:00Z'),
  updatedAt: new Date('2024-01-03T10:00:00Z'),
};

export const cashierUser: UserFixture = {
  id: 'cashier-uuid-00000000-0000-0000-0000-000000000004',
  email: 'cashier@festival.test',
  passwordHash: VALID_PASSWORD_HASH,
  plainPassword: VALID_PASSWORD,
  firstName: 'Cash',
  lastName: 'Handler',
  phone: '+33642345678',
  role: UserRole.CASHIER,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  refreshToken: 'cashier-refresh-token',
  lastLoginAt: new Date('2024-01-04T10:00:00Z'),
  createdAt: new Date('2023-04-01T00:00:00Z'),
  updatedAt: new Date('2024-01-04T10:00:00Z'),
};

export const securityUser: UserFixture = {
  id: 'security-uuid-00000000-0000-0000-0000-000000000005',
  email: 'security@festival.test',
  passwordHash: VALID_PASSWORD_HASH,
  plainPassword: VALID_PASSWORD,
  firstName: 'Security',
  lastName: 'Guard',
  phone: '+33652345678',
  role: UserRole.SECURITY,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  refreshToken: 'security-refresh-token',
  lastLoginAt: new Date('2024-01-05T10:00:00Z'),
  createdAt: new Date('2023-05-01T00:00:00Z'),
  updatedAt: new Date('2024-01-05T10:00:00Z'),
};

export const regularUser: UserFixture = {
  id: 'user-uuid-00000000-0000-0000-0000-000000000006',
  email: 'user@festival.test',
  passwordHash: VALID_PASSWORD_HASH,
  plainPassword: VALID_PASSWORD,
  firstName: 'Regular',
  lastName: 'Attendee',
  phone: '+33662345678',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  refreshToken: 'user-refresh-token',
  lastLoginAt: new Date('2024-01-06T10:00:00Z'),
  createdAt: new Date('2023-06-01T00:00:00Z'),
  updatedAt: new Date('2024-01-06T10:00:00Z'),
};

// ============================================================================
// User Fixtures by Status
// ============================================================================

export const unverifiedUser: UserFixture = {
  id: 'unverified-uuid-00000000-0000-0000-0000-000000000007',
  email: 'unverified@festival.test',
  passwordHash: VALID_PASSWORD_HASH,
  plainPassword: VALID_PASSWORD,
  firstName: 'Unverified',
  lastName: 'User',
  phone: null,
  role: UserRole.USER,
  status: UserStatus.PENDING_VERIFICATION,
  emailVerified: false,
  refreshToken: null,
  lastLoginAt: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const bannedUser: UserFixture = {
  id: 'banned-uuid-00000000-0000-0000-0000-000000000008',
  email: 'banned@festival.test',
  passwordHash: VALID_PASSWORD_HASH,
  plainPassword: VALID_PASSWORD,
  firstName: 'Banned',
  lastName: 'User',
  phone: '+33672345678',
  role: UserRole.USER,
  status: UserStatus.BANNED,
  emailVerified: true,
  refreshToken: null,
  lastLoginAt: new Date('2023-12-01T10:00:00Z'),
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2023-12-01T10:00:00Z'),
};

export const inactiveUser: UserFixture = {
  id: 'inactive-uuid-00000000-0000-0000-0000-000000000009',
  email: 'inactive@festival.test',
  passwordHash: VALID_PASSWORD_HASH,
  plainPassword: VALID_PASSWORD,
  firstName: 'Inactive',
  lastName: 'User',
  phone: '+33682345678',
  role: UserRole.USER,
  status: UserStatus.INACTIVE,
  emailVerified: true,
  refreshToken: null,
  lastLoginAt: new Date('2022-12-01T10:00:00Z'),
  createdAt: new Date('2022-01-01T00:00:00Z'),
  updatedAt: new Date('2023-06-01T00:00:00Z'),
};

// ============================================================================
// Test Input Data
// ============================================================================

export const validRegistrationInput: CreateUserInput = {
  email: 'newuser@festival.test',
  password: VALID_PASSWORD,
  firstName: 'New',
  lastName: 'User',
  phone: '+33692345678',
};

export const validLoginInput = {
  email: regularUser.email,
  password: VALID_PASSWORD,
};

export const invalidLoginInputs = {
  wrongEmail: {
    email: 'nonexistent@festival.test',
    password: VALID_PASSWORD,
  },
  wrongPassword: {
    email: regularUser.email,
    password: 'WrongPassword123!',
  },
  invalidEmailFormat: {
    email: 'not-an-email',
    password: VALID_PASSWORD,
  },
  emptyEmail: {
    email: '',
    password: VALID_PASSWORD,
  },
  emptyPassword: {
    email: regularUser.email,
    password: '',
  },
};

export const invalidRegistrationInputs = {
  duplicateEmail: {
    email: regularUser.email,
    password: VALID_PASSWORD,
    firstName: 'Duplicate',
    lastName: 'Email',
  },
  invalidEmail: {
    email: 'not-an-email',
    password: VALID_PASSWORD,
    firstName: 'Invalid',
    lastName: 'Email',
  },
  weakPassword: {
    email: 'weak@festival.test',
    password: '123',
    firstName: 'Weak',
    lastName: 'Password',
  },
  missingFirstName: {
    email: 'missing@festival.test',
    password: VALID_PASSWORD,
    firstName: '',
    lastName: 'User',
  },
  missingLastName: {
    email: 'missing@festival.test',
    password: VALID_PASSWORD,
    firstName: 'User',
    lastName: '',
  },
};

// ============================================================================
// Collection of All Users
// ============================================================================

export const allUserFixtures: UserFixture[] = [
  adminUser,
  organizerUser,
  staffUser,
  cashierUser,
  securityUser,
  regularUser,
  unverifiedUser,
  bannedUser,
  inactiveUser,
];

export const activeUserFixtures: UserFixture[] = [
  adminUser,
  organizerUser,
  staffUser,
  cashierUser,
  securityUser,
  regularUser,
];

// ============================================================================
// Factory Functions
// ============================================================================

let userCounter = 0;

/**
 * Creates a unique user fixture with optional overrides
 */
export function createUserFixture(overrides: Partial<UserFixture> = {}): UserFixture {
  userCounter++;
  const timestamp = Date.now();
  const uniqueId = `test-${timestamp}-${userCounter}`;

  return {
    id: `user-uuid-${uniqueId}`,
    email: `user-${uniqueId}@festival.test`,
    passwordHash: VALID_PASSWORD_HASH,
    plainPassword: VALID_PASSWORD,
    firstName: `First${userCounter}`,
    lastName: `Last${userCounter}`,
    phone: null,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    refreshToken: null,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates multiple unique user fixtures
 */
export function createUserFixtures(count: number, overrides: Partial<UserFixture> = {}): UserFixture[] {
  return Array.from({ length: count }, () => createUserFixture(overrides));
}

/**
 * Converts a UserFixture to the format expected by Prisma (without plainPassword)
 */
export function toPrismaUser(fixture: UserFixture) {
  const { plainPassword, ...prismaUser } = fixture;
  return prismaUser;
}

/**
 * Converts multiple UserFixtures to Prisma format
 */
export function toPrismaUsers(fixtures: UserFixture[]) {
  return fixtures.map(toPrismaUser);
}
