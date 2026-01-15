/**
 * CashlessTransaction Model
 * WatermelonDB model for cashless transaction data with offline support
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation, writer } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import { v4 as uuidv4 } from 'uuid';

import { TableNames } from '../schema';
import CashlessAccount from './CashlessAccount';

// Transaction type enum matching backend
export type TransactionType = 'TOPUP' | 'PAYMENT' | 'REFUND' | 'TRANSFER' | 'CORRECTION';

/**
 * CashlessTransaction model for local database
 * Supports offline transactions with sync queue
 */
export default class CashlessTransaction extends Model {
  static table = TableNames.CASHLESS_TRANSACTIONS;

  static associations: Associations = {
    [TableNames.CASHLESS_ACCOUNTS]: { type: 'belongs_to', key: 'account_id' },
    [TableNames.FESTIVALS]: { type: 'belongs_to', key: 'festival_id' },
  };

  // Server ID (can be null for offline transactions)
  @text('server_id') serverId?: string;

  // Relations
  @text('account_id') accountId!: string;
  @text('festival_id') festivalId!: string;

  // Lazy loading relations
  @relation(TableNames.CASHLESS_ACCOUNTS, 'account_id') account!: CashlessAccount;

  // Transaction details
  @text('type') type!: TransactionType;
  @field('amount') amount!: number; // Stored as cents
  @field('balance_before') balanceBefore!: number; // Stored as cents
  @field('balance_after') balanceAfter!: number; // Stored as cents
  @text('description') description?: string;
  @text('metadata') metadata?: string; // JSON string

  // Payment reference
  @text('payment_id') paymentId?: string;
  @text('performed_by_id') performedById?: string;

  // Server timestamp
  @field('server_created_at') serverCreatedAt!: number;

  // Sync metadata
  @field('is_synced') isSynced!: boolean;
  @field('last_synced_at') lastSyncedAt?: number;
  @field('needs_push') needsPush!: boolean;

  // Offline transaction tracking
  @field('is_offline_transaction') isOfflineTransaction!: boolean;
  @text('offline_id') offlineId?: string;

  // Read-only timestamps
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties

  /**
   * Amount in decimal (e.g., 10.50)
   */
  get amountDecimal(): number {
    return this.amount / 100;
  }

  /**
   * Formatted amount with sign
   */
  get amountFormatted(): string {
    const sign = this.isCredit ? '+' : '-';
    return `${sign}${Math.abs(this.amountDecimal).toFixed(2)}`;
  }

  /**
   * Get amount with currency
   */
  getAmountWithCurrency(currency = 'EUR'): string {
    const sign = this.isCredit ? '+' : '-';
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(Math.abs(this.amountDecimal));
    return `${sign}${formatted}`;
  }

  /**
   * Balance before in decimal
   */
  get balanceBeforeDecimal(): number {
    return this.balanceBefore / 100;
  }

  /**
   * Balance after in decimal
   */
  get balanceAfterDecimal(): number {
    return this.balanceAfter / 100;
  }

  /**
   * Check if this is a credit (adds to balance)
   */
  get isCredit(): boolean {
    return this.type === 'TOPUP' || this.type === 'REFUND';
  }

  /**
   * Check if this is a debit (subtracts from balance)
   */
  get isDebit(): boolean {
    return this.type === 'PAYMENT';
  }

  /**
   * Transaction date
   */
  get transactionDate(): Date {
    return new Date(this.serverCreatedAt);
  }

  /**
   * Check if pending sync
   */
  get isPendingSync(): boolean {
    return !this.isSynced || this.needsPush || this.isOfflineTransaction;
  }

  /**
   * Parse metadata JSON
   */
  get parsedMetadata(): Record<string, unknown> | null {
    if (!this.metadata) {return null;}
    try {
      return JSON.parse(this.metadata);
    } catch {
      return null;
    }
  }

  /**
   * Get transaction type display name
   */
  getTypeDisplayName(): string {
    const typeNames: Record<TransactionType, string> = {
      TOPUP: 'Top Up',
      PAYMENT: 'Payment',
      REFUND: 'Refund',
      TRANSFER: 'Transfer',
      CORRECTION: 'Correction',
    };
    return typeNames[this.type] || this.type;
  }

  /**
   * Get transaction icon name (for UI)
   */
  getIconName(): string {
    const icons: Record<TransactionType, string> = {
      TOPUP: 'plus-circle',
      PAYMENT: 'shopping-cart',
      REFUND: 'refresh-ccw',
      TRANSFER: 'arrow-right-left',
      CORRECTION: 'edit',
    };
    return icons[this.type] || 'circle';
  }

  /**
   * Get transaction color (for UI)
   */
  getColor(): string {
    return this.isCredit ? '#22c55e' : '#ef4444'; // green for credit, red for debit
  }

  /**
   * Format transaction date
   */
  getDateFormatted(locale = 'en-US'): string {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return this.transactionDate.toLocaleDateString(locale, options);
  }

  /**
   * Convert to plain object for API calls
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.serverId,
      accountId: this.accountId,
      festivalId: this.festivalId,
      type: this.type,
      amount: this.amountDecimal,
      balanceBefore: this.balanceBeforeDecimal,
      balanceAfter: this.balanceAfterDecimal,
      description: this.description,
      metadata: this.parsedMetadata,
      paymentId: this.paymentId,
      performedById: this.performedById,
      createdAt: this.serverCreatedAt ? new Date(this.serverCreatedAt).toISOString() : null,
      // Include offline tracking for sync
      isOfflineTransaction: this.isOfflineTransaction,
      offlineId: this.offlineId,
    };
  }

  /**
   * Update transaction from server data (after sync)
   */
  @writer async updateFromServer(data: {
    serverId: string;
    balanceBefore?: number;
    balanceAfter?: number;
    createdAt?: string;
  }): Promise<void> {
    await this.update((transaction) => {
      transaction.serverId = data.serverId;
      if (data.balanceBefore !== undefined) {
        transaction.balanceBefore = Math.round(data.balanceBefore * 100);
      }
      if (data.balanceAfter !== undefined) {
        transaction.balanceAfter = Math.round(data.balanceAfter * 100);
      }
      if (data.createdAt) {
        transaction.serverCreatedAt = new Date(data.createdAt).getTime();
      }
      transaction.isSynced = true;
      transaction.lastSyncedAt = Date.now();
      transaction.needsPush = false;
      transaction.isOfflineTransaction = false;
    });
  }

  /**
   * Mark as synced
   */
  @writer async markSynced(serverId: string): Promise<void> {
    await this.update((transaction) => {
      transaction.serverId = serverId;
      transaction.isSynced = true;
      transaction.lastSyncedAt = Date.now();
      transaction.needsPush = false;
      transaction.isOfflineTransaction = false;
    });
  }

  /**
   * Mark for sync
   */
  @writer async markForSync(): Promise<void> {
    await this.update((transaction) => {
      transaction.isSynced = false;
      transaction.needsPush = true;
    });
  }
}

/**
 * Helper to create offline transaction data
 */
export function createOfflineTransactionData(params: {
  accountId: string;
  festivalId: string;
  type: TransactionType;
  amountCents: number;
  balanceBeforeCents: number;
  description?: string;
  metadata?: Record<string, unknown>;
  performedById?: string;
}): Record<string, unknown> {
  const offlineId = uuidv4();
  const balanceAfterCents =
    params.type === 'TOPUP' || params.type === 'REFUND'
      ? params.balanceBeforeCents + params.amountCents
      : params.balanceBeforeCents - params.amountCents;

  return {
    account_id: params.accountId,
    festival_id: params.festivalId,
    type: params.type,
    amount: params.amountCents,
    balance_before: params.balanceBeforeCents,
    balance_after: balanceAfterCents,
    description: params.description,
    metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    performed_by_id: params.performedById,
    server_created_at: Date.now(),
    is_synced: false,
    needs_push: true,
    is_offline_transaction: true,
    offline_id: offlineId,
  };
}
