/**
 * NFC Services Index
 * Exports all NFC-related services for the Festival platform
 */

export { nfcManager, NFCError, NFCErrorCode } from './NFCManager';
export type { NFCStatus, NFCEventListener, NFCManagerConfig } from './NFCManager';

export { NFCReader } from './NFCReader';
export type { NFCReadResult, NFCReadOptions } from './NFCReader';

export { NFCWriter } from './NFCWriter';
export type { NFCWriteResult, NFCWriteOptions } from './NFCWriter';

export { NFCFormatter } from './NFCFormatter';
export type {
  NFCTagType,
  NFCTagData,
  NFCPayload,
  CashlessData,
  TransferData,
  StaffData,
  TicketData,
} from './NFCFormatter';
