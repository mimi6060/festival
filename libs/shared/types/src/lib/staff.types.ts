/**
 * Staff Types
 * Types for staff management, shifts, and scheduling
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Staff role
 */
export enum StaffRole {
  COORDINATOR = 'coordinator',
  TEAM_LEADER = 'team_leader',
  SECURITY = 'security',
  ENTRY_CONTROL = 'entry_control',
  CASHIER = 'cashier',
  BAR = 'bar',
  FOOD = 'food',
  CLEANING = 'cleaning',
  MEDICAL = 'medical',
  TECHNICAL = 'technical',
  LOGISTICS = 'logistics',
  HOSPITALITY = 'hospitality',
  ARTIST_LIAISON = 'artist_liaison',
  VOLUNTEER = 'volunteer',
  RUNNER = 'runner',
  PARKING = 'parking',
  INFORMATION = 'information',
  OTHER = 'other',
}

/**
 * Staff status
 */
export enum StaffStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  ACTIVE = 'active',
  ON_BREAK = 'on_break',
  OFF_DUTY = 'off_duty',
  TERMINATED = 'terminated',
  SUSPENDED = 'suspended',
}

/**
 * Contract type
 */
export enum ContractType {
  EMPLOYEE = 'employee',
  CONTRACTOR = 'contractor',
  VOLUNTEER = 'volunteer',
  INTERN = 'intern',
}

/**
 * Shift status
 */
export enum ShiftStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  PARTIAL = 'partial',
}

/**
 * Check-in/out status
 */
export enum AttendanceStatus {
  ON_TIME = 'on_time',
  LATE = 'late',
  EARLY = 'early',
  ABSENT = 'absent',
  EXCUSED = 'excused',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Staff member
 */
export interface StaffMember {
  id: string;
  festivalId: string;
  userId: string;
  employeeNumber?: string;
  role: StaffRole;
  status: StaffStatus;
  contractType: ContractType;
  department?: string;
  supervisor?: string;
  supervisorId?: string;
  contactInfo: StaffContactInfo;
  emergencyContact: EmergencyContact;
  skills: string[];
  certifications: Certification[];
  languages: string[];
  uniformSize?: UniformSize;
  dietaryRestrictions?: string[];
  accessCredentials?: StaffAccessCredentials;
  availability: StaffAvailability;
  payInfo?: StaffPayInfo;
  notes?: string;
  hiredAt: string;
  terminatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Staff contact info
 */
export interface StaffContactInfo {
  email: string;
  phone: string;
  phoneSecondary?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

/**
 * Emergency contact
 */
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  phoneSecondary?: string;
}

/**
 * Certification
 */
export interface Certification {
  name: string;
  type: 'license' | 'certificate' | 'training';
  issuedBy?: string;
  issuedAt: string;
  expiresAt?: string;
  documentUrl?: string;
}

/**
 * Uniform size
 */
export interface UniformSize {
  shirt: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
  pants?: string;
  shoes?: string;
}

/**
 * Staff access credentials
 */
export interface StaffAccessCredentials {
  badgeId?: string;
  nfcId?: string;
  pinCode?: string;
  accessZones: string[];
  accessLevel: number;
}

/**
 * Staff availability
 */
export interface StaffAvailability {
  availableDates: string[];
  unavailableDates: string[];
  preferredShifts: ShiftPreference[];
  maxHoursPerDay?: number;
  maxHoursPerWeek?: number;
  notes?: string;
}

/**
 * Shift preference
 */
export interface ShiftPreference {
  date: string;
  startTime: string;
  endTime: string;
  priority: 'preferred' | 'available' | 'if_needed';
}

/**
 * Staff pay info
 */
export interface StaffPayInfo {
  hourlyRate?: number;
  dailyRate?: number;
  currency: string;
  paymentMethod: 'bank_transfer' | 'check' | 'cash' | 'other';
  bankDetails?: {
    bankName: string;
    iban: string;
    bic: string;
    accountHolder: string;
  };
  taxId?: string;
}

/**
 * Shift
 */
export interface Shift {
  id: string;
  festivalId: string;
  staffId: string;
  role: StaffRole;
  status: ShiftStatus;
  date: string;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  location?: string;
  zoneId?: string;
  zoneName?: string;
  gateId?: string;
  gateName?: string;
  supervisorId?: string;
  supervisorName?: string;
  tasks: ShiftTask[];
  notes?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  attendance?: ShiftAttendance;
  createdAt: string;
  updatedAt: string;
}

/**
 * Shift task
 */
export interface ShiftTask {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

/**
 * Shift attendance
 */
export interface ShiftAttendance {
  checkInTime?: string;
  checkInStatus?: AttendanceStatus;
  checkInLocation?: {
    latitude: number;
    longitude: number;
  };
  checkInMethod?: 'app' | 'nfc' | 'qr' | 'manual';
  checkOutTime?: string;
  checkOutLocation?: {
    latitude: number;
    longitude: number;
  };
  breaks: BreakRecord[];
  totalWorkedMinutes?: number;
  overtime?: number;
  notes?: string;
}

/**
 * Break record
 */
export interface BreakRecord {
  startTime: string;
  endTime?: string;
  duration?: number;
  type: 'meal' | 'rest' | 'other';
}

/**
 * Shift with staff details
 */
export interface ShiftWithStaff extends Shift {
  staff: StaffMember;
}

/**
 * Staff with shifts
 */
export interface StaffWithShifts extends StaffMember {
  shifts: Shift[];
  totalHoursScheduled: number;
  totalHoursWorked: number;
}

/**
 * Staff schedule view
 */
export interface StaffSchedule {
  festivalId: string;
  date: string;
  shifts: ShiftWithStaff[];
  totalStaff: number;
  byRole: RoleScheduleSummary[];
  byZone: ZoneScheduleSummary[];
}

/**
 * Role schedule summary
 */
export interface RoleScheduleSummary {
  role: StaffRole;
  roleName: string;
  staffCount: number;
  shifts: Shift[];
}

/**
 * Zone schedule summary
 */
export interface ZoneScheduleSummary {
  zoneId: string;
  zoneName: string;
  staffCount: number;
  shifts: Shift[];
}

/**
 * Staff statistics
 */
export interface StaffStats {
  festivalId: string;
  totalStaff: number;
  byRole: { role: StaffRole; count: number }[];
  byStatus: { status: StaffStatus; count: number }[];
  byContractType: { type: ContractType; count: number }[];
  totalShifts: number;
  averageHoursPerStaff: number;
  attendanceRate: number;
  noShowRate: number;
}

/**
 * Staff summary
 */
export interface StaffSummary {
  id: string;
  userId: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  status: StaffStatus;
  phone: string;
  avatarUrl?: string;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a staff member
 */
export interface CreateStaffMemberDto {
  userId: string;
  role: StaffRole;
  contractType: ContractType;
  department?: string;
  supervisorId?: string;
  contactInfo: StaffContactInfo;
  emergencyContact: EmergencyContact;
  skills?: string[];
  certifications?: Omit<Certification, 'id'>[];
  languages?: string[];
  uniformSize?: UniformSize;
  dietaryRestrictions?: string[];
  availability?: Partial<StaffAvailability>;
  payInfo?: Partial<StaffPayInfo>;
  notes?: string;
}

/**
 * DTO for updating a staff member
 */
export interface UpdateStaffMemberDto {
  role?: StaffRole;
  status?: StaffStatus;
  contractType?: ContractType;
  department?: string;
  supervisorId?: string;
  contactInfo?: Partial<StaffContactInfo>;
  emergencyContact?: Partial<EmergencyContact>;
  skills?: string[];
  certifications?: Certification[];
  languages?: string[];
  uniformSize?: UniformSize;
  dietaryRestrictions?: string[];
  accessCredentials?: Partial<StaffAccessCredentials>;
  availability?: Partial<StaffAvailability>;
  payInfo?: Partial<StaffPayInfo>;
  notes?: string;
}

/**
 * DTO for creating a shift
 */
export interface CreateShiftDto {
  staffId: string;
  role: StaffRole;
  date: string;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  location?: string;
  zoneId?: string;
  gateId?: string;
  supervisorId?: string;
  tasks?: Omit<ShiftTask, 'id' | 'isCompleted' | 'completedAt'>[];
  notes?: string;
}

/**
 * DTO for updating a shift
 */
export interface UpdateShiftDto {
  role?: StaffRole;
  status?: ShiftStatus;
  date?: string;
  startTime?: string;
  endTime?: string;
  breakDuration?: number;
  location?: string;
  zoneId?: string;
  gateId?: string;
  supervisorId?: string;
  tasks?: ShiftTask[];
  notes?: string;
}

/**
 * DTO for bulk creating shifts
 */
export interface BulkCreateShiftsDto {
  shifts: CreateShiftDto[];
}

/**
 * DTO for staff check-in
 */
export interface StaffCheckInDto {
  shiftId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  method?: 'app' | 'nfc' | 'qr' | 'manual';
}

/**
 * DTO for staff check-out
 */
export interface StaffCheckOutDto {
  shiftId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

/**
 * DTO for starting/ending break
 */
export interface BreakDto {
  shiftId: string;
  type: 'meal' | 'rest' | 'other';
}

/**
 * Staff filters
 */
export interface StaffFilters {
  festivalId?: string;
  role?: StaffRole | StaffRole[];
  status?: StaffStatus | StaffStatus[];
  contractType?: ContractType | ContractType[];
  department?: string;
  supervisorId?: string;
  hasShiftsOn?: string;
  isAvailableOn?: string;
  search?: string;
}

/**
 * Shift filters
 */
export interface ShiftFilters {
  festivalId?: string;
  staffId?: string;
  role?: StaffRole | StaffRole[];
  status?: ShiftStatus | ShiftStatus[];
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  zoneId?: string;
  supervisorId?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid StaffRole
 */
export function isStaffRole(value: unknown): value is StaffRole {
  return Object.values(StaffRole).includes(value as StaffRole);
}

/**
 * Check if value is a valid StaffStatus
 */
export function isStaffStatus(value: unknown): value is StaffStatus {
  return Object.values(StaffStatus).includes(value as StaffStatus);
}

/**
 * Check if value is a valid ShiftStatus
 */
export function isShiftStatus(value: unknown): value is ShiftStatus {
  return Object.values(ShiftStatus).includes(value as ShiftStatus);
}

/**
 * Check if staff member is active
 */
export function isStaffActive(staff: StaffMember): boolean {
  return [StaffStatus.ACTIVE, StaffStatus.ON_BREAK].includes(staff.status);
}

/**
 * Check if staff can check in to shift
 */
export function canCheckInToShift(shift: Shift): boolean {
  return [ShiftStatus.SCHEDULED, ShiftStatus.CONFIRMED].includes(shift.status);
}

/**
 * Check if shift is in progress
 */
export function isShiftInProgress(shift: Shift): boolean {
  return shift.status === ShiftStatus.IN_PROGRESS;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get staff role display name
 */
export function getStaffRoleDisplayName(role: StaffRole): string {
  const names: Record<StaffRole, string> = {
    [StaffRole.COORDINATOR]: 'Coordinateur',
    [StaffRole.TEAM_LEADER]: 'Chef d\'equipe',
    [StaffRole.SECURITY]: 'Securite',
    [StaffRole.ENTRY_CONTROL]: 'Controle d\'acces',
    [StaffRole.CASHIER]: 'Caissier',
    [StaffRole.BAR]: 'Bar',
    [StaffRole.FOOD]: 'Restauration',
    [StaffRole.CLEANING]: 'Nettoyage',
    [StaffRole.MEDICAL]: 'Medical',
    [StaffRole.TECHNICAL]: 'Technique',
    [StaffRole.LOGISTICS]: 'Logistique',
    [StaffRole.HOSPITALITY]: 'Accueil',
    [StaffRole.ARTIST_LIAISON]: 'Relations artistes',
    [StaffRole.VOLUNTEER]: 'Benevole',
    [StaffRole.RUNNER]: 'Runner',
    [StaffRole.PARKING]: 'Parking',
    [StaffRole.INFORMATION]: 'Information',
    [StaffRole.OTHER]: 'Autre',
  };
  return names[role];
}

/**
 * Get staff status display name
 */
export function getStaffStatusDisplayName(status: StaffStatus): string {
  const names: Record<StaffStatus, string> = {
    [StaffStatus.PENDING]: 'En attente',
    [StaffStatus.APPROVED]: 'Approuve',
    [StaffStatus.ACTIVE]: 'En service',
    [StaffStatus.ON_BREAK]: 'En pause',
    [StaffStatus.OFF_DUTY]: 'Hors service',
    [StaffStatus.TERMINATED]: 'Termine',
    [StaffStatus.SUSPENDED]: 'Suspendu',
  };
  return names[status];
}

/**
 * Get shift status display name
 */
export function getShiftStatusDisplayName(status: ShiftStatus): string {
  const names: Record<ShiftStatus, string> = {
    [ShiftStatus.SCHEDULED]: 'Planifie',
    [ShiftStatus.CONFIRMED]: 'Confirme',
    [ShiftStatus.IN_PROGRESS]: 'En cours',
    [ShiftStatus.COMPLETED]: 'Termine',
    [ShiftStatus.CANCELLED]: 'Annule',
    [ShiftStatus.NO_SHOW]: 'Absent',
    [ShiftStatus.PARTIAL]: 'Partiel',
  };
  return names[status];
}

/**
 * Calculate shift duration in hours
 */
export function calculateShiftDuration(shift: Shift): number {
  const [startHour = 0, startMin = 0] = shift.startTime.split(':').map(Number);
  const [endHour = 0, endMin = 0] = shift.endTime.split(':').map(Number);

  let duration = (endHour - startHour) + (endMin - startMin) / 60;
  if (duration < 0) duration += 24;

  if (shift.breakDuration) {
    duration -= shift.breakDuration / 60;
  }

  return Math.round(duration * 100) / 100;
}

/**
 * Calculate worked hours from attendance
 */
export function calculateWorkedHours(attendance: ShiftAttendance): number {
  if (!attendance.checkInTime || !attendance.checkOutTime) return 0;

  const checkIn = new Date(attendance.checkInTime);
  const checkOut = new Date(attendance.checkOutTime);

  let totalMinutes = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60);

  for (const breakRecord of attendance.breaks) {
    if (breakRecord.duration) {
      totalMinutes -= breakRecord.duration;
    }
  }

  return Math.round((totalMinutes / 60) * 100) / 100;
}

/**
 * Format shift time range
 */
export function formatShiftTime(shift: Shift): string {
  return `${shift.startTime} - ${shift.endTime}`;
}

/**
 * Get staff full name
 */
export function getStaffFullName(_staff: StaffMember, user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`;
}

/**
 * Check if certification is expired
 */
export function isCertificationExpired(cert: Certification): boolean {
  if (!cert.expiresAt) return false;
  return new Date(cert.expiresAt) < new Date();
}

/**
 * Check if certification expires soon (within 30 days)
 */
export function isCertificationExpiringSoon(cert: Certification, days = 30): boolean {
  if (!cert.expiresAt) return false;
  const expiryDate = new Date(cert.expiresAt);
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + days);
  return expiryDate <= warningDate && expiryDate > new Date();
}
