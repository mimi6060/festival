/**
 * NFC Components Index
 * Exports all NFC-related components
 */

export { NFCScanner } from './NFCScanner';
export type { NFCScannerProps, NFCScannerMode } from './NFCScanner';

export {
  NFCStatus,
  NFCStatusIndicator,
  NFCStatusBadge,
  NFCConnectionStatus,
} from './NFCStatus';
export type {
  NFCStatusProps,
  NFCStatusIndicatorProps,
  NFCStatusBadgeProps,
  NFCConnectionStatusProps,
} from './NFCStatus';

export {
  NFCAnimation,
  NFCPulseIndicator,
  NFCPhoneAnimation,
} from './NFCAnimation';
export type { NFCAnimationProps, NFCAnimationStatus } from './NFCAnimation';
