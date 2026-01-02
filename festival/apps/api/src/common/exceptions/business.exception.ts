import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ErrorCodes } from './error-codes';

/**
 * Business logic exceptions for domain-specific errors
 */

// ============================================
// TICKET BUSINESS EXCEPTIONS
// ============================================
export class TicketSoldOutException extends BaseException {
  constructor(categoryId: string, categoryName?: string) {
    super(
      ErrorCodes.TICKET_SOLD_OUT,
      `Tickets sold out for category: ${categoryId}`,
      HttpStatus.CONFLICT,
      { categoryId, categoryName },
    );
  }
}

export class TicketQuotaExceededException extends BaseException {
  constructor(maxPerUser: number, requestedQty: number) {
    super(
      ErrorCodes.TICKET_QUOTA_EXCEEDED,
      `Quota exceeded: max ${maxPerUser}, requested ${requestedQty}`,
      HttpStatus.BAD_REQUEST,
      { maxPerUser, requestedQty },
    );
  }
}

export class TicketSaleNotStartedException extends BaseException {
  constructor(saleStartDate: Date) {
    super(
      ErrorCodes.TICKET_SALE_NOT_STARTED,
      `Ticket sale starts at: ${saleStartDate.toISOString()}`,
      HttpStatus.BAD_REQUEST,
      { saleStartDate: saleStartDate.toISOString() },
    );
  }
}

export class TicketSaleEndedException extends BaseException {
  constructor(saleEndDate: Date) {
    super(
      ErrorCodes.TICKET_SALE_ENDED,
      `Ticket sale ended at: ${saleEndDate.toISOString()}`,
      HttpStatus.BAD_REQUEST,
      { saleEndDate: saleEndDate.toISOString() },
    );
  }
}

export class TicketAlreadyUsedException extends BaseException {
  constructor(ticketId: string, usedAt: Date) {
    super(
      ErrorCodes.TICKET_ALREADY_USED,
      `Ticket already scanned at: ${usedAt.toISOString()}`,
      HttpStatus.CONFLICT,
      { ticketId, usedAt: usedAt.toISOString() },
    );
  }
}

export class TicketExpiredException extends BaseException {
  constructor(ticketId: string, expiryDate: Date) {
    super(
      ErrorCodes.TICKET_EXPIRED,
      `Ticket expired at: ${expiryDate.toISOString()}`,
      HttpStatus.BAD_REQUEST,
      { ticketId, expiryDate: expiryDate.toISOString() },
    );
  }
}

export class InvalidQRCodeException extends BaseException {
  constructor(reason: string) {
    super(
      ErrorCodes.TICKET_INVALID_QR,
      `Invalid QR code: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { reason },
    );
  }
}

// ============================================
// PAYMENT BUSINESS EXCEPTIONS
// ============================================
export class PaymentFailedException extends BaseException {
  constructor(reason: string, providerCode?: string) {
    super(
      ErrorCodes.PAYMENT_FAILED,
      `Payment failed: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { reason, providerCode },
    );
  }
}

export class PaymentDeclinedException extends BaseException {
  constructor(declineCode: string, declineMessage: string) {
    super(
      ErrorCodes.PAYMENT_DECLINED,
      `Payment declined: ${declineCode} - ${declineMessage}`,
      HttpStatus.BAD_REQUEST,
      { declineCode, declineMessage },
    );
  }
}

export class RefundFailedException extends BaseException {
  constructor(paymentId: string, reason: string) {
    super(
      ErrorCodes.PAYMENT_REFUND_FAILED,
      `Refund failed for payment ${paymentId}: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { paymentId, reason },
    );
  }
}

export class RefundPeriodExpiredException extends BaseException {
  constructor(paymentId: string, refundDeadline: Date) {
    super(
      ErrorCodes.PAYMENT_REFUND_PERIOD_EXPIRED,
      `Refund period expired for payment ${paymentId}`,
      HttpStatus.BAD_REQUEST,
      { paymentId, refundDeadline: refundDeadline.toISOString() },
    );
  }
}

export class AlreadyRefundedException extends BaseException {
  constructor(paymentId: string) {
    super(
      ErrorCodes.PAYMENT_ALREADY_REFUNDED,
      `Payment already refunded: ${paymentId}`,
      HttpStatus.CONFLICT,
      { paymentId },
    );
  }
}

export class InvalidWebhookException extends BaseException {
  constructor(reason: string) {
    super(
      ErrorCodes.PAYMENT_WEBHOOK_INVALID,
      `Invalid webhook: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { reason },
    );
  }
}

// ============================================
// CASHLESS BUSINESS EXCEPTIONS
// ============================================
export class InsufficientBalanceException extends BaseException {
  constructor(currentBalance: number, requiredAmount: number, currency: string) {
    super(
      ErrorCodes.CASHLESS_INSUFFICIENT_BALANCE,
      `Insufficient balance: ${currentBalance} ${currency}, required: ${requiredAmount} ${currency}`,
      HttpStatus.BAD_REQUEST,
      { currentBalance, requiredAmount, currency },
    );
  }
}

export class CashlessAccountDisabledException extends BaseException {
  constructor(accountId: string) {
    super(
      ErrorCodes.CASHLESS_ACCOUNT_DISABLED,
      `Cashless account disabled: ${accountId}`,
      HttpStatus.FORBIDDEN,
      { accountId },
    );
  }
}

export class TopupFailedException extends BaseException {
  constructor(reason: string) {
    super(
      ErrorCodes.CASHLESS_TOPUP_FAILED,
      `Topup failed: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { reason },
    );
  }
}

export class CashlessTransferFailedException extends BaseException {
  constructor(fromAccountId: string, toAccountId: string, reason: string) {
    super(
      ErrorCodes.CASHLESS_TRANSFER_FAILED,
      `Transfer failed: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { fromAccountId, toAccountId, reason },
    );
  }
}

export class InvalidNFCTagException extends BaseException {
  constructor(nfcTag: string) {
    super(
      ErrorCodes.CASHLESS_NFC_TAG_INVALID,
      `Invalid NFC tag: ${nfcTag}`,
      HttpStatus.BAD_REQUEST,
      { nfcTag },
    );
  }
}

export class TransactionLimitExceededException extends BaseException {
  constructor(limit: number, requested: number, currency: string, limitType: 'daily' | 'single') {
    super(
      ErrorCodes.CASHLESS_LIMIT_EXCEEDED,
      `${limitType} transaction limit exceeded: ${limit} ${currency}`,
      HttpStatus.BAD_REQUEST,
      { limit, requested, currency, limitType },
    );
  }
}

// ============================================
// FESTIVAL BUSINESS EXCEPTIONS
// ============================================
export class FestivalNotPublishedException extends BaseException {
  constructor(festivalId: string) {
    super(
      ErrorCodes.FESTIVAL_NOT_PUBLISHED,
      `Festival not published: ${festivalId}`,
      HttpStatus.FORBIDDEN,
      { festivalId },
    );
  }
}

export class FestivalEndedException extends BaseException {
  constructor(festivalId: string, endDate: Date) {
    super(
      ErrorCodes.FESTIVAL_ENDED,
      `Festival ended at: ${endDate.toISOString()}`,
      HttpStatus.BAD_REQUEST,
      { festivalId, endDate: endDate.toISOString() },
    );
  }
}

export class FestivalCancelledException extends BaseException {
  constructor(festivalId: string) {
    super(
      ErrorCodes.FESTIVAL_CANCELLED,
      `Festival cancelled: ${festivalId}`,
      HttpStatus.BAD_REQUEST,
      { festivalId },
    );
  }
}

export class FestivalCapacityReachedException extends BaseException {
  constructor(festivalId: string, capacity: number) {
    super(
      ErrorCodes.FESTIVAL_CAPACITY_REACHED,
      `Festival capacity reached: ${capacity}`,
      HttpStatus.CONFLICT,
      { festivalId, capacity },
    );
  }
}

// ============================================
// ZONE/ACCESS BUSINESS EXCEPTIONS
// ============================================
export class ZoneAccessDeniedException extends BaseException {
  constructor(zoneId: string, reason: string) {
    super(
      ErrorCodes.ZONE_ACCESS_DENIED,
      `Zone access denied: ${reason}`,
      HttpStatus.FORBIDDEN,
      { zoneId, reason },
    );
  }
}

export class ZoneCapacityReachedException extends BaseException {
  constructor(zoneId: string, zoneName: string, capacity: number) {
    super(
      ErrorCodes.ZONE_CAPACITY_REACHED,
      `Zone capacity reached: ${zoneName}`,
      HttpStatus.CONFLICT,
      { zoneId, zoneName, capacity },
    );
  }
}

export class ZoneEntryNotAllowedException extends BaseException {
  constructor(zoneId: string, reason: string) {
    super(
      ErrorCodes.ZONE_ENTRY_NOT_ALLOWED,
      `Zone entry not allowed: ${reason}`,
      HttpStatus.FORBIDDEN,
      { zoneId, reason },
    );
  }
}

// ============================================
// VENDOR BUSINESS EXCEPTIONS
// ============================================
export class VendorClosedException extends BaseException {
  constructor(vendorId: string, vendorName: string) {
    super(
      ErrorCodes.VENDOR_CLOSED,
      `Vendor closed: ${vendorName}`,
      HttpStatus.BAD_REQUEST,
      { vendorId, vendorName },
    );
  }
}

export class ProductUnavailableException extends BaseException {
  constructor(productId: string, productName: string) {
    super(
      ErrorCodes.VENDOR_PRODUCT_UNAVAILABLE,
      `Product unavailable: ${productName}`,
      HttpStatus.CONFLICT,
      { productId, productName },
    );
  }
}

export class VendorOrderFailedException extends BaseException {
  constructor(vendorId: string, reason: string) {
    super(
      ErrorCodes.VENDOR_ORDER_FAILED,
      `Vendor order failed: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { vendorId, reason },
    );
  }
}

// ============================================
// FILE BUSINESS EXCEPTIONS
// ============================================
export class FileTooLargeException extends BaseException {
  constructor(maxSize: number, actualSize: number) {
    super(
      ErrorCodes.FILE_TOO_LARGE,
      `File too large: ${actualSize} bytes (max: ${maxSize} bytes)`,
      HttpStatus.BAD_REQUEST,
      { maxSize, actualSize },
    );
  }
}

export class FileTypeNotAllowedException extends BaseException {
  constructor(mimeType: string, allowedTypes: string[]) {
    super(
      ErrorCodes.FILE_TYPE_NOT_ALLOWED,
      `File type not allowed: ${mimeType}`,
      HttpStatus.BAD_REQUEST,
      { mimeType, allowedTypes },
    );
  }
}

export class FileUploadFailedException extends BaseException {
  constructor(reason: string) {
    super(
      ErrorCodes.FILE_UPLOAD_FAILED,
      `File upload failed: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { reason },
    );
  }
}
