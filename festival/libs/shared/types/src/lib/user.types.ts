/**
 * User Types
 * Types for user management, authentication, and authorization
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * User role for RBAC
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  ORGANIZER = 'organizer',
  STAFF = 'staff',
  VENDOR = 'vendor',
  ARTIST = 'artist',
  ATTENDEE = 'attendee',
  GUEST = 'guest',
}

/**
 * User status
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  PENDING_VERIFICATION = 'pending_verification',
  PENDING_APPROVAL = 'pending_approval',
}

/**
 * Verification status
 */
export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  EMAIL_VERIFIED = 'email_verified',
  PHONE_VERIFIED = 'phone_verified',
  FULLY_VERIFIED = 'fully_verified',
  ID_VERIFIED = 'id_verified',
}

/**
 * OAuth provider
 */
export enum OAuthProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
  TWITTER = 'twitter',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Main User interface
 */
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  displayName?: string;
  role: UserRole;
  status: UserStatus;
  verificationStatus: VerificationStatus;
  phoneNumber?: string;
  phoneVerified?: boolean;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: UserAddress;
  preferences: UserPreferences;
  emergencyContact?: EmergencyContact;
  gdprConsent: GdprConsent;
  oauthProviders?: OAuthConnection[];
  lastLoginAt?: string;
  lastActiveAt?: string;
  loginCount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Gender options
 */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

/**
 * User address
 */
export interface UserAddress {
  street: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

/**
 * User preferences
 */
export interface UserPreferences {
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  notifications: NotificationPreferences;
  accessibility: AccessibilityPreferences;
  privacy: PrivacyPreferences;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  festivalUpdates: boolean;
  artistAnnouncements: boolean;
  ticketReminders: boolean;
  cashlessAlerts: boolean;
}

/**
 * Accessibility preferences
 */
export interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  screenReader: boolean;
  largeText: boolean;
}

/**
 * Privacy preferences
 */
export interface PrivacyPreferences {
  profileVisibility: 'public' | 'friends' | 'private';
  showOnlineStatus: boolean;
  allowFriendRequests: boolean;
  shareActivity: boolean;
}

/**
 * Emergency contact
 */
export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
}

/**
 * GDPR consent tracking
 */
export interface GdprConsent {
  termsAccepted: boolean;
  termsAcceptedAt?: string;
  privacyAccepted: boolean;
  privacyAcceptedAt?: string;
  marketingConsent: boolean;
  marketingConsentAt?: string;
  dataProcessingConsent: boolean;
  dataProcessingConsentAt?: string;
}

/**
 * OAuth connection
 */
export interface OAuthConnection {
  provider: OAuthProvider;
  providerId: string;
  email?: string;
  connectedAt: string;
}

/**
 * User session
 */
export interface UserSession {
  id: string;
  userId: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Device information
 */
export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  os: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  appVersion?: string;
  deviceId?: string;
}

/**
 * User activity log entry
 */
export interface UserActivity {
  id: string;
  userId: string;
  action: UserAction;
  details?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

/**
 * User action types for activity log
 */
export enum UserAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  PROFILE_UPDATE = 'profile_update',
  EMAIL_CHANGE = 'email_change',
  PHONE_CHANGE = 'phone_change',
  PREFERENCES_UPDATE = 'preferences_update',
  TICKET_PURCHASE = 'ticket_purchase',
  CASHLESS_TOPUP = 'cashless_topup',
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_DELETED = 'account_deleted',
  TWO_FA_ENABLED = 'two_fa_enabled',
  TWO_FA_DISABLED = 'two_fa_disabled',
}

/**
 * User summary for lists
 */
export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
}

/**
 * User public profile
 */
export interface UserPublicProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a user
 */
export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  phoneNumber?: string;
  dateOfBirth?: string;
  gdprConsent: {
    termsAccepted: boolean;
    privacyAccepted: boolean;
    marketingConsent?: boolean;
  };
}

/**
 * DTO for updating a user
 */
export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: UserAddress;
  emergencyContact?: EmergencyContact;
}

/**
 * DTO for updating preferences
 */
export interface UpdatePreferencesDto {
  language?: string;
  timezone?: string;
  currency?: string;
  notifications?: Partial<NotificationPreferences>;
  accessibility?: Partial<AccessibilityPreferences>;
  privacy?: Partial<PrivacyPreferences>;
}

/**
 * DTO for login
 */
export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: Partial<DeviceInfo>;
}

/**
 * DTO for OAuth login
 */
export interface OAuthLoginDto {
  provider: OAuthProvider;
  accessToken: string;
  idToken?: string;
}

/**
 * DTO for registration
 */
export interface RegisterDto extends CreateUserDto {
  confirmPassword: string;
}

/**
 * DTO for password reset request
 */
export interface ForgotPasswordDto {
  email: string;
}

/**
 * DTO for password reset
 */
export interface ResetPasswordDto {
  token: string;
  password: string;
  confirmPassword: string;
}

/**
 * DTO for password change
 */
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * DTO for email verification
 */
export interface VerifyEmailDto {
  token: string;
}

/**
 * DTO for phone verification
 */
export interface VerifyPhoneDto {
  code: string;
}

/**
 * Auth response
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: Omit<User, 'gdprConsent' | 'oauthProviders' | 'metadata'>;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

/**
 * User filters for queries
 */
export interface UserFilters {
  role?: UserRole | UserRole[];
  status?: UserStatus | UserStatus[];
  verificationStatus?: VerificationStatus;
  emailVerified?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid UserRole
 */
export function isUserRole(value: unknown): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

/**
 * Check if value is a valid UserStatus
 */
export function isUserStatus(value: unknown): value is UserStatus {
  return Object.values(UserStatus).includes(value as UserStatus);
}

/**
 * Check if user is active
 */
export function isUserActive(user: User): boolean {
  return user.status === UserStatus.ACTIVE && user.emailVerified;
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(user: User): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role);
}

/**
 * Check if user is staff or higher
 */
export function isStaffOrHigher(user: User): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF].includes(user.role);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get user's full name
 */
export function getFullName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

/**
 * Get user's display name or full name
 */
export function getDisplayName(user: Pick<User, 'firstName' | 'lastName' | 'displayName'>): string {
  return user.displayName || getFullName(user);
}

/**
 * Get user's initials
 */
export function getInitials(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'Super Admin',
    [UserRole.ADMIN]: 'Administrateur',
    [UserRole.ORGANIZER]: 'Organisateur',
    [UserRole.STAFF]: 'Staff',
    [UserRole.VENDOR]: 'Vendeur',
    [UserRole.ARTIST]: 'Artiste',
    [UserRole.ATTENDEE]: 'Participant',
    [UserRole.GUEST]: 'Invite',
  };
  return names[role];
}

/**
 * Get status display name
 */
export function getStatusDisplayName(status: UserStatus): string {
  const names: Record<UserStatus, string> = {
    [UserStatus.ACTIVE]: 'Actif',
    [UserStatus.INACTIVE]: 'Inactif',
    [UserStatus.SUSPENDED]: 'Suspendu',
    [UserStatus.BANNED]: 'Banni',
    [UserStatus.PENDING_VERIFICATION]: 'En attente de verification',
    [UserStatus.PENDING_APPROVAL]: 'En attente d\'approbation',
  };
  return names[status];
}
