'use client';

import React from 'react';
import { useTheme } from './Providers';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
};

function SunIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-yellow-500"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-blue-400"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SystemIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-500 dark:text-gray-400"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

export function ThemeToggle({ className = '', showLabel = false, size = 'md' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const iconSize = iconSizes[size];

  const cycleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <SystemIcon size={iconSize} />;
    }
    return resolvedTheme === 'dark' ? <MoonIcon size={iconSize} /> : <SunIcon size={iconSize} />;
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Clair';
      case 'dark':
        return 'Sombre';
      case 'system':
        return 'Système';
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center gap-2
        rounded-lg
        bg-gray-100 hover:bg-gray-200
        dark:bg-gray-800 dark:hover:bg-gray-700
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-900
        ${className}
      `}
      title={`Thème actuel: ${getLabel()}. Cliquez pour changer.`}
      aria-label={`Changer le thème. Actuel: ${getLabel()}`}
    >
      {getIcon()}
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getLabel()}
        </span>
      )}
    </button>
  );
}

interface ThemeDropdownProps {
  className?: string;
}

export function ThemeDropdown({ className = '' }: ThemeDropdownProps) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Clair', icon: <SunIcon size={16} /> },
    { value: 'dark', label: 'Sombre', icon: <MoonIcon size={16} /> },
    { value: 'system', label: 'Système', icon: <SystemIcon size={16} /> },
  ];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2
          rounded-lg border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800
          text-gray-700 dark:text-gray-300
          hover:bg-gray-50 dark:hover:bg-gray-700
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500
        "
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {themes.find((t) => t.value === theme)?.icon}
        <span className="text-sm font-medium">
          {themes.find((t) => t.value === theme)?.label}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <ul
            className="
              absolute right-0 z-20 mt-2 w-36
              rounded-lg border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800
              shadow-lg
              py-1
            "
            role="listbox"
          >
            {themes.map((t) => (
              <li key={t.value}>
                <button
                  onClick={() => {
                    setTheme(t.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2
                    text-left text-sm
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    ${theme === t.value ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-700 dark:text-gray-300'}
                  `}
                  role="option"
                  aria-selected={theme === t.value}
                >
                  {t.icon}
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
