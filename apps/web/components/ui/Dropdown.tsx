'use client';

import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';

export type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end' | 'top';

// Dropdown Context
interface DropdownContextValue {
  isOpen: boolean;
  close: () => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

// Main Dropdown Component
interface DropdownProps {
  children: React.ReactNode;
  className?: string;
}

export function Dropdown({ children, className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, close }}>
      <div ref={dropdownRef} className={`relative inline-block ${className}`}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            if (child.type === DropdownTrigger) {
              return React.cloneElement(child as React.ReactElement<DropdownTriggerProps>, {
                onClick: () => setIsOpen(!isOpen),
                isOpen,
              });
            }
            if (child.type === DropdownMenu) {
              return React.cloneElement(child as React.ReactElement<DropdownMenuProps>, {
                isOpen,
              });
            }
          }
          return child;
        })}
      </div>
    </DropdownContext.Provider>
  );
}

// Dropdown Trigger
interface DropdownTriggerProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isOpen?: boolean;
}

export function DropdownTrigger({ children, className = '', onClick, isOpen }: DropdownTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center gap-2
        focus:outline-none
        ${className}
      `}
      aria-haspopup="true"
      aria-expanded={isOpen}
    >
      {children}
    </button>
  );
}

// Dropdown Menu
interface DropdownMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen?: boolean;
  placement?: DropdownPlacement;
  minWidth?: string;
}

const placementStyles: Record<DropdownPlacement, string> = {
  'bottom-start': 'top-full left-0 mt-2',
  'bottom-end': 'top-full right-0 mt-2',
  'bottom': 'top-full left-1/2 -translate-x-1/2 mt-2',
  'top-start': 'bottom-full left-0 mb-2',
  'top-end': 'bottom-full right-0 mb-2',
  'top': 'bottom-full left-1/2 -translate-x-1/2 mb-2',
};

export function DropdownMenu({
  children,
  className = '',
  isOpen = false,
  placement = 'bottom-start',
  minWidth = 'min-w-48',
}: DropdownMenuProps) {
  if (!isOpen) {return null;}

  return (
    <div
      className={`
        absolute z-50
        ${placementStyles[placement]}
        ${minWidth}
        py-2
        bg-festival-dark/95 backdrop-blur-xl
        border border-white/10
        rounded-xl
        shadow-xl shadow-black/20
        animate-in fade-in zoom-in-95 duration-150
        ${className}
      `}
      role="menu"
    >
      {children}
    </div>
  );
}

// Dropdown Item
interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  icon?: React.ReactNode;
  className?: string;
  closeOnClick?: boolean;
}

export function DropdownItem({
  children,
  onClick,
  disabled = false,
  danger = false,
  icon,
  className = '',
  closeOnClick = true,
}: DropdownItemProps) {
  const context = useContext(DropdownContext);

  const handleClick = () => {
    if (disabled) {return;}
    onClick?.();
    if (closeOnClick && context) {
      context.close();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full
        flex items-center gap-3
        px-4 py-2.5
        text-left text-sm
        transition-colors duration-150
        ${
          disabled
            ? 'text-white/30 cursor-not-allowed'
            : danger
            ? 'text-red-400 hover:bg-red-500/10'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }
        focus:outline-none focus:bg-white/10
        ${className}
      `}
      role="menuitem"
    >
      {icon && <span className="flex-shrink-0 w-5 h-5">{icon}</span>}
      {children}
    </button>
  );
}

// Dropdown Separator
interface DropdownSeparatorProps {
  className?: string;
}

export function DropdownSeparator({ className = '' }: DropdownSeparatorProps) {
  return <div className={`my-2 border-t border-white/10 ${className}`} role="separator" />;
}

// Dropdown Label
interface DropdownLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownLabel({ children, className = '' }: DropdownLabelProps) {
  return (
    <div className={`px-4 py-2 text-xs font-medium text-white/50 uppercase tracking-wider ${className}`}>
      {children}
    </div>
  );
}

// Dropdown Checkbox Item
interface DropdownCheckboxItemProps {
  children: React.ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function DropdownCheckboxItem({
  children,
  checked = false,
  onChange,
  disabled = false,
  className = '',
}: DropdownCheckboxItemProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
      className={`
        w-full
        flex items-center gap-3
        px-4 py-2.5
        text-left text-sm
        transition-colors duration-150
        ${
          disabled
            ? 'text-white/30 cursor-not-allowed'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }
        focus:outline-none focus:bg-white/10
        ${className}
      `}
      role="menuitemcheckbox"
      aria-checked={checked}
    >
      <span
        className={`
          flex-shrink-0 w-4 h-4
          rounded
          border-2
          flex items-center justify-center
          transition-colors duration-150
          ${checked ? 'bg-primary-500 border-primary-500' : 'border-white/30'}
        `}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {children}
    </button>
  );
}
