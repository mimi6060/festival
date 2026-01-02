'use client';

import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKeys } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  availableLanguages: { code: Language; name: string; flag: string }[];
}

const STORAGE_KEY = 'festival-admin-language';

const availableLanguages: { code: Language; name: string; flag: string }[] = [
  { code: 'fr', name: 'Francais', flag: 'FR' },
  { code: 'en', name: 'English', flag: 'GB' },
];

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

export function LanguageProvider({ children, defaultLanguage = 'fr' }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load language from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored && (stored === 'fr' || stored === 'en')) {
        setLanguageState(stored);
      }
      setIsInitialized(true);
    }
  }, []);

  // Save language to localStorage when it changes
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
    // Update document lang attribute for accessibility
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, []);

  // Get current translations
  const t = translations[language];

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    availableLanguages,
  };

  // Prevent hydration mismatch by rendering with default language until initialized
  if (!isInitialized) {
    return (
      <LanguageContext.Provider value={{ ...value, t: translations[defaultLanguage] }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageProvider;
