'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, Theme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'button' | 'dropdown';
}

export function ThemeToggle({
  className = '',
  showLabel = false,
  variant = 'button',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: <SunIcon className="w-4 h-4" />,
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: <MoonIcon className="w-4 h-4" />,
    },
    {
      value: 'system',
      label: 'System',
      icon: <ComputerIcon className="w-4 h-4" />,
    },
  ];

  // Simple button variant
  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        className={`
          relative inline-flex items-center justify-center gap-2 p-2.5 rounded-xl
          bg-theme-surface hover:bg-theme-surface-hover
          border border-theme hover:border-theme-hover
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-2 focus:ring-primary-500/50
          group
          ${className}
        `}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <span className="relative w-5 h-5">
          {/* Sun icon - shown in dark mode */}
          <SunIcon
            className={`
              absolute inset-0 w-5 h-5 text-yellow-400
              transition-all duration-300 ease-out
              ${
                resolvedTheme === 'dark'
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 -rotate-90 scale-0'
              }
            `}
          />
          {/* Moon icon - shown in light mode */}
          <MoonIcon
            className={`
              absolute inset-0 w-5 h-5 text-primary-500
              transition-all duration-300 ease-out
              ${
                resolvedTheme === 'light'
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 rotate-90 scale-0'
              }
            `}
          />
        </span>
        {showLabel && (
          <span className="text-sm text-theme-secondary group-hover:text-theme-primary transition-colors">
            {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
          </span>
        )}
      </button>
    );
  }

  // Dropdown variant
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative inline-flex items-center justify-center gap-2 p-2.5 rounded-xl
          bg-theme-surface hover:bg-theme-surface-hover
          border border-theme hover:border-theme-hover
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-2 focus:ring-primary-500/50
          group
        `}
        aria-label="Theme settings"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="relative w-5 h-5">
          {/* Sun icon - shown when light theme is selected */}
          <SunIcon
            className={`
              absolute inset-0 w-5 h-5 text-yellow-400
              transition-all duration-300 ease-out
              ${
                theme === 'light'
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 -rotate-90 scale-0'
              }
            `}
          />
          {/* Moon icon - shown when dark theme is selected */}
          <MoonIcon
            className={`
              absolute inset-0 w-5 h-5 text-primary-500
              transition-all duration-300 ease-out
              ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'}
            `}
          />
          {/* Computer icon - shown when system theme is selected */}
          <ComputerIcon
            className={`
              absolute inset-0 w-5 h-5 text-theme-secondary
              transition-all duration-300 ease-out
              ${theme === 'system' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 scale-0'}
            `}
          />
        </span>
        <ChevronDownIcon
          className={`
            w-3 h-3 text-theme-muted
            transition-transform duration-200
            ${isOpen ? 'rotate-180' : 'rotate-0'}
          `}
        />
      </button>

      {/* Dropdown menu */}
      <div
        className={`
          absolute right-0 mt-2 w-40 py-1
          bg-theme-card-bg backdrop-blur-xl
          border border-theme rounded-xl
          shadow-theme-lg
          transition-all duration-200 ease-out origin-top-right
          ${
            isOpen
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
          }
          z-50
        `}
        role="menu"
        aria-orientation="vertical"
      >
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setTheme(option.value);
              setIsOpen(false);
            }}
            className={`
              w-full flex items-center gap-3 px-4 py-2.5
              transition-all duration-200
              ${
                theme === option.value
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-theme-secondary hover:bg-theme-surface-hover hover:text-theme-primary'
              }
            `}
            role="menuitem"
          >
            <span
              className={`
              transition-colors duration-200
              ${theme === option.value ? 'text-primary-400' : ''}
            `}
            >
              {option.icon}
            </span>
            <span className="text-sm font-medium">{option.label}</span>
            {theme === option.value && <CheckIcon className="w-4 h-4 ml-auto text-primary-400" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// Theme Selector (for settings page)
interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className = '' }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: React.ReactNode; description: string }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: <SunIcon className="w-5 h-5" />,
      description: 'Bright and clean',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: <MoonIcon className="w-5 h-5" />,
      description: 'Easy on the eyes',
    },
    {
      value: 'system',
      label: 'System',
      icon: <ComputerIcon className="w-5 h-5" />,
      description: 'Match device settings',
    },
  ];

  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={`
            relative flex flex-col items-center gap-2 p-4 rounded-2xl
            transition-all duration-300 ease-out
            border-2
            ${
              theme === option.value
                ? 'bg-primary-500/10 border-primary-500/50 shadow-theme-glow'
                : 'bg-theme-surface border-theme hover:border-theme-hover hover:bg-theme-surface-hover'
            }
          `}
        >
          <span
            className={`
            p-3 rounded-xl transition-colors duration-300
            ${
              theme === option.value
                ? 'bg-primary-500/20 text-primary-400'
                : 'bg-theme-surface text-theme-secondary'
            }
          `}
          >
            {option.icon}
          </span>
          <span
            className={`
            text-sm font-semibold transition-colors duration-300
            ${theme === option.value ? 'text-primary-400' : 'text-theme-primary'}
          `}
          >
            {option.label}
          </span>
          <span className="text-xs text-theme-muted text-center">{option.description}</span>
          {theme === option.value && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
          )}
        </button>
      ))}
    </div>
  );
}

// Icons
function SunIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function MoonIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

function ComputerIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
