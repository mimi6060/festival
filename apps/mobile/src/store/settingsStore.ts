import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'fr' | 'en' | 'es' | 'de';
export type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  language: Language;
  theme: Theme;
  biometricEnabled: boolean;
  offlineModeEnabled: boolean;

  // Actions
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setOfflineModeEnabled: (enabled: boolean) => void;
  resetSettings: () => void;
}

const initialState = {
  language: 'fr' as Language,
  theme: 'dark' as Theme,
  biometricEnabled: false,
  offlineModeEnabled: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,

      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setOfflineModeEnabled: (offlineModeEnabled) => set({ offlineModeEnabled }),
      resetSettings: () => set(initialState),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Language labels for display
export const languageLabels: Record<Language, string> = {
  fr: 'Francais',
  en: 'English',
  es: 'Espanol',
  de: 'Deutsch',
};

// Theme labels for display
export const themeLabels: Record<Theme, string> = {
  light: 'Clair',
  dark: 'Sombre',
  system: 'Systeme',
};
