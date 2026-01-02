'use client';

import { useContext } from 'react';
import { LanguageContext } from './LanguageContext';
import { Language, TranslationKeys, TranslationSection, translations } from './translations';

interface UseTranslationReturn {
  t: TranslationKeys;
  language: Language;
  setLanguage: (lang: Language) => void;
  availableLanguages: { code: Language; name: string; flag: string }[];
}

/**
 * Hook to access translations and language settings
 *
 * @example
 * ```tsx
 * const { t, language, setLanguage } = useTranslation();
 *
 * return (
 *   <div>
 *     <h1>{t.dashboard.title}</h1>
 *     <button onClick={() => setLanguage('en')}>Switch to English</button>
 *   </div>
 * );
 * ```
 */
export function useTranslation(): UseTranslationReturn {
  const context = useContext(LanguageContext);

  if (context === undefined) {
    // Return default French translations if used outside provider
    // This allows the hook to work in server components or outside the provider
    return {
      t: translations.fr,
      language: 'fr',
      setLanguage: () => {
        console.warn('useTranslation: setLanguage called outside of LanguageProvider');
      },
      availableLanguages: [
        { code: 'fr', name: 'Francais', flag: 'FR' },
        { code: 'en', name: 'English', flag: 'GB' },
      ],
    };
  }

  return {
    t: context.t,
    language: context.language,
    setLanguage: context.setLanguage,
    availableLanguages: context.availableLanguages,
  };
}

/**
 * Get a specific section of translations
 *
 * @example
 * ```tsx
 * const { section, language } = useTranslationSection('festivals');
 * console.log(section.title); // "Festivals"
 * ```
 */
export function useTranslationSection<T extends TranslationSection>(
  sectionName: T
): { section: TranslationKeys[T]; language: Language } {
  const { t, language } = useTranslation();
  return {
    section: t[sectionName],
    language,
  };
}

export default useTranslation;
