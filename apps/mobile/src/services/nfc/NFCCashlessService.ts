/**
 * NFCCashlessService.ts
 * NFC-based cashless payment service for festival transactions
 * Handles tap-to-pay, balance checks, and secure transactions
 */

import { nfcManager } from './NFCManager';
import { NFCReader } from './NFCReader';
import { NFCWriter } from './NFCWriter';
import { NFCFormatter, CashlessData } from './NFCFormatter';
import { offlineManager as _offlineManager } from '../offline/OfflineManager';
import { syncQueue } from '../offline/SyncQueue';
import { networkDetector } from '../offline/NetworkDetector';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.festival.app';

// Transaction types
export type CashlessTransactionType = 'payment' | 'topup' | 'refund' | 'transfer';

// Transaction status
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// Cashless transaction
export interface CashlessTransaction {
  id: string;
  type: CashlessTransactionType;
  amount: number;
  currency: string;
  braceletId: string;
  vendorId?: string;
  vendorName?: string;
  festivalId: string;
  userId?: string;
  status: TransactionStatus;
  timestamp: Date;
  offlineId?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  description?: string;
  items?: CashlessTransactionItem[];
  previousBalance: number;
  newBalance: number;
  signature?: string;
}

export interface CashlessTransactionItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Balance info
export interface CashlessBalance {
  braceletId: string;
  balance: number;
  currency: string;
  lastUpdated: Date;
  festivalId: string;
  userId?: string;
  isActive: boolean;
  dailyLimit?: number;
  dailySpent?: number;
}

// Payment request
export interface PaymentRequest {
  amount: number;
  vendorId: string;
  vendorName?: string;
  items?: CashlessTransactionItem[];
  description?: string;
  festivalId: string;
}

// Topup request
export interface TopupRequest {
  amount: number;
  paymentMethodId?: string;
  festivalId: string;
}

// Transfer request
export interface TransferRequest {
  amount: number;
  recipientBraceletId: string;
  festivalId: string;
  description?: string;
}

// Service result
export interface CashlessResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

// Configuration
export interface NFCCashlessConfig {
  apiBaseUrl: string;
  authToken: string | null;
  festivalId: string | null;
  vendorId: string | null;
  enableOfflinePayments: boolean;
  offlineLimit: number;
  transactionTimeout: number;
  requirePinAbove: number;
}

const DEFAULT_CONFIG: NFCCashlessConfig = {
  apiBaseUrl: API_BASE_URL,
  authToken: null,
  festivalId: null,
  vendorId: null,
  enableOfflinePayments: true,
  offlineLimit: 50,
  transactionTimeout: 30000,
  requirePinAbove: 100,
};

// Storage keys
const STORAGE_KEYS = {
  OFFLINE_TRANSACTIONS: '@cashless/offline_transactions',
  BRACELET_CACHE: '@cashless/bracelet_cache',
  DAILY_TOTALS: '@cashless/daily_totals',
};

class NFCCashlessService {
  private static instance: NFCCashlessService;
  private config: NFCCashlessConfig;
  private reader: NFCReader;
  private writer: NFCWriter;
  private formatter: NFCFormatter;
  private isInitialized = false;
  private offlineTransactions: CashlessTransaction[] = [];
  private transactionListeners = new Set<(tx: CashlessTransaction) => void>();
  private currentBraceletId: string | null = null;

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.reader = nfcManager.reader;
    this.writer = nfcManager.writer;
    this.formatter = nfcManager.formatter;
  }

  public static getInstance(): NFCCashlessService {
    if (!NFCCashlessService.instance) {
      NFCCashlessService.instance = new NFCCashlessService();
    }
    return NFCCashlessService.instance;
  }

  /**
   * Initialize the cashless service
   */
  public async initialize(config: Partial<NFCCashlessConfig>): Promise<boolean> {
    try {
      this.config = { ...this.config, ...config };

      // Initialize NFC manager
      const nfcReady = await nfcManager.initialize({
        alertMessage: 'Approchez votre bracelet pour le paiement',
      });

      if (!nfcReady) {
        console.log('[NFCCashlessService] NFC not available');
        return false;
      }

      // Load offline transactions
      await this.loadOfflineTransactions();

      // Set up network listener for syncing
      networkDetector.addListener((isOnline) => {
        if (isOnline) {
          this.syncOfflineTransactions();
        }
      });

      this.isInitialized = true;
      console.log('[NFCCashlessService] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[NFCCashlessService] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<NFCCashlessConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Read bracelet and get balance
   */
  public async readBalance(): Promise<CashlessResult<CashlessBalance>> {
    try {
      const readResult = await this.reader.readCashlessBracelet();

      if (!readResult.success || !readResult.cashlessData) {
        return {
          success: false,
          error: readResult.error?.message || 'Failed to read bracelet',
          errorCode: readResult.error?.code,
        };
      }

      this.currentBraceletId = readResult.braceletId;

      // Try to get balance from server
      if (networkDetector.isOnline()) {
        try {
          const serverBalance = await this.fetchBalanceFromServer(readResult.braceletId!);
          if (serverBalance) {
            await this.cacheBalance(serverBalance);
            return { success: true, data: serverBalance };
          }
        } catch (error) {
          console.warn('[NFCCashlessService] Failed to fetch from server, using cached:', error);
        }
      }

      // Use cached or bracelet data
      const cachedBalance = await this.getCachedBalance(readResult.braceletId!);
      if (cachedBalance) {
        return { success: true, data: cachedBalance };
      }

      // Build balance from bracelet data
      const balance: CashlessBalance = {
        braceletId: readResult.braceletId!,
        balance: readResult.cashlessData.balance,
        currency: readResult.cashlessData.currency || 'EUR',
        lastUpdated: new Date(readResult.cashlessData.lastUpdated || Date.now()),
        festivalId: readResult.cashlessData.festivalId,
        isActive: readResult.cashlessData.isActive,
      };

      return { success: true, data: balance };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'READ_ERROR',
      };
    }
  }

  /**
   * Process a payment
   */
  public async processPayment(
    request: PaymentRequest
  ): Promise<CashlessResult<CashlessTransaction>> {
    try {
      if (!this.isInitialized) {
        return { success: false, error: 'Service not initialized', errorCode: 'NOT_INITIALIZED' };
      }

      // First read the bracelet
      const balanceResult = await this.readBalance();
      if (!balanceResult.success || !balanceResult.data) {
        return {
          success: false,
          error: balanceResult.error || 'Failed to read bracelet',
          errorCode: balanceResult.errorCode,
        };
      }

      const balance = balanceResult.data;

      // Check if balance is sufficient
      if (balance.balance < request.amount) {
        return {
          success: false,
          error: `Insufficient balance. Available: ${balance.balance} ${balance.currency}`,
          errorCode: 'INSUFFICIENT_BALANCE',
        };
      }

      // Check daily limit if applicable
      if (balance.dailyLimit && balance.dailySpent !== undefined) {
        const remainingDaily = balance.dailyLimit - balance.dailySpent;
        if (request.amount > remainingDaily) {
          return {
            success: false,
            error: `Daily limit exceeded. Remaining: ${remainingDaily} ${balance.currency}`,
            errorCode: 'DAILY_LIMIT_EXCEEDED',
          };
        }
      }

      // Check if PIN is required
      if (this.config.requirePinAbove && request.amount > this.config.requirePinAbove) {
        // PIN verification would be handled by the UI layer
        // This is a placeholder for the actual implementation
      }

      // Create transaction
      const transaction: CashlessTransaction = {
        id: this.generateTransactionId(),
        type: 'payment',
        amount: request.amount,
        currency: balance.currency,
        braceletId: balance.braceletId,
        vendorId: request.vendorId,
        vendorName: request.vendorName,
        festivalId: request.festivalId,
        status: 'processing',
        timestamp: new Date(),
        syncStatus: networkDetector.isOnline() ? 'synced' : 'pending',
        description: request.description,
        items: request.items,
        previousBalance: balance.balance,
        newBalance: balance.balance - request.amount,
      };

      // Process transaction
      if (networkDetector.isOnline()) {
        try {
          const serverResult = await this.processOnlineTransaction(transaction);
          if (serverResult.success && serverResult.data) {
            this.notifyTransactionListeners(serverResult.data);
            return serverResult;
          }
        } catch (error) {
          console.warn('[NFCCashlessService] Online processing failed, trying offline:', error);
        }
      }

      // Process offline if enabled
      if (this.config.enableOfflinePayments) {
        if (request.amount > this.config.offlineLimit) {
          return {
            success: false,
            error: `Offline payments limited to ${this.config.offlineLimit} ${balance.currency}`,
            errorCode: 'OFFLINE_LIMIT_EXCEEDED',
          };
        }

        return await this.processOfflineTransaction(transaction);
      }

      return {
        success: false,
        error: 'Payment cannot be processed. No network connection.',
        errorCode: 'OFFLINE_NOT_ALLOWED',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
        errorCode: 'PAYMENT_ERROR',
      };
    }
  }

  /**
   * Process a topup
   */
  public async processTopup(request: TopupRequest): Promise<CashlessResult<CashlessTransaction>> {
    try {
      if (!networkDetector.isOnline()) {
        return {
          success: false,
          error: 'Topup requires an internet connection',
          errorCode: 'OFFLINE_NOT_ALLOWED',
        };
      }

      // First read the bracelet
      const balanceResult = await this.readBalance();
      if (!balanceResult.success || !balanceResult.data) {
        return {
          success: false,
          error: balanceResult.error || 'Failed to read bracelet',
          errorCode: balanceResult.errorCode,
        };
      }

      const balance = balanceResult.data;

      const transaction: CashlessTransaction = {
        id: this.generateTransactionId(),
        type: 'topup',
        amount: request.amount,
        currency: balance.currency,
        braceletId: balance.braceletId,
        festivalId: request.festivalId,
        status: 'processing',
        timestamp: new Date(),
        syncStatus: 'synced',
        previousBalance: balance.balance,
        newBalance: balance.balance + request.amount,
      };

      return await this.processOnlineTransaction(transaction);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Topup failed',
        errorCode: 'TOPUP_ERROR',
      };
    }
  }

  /**
   * Process a transfer between bracelets
   */
  public async processTransfer(
    request: TransferRequest
  ): Promise<CashlessResult<CashlessTransaction>> {
    try {
      if (!networkDetector.isOnline()) {
        return {
          success: false,
          error: 'Transfer requires an internet connection',
          errorCode: 'OFFLINE_NOT_ALLOWED',
        };
      }

      // Read sender bracelet
      const senderResult = await this.readBalance();
      if (!senderResult.success || !senderResult.data) {
        return {
          success: false,
          error: senderResult.error || 'Failed to read sender bracelet',
          errorCode: senderResult.errorCode,
        };
      }

      const senderBalance = senderResult.data;

      // Check balance
      if (senderBalance.balance < request.amount) {
        return {
          success: false,
          error: 'Insufficient balance for transfer',
          errorCode: 'INSUFFICIENT_BALANCE',
        };
      }

      const transaction: CashlessTransaction = {
        id: this.generateTransactionId(),
        type: 'transfer',
        amount: request.amount,
        currency: senderBalance.currency,
        braceletId: senderBalance.braceletId,
        festivalId: request.festivalId,
        status: 'processing',
        timestamp: new Date(),
        syncStatus: 'synced',
        description: `Transfer to ${request.recipientBraceletId}${request.description ? ': ' + request.description : ''}`,
        previousBalance: senderBalance.balance,
        newBalance: senderBalance.balance - request.amount,
      };

      return await this.processOnlineTransaction(transaction);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed',
        errorCode: 'TRANSFER_ERROR',
      };
    }
  }

  /**
   * Process transaction online
   */
  private async processOnlineTransaction(
    transaction: CashlessTransaction
  ): Promise<CashlessResult<CashlessTransaction>> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/cashless/transaction`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(transaction),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Transaction failed',
          errorCode: error.code || 'SERVER_ERROR',
        };
      }

      const result = await response.json();
      transaction.id = result.id;
      transaction.status = 'completed';
      transaction.signature = result.signature;

      // Update bracelet with new balance
      await this.updateBraceletBalance(transaction);

      // Update cached balance
      await this.updateCachedBalance(transaction);

      this.notifyTransactionListeners(transaction);

      return { success: true, data: transaction };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Server error',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }

  /**
   * Process transaction offline
   */
  private async processOfflineTransaction(
    transaction: CashlessTransaction
  ): Promise<CashlessResult<CashlessTransaction>> {
    try {
      transaction.offlineId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      transaction.status = 'pending';
      transaction.syncStatus = 'pending';

      // Sign the transaction locally
      transaction.signature = this.generateLocalSignature(transaction);

      // Update bracelet with new balance (offline)
      await this.updateBraceletBalance(transaction);

      // Update cached balance
      await this.updateCachedBalance(transaction);

      // Store in offline queue
      this.offlineTransactions.push(transaction);
      await this.saveOfflineTransactions();

      // Queue for sync
      await syncQueue.add({
        action: 'cashless:transaction',
        endpoint: `${this.config.apiBaseUrl}/api/cashless/transaction`,
        method: 'POST',
        body: transaction as unknown as Record<string, unknown>,
        headers: this.getHeaders(),
        priority: 'critical',
        timeout: this.config.transactionTimeout,
        maxRetries: 5,
      });

      this.notifyTransactionListeners(transaction);
      nfcManager.provideFeedback('success');

      return { success: true, data: transaction };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Offline processing failed',
        errorCode: 'OFFLINE_ERROR',
      };
    }
  }

  /**
   * Update bracelet balance via NFC write
   */
  private async updateBraceletBalance(transaction: CashlessTransaction): Promise<void> {
    try {
      const cashlessData: CashlessData = {
        accountId: transaction.braceletId,
        balance: transaction.newBalance,
        currency: transaction.currency,
        festivalId: transaction.festivalId,
        lastUpdated: Date.now(),
        isActive: true,
      };

      await this.writer.writeCashlessData(cashlessData);
    } catch (error) {
      console.error('[NFCCashlessService] Failed to update bracelet:', error);
      // Continue even if write fails - server has the truth
    }
  }

  /**
   * Fetch balance from server
   */
  private async fetchBalanceFromServer(braceletId: string): Promise<CashlessBalance | null> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/cashless/balance/${braceletId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        braceletId: data.braceletId,
        balance: data.balance,
        currency: data.currency,
        lastUpdated: new Date(data.lastUpdated),
        festivalId: data.festivalId,
        userId: data.userId,
        isActive: data.isActive,
        dailyLimit: data.dailyLimit,
        dailySpent: data.dailySpent,
      };
    } catch (error) {
      console.error('[NFCCashlessService] Failed to fetch balance:', error);
      return null;
    }
  }

  /**
   * Cache balance locally
   */
  private async cacheBalance(balance: CashlessBalance): Promise<void> {
    try {
      const cacheKey = `${STORAGE_KEYS.BRACELET_CACHE}_${balance.braceletId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(balance));
    } catch (error) {
      console.error('[NFCCashlessService] Failed to cache balance:', error);
    }
  }

  /**
   * Get cached balance
   */
  private async getCachedBalance(braceletId: string): Promise<CashlessBalance | null> {
    try {
      const cacheKey = `${STORAGE_KEYS.BRACELET_CACHE}_${braceletId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const balance = JSON.parse(cached);
        balance.lastUpdated = new Date(balance.lastUpdated);
        return balance;
      }
      return null;
    } catch (error) {
      console.error('[NFCCashlessService] Failed to get cached balance:', error);
      return null;
    }
  }

  /**
   * Update cached balance after transaction
   */
  private async updateCachedBalance(transaction: CashlessTransaction): Promise<void> {
    try {
      const balance = await this.getCachedBalance(transaction.braceletId);
      if (balance) {
        balance.balance = transaction.newBalance;
        balance.lastUpdated = new Date();
        if (transaction.type === 'payment' && balance.dailySpent !== undefined) {
          balance.dailySpent += transaction.amount;
        }
        await this.cacheBalance(balance);
      }
    } catch (error) {
      console.error('[NFCCashlessService] Failed to update cached balance:', error);
    }
  }

  /**
   * Load offline transactions from storage
   */
  private async loadOfflineTransactions(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_TRANSACTIONS);
      if (stored) {
        this.offlineTransactions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[NFCCashlessService] Failed to load offline transactions:', error);
    }
  }

  /**
   * Save offline transactions to storage
   */
  private async saveOfflineTransactions(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_TRANSACTIONS,
        JSON.stringify(this.offlineTransactions)
      );
    } catch (error) {
      console.error('[NFCCashlessService] Failed to save offline transactions:', error);
    }
  }

  /**
   * Sync offline transactions
   */
  public async syncOfflineTransactions(): Promise<void> {
    if (this.offlineTransactions.length === 0) {
      return;
    }

    console.log(
      `[NFCCashlessService] Syncing ${this.offlineTransactions.length} offline transactions`
    );

    for (const transaction of this.offlineTransactions) {
      if (transaction.syncStatus !== 'pending') {
        continue;
      }

      try {
        const result = await this.processOnlineTransaction(transaction);
        if (result.success) {
          transaction.syncStatus = 'synced';
        } else {
          transaction.syncStatus = 'failed';
        }
      } catch {
        transaction.syncStatus = 'failed';
      }
    }

    // Remove synced transactions
    this.offlineTransactions = this.offlineTransactions.filter((tx) => tx.syncStatus !== 'synced');
    await this.saveOfflineTransactions();
  }

  /**
   * Get offline transactions
   */
  public getOfflineTransactions(): CashlessTransaction[] {
    return [...this.offlineTransactions];
  }

  /**
   * Get transaction history
   */
  public async getTransactionHistory(
    braceletId?: string,
    limit = 50
  ): Promise<CashlessTransaction[]> {
    try {
      if (!networkDetector.isOnline()) {
        return this.offlineTransactions
          .filter((tx) => !braceletId || tx.braceletId === braceletId)
          .slice(0, limit);
      }

      const params = new URLSearchParams({ limit: limit.toString() });
      if (braceletId) {
        params.append('braceletId', braceletId);
      }

      const response = await fetch(
        `${this.config.apiBaseUrl}/api/cashless/transactions?${params}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }

      const data = await response.json();
      return data.transactions || [];
    } catch (error) {
      console.error('[NFCCashlessService] Failed to get history:', error);
      return this.offlineTransactions.slice(0, limit);
    }
  }

  /**
   * Add transaction listener
   */
  public addTransactionListener(listener: (tx: CashlessTransaction) => void): () => void {
    this.transactionListeners.add(listener);
    return () => this.transactionListeners.delete(listener);
  }

  /**
   * Notify transaction listeners
   */
  private notifyTransactionListeners(transaction: CashlessTransaction): void {
    this.transactionListeners.forEach((listener) => {
      try {
        listener(transaction);
      } catch (error) {
        console.error('[NFCCashlessService] Listener error:', error);
      }
    });
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }
    return headers;
  }

  /**
   * Generate transaction ID
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate local signature for offline transactions
   */
  private generateLocalSignature(transaction: CashlessTransaction): string {
    const data = `${transaction.id}:${transaction.braceletId}:${transaction.amount}:${transaction.timestamp.getTime()}`;
    // Simple hash - in production, use proper cryptographic signing
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `local_${hash.toString(16)}`;
  }

  /**
   * Check if NFC is ready
   */
  public isNFCReady(): boolean {
    return this.isInitialized && nfcManager.isReady();
  }

  /**
   * Get current bracelet ID
   */
  public getCurrentBraceletId(): string | null {
    return this.currentBraceletId;
  }

  /**
   * Cancel any ongoing NFC operation
   */
  public async cancelOperation(): Promise<void> {
    await nfcManager.stopSession();
  }
}

export const nfcCashlessService = NFCCashlessService.getInstance();
export default NFCCashlessService;
