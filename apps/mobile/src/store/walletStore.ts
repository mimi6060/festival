import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WalletBalance, Transaction } from '../types';

interface WalletState {
  balance: WalletBalance;
  transactions: Transaction[];
  isLoading: boolean;
  lastSyncedAt: string | null;

  // Actions
  setBalance: (balance: WalletBalance) => void;
  updateBalance: (amount: number, type: 'add' | 'subtract') => void;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  setLoading: (loading: boolean) => void;
  syncWallet: (balance: WalletBalance, transactions: Transaction[]) => void;
  clearWallet: () => void;
}

const initialBalance: WalletBalance = {
  available: 0,
  pending: 0,
  currency: 'EUR',
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      balance: initialBalance,
      transactions: [],
      isLoading: false,
      lastSyncedAt: null,

      setBalance: (balance) => set({ balance }),

      updateBalance: (amount, type) =>
        set((state) => ({
          balance: {
            ...state.balance,
            available:
              type === 'add'
                ? state.balance.available + amount
                : state.balance.available - amount,
          },
        })),

      setTransactions: (transactions) => set({ transactions }),

      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [transaction, ...state.transactions],
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      syncWallet: (balance, transactions) =>
        set({
          balance,
          transactions,
          lastSyncedAt: new Date().toISOString(),
        }),

      clearWallet: () =>
        set({
          balance: initialBalance,
          transactions: [],
          lastSyncedAt: null,
        }),
    }),
    {
      name: 'wallet-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        balance: state.balance,
        transactions: state.transactions,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
