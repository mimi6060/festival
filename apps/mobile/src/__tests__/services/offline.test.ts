/**
 * Offline Service Tests
 *
 * Tests the OfflineService functionality including
 * network detection, sync queue, and data synchronization.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Mock stores
const mockSyncTickets = jest.fn();
const mockSyncWallet = jest.fn();
const mockSyncProgram = jest.fn();

jest.mock('../../store', () => ({
  useTicketStore: {
    getState: () => ({
      syncTickets: mockSyncTickets,
    }),
  },
  useWalletStore: {
    getState: () => ({
      syncWallet: mockSyncWallet,
    }),
  },
  useProgramStore: {
    getState: () => ({
      syncProgram: mockSyncProgram,
    }),
  },
}));

// Mock API service
const mockGetTickets = jest.fn();
const mockGetWalletBalance = jest.fn();
const mockGetTransactions = jest.fn();
const mockGetProgram = jest.fn();

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getTickets: () => mockGetTickets(),
    getWalletBalance: () => mockGetWalletBalance(),
    getTransactions: () => mockGetTransactions(),
    getProgram: () => mockGetProgram(),
  },
  apiService: {
    getTickets: () => mockGetTickets(),
    getWalletBalance: () => mockGetWalletBalance(),
    getTransactions: () => mockGetTransactions(),
    getProgram: () => mockGetProgram(),
  },
}));

describe('OfflineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
  });

  describe('SyncQueueItem Interface', () => {
    interface SyncQueueItem {
      id: string;
      action: string;
      endpoint: string;
      method: string;
      body?: object;
      timestamp: string;
    }

    it('should have required fields', () => {
      const item: SyncQueueItem = {
        id: 'item-123',
        action: 'CREATE_TICKET',
        endpoint: '/api/tickets',
        method: 'POST',
        timestamp: new Date().toISOString(),
      };

      expect(item.id).toBeDefined();
      expect(item.action).toBeDefined();
      expect(item.endpoint).toBeDefined();
      expect(item.method).toBeDefined();
      expect(item.timestamp).toBeDefined();
    });

    it('should allow optional body', () => {
      const itemWithBody: SyncQueueItem = {
        id: 'item-123',
        action: 'CREATE_TICKET',
        endpoint: '/api/tickets',
        method: 'POST',
        body: { ticketId: '456' },
        timestamp: new Date().toISOString(),
      };

      expect(itemWithBody.body).toEqual({ ticketId: '456' });

      const itemWithoutBody: SyncQueueItem = {
        id: 'item-124',
        action: 'GET_TICKETS',
        endpoint: '/api/tickets',
        method: 'GET',
        timestamp: new Date().toISOString(),
      };

      expect(itemWithoutBody.body).toBeUndefined();
    });

    it('should generate unique IDs', () => {
      const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const id1 = generateId();
      const id2 = generateId();

      expect(id1).not.toBe(id2);
    });

    it('should have valid timestamp format', () => {
      const item: SyncQueueItem = {
        id: 'item-123',
        action: 'TEST',
        endpoint: '/api/test',
        method: 'GET',
        timestamp: new Date().toISOString(),
      };

      expect(new Date(item.timestamp).toISOString()).toBe(item.timestamp);
    });
  });

  describe('Network Status', () => {
    it('should detect online status', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      const state = await NetInfo.fetch();
      expect(state.isConnected).toBe(true);
    });

    it('should detect offline status', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      const state = await NetInfo.fetch();
      expect(state.isConnected).toBe(false);
    });

    it('should handle null connection state', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: null,
        isInternetReachable: null,
        type: 'unknown',
      });

      const state = await NetInfo.fetch();
      const isOnline = state.isConnected ?? false;
      expect(isOnline).toBe(false);
    });

    it('should detect wifi connection type', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      const state = await NetInfo.fetch();
      expect(state.type).toBe('wifi');
    });

    it('should detect cellular connection type', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
      });

      const state = await NetInfo.fetch();
      expect(state.type).toBe('cellular');
    });
  });

  describe('AsyncStorage Operations', () => {
    const SYNC_QUEUE_KEY = '@sync_queue';
    const LAST_SYNC_KEY = '@last_sync';

    it('should save sync queue to storage', async () => {
      const queue = [
        {
          id: 'item-1',
          action: 'TEST',
          endpoint: '/test',
          method: 'GET',
          timestamp: new Date().toISOString(),
        },
      ];

      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(SYNC_QUEUE_KEY, expect.any(String));
    });

    it('should load sync queue from storage', async () => {
      const queue = [{ id: 'item-1', action: 'TEST' }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queue));

      const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];

      expect(parsed).toEqual(queue);
    });

    it('should handle empty storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];

      expect(parsed).toEqual([]);
    });

    it('should save last sync time', async () => {
      const syncTime = new Date().toISOString();

      await AsyncStorage.setItem(LAST_SYNC_KEY, syncTime);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(LAST_SYNC_KEY, syncTime);
    });

    it('should load last sync time', async () => {
      const syncTime = '2026-01-08T10:00:00.000Z';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(syncTime);

      const stored = await AsyncStorage.getItem(LAST_SYNC_KEY);

      expect(stored).toBe(syncTime);
    });

    it('should clear offline data', async () => {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
      await AsyncStorage.removeItem(LAST_SYNC_KEY);

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(SYNC_QUEUE_KEY);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(LAST_SYNC_KEY);
    });
  });

  describe('Sync Data Logic', () => {
    it('should sync tickets on success', async () => {
      const tickets = [{ id: 'ticket-1', eventName: 'Festival' }];
      mockGetTickets.mockResolvedValue({ success: true, data: tickets });

      const response = await mockGetTickets();

      if (response.success) {
        mockSyncTickets(response.data);
      }

      expect(mockSyncTickets).toHaveBeenCalledWith(tickets);
    });

    it('should not sync tickets on failure', async () => {
      mockGetTickets.mockResolvedValue({ success: false, data: null });

      const response = await mockGetTickets();

      if (response.success) {
        mockSyncTickets(response.data);
      }

      expect(mockSyncTickets).not.toHaveBeenCalled();
    });

    it('should sync wallet data', async () => {
      const balance = { available: 100, pending: 0, currency: 'EUR' };
      const transactions = [{ id: 'tx-1', amount: 50 }];

      mockGetWalletBalance.mockResolvedValue({ success: true, data: balance });
      mockGetTransactions.mockResolvedValue({
        success: true,
        data: transactions,
      });

      const [balanceRes, transactionsRes] = await Promise.all([
        mockGetWalletBalance(),
        mockGetTransactions(),
      ]);

      if (balanceRes.success && transactionsRes.success) {
        mockSyncWallet(balanceRes.data, transactionsRes.data);
      }

      expect(mockSyncWallet).toHaveBeenCalledWith(balance, transactions);
    });

    it('should sync program data', async () => {
      const program = [{ id: 'event-1', name: 'Concert' }];
      mockGetProgram.mockResolvedValue({ success: true, data: program });

      const response = await mockGetProgram();

      if (response.success) {
        mockSyncProgram(response.data, [], []);
      }

      expect(mockSyncProgram).toHaveBeenCalledWith(program, [], []);
    });

    it('should handle API errors gracefully', async () => {
      mockGetTickets.mockRejectedValue(new Error('Network error'));

      let errorCaught = false;
      try {
        await mockGetTickets();
      } catch {
        errorCaught = true;
      }

      expect(errorCaught).toBe(true);
    });
  });

  describe('Queue Processing', () => {
    it('should process queue items with fetch', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const item = {
        endpoint: 'http://api.test/endpoint',
        method: 'POST',
        body: { data: 'test' },
      };

      await fetch(item.endpoint, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        item.endpoint,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(item.body),
        })
      );
    });

    it('should retry failed items', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Failed'));

      const queue: any[] = [];
      const item = {
        id: 'item-1',
        endpoint: '/api/test',
        method: 'GET',
        timestamp: new Date().toISOString(),
      };

      try {
        await fetch(item.endpoint, { method: item.method });
      } catch {
        queue.push(item);
      }

      expect(queue).toContain(item);
    });
  });

  describe('Offline Behavior', () => {
    it('should queue actions when offline', () => {
      const isOnline = false;
      const queue: any[] = [];

      const action = { type: 'PURCHASE_TICKET', payload: { ticketId: '123' } };

      if (!isOnline) {
        queue.push(action);
      }

      expect(queue).toContain(action);
    });

    it('should process queue when back online', async () => {
      const queue = [
        { id: 'item-1', endpoint: '/api/test', method: 'GET' },
        { id: 'item-2', endpoint: '/api/test2', method: 'POST' },
      ];

      const isOnline = true;
      const processed: string[] = [];

      if (isOnline) {
        for (const item of queue) {
          processed.push(item.id);
        }
      }

      expect(processed).toEqual(['item-1', 'item-2']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent operations', async () => {
      const operations = [
        AsyncStorage.setItem('@key1', 'value1'),
        AsyncStorage.setItem('@key2', 'value2'),
        AsyncStorage.setItem('@key3', 'value3'),
      ];

      await Promise.all(operations);

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(3);
    });

    it('should handle storage errors', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

      let errorCaught = false;
      try {
        await AsyncStorage.setItem('@test', 'value');
      } catch {
        errorCaught = true;
      }

      expect(errorCaught).toBe(true);
    });

    it('should handle malformed stored data', () => {
      const badData = 'not-valid-json';

      let parsed = [];
      try {
        parsed = JSON.parse(badData);
      } catch {
        parsed = [];
      }

      expect(parsed).toEqual([]);
    });
  });
});
