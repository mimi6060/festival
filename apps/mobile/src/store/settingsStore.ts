import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

export type Language = 'fr' | 'en' | 'es' | 'de' | 'it' | 'ar';
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

      setLanguage: (language) => {
        // Update i18n language
        i18n.changeLanguage(language);
        set({ language });
      },
      setTheme: (theme) => set({ theme }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setOfflineModeEnabled: (offlineModeEnabled) => set({ offlineModeEnabled }),
      resetSettings: () => {
        i18n.changeLanguage(initialState.language);
        set(initialState);
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Sync i18n on rehydration
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          i18n.changeLanguage(state.language);
        }
      },
    }
  )
);

// Language labels for display (native names)
export const languageLabels: Record<Language, string> = {
  fr: 'Francais',
  en: 'English',
  es: 'Espanol',
  de: 'Deutsch',
  it: 'Italiano',
  ar: 'العربية',
};

// Language flags for display
export const languageFlags: Record<Language, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  de: '🇩🇪',
  it: '🇮🇹',
  ar: '🇸🇦',
};

// Theme labels for display
export const themeLabels: Record<Theme, string> = {
  light: 'Clair',
  dark: 'Sombre',
  system: 'Systeme',
};
