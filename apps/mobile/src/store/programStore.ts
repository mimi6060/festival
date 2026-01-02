import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProgramEvent, Artist, Stage } from '../types';

interface ProgramState {
  events: ProgramEvent[];
  artists: Artist[];
  stages: Stage[];
  favorites: string[]; // Event IDs
  selectedDay: string | null;
  isLoading: boolean;
  lastSyncedAt: string | null;

  // Actions
  setEvents: (events: ProgramEvent[]) => void;
  setArtists: (artists: Artist[]) => void;
  setStages: (stages: Stage[]) => void;
  toggleFavorite: (eventId: string) => void;
  setSelectedDay: (day: string | null) => void;
  setLoading: (loading: boolean) => void;
  syncProgram: (events: ProgramEvent[], artists: Artist[], stages: Stage[]) => void;
  clearProgram: () => void;
}

export const useProgramStore = create<ProgramState>()(
  persist(
    (set) => ({
      events: [],
      artists: [],
      stages: [],
      favorites: [],
      selectedDay: null,
      isLoading: false,
      lastSyncedAt: null,

      setEvents: (events) => set({ events }),

      setArtists: (artists) => set({ artists }),

      setStages: (stages) => set({ stages }),

      toggleFavorite: (eventId) =>
        set((state) => ({
          favorites: state.favorites.includes(eventId)
            ? state.favorites.filter((id) => id !== eventId)
            : [...state.favorites, eventId],
        })),

      setSelectedDay: (day) => set({ selectedDay: day }),

      setLoading: (loading) => set({ isLoading: loading }),

      syncProgram: (events, artists, stages) =>
        set({
          events,
          artists,
          stages,
          lastSyncedAt: new Date().toISOString(),
        }),

      clearProgram: () =>
        set({
          events: [],
          artists: [],
          stages: [],
          favorites: [],
          selectedDay: null,
          lastSyncedAt: null,
        }),
    }),
    {
      name: 'program-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        events: state.events,
        artists: state.artists,
        stages: state.stages,
        favorites: state.favorites,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
