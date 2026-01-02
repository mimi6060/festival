/**
 * Admin App Internationalization (i18n)
 *
 * Usage:
 * 1. Wrap your app with LanguageProvider in layout.tsx
 * 2. Use useTranslation() hook to access translations
 * 3. Use LanguageSwitcher component to allow language switching
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * import { LanguageProvider } from './lib/i18n';
 *
 * export default function Layout({ children }) {
 *   return (
 *     <LanguageProvider>
 *       {children}
 *     </LanguageProvider>
 *   );
 * }
 *
 * // In any component
 * import { useTranslation } from '../lib/i18n';
 *
 * function MyComponent() {
 *   const { t, language, setLanguage } = useTranslation();
 *   return <h1>{t.dashboard.title}</h1>;
 * }
 * ```
 */

export { LanguageProvider, LanguageContext } from './LanguageContext';
export { useTranslation, useTranslationSection } from './useTranslation';
export { translations, type Language, type TranslationKeys, type TranslationSection } from './translations';
