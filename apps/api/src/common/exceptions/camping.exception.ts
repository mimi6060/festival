import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ErrorCodes } from './error-codes';

/**
 * Camping/Accommodation-related business exceptions
 */

// ============================================
// CAMPING SPOT EXCEPTIONS
// ============================================

export class CampingSpotNotFoundException extends BaseException {
  constructor(spotId: string) {
    super(
      ErrorCodes.CAMPING_SPOT_NOT_FOUND,
      `Camping spot not found: ${spotId}`,
      HttpStatus.NOT_FOUND,
      { spotId },
    );
  }
}

export class CampingSpotUnavailableException extends BaseException {
  constructor(spotId: string, reason: string) {
    super(
      ErrorCodes.CAMPING_SPOT_UNAVAILABLE,
      `Camping spot unavailable: ${reason}`,
      HttpStatus.CONFLICT,
      { spotId, reason },
    );
  }
}

export class CampingSpotAlreadyBookedException extends BaseException {
  constructor(spotId: string, bookedFrom: Date, bookedTo: Date) {
    super(
      ErrorCodes.CAMPING_SPOT_ALREADY_BOOKED,
      `Camping spot already booked from ${bookedFrom.toISOString()} to ${bookedTo.toISOString()}`,
      HttpStatus.CONFLICT,
      {
        spotId,
        bookedFrom: bookedFrom.toISOString(),
        bookedTo: bookedTo.toISOString(),
      },
    );
  }
}

// ============================================
// CAMPING ZONE EXCEPTIONS
// ============================================

export class CampingZoneNotFoundException extends BaseException {
  constructor(zoneId: string) {
    super(
      ErrorCodes.CAMPING_ZONE_NOT_FOUND,
      `Camping zone not found: ${zoneId}`,
      HttpStatus.NOT_FOUND,
      { zoneId },
    );
  }
}

export class CampingZoneFullException extends BaseException {
  constructor(zoneId: string, zoneName: string, capacity: number) {
    super(
      ErrorCodes.CAMPING_ZONE_FULL,
      `Camping zone ${zoneName} is full (capacity: ${capacity})`,
      HttpStatus.CONFLICT,
      { zoneId, zoneName, capacity },
    );
  }
}

export class CampingZoneClosedException extends BaseException {
  constructor(zoneId: string, zoneName: string, reason?: string) {
    super(
      ErrorCodes.CAMPING_ZONE_CLOSED,
      `Camping zone ${zoneName} is closed${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      { zoneId, zoneName, reason },
    );
  }
}

// ============================================
// CAMPING BOOKING EXCEPTIONS
// ============================================

export class CampingBookingNotFoundException extends BaseException {
  constructor(bookingId: string) {
    super(
      ErrorCodes.CAMPING_BOOKING_NOT_FOUND,
      `Camping booking not found: ${bookingId}`,
      HttpStatus.NOT_FOUND,
      { bookingId },
    );
  }
}

export class CampingBookingAlreadyCancelledException extends BaseException {
  constructor(bookingId: string, cancelledAt: Date) {
    super(
      ErrorCodes.CAMPING_BOOKING_ALREADY_CANCELLED,
      `Camping booking already cancelled at ${cancelledAt.toISOString()}`,
      HttpStatus.CONFLICT,
      { bookingId, cancelledAt: cancelledAt.toISOString() },
    );
  }
}

export class CampingBookingInvalidDatesException extends BaseException {
  constructor(checkIn: Date, checkOut: Date, reason: string) {
    super(
      ErrorCodes.CAMPING_BOOKING_INVALID_DATES,
      `Invalid booking dates: ${reason}`,
      HttpStatus.BAD_REQUEST,
      {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        reason,
      },
    );
  }
}

export class CampingBookingMaxNightsExceededException extends BaseException {
  constructor(requestedNights: number, maxNights: number) {
    super(
      ErrorCodes.CAMPING_BOOKING_MAX_NIGHTS_EXCEEDED,
      `Maximum ${maxNights} nights allowed, requested ${requestedNights}`,
      HttpStatus.BAD_REQUEST,
      { requestedNights, maxNights },
    );
  }
}

// ============================================
// CHECK-IN/CHECK-OUT EXCEPTIONS
// ============================================

export class CampingCheckInTooEarlyException extends BaseException {
  constructor(bookingId: string, checkInTime: Date, allowedFrom: Date) {
    super(
      ErrorCodes.CAMPING_CHECKIN_TOO_EARLY,
      `Check-in not allowed until ${allowedFrom.toISOString()}`,
      HttpStatus.BAD_REQUEST,
      {
        bookingId,
        requestedTime: checkInTime.toISOString(),
        allowedFrom: allowedFrom.toISOString(),
      },
    );
  }
}

export class CampingCheckOutLateException extends BaseException {
  constructor(bookingId: string, checkOutTime: Date, deadline: Date, lateFee: number) {
    super(
      ErrorCodes.CAMPING_CHECKOUT_LATE,
      `Late check-out, deadline was ${deadline.toISOString()}`,
      HttpStatus.BAD_REQUEST,
      {
        bookingId,
        checkOutTime: checkOutTime.toISOString(),
        deadline: deadline.toISOString(),
        lateFee,
      },
    );
  }
}

export class CampingAlreadyCheckedInException extends BaseException {
  constructor(bookingId: string, checkedInAt: Date) {
    super(
      ErrorCodes.CAMPING_ALREADY_CHECKED_IN,
      `Already checked in at ${checkedInAt.toISOString()}`,
      HttpStatus.CONFLICT,
      { bookingId, checkedInAt: checkedInAt.toISOString() },
    );
  }
}

export class CampingNotCheckedInException extends BaseException {
  constructor(bookingId: string) {
    super(
      ErrorCodes.CAMPING_NOT_CHECKED_IN,
      `Cannot check out: not checked in yet`,
      HttpStatus.BAD_REQUEST,
      { bookingId },
    );
  }
}

// ============================================
// VEHICLE EXCEPTIONS
// ============================================

export class VehicleNotAllowedException extends BaseException {
  constructor(zoneId: string, vehicleType: string) {
    super(
      ErrorCodes.CAMPING_VEHICLE_NOT_ALLOWED,
      `Vehicle type ${vehicleType} not allowed in this zone`,
      HttpStatus.FORBIDDEN,
      { zoneId, vehicleType },
    );
  }
}

export class VehicleSizeLimitExceededException extends BaseException {
  constructor(spotId: string, maxLength: number, maxWidth: number, actualLength: number, actualWidth: number) {
    super(
      ErrorCodes.CAMPING_VEHICLE_SIZE_EXCEEDED,
      `Vehicle exceeds spot size limits (max: ${maxLength}x${maxWidth}m)`,
      HttpStatus.BAD_REQUEST,
      { spotId, maxLength, maxWidth, actualLength, actualWidth },
    );
  }
}
