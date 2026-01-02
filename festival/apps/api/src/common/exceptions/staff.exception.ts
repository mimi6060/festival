import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ErrorCodes } from './error-codes';

/**
 * Staff-related business exceptions
 */

// ============================================
// STAFF SHIFT EXCEPTIONS
// ============================================

export class ShiftNotFoundException extends BaseException {
  constructor(shiftId: string) {
    super(
      ErrorCodes.STAFF_SHIFT_NOT_FOUND,
      `Shift not found: ${shiftId}`,
      HttpStatus.NOT_FOUND,
      { shiftId },
    );
  }
}

export class ShiftOverlapException extends BaseException {
  constructor(staffId: string, existingShiftId: string, startTime: Date, endTime: Date) {
    super(
      ErrorCodes.STAFF_SHIFT_OVERLAP,
      `Shift overlaps with existing shift ${existingShiftId}`,
      HttpStatus.CONFLICT,
      {
        staffId,
        existingShiftId,
        requestedStart: startTime.toISOString(),
        requestedEnd: endTime.toISOString(),
      },
    );
  }
}

export class ShiftAlreadyStartedException extends BaseException {
  constructor(shiftId: string, startedAt: Date) {
    super(
      ErrorCodes.STAFF_SHIFT_ALREADY_STARTED,
      `Shift already started at ${startedAt.toISOString()}`,
      HttpStatus.CONFLICT,
      { shiftId, startedAt: startedAt.toISOString() },
    );
  }
}

export class ShiftNotStartedException extends BaseException {
  constructor(shiftId: string) {
    super(
      ErrorCodes.STAFF_SHIFT_NOT_STARTED,
      `Shift has not started yet: ${shiftId}`,
      HttpStatus.BAD_REQUEST,
      { shiftId },
    );
  }
}

export class ShiftAlreadyEndedException extends BaseException {
  constructor(shiftId: string, endedAt: Date) {
    super(
      ErrorCodes.STAFF_SHIFT_ALREADY_ENDED,
      `Shift already ended at ${endedAt.toISOString()}`,
      HttpStatus.CONFLICT,
      { shiftId, endedAt: endedAt.toISOString() },
    );
  }
}

export class MaxHoursExceededException extends BaseException {
  constructor(staffId: string, maxHours: number, requestedHours: number, period: 'daily' | 'weekly') {
    super(
      ErrorCodes.STAFF_MAX_HOURS_EXCEEDED,
      `${period} hours limit exceeded: max ${maxHours}h, requested ${requestedHours}h`,
      HttpStatus.BAD_REQUEST,
      { staffId, maxHours, requestedHours, period },
    );
  }
}

// ============================================
// STAFF MEMBER EXCEPTIONS
// ============================================

export class StaffMemberNotFoundException extends BaseException {
  constructor(staffId: string) {
    super(
      ErrorCodes.STAFF_NOT_FOUND,
      `Staff member not found: ${staffId}`,
      HttpStatus.NOT_FOUND,
      { staffId },
    );
  }
}

export class StaffMemberAlreadyExistsException extends BaseException {
  constructor(email: string, festivalId: string) {
    super(
      ErrorCodes.STAFF_ALREADY_EXISTS,
      `Staff member already exists for this festival: ${email}`,
      HttpStatus.CONFLICT,
      { email, festivalId },
    );
  }
}

export class StaffNotAssignedToZoneException extends BaseException {
  constructor(staffId: string, zoneId: string) {
    super(
      ErrorCodes.STAFF_NOT_ASSIGNED_TO_ZONE,
      `Staff member not assigned to zone: ${zoneId}`,
      HttpStatus.FORBIDDEN,
      { staffId, zoneId },
    );
  }
}

export class StaffAccountInactiveException extends BaseException {
  constructor(staffId: string) {
    super(
      ErrorCodes.STAFF_ACCOUNT_INACTIVE,
      `Staff account is inactive: ${staffId}`,
      HttpStatus.FORBIDDEN,
      { staffId },
    );
  }
}

export class StaffBadgeExpiredException extends BaseException {
  constructor(staffId: string, expiryDate: Date) {
    super(
      ErrorCodes.STAFF_BADGE_EXPIRED,
      `Staff badge expired at ${expiryDate.toISOString()}`,
      HttpStatus.FORBIDDEN,
      { staffId, expiryDate: expiryDate.toISOString() },
    );
  }
}

// ============================================
// STAFF PERMISSION EXCEPTIONS
// ============================================

export class StaffInsufficientPermissionException extends BaseException {
  constructor(staffId: string, requiredPermission: string) {
    super(
      ErrorCodes.STAFF_INSUFFICIENT_PERMISSION,
      `Staff member lacks required permission: ${requiredPermission}`,
      HttpStatus.FORBIDDEN,
      { staffId, requiredPermission },
    );
  }
}

export class StaffRoleNotAllowedException extends BaseException {
  constructor(staffId: string, currentRole: string, requiredRoles: string[]) {
    super(
      ErrorCodes.STAFF_ROLE_NOT_ALLOWED,
      `Staff role ${currentRole} is not allowed for this action`,
      HttpStatus.FORBIDDEN,
      { staffId, currentRole, requiredRoles },
    );
  }
}
