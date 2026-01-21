/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any -- WatermelonDB record callbacks require dynamic typing */
/**
 * TicketCacheService
 * Ensures tickets and their QR codes are properly cached for offline access
 */

import { Database, Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDatabase, TableNames } from '../../database';
import type Ticket from '../../database/models/Ticket';

// Storage keys
const STORAGE_KEYS = {
  TICKETS_LAST_FETCHED: '@tickets/last_fetched',
  TICKETS_CACHE_VERSION: '@tickets/cache_version',
  QR_CODES_CACHED: '@tickets/qr_codes_cached',
};

// Cache configuration
const CACHE_CONFIG = {
  // Maximum age of cached tickets before requiring refresh (24 hours)
  MAX_CACHE_AGE_MS: 24 * 60 * 60 * 1000,
  // Current cache version for migration purposes
  CACHE_VERSION: '1.0.0',
};

// Ticket data for caching (simplified for storage)
export interface CachedTicketData {
  id: string;
  serverId: string;
  festivalId: string;
  qrCode: string;
  qrCodeData: string;
  status: string;
  categoryName: string;
  categoryType: string;
  purchasePrice: number;
  cachedAt: number;
}

// Cache status
export interface TicketCacheStatus {
  isCached: boolean;
  ticketCount: number;
  lastFetchedAt: Date | null;
  isStale: boolean;
  qrCodesAvailable: boolean;
}

/**
 * TicketCacheService class
 * Manages offline caching of tickets and QR codes
 */
class TicketCacheService {
  private static instance: TicketCacheService;
  private database: Database;
  private isInitialized = false;

  private constructor() {
    this.database = getDatabase();
  }

  static getInstance(): TicketCacheService {
    if (!TicketCacheService.instance) {
      TicketCacheService.instance = new TicketCacheService();
    }
    return TicketCacheService.instance;
  }

  /**
   * Initialize the cache service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.info('[TicketCacheService] Initializing...');

    // Check cache version and migrate if needed
    await this.checkCacheVersion();

    this.isInitialized = true;
    console.info('[TicketCacheService] Initialized');
  }

  /**
   * Check cache version and handle migrations
   */
  private async checkCacheVersion(): Promise<void> {
    try {
      const storedVersion = await AsyncStorage.getItem(STORAGE_KEYS.TICKETS_CACHE_VERSION);

      if (storedVersion !== CACHE_CONFIG.CACHE_VERSION) {
        console.info(
          `[TicketCacheService] Cache version mismatch: ${storedVersion} -> ${CACHE_CONFIG.CACHE_VERSION}`
        );
        // Perform any necessary migrations here
        await AsyncStorage.setItem(STORAGE_KEYS.TICKETS_CACHE_VERSION, CACHE_CONFIG.CACHE_VERSION);
      }
    } catch (error) {
      console.error('[TicketCacheService] Failed to check cache version:', error);
    }
  }

  /**
   * Cache tickets from server response
   * Call this after fetching tickets from the API
   */
  async cacheTickets(
    tickets: {
      id: string;
      festivalId: string;
      categoryId: string;
      qrCode: string;
      qrCodeData?: string;
      status: string;
      purchasePrice: number;
      categoryName?: string;
      categoryType?: string;
      usedAt?: string | null;
      usedByStaffId?: string | null;
      isGuest?: boolean;
      guestEmail?: string;
      guestFirstName?: string;
      guestLastName?: string;
      guestPhone?: string;
      createdAt?: string;
      updatedAt?: string;
    }[]
  ): Promise<void> {
    if (!tickets || tickets.length === 0) {
      console.info('[TicketCacheService] No tickets to cache');
      return;
    }

    console.info(`[TicketCacheService] Caching ${tickets.length} tickets`);

    const collection = this.database.get<Ticket>(TableNames.TICKETS);

    await this.database.write(async () => {
      for (const serverTicket of tickets) {
        try {
          // Check if ticket already exists
          const existing = await collection.query(Q.where('server_id', serverTicket.id)).fetch();

          if (existing.length > 0) {
            // Update existing ticket
            await existing[0].update((ticket: any) => {
              ticket.qrCode = serverTicket.qrCode;
              ticket.qrCodeData = serverTicket.qrCodeData || serverTicket.qrCode;
              ticket.status = serverTicket.status;
              ticket.purchasePrice = Math.round(serverTicket.purchasePrice * 100);
              ticket.categoryName = serverTicket.categoryName || '';
              ticket.categoryType = serverTicket.categoryType || 'STANDARD';
              ticket.usedAt = serverTicket.usedAt ? new Date(serverTicket.usedAt).getTime() : null;
              ticket.usedByStaffId = serverTicket.usedByStaffId || null;
              ticket.serverUpdatedAt = serverTicket.updatedAt
                ? new Date(serverTicket.updatedAt).getTime()
                : Date.now();
              ticket.isSynced = true;
              ticket.lastSyncedAt = Date.now();
              ticket.needsPush = false;
            });
          } else {
            // Create new ticket
            await collection.create((ticket: any) => {
              ticket.serverId = serverTicket.id;
              ticket.festivalId = serverTicket.festivalId;
              ticket.categoryId = serverTicket.categoryId;
              ticket.qrCode = serverTicket.qrCode;
              ticket.qrCodeData = serverTicket.qrCodeData || serverTicket.qrCode;
              ticket.status = serverTicket.status;
              ticket.purchasePrice = Math.round(serverTicket.purchasePrice * 100);
              ticket.categoryName = serverTicket.categoryName || '';
              ticket.categoryType = serverTicket.categoryType || 'STANDARD';
              ticket.usedAt = serverTicket.usedAt ? new Date(serverTicket.usedAt).getTime() : null;
              ticket.usedByStaffId = serverTicket.usedByStaffId || null;
              ticket.isGuest = serverTicket.isGuest || false;
              ticket.guestEmail = serverTicket.guestEmail || null;
              ticket.guestFirstName = serverTicket.guestFirstName || null;
              ticket.guestLastName = serverTicket.guestLastName || null;
              ticket.guestPhone = serverTicket.guestPhone || null;
              ticket.serverCreatedAt = serverTicket.createdAt
                ? new Date(serverTicket.createdAt).getTime()
                : Date.now();
              ticket.serverUpdatedAt = serverTicket.updatedAt
                ? new Date(serverTicket.updatedAt).getTime()
                : Date.now();
              ticket.isSynced = true;
              ticket.lastSyncedAt = Date.now();
              ticket.needsPush = false;
            });
          }
        } catch (error) {
          console.error(`[TicketCacheService] Failed to cache ticket ${serverTicket.id}:`, error);
        }
      }
    });

    // Update cache metadata
    await this.updateCacheMetadata(tickets.length);

    console.info(`[TicketCacheService] Successfully cached ${tickets.length} tickets`);
  }

  /**
   * Update cache metadata after caching
   */
  private async updateCacheMetadata(ticketCount: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TICKETS_LAST_FETCHED, String(Date.now()));
      await AsyncStorage.setItem(STORAGE_KEYS.QR_CODES_CACHED, 'true');
    } catch (error) {
      console.error('[TicketCacheService] Failed to update cache metadata:', error);
    }
  }

  /**
   * Get cached tickets
   */
  async getCachedTickets(festivalId?: string, userId?: string): Promise<Ticket[]> {
    const collection = this.database.get<Ticket>(TableNames.TICKETS);

    let query = collection.query();

    if (festivalId) {
      query = collection.query(Q.where('festival_id', festivalId));
    }

    if (userId) {
      query = collection.query(Q.where('user_id', userId));
    }

    return query.fetch();
  }

  /**
   * Get a single cached ticket by server ID
   */
  async getCachedTicketById(ticketId: string): Promise<Ticket | null> {
    const collection = this.database.get<Ticket>(TableNames.TICKETS);

    try {
      // Try by WatermelonDB ID first
      return await collection.find(ticketId);
    } catch {
      // Try by server ID
      const results = await collection.query(Q.where('server_id', ticketId)).fetch();
      return results[0] || null;
    }
  }

  /**
   * Get QR code data for offline display
   */
  async getQRCodeData(ticketId: string): Promise<{ qrCode: string; qrCodeData: string } | null> {
    const ticket = await this.getCachedTicketById(ticketId);

    if (!ticket) {
      return null;
    }

    return {
      qrCode: ticket.qrCode,
      qrCodeData: ticket.qrCodeData,
    };
  }

  /**
   * Check if QR codes are available offline
   */
  async hasQRCodesAvailable(festivalId?: string): Promise<boolean> {
    const tickets = await this.getCachedTickets(festivalId);

    if (tickets.length === 0) {
      return false;
    }

    // Check if all tickets have QR data
    return tickets.every((ticket) => ticket.qrCode && ticket.qrCodeData);
  }

  /**
   * Get cache status
   */
  async getCacheStatus(festivalId?: string): Promise<TicketCacheStatus> {
    try {
      const lastFetchedStr = await AsyncStorage.getItem(STORAGE_KEYS.TICKETS_LAST_FETCHED);
      const lastFetchedAt = lastFetchedStr ? new Date(parseInt(lastFetchedStr, 10)) : null;

      const tickets = await this.getCachedTickets(festivalId);
      const qrCodesAvailable = await this.hasQRCodesAvailable(festivalId);

      const isStale = lastFetchedAt
        ? Date.now() - lastFetchedAt.getTime() > CACHE_CONFIG.MAX_CACHE_AGE_MS
        : true;

      return {
        isCached: tickets.length > 0,
        ticketCount: tickets.length,
        lastFetchedAt,
        isStale,
        qrCodesAvailable,
      };
    } catch (error) {
      console.error('[TicketCacheService] Failed to get cache status:', error);
      return {
        isCached: false,
        ticketCount: 0,
        lastFetchedAt: null,
        isStale: true,
        qrCodesAvailable: false,
      };
    }
  }

  /**
   * Check if tickets need refresh
   */
  async needsRefresh(): Promise<boolean> {
    const status = await this.getCacheStatus();
    return !status.isCached || status.isStale;
  }

  /**
   * Clear all cached tickets
   */
  async clearCache(): Promise<void> {
    console.info('[TicketCacheService] Clearing ticket cache');

    const collection = this.database.get<Ticket>(TableNames.TICKETS);
    const allTickets = await collection.query().fetch();

    await this.database.write(async () => {
      for (const ticket of allTickets) {
        await ticket.destroyPermanently();
      }
    });

    // Clear metadata
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TICKETS_LAST_FETCHED,
      STORAGE_KEYS.QR_CODES_CACHED,
    ]);

    console.info('[TicketCacheService] Cache cleared');
  }

  /**
   * Preload tickets for a festival (call on app start or before going offline)
   */
  async preloadTickets(
    fetchFunction: () => Promise<any[]>,
    festivalId?: string
  ): Promise<{ success: boolean; ticketCount: number }> {
    console.info('[TicketCacheService] Preloading tickets...');

    try {
      const tickets = await fetchFunction();
      await this.cacheTickets(tickets);

      return {
        success: true,
        ticketCount: tickets.length,
      };
    } catch (error) {
      console.error('[TicketCacheService] Failed to preload tickets:', error);
      return {
        success: false,
        ticketCount: 0,
      };
    }
  }

  /**
   * Ensure a specific ticket is cached (called when viewing a ticket)
   */
  async ensureTicketCached(
    ticketId: string,
    fetchFunction: () => Promise<any>
  ): Promise<Ticket | null> {
    // Check if already cached
    const cached = await this.getCachedTicketById(ticketId);
    if (cached) {
      console.info(`[TicketCacheService] Ticket ${ticketId} already cached`);
      return cached;
    }

    // Fetch and cache
    try {
      const serverTicket = await fetchFunction();
      await this.cacheTickets([serverTicket]);
      return this.getCachedTicketById(ticketId);
    } catch (error) {
      console.error(`[TicketCacheService] Failed to ensure ticket ${ticketId} cached:`, error);
      return null;
    }
  }

  /**
   * Get tickets with valid (unused) status
   */
  async getValidTickets(festivalId?: string): Promise<Ticket[]> {
    const collection = this.database.get<Ticket>(TableNames.TICKETS);

    const queries = [Q.where('status', Q.oneOf(['AVAILABLE', 'SOLD']))];

    if (festivalId) {
      queries.push(Q.where('festival_id', festivalId));
    }

    return collection.query(...queries).fetch();
  }

  /**
   * Mark a ticket as used locally (will sync later)
   */
  async markTicketAsUsed(ticketId: string, staffId?: string): Promise<boolean> {
    const ticket = await this.getCachedTicketById(ticketId);

    if (!ticket) {
      console.error(`[TicketCacheService] Ticket ${ticketId} not found for marking as used`);
      return false;
    }

    try {
      await ticket.markAsUsed(staffId);
      console.info(`[TicketCacheService] Ticket ${ticketId} marked as used locally`);
      return true;
    } catch (error) {
      console.error(`[TicketCacheService] Failed to mark ticket ${ticketId} as used:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const ticketCacheService = TicketCacheService.getInstance();
export default TicketCacheService;
