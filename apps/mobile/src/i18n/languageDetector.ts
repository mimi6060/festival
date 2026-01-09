/**
 * Language Detector for React Native
 * Detects device language and persists user preference
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { LanguageDetectorAsyncModule } from 'i18next';

import {
  Locale,
  LANGUAGE_STORAGE_KEY,
  FALLBACK_LANGUAGE,
  mapLanguageCode,
  isValidLocale,
} from './config';

/**
 * Get the device's preferred language
 */
export function getDeviceLanguage(): Locale {
  try {
    // Get the device's preferred locales
    const locales = Localization.getLocales();

    if (locales && locales.length > 0) {
      const deviceLocale = locales[0];
      const languageCode = deviceLocale?.languageCode || '';

      // Try to map the device language to our supported locales
      return mapLanguageCode(languageCode);
    }
  } catch (error) {
    console.warn('Failed to get device language:', error);
  }

  return FALLBACK_LANGUAGE;
}

/**
 * Get the stored language preference
 */
export async function getStoredLanguage(): Promise<Locale | null> {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (storedLanguage && isValidLocale(storedLanguage)) {
      return storedLanguage;
    }
  } catch (error) {
    console.warn('Failed to get stored language:', error);
  }

  return null;
}

/**
 * Store the language preference
 */
export async function storeLanguage(language: Locale): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to store language:', error);
  }
}

/**
 * Clear the stored language preference
 */
export async function clearStoredLanguage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear stored language:', error);
  }
}

/**
 * i18next language detector plugin for React Native
 */
const languageDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,

  /**
   * Initialize the detector
   */
  init: () => {
    // No initialization needed
  },

  /**
   * Detect the user's language
   * Priority: stored preference > device language > fallback
   */
  detect: async (callback: (lng: string) => void) => {
    try {
      // First, check for stored preference
      const storedLanguage = await getStoredLanguage();

      if (storedLanguage) {
        callback(storedLanguage);
        return;
      }

      // Fall back to device language
      const deviceLanguage = getDeviceLanguage();
      callback(deviceLanguage);
    } catch (error) {
      console.warn('Language detection failed:', error);
      callback(FALLBACK_LANGUAGE);
    }
  },

  /**
   * Cache the detected language
   */
  cacheUserLanguage: async (language: string) => {
    if (isValidLocale(language)) {
      await storeLanguage(language);
    }
  },
};

export default languageDetector;
