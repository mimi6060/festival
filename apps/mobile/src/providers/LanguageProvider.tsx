/**
 * LanguageProvider - Manages language state and RTL support for React Native
 *
 * Features:
 * - Persists language preference
 * - Syncs with device settings on first launch
 * - Handles RTL layout direction for Arabic
 * - Provides language context to children
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { I18nextProvider } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';

import i18n from '../i18n';
import {
  Locale,
  LocaleConfig,
  isRTL,
  getLocaleConfig,
  getAllLocales,
  isValidLocale,
} from '../i18n/config';
import { storeLanguage } from '../i18n/languageDetector';

/**
 * Language context value type
 */
interface LanguageContextValue {
  /** Current language */
  language: Locale;
  /** Current locale configuration */
  localeConfig: LocaleConfig;
  /** All available locales */
  availableLocales: LocaleConfig[];
  /** Whether current language is RTL */
  isRTL: boolean;
  /** Change the current language */
  changeLanguage: (language: Locale) => Promise<void>;
  /** Whether the language system is initialized */
  isInitialized: boolean;
  /** Whether a language change is pending restart */
  pendingRestart: boolean;
}

/**
 * Language context
 */
const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Props for LanguageProvider
 */
interface LanguageProviderProps {
  children: ReactNode;
}

/**
 * LanguageProvider component
 *
 * Wraps the app with i18next provider and manages RTL support.
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { LanguageProvider } from './providers/LanguageProvider';
 *
 * export default function App() {
 *   return (
 *     <LanguageProvider>
 *       <Navigation />
 *     </LanguageProvider>
 *   );
 * }
 * ```
 */
export function LanguageProvider({ children }: LanguageProviderProps): JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingRestart, setPendingRestart] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Locale>('fr');

  /**
   * Initialize language on mount
   */
  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        // Wait for i18next to be ready
        if (!i18n.isInitialized) {
          await new Promise<void>((resolve) => {
            i18n.on('initialized', () => resolve());
          });
        }

        // Get the current language from i18next
        const lang = i18n.language;
        const validLang: Locale = isValidLocale(lang) ? lang : 'fr';
        setCurrentLanguage(validLang);

        // Ensure RTL is correctly set
        const shouldBeRTL = isRTL(validLang);
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.allowRTL(shouldBeRTL);
          I18nManager.forceRTL(shouldBeRTL);

          // On iOS, we need to restart for RTL changes
          if (Platform.OS === 'ios') {
            setPendingRestart(true);
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize language:', error);
        setIsInitialized(true); // Still mark as initialized to not block the app
      }
    };

    initializeLanguage();
  }, []);

  /**
   * Listen for language changes from i18next
   */
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      if (isValidLocale(lng)) {
        setCurrentLanguage(lng);
      }
    };

    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  /**
   * Change language with RTL handling
   */
  const changeLanguage = useCallback(
    async (newLanguage: Locale): Promise<void> => {
      if (!isValidLocale(newLanguage)) {
        console.warn(`Invalid locale: ${newLanguage}`);
        return;
      }

      const currentIsRTL = isRTL(currentLanguage);
      const newIsRTL = isRTL(newLanguage);
      const rtlChanged = currentIsRTL !== newIsRTL;

      try {
        // Change i18next language
        await i18n.changeLanguage(newLanguage);

        // Store preference
        await storeLanguage(newLanguage);

        // Update state
        setCurrentLanguage(newLanguage);

        // Handle RTL change
        if (rtlChanged) {
          I18nManager.allowRTL(newIsRTL);
          I18nManager.forceRTL(newIsRTL);

          // Need to restart the app for RTL changes to take effect
          setPendingRestart(true);

          // In development, we can try to reload
          if (__DEV__) {
            // Expo development reload
            try {
              await Updates.reloadAsync();
            } catch {
              // Updates.reloadAsync may not be available in dev
              console.warn('Please restart the app for RTL changes to take effect');
            }
          }
        }
      } catch (error) {
        console.error('Failed to change language:', error);
        throw error;
      }
    },
    [currentLanguage]
  );

  /**
   * Memoized context value
   */
  const contextValue = useMemo<LanguageContextValue>(
    () => ({
      language: currentLanguage,
      localeConfig: getLocaleConfig(currentLanguage),
      availableLocales: getAllLocales(),
      isRTL: isRTL(currentLanguage),
      changeLanguage,
      isInitialized,
      pendingRestart,
    }),
    [currentLanguage, changeLanguage, isInitialized, pendingRestart]
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>
    </I18nextProvider>
  );
}

/**
 * Hook to access language context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { language, changeLanguage, isRTL } = useLanguage();
 *
 *   return (
 *     <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
 *       <Text>Current: {language}</Text>
 *       <Button onPress={() => changeLanguage('ar')} title="Switch to Arabic" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}

/**
 * HOC to provide language context to class components
 *
 * @example
 * ```tsx
 * class MyClassComponent extends React.Component<WithLanguageProps> {
 *   render() {
 *     const { language, t } = this.props;
 *     return <Text>{t('common.welcome')}</Text>;
 *   }
 * }
 *
 * export default withLanguage(MyClassComponent);
 * ```
 */
export type WithLanguageProps = LanguageContextValue;

export function withLanguage<P extends object>(
  WrappedComponent: React.ComponentType<P & WithLanguageProps>
): React.FC<Omit<P, keyof WithLanguageProps>> {
  return function WithLanguageComponent(props: Omit<P, keyof WithLanguageProps>) {
    const languageContext = useLanguage();

    return <WrappedComponent {...(props as P)} {...languageContext} />;
  };
}

export default LanguageProvider;
