/* eslint-disable @typescript-eslint/no-unused-vars */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ticket } from '../types';

interface TicketState {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  isLoading: boolean;
  lastSyncedAt: string | null;

  // Actions
  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => void;
  removeTicket: (ticketId: string) => void;
  selectTicket: (ticket: Ticket | null) => void;
  setLoading: (loading: boolean) => void;
  syncTickets: (tickets: Ticket[]) => void;
  clearTickets: () => void;
}

export const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: [],
      selectedTicket: null,
      isLoading: false,
      lastSyncedAt: null,

      setTickets: (tickets) => set({ tickets }),

      addTicket: (ticket) =>
        set((state) => ({
          tickets: [...state.tickets, ticket],
        })),

      updateTicket: (ticketId, updates) =>
        set((state) => ({
          tickets: state.tickets.map((t) => (t.id === ticketId ? { ...t, ...updates } : t)),
        })),

      removeTicket: (ticketId) =>
        set((state) => ({
          tickets: state.tickets.filter((t) => t.id !== ticketId),
        })),

      selectTicket: (ticket) => set({ selectedTicket: ticket }),

      setLoading: (loading) => set({ isLoading: loading }),

      syncTickets: (tickets) =>
        set({
          tickets,
          lastSyncedAt: new Date().toISOString(),
        }),

      clearTickets: () =>
        set({
          tickets: [],
          selectedTicket: null,
          lastSyncedAt: null,
        }),
    }),
    {
      name: 'ticket-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tickets: state.tickets,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
