import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ErrorCodes } from './error-codes';

/**
 * Program/Event-related business exceptions (Artists, Stages, Performances)
 */

// ============================================
// ARTIST EXCEPTIONS
// ============================================

export class ArtistNotFoundException extends BaseException {
  constructor(artistId: string) {
    super(
      ErrorCodes.ARTIST_NOT_FOUND,
      `Artist not found: ${artistId}`,
      HttpStatus.NOT_FOUND,
      { artistId },
    );
  }
}

export class ArtistAlreadyBookedException extends BaseException {
  constructor(artistId: string, artistName: string, conflictingDate: Date) {
    super(
      ErrorCodes.ARTIST_ALREADY_BOOKED,
      `Artist ${artistName} already has a booking on ${conflictingDate.toISOString()}`,
      HttpStatus.CONFLICT,
      { artistId, artistName, conflictingDate: conflictingDate.toISOString() },
    );
  }
}

export class ArtistContractNotSignedException extends BaseException {
  constructor(artistId: string, artistName: string) {
    super(
      ErrorCodes.ARTIST_CONTRACT_NOT_SIGNED,
      `Contract not signed for artist: ${artistName}`,
      HttpStatus.BAD_REQUEST,
      { artistId, artistName },
    );
  }
}

export class ArtistCancelledException extends BaseException {
  constructor(artistId: string, artistName: string, cancellationReason?: string) {
    super(
      ErrorCodes.ARTIST_CANCELLED,
      `Artist ${artistName} has been cancelled${cancellationReason ? `: ${cancellationReason}` : ''}`,
      HttpStatus.GONE,
      { artistId, artistName, cancellationReason },
    );
  }
}

// ============================================
// STAGE EXCEPTIONS
// ============================================

export class StageNotFoundException extends BaseException {
  constructor(stageId: string) {
    super(
      ErrorCodes.STAGE_NOT_FOUND,
      `Stage not found: ${stageId}`,
      HttpStatus.NOT_FOUND,
      { stageId },
    );
  }
}

export class StageClosedException extends BaseException {
  constructor(stageId: string, stageName: string, reason?: string) {
    super(
      ErrorCodes.STAGE_CLOSED,
      `Stage ${stageName} is closed${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      { stageId, stageName, reason },
    );
  }
}

export class StageTechnicalIssueException extends BaseException {
  constructor(stageId: string, stageName: string, issueDescription: string) {
    super(
      ErrorCodes.STAGE_TECHNICAL_ISSUE,
      `Technical issue at ${stageName}: ${issueDescription}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { stageId, stageName, issueDescription },
    );
  }
}

export class StageCapacityExceededException extends BaseException {
  constructor(stageId: string, stageName: string, capacity: number, currentCount: number) {
    super(
      ErrorCodes.STAGE_CAPACITY_EXCEEDED,
      `Stage ${stageName} capacity exceeded (${currentCount}/${capacity})`,
      HttpStatus.CONFLICT,
      { stageId, stageName, capacity, currentCount },
    );
  }
}

// ============================================
// PERFORMANCE EXCEPTIONS
// ============================================

export class PerformanceNotFoundException extends BaseException {
  constructor(performanceId: string) {
    super(
      ErrorCodes.PERFORMANCE_NOT_FOUND,
      `Performance not found: ${performanceId}`,
      HttpStatus.NOT_FOUND,
      { performanceId },
    );
  }
}

export class PerformanceTimeConflictException extends BaseException {
  constructor(
    stageId: string,
    stageName: string,
    conflictingPerformanceId: string,
    requestedStart: Date,
    requestedEnd: Date,
  ) {
    super(
      ErrorCodes.PERFORMANCE_TIME_CONFLICT,
      `Performance time conflicts with existing schedule on ${stageName}`,
      HttpStatus.CONFLICT,
      {
        stageId,
        stageName,
        conflictingPerformanceId,
        requestedStart: requestedStart.toISOString(),
        requestedEnd: requestedEnd.toISOString(),
      },
    );
  }
}

export class PerformanceCancelledException extends BaseException {
  constructor(performanceId: string, artistName: string, reason?: string) {
    super(
      ErrorCodes.PERFORMANCE_CANCELLED,
      `Performance by ${artistName} has been cancelled${reason ? `: ${reason}` : ''}`,
      HttpStatus.GONE,
      { performanceId, artistName, reason },
    );
  }
}

export class PerformanceDelayedException extends BaseException {
  constructor(performanceId: string, artistName: string, newStartTime: Date, delayMinutes: number) {
    super(
      ErrorCodes.PERFORMANCE_DELAYED,
      `Performance by ${artistName} delayed by ${delayMinutes} minutes`,
      HttpStatus.OK,
      {
        performanceId,
        artistName,
        newStartTime: newStartTime.toISOString(),
        delayMinutes,
      },
    );
  }
}

export class PerformanceNotStartedException extends BaseException {
  constructor(performanceId: string, scheduledStart: Date) {
    super(
      ErrorCodes.PERFORMANCE_NOT_STARTED,
      `Performance has not started yet (scheduled: ${scheduledStart.toISOString()})`,
      HttpStatus.BAD_REQUEST,
      { performanceId, scheduledStart: scheduledStart.toISOString() },
    );
  }
}

export class PerformanceAlreadyEndedException extends BaseException {
  constructor(performanceId: string, endedAt: Date) {
    super(
      ErrorCodes.PERFORMANCE_ALREADY_ENDED,
      `Performance already ended at ${endedAt.toISOString()}`,
      HttpStatus.BAD_REQUEST,
      { performanceId, endedAt: endedAt.toISOString() },
    );
  }
}

// ============================================
// SCHEDULE EXCEPTIONS
// ============================================

export class ScheduleConflictException extends BaseException {
  constructor(
    conflicts: { stageId: string; performanceId: string; time: string }[],
  ) {
    super(
      ErrorCodes.SCHEDULE_CONFLICT,
      `Schedule has ${conflicts.length} conflict(s)`,
      HttpStatus.CONFLICT,
      { conflicts },
    );
  }
}

export class ScheduleLockedExeption extends BaseException {
  constructor(festivalId: string, lockedAt: Date, lockedBy: string) {
    super(
      ErrorCodes.SCHEDULE_LOCKED,
      `Schedule is locked and cannot be modified`,
      HttpStatus.FORBIDDEN,
      { festivalId, lockedAt: lockedAt.toISOString(), lockedBy },
    );
  }
}

export class SetlistNotFoundException extends BaseException {
  constructor(performanceId: string) {
    super(
      ErrorCodes.SETLIST_NOT_FOUND,
      `Setlist not found for performance: ${performanceId}`,
      HttpStatus.NOT_FOUND,
      { performanceId },
    );
  }
}
