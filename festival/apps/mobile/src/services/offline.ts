import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useTicketStore, useWalletStore, useProgramStore } from '../store';
import apiService from './api';

const SYNC_QUEUE_KEY = '@sync_queue';
const LAST_SYNC_KEY = '@last_sync';

interface SyncQueueItem {
  id: string;
  action: string;
  endpoint: string;
  method: string;
  body?: object;
  timestamp: string;
}

class OfflineService {
  private isOnline = true;
  private syncQueue: SyncQueueItem[] = [];

  constructor() {
    this.initNetworkListener();
    this.loadSyncQueue();
  }

  private initNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        this.processSyncQueue();
      }
    });
  }

  async isNetworkAvailable(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  private async loadSyncQueue() {
    try {
      const queueData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  private async saveSyncQueue() {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>) {
    const queueItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.syncQueue.push(queueItem);
    await this.saveSyncQueue();
  }

  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    const itemsToProcess = [...this.syncQueue];
    this.syncQueue = [];
    await this.saveSyncQueue();

    for (const item of itemsToProcess) {
      try {
        await fetch(item.endpoint, {
          method: item.method,
          headers: { 'Content-Type': 'application/json' },
          body: item.body ? JSON.stringify(item.body) : undefined,
        });
      } catch (error) {
        // Re-add to queue if failed
        this.syncQueue.push(item);
      }
    }

    if (this.syncQueue.length > 0) {
      await this.saveSyncQueue();
    }
  }

  async syncAllData() {
    if (!await this.isNetworkAvailable()) {
      return { success: false, message: 'No network connection' };
    }

    try {
      // Sync tickets
      const ticketsResponse = await apiService.getTickets();
      if (ticketsResponse.success) {
        useTicketStore.getState().syncTickets(ticketsResponse.data);
      }

      // Sync wallet
      const [balanceResponse, transactionsResponse] = await Promise.all([
        apiService.getWalletBalance(),
        apiService.getTransactions(),
      ]);

      if (balanceResponse.success && transactionsResponse.success) {
        useWalletStore.getState().syncWallet(
          balanceResponse.data,
          transactionsResponse.data
        );
      }

      // Sync program
      const programResponse = await apiService.getProgram();
      if (programResponse.success) {
        useProgramStore.getState().syncProgram(programResponse.data, [], []);
      }

      // Update last sync time
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

      return { success: true };
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, message: 'Sync failed' };
    }
  }

  async getLastSyncTime(): Promise<string | null> {
    return AsyncStorage.getItem(LAST_SYNC_KEY);
  }

  async clearOfflineData() {
    await Promise.all([
      AsyncStorage.removeItem(SYNC_QUEUE_KEY),
      AsyncStorage.removeItem(LAST_SYNC_KEY),
    ]);
    this.syncQueue = [];
  }

  getSyncQueueLength(): number {
    return this.syncQueue.length;
  }
}

export const offlineService = new OfflineService();
export default offlineService;
