/**
 * CashlessAccount Model
 * WatermelonDB model for cashless wallet data with offline support
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children as _children, writer } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

import { TableNames } from '../schema';

/**
 * CashlessAccount model for local database
 * Stores balance as cents (integer) for precision
 */
export default class CashlessAccount extends Model {
  static table = TableNames.CASHLESS_ACCOUNTS;

  static associations: Associations = {
    [TableNames.CASHLESS_TRANSACTIONS]: { type: 'has_many', foreignKey: 'account_id' },
  };

  // Server ID (backend UUID)
  @text('server_id') serverId!: string;

  // Relations
  @text('user_id') userId!: string;

  // Balance (stored as cents for precision)
  @field('balance') balance!: number;

  // NFC
  @text('nfc_tag_id') nfcTagId?: string;

  // Status
  @field('is_active') isActive!: boolean;

  // Server timestamps
  @field('server_created_at') serverCreatedAt!: number;
  @field('server_updated_at') serverUpdatedAt!: number;

  // Sync metadata
  @field('is_synced') isSynced!: boolean;
  @field('last_synced_at') lastSyncedAt?: number;
  @field('needs_push') needsPush!: boolean;

  // Offline transaction tracking
  @field('pending_balance_change') pendingBalanceChange!: number;

  // Read-only timestamps
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties

  /**
   * Balance in decimal (e.g., 10.50)
   */
  get balanceDecimal(): number {
    return this.balance / 100;
  }

  /**
   * Formatted balance with currency symbol
   */
  get balanceFormatted(): string {
    return `${this.balanceDecimal.toFixed(2)}`;
  }

  /**
   * Get balance with currency (assuming EUR by default)
   */
  getBalanceWithCurrency(currency = 'EUR'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(this.balanceDecimal);
  }

  /**
   * Effective balance including pending offline changes
   */
  get effectiveBalance(): number {
    return this.balance + this.pendingBalanceChange;
  }

  /**
   * Effective balance in decimal
   */
  get effectiveBalanceDecimal(): number {
    return this.effectiveBalance / 100;
  }

  /**
   * Check if there are pending offline changes
   */
  get hasPendingChanges(): boolean {
    return this.pendingBalanceChange !== 0;
  }

  /**
   * Check if balance is low (less than 5 EUR)
   */
  get isLowBalance(): boolean {
    return this.effectiveBalanceDecimal < 5;
  }

  /**
   * Check if account has NFC tag linked
   */
  get hasNfcTag(): boolean {
    return !!this.nfcTagId;
  }

  get isPendingSync(): boolean {
    return !this.isSynced || this.needsPush || this.hasPendingChanges;
  }

  /**
   * Convert to plain object for API calls
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.serverId,
      userId: this.userId,
      balance: this.balanceDecimal,
      nfcTagId: this.nfcTagId,
      isActive: this.isActive,
      createdAt: this.serverCreatedAt ? new Date(this.serverCreatedAt).toISOString() : null,
      updatedAt: this.serverUpdatedAt ? new Date(this.serverUpdatedAt).toISOString() : null,
    };
  }

  /**
   * Update account from server data
   */
  @writer async updateFromServer(data: {
    balance?: number; // Server sends decimal value
    nfcTagId?: string;
    isActive?: boolean;
    updatedAt?: string;
  }): Promise<void> {
    await this.update((account) => {
      if (data.balance !== undefined) {
        // Convert decimal to cents and apply any pending changes
        const serverBalanceCents = Math.round(data.balance * 100);
        account.balance = serverBalanceCents;
        // Clear pending changes after sync (server has authoritative balance)
        account.pendingBalanceChange = 0;
      }
      if (data.nfcTagId !== undefined) {account.nfcTagId = data.nfcTagId;}
      if (data.isActive !== undefined) {account.isActive = data.isActive;}
      if (data.updatedAt) {account.serverUpdatedAt = new Date(data.updatedAt).getTime();}
      account.isSynced = true;
      account.lastSyncedAt = Date.now();
      account.needsPush = false;
    });
  }

  /**
   * Apply offline balance change (for offline transactions)
   * This updates pendingBalanceChange, not the main balance
   */
  @writer async applyOfflineChange(amountCents: number): Promise<void> {
    await this.update((account) => {
      account.pendingBalanceChange += amountCents;
      account.needsPush = true;
    });
  }

  /**
   * Apply topup (adds to balance)
   */
  @writer async applyTopup(amountCents: number): Promise<void> {
    await this.update((account) => {
      account.balance += amountCents;
      account.isSynced = false;
      account.needsPush = true;
    });
  }

  /**
   * Apply payment (subtracts from balance)
   * Returns false if insufficient funds
   */
  @writer async applyPayment(amountCents: number): Promise<boolean> {
    if (this.effectiveBalance < amountCents) {
      return false;
    }

    await this.update((account) => {
      account.pendingBalanceChange -= amountCents;
      account.needsPush = true;
    });

    return true;
  }

  /**
   * Link NFC tag to account
   */
  @writer async linkNfcTag(tagId: string): Promise<void> {
    await this.update((account) => {
      account.nfcTagId = tagId;
      account.isSynced = false;
      account.needsPush = true;
    });
  }

  /**
   * Unlink NFC tag from account
   */
  @writer async unlinkNfcTag(): Promise<void> {
    await this.update((account) => {
      account.nfcTagId = undefined;
      account.isSynced = false;
      account.needsPush = true;
    });
  }

  /**
   * Mark for sync after local changes
   */
  @writer async markForSync(): Promise<void> {
    await this.update((account) => {
      account.isSynced = false;
      account.needsPush = true;
    });
  }
}
