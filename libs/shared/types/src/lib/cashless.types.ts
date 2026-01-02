/**
 * Cashless Types
 * Types for cashless payment system (NFC wristbands, virtual wallets)
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Transaction type
 */
export enum TransactionType {
  TOPUP = 'topup',
  PAYMENT = 'payment',
  REFUND = 'refund',
  TRANSFER = 'transfer',
  CORRECTION = 'correction',
  CASHOUT = 'cashout',
}

/**
 * Transaction status
 */
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
}

/**
 * Cashless account status
 */
export enum CashlessAccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  CLOSED = 'closed',
}

/**
 * Top-up method
 */
export enum TopupMethod {
  ONLINE = 'online',
  KIOSK = 'kiosk',
  CASH_DESK = 'cash_desk',
  BANK_CARD = 'bank_card',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Cashless account (virtual wallet)
 */
export interface CashlessAccount {
  id: string;
  festivalId: string;
  userId?: string;
  ticketId?: string;
  nfcId: string;
  balance: number;
  currency: string;
  status: CashlessAccountStatus;
  pin?: string;
  dailyLimit?: number;
  transactionLimit?: number;
  lastTransactionAt?: string;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cashless account with recent transactions
 */
export interface CashlessAccountWithTransactions extends CashlessAccount {
  recentTransactions: CashlessTransaction[];
}

/**
 * Cashless transaction
 */
export interface CashlessTransaction {
  id: string;
  accountId: string;
  festivalId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  currency: string;
  description?: string;
  vendorId?: string;
  vendorName?: string;
  terminalId?: string;
  reference?: string;
  relatedTransactionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
  createdBy?: string;
}

/**
 * Vendor/Merchant for cashless payments
 */
export interface CashlessVendor {
  id: string;
  festivalId: string;
  name: string;
  type: VendorType;
  location?: string;
  terminals: CashlessTerminal[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vendor type
 */
export enum VendorType {
  BAR = 'bar',
  FOOD = 'food',
  MERCHANDISE = 'merchandise',
  SERVICES = 'services',
  OTHER = 'other',
}

/**
 * Cashless terminal (POS device)
 */
export interface CashlessTerminal {
  id: string;
  vendorId: string;
  terminalNumber: string;
  name?: string;
  isActive: boolean;
  lastActivityAt?: string;
  createdAt: string;
}

/**
 * Cashless statistics
 */
export interface CashlessStats {
  festivalId: string;
  totalAccounts: number;
  activeAccounts: number;
  totalBalance: number;
  totalTopups: number;
  totalPayments: number;
  totalRefunds: number;
  averageBalance: number;
  transactionCount: number;
  topVendors: VendorStats[];
}

/**
 * Vendor statistics
 */
export interface VendorStats {
  vendorId: string;
  vendorName: string;
  transactionCount: number;
  totalAmount: number;
  averageTransaction: number;
}

/**
 * Balance history entry
 */
export interface BalanceHistoryEntry {
  date: string;
  balance: number;
  change: number;
  transactionType: TransactionType;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a cashless account
 */
export interface CreateCashlessAccountDto {
  nfcId: string;
  userId?: string;
  ticketId?: string;
  initialBalance?: number;
  pin?: string;
}

/**
 * DTO for activating a cashless account
 */
export interface ActivateCashlessAccountDto {
  nfcId: string;
  ticketId?: string;
  pin?: string;
}

/**
 * DTO for topping up an account
 */
export interface TopupDto {
  accountId?: string;
  nfcId?: string;
  amount: number;
  method: TopupMethod;
  paymentId?: string;
  terminalId?: string;
}

/**
 * DTO for making a payment
 */
export interface PayDto {
  accountId?: string;
  nfcId?: string;
  amount: number;
  vendorId: string;
  terminalId?: string;
  description?: string;
  pin?: string;
}

/**
 * DTO for processing a refund
 */
export interface CashlessRefundDto {
  transactionId: string;
  amount?: number;
  reason?: string;
}

/**
 * DTO for transferring balance
 */
export interface TransferBalanceDto {
  fromAccountId?: string;
  fromNfcId?: string;
  toAccountId?: string;
  toNfcId?: string;
  amount: number;
  pin?: string;
}

/**
 * DTO for cashing out remaining balance
 */
export interface CashoutDto {
  accountId?: string;
  nfcId?: string;
  method: 'bank_transfer' | 'refund_to_card';
  bankDetails?: {
    iban: string;
    bic: string;
    holderName: string;
  };
}

/**
 * DTO for setting account PIN
 */
export interface SetPinDto {
  accountId?: string;
  nfcId?: string;
  pin: string;
  confirmPin: string;
}

/**
 * Transaction filters for queries
 */
export interface CashlessTransactionFilters {
  accountId?: string;
  festivalId?: string;
  vendorId?: string;
  type?: TransactionType | TransactionType[];
  status?: TransactionStatus | TransactionStatus[];
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid TransactionType
 */
export function isTransactionType(value: unknown): value is TransactionType {
  return Object.values(TransactionType).includes(value as TransactionType);
}

/**
 * Check if value is a valid TransactionStatus
 */
export function isTransactionStatus(
  value: unknown
): value is TransactionStatus {
  return Object.values(TransactionStatus).includes(value as TransactionStatus);
}

/**
 * Check if value is a valid CashlessAccountStatus
 */
export function isCashlessAccountStatus(
  value: unknown
): value is CashlessAccountStatus {
  return Object.values(CashlessAccountStatus).includes(
    value as CashlessAccountStatus
  );
}

/**
 * Check if account is active
 */
export function isAccountActive(account: CashlessAccount): boolean {
  return account.status === CashlessAccountStatus.ACTIVE;
}

/**
 * Check if account can make payment
 */
export function canMakePayment(
  account: CashlessAccount,
  amount: number
): boolean {
  return (
    account.status === CashlessAccountStatus.ACTIVE &&
    account.balance >= amount &&
    (!account.transactionLimit || amount <= account.transactionLimit)
  );
}

/**
 * Check if transaction is reversible
 */
export function isTransactionReversible(
  transaction: CashlessTransaction
): boolean {
  return (
    transaction.status === TransactionStatus.COMPLETED &&
    transaction.type === TransactionType.PAYMENT &&
    !transaction.relatedTransactionId
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format balance for display
 */
export function formatBalance(
  balance: number,
  currency: string,
  locale = 'fr-FR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(balance / 100); // Assuming amounts are in cents
}

/**
 * Calculate account statistics
 */
export function calculateAccountStats(
  transactions: CashlessTransaction[]
): {
  totalTopups: number;
  totalPayments: number;
  totalRefunds: number;
  transactionCount: number;
} {
  return transactions.reduce(
    (stats, tx) => {
      if (tx.status !== TransactionStatus.COMPLETED) return stats;

      stats.transactionCount++;
      switch (tx.type) {
        case TransactionType.TOPUP:
          stats.totalTopups += tx.amount;
          break;
        case TransactionType.PAYMENT:
          stats.totalPayments += tx.amount;
          break;
        case TransactionType.REFUND:
          stats.totalRefunds += tx.amount;
          break;
      }
      return stats;
    },
    { totalTopups: 0, totalPayments: 0, totalRefunds: 0, transactionCount: 0 }
  );
}

/**
 * Get transaction type display name
 */
export function getTransactionTypeName(type: TransactionType): string {
  const names: Record<TransactionType, string> = {
    [TransactionType.TOPUP]: 'Rechargement',
    [TransactionType.PAYMENT]: 'Paiement',
    [TransactionType.REFUND]: 'Remboursement',
    [TransactionType.TRANSFER]: 'Transfert',
    [TransactionType.CORRECTION]: 'Correction',
    [TransactionType.CASHOUT]: 'Retrait',
  };
  return names[type];
}

/**
 * Validate NFC ID format
 */
export function isValidNfcId(nfcId: string): boolean {
  // Assuming NFC IDs are 8-character hex strings
  return /^[A-Fa-f0-9]{8,16}$/.test(nfcId);
}

/**
 * Validate PIN format
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
