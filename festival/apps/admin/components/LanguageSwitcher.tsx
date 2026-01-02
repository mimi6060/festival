'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../lib/i18n/useTranslation';
import type { Language } from '../lib/i18n/translations';

interface LanguageSwitcherProps {
  /** Show only the flag/code instead of full dropdown */
  compact?: boolean;
  /** Custom className for the container */
  className?: string;
}

/**
 * Language switcher component for the admin app
 *
 * @example
 * ```tsx
 * // Full dropdown
 * <LanguageSwitcher />
 *
 * // Compact version (just shows current language, click to toggle)
 * <LanguageSwitcher compact />
 * ```
 */
export function LanguageSwitcher({ compact = false, className = '' }: LanguageSwitcherProps) {
  const { language, setLanguage, availableLanguages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = availableLanguages.find((l) => l.code === language);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const handleLanguageSelect = (langCode: Language) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  // Compact version - just toggle between languages
  if (compact) {
    const nextLanguage = availableLanguages.find((l) => l.code !== language);

    return (
      <button
        type="button"
        onClick={() => nextLanguage && setLanguage(nextLanguage.code)}
        className={`inline-flex items-center px-2 py-1 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors ${className}`}
        title={`Switch to ${nextLanguage?.name}`}
      >
        <span className="font-semibold">{currentLanguage?.flag}</span>
      </button>
    );
  }

  // Full dropdown version
  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="inline-flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
      >
        <span className="flex items-center">
          <span className="mr-2 font-semibold">{currentLanguage?.flag}</span>
          <span>{currentLanguage?.name}</span>
        </span>
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-10 mt-1 w-full min-w-[140px] bg-white border border-gray-200 rounded-md shadow-lg"
          role="listbox"
          aria-label="Available languages"
        >
          <ul className="py-1">
            {availableLanguages.map((lang) => (
              <li key={lang.code}>
                <button
                  type="button"
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 ${
                    lang.code === language ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                  }`}
                  role="option"
                  aria-selected={lang.code === language}
                >
                  <span className="mr-2 font-semibold">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {lang.code === language && (
                    <svg
                      className="w-4 h-4 ml-auto text-indigo-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
