'use client';

import React, { useState, useRef, useEffect, forwardRef } from 'react';

/**
 * Select size options
 */
export type SelectSize = 'sm' | 'md' | 'lg';

/**
 * Select variant styles
 */
export type SelectVariant = 'default' | 'filled' | 'outline';

/**
 * Option type for select
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

/**
 * Option group type
 */
export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

/**
 * Props for the Select component
 */
export interface SelectProps {
  /** Select options */
  options: (SelectOption | SelectOptionGroup)[];
  /** Current value */
  value?: string;
  /** Default value (uncontrolled) */
  defaultValue?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Label text */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Size of the select */
  size?: SelectSize;
  /** Visual style variant */
  variant?: SelectVariant;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Whether the select is required */
  required?: boolean;
  /** Whether to allow clearing the selection */
  clearable?: boolean;
  /** Whether to allow searching */
  searchable?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** ID for the select */
  id?: string;
  /** Name attribute */
  name?: string;
}

const sizeStyles: Record<SelectSize, { input: string; text: string; icon: string }> = {
  sm: {
    input: 'px-3 py-2',
    text: 'text-sm',
    icon: 'w-4 h-4',
  },
  md: {
    input: 'px-4 py-3',
    text: 'text-base',
    icon: 'w-5 h-5',
  },
  lg: {
    input: 'px-5 py-4',
    text: 'text-lg',
    icon: 'w-6 h-6',
  },
};

const variantStyles: Record<SelectVariant, string> = {
  default: 'bg-white/5 border-white/10 focus-within:border-primary-500',
  filled: 'bg-white/10 border-transparent focus-within:border-primary-500',
  outline: 'bg-transparent border-white/20 focus-within:border-primary-500',
};

/**
 * Checks if an option is a group
 */
function isOptionGroup(option: SelectOption | SelectOptionGroup): option is SelectOptionGroup {
  return 'options' in option;
}

/**
 * Flattens options including groups
 */
function flattenOptions(options: (SelectOption | SelectOptionGroup)[]): SelectOption[] {
  return options.flatMap(opt => isOptionGroup(opt) ? opt.options : [opt]);
}

/**
 * Custom Select component with dropdown functionality.
 *
 * @example
 * ```tsx
 * <SelectComponent
 *   label="Country"
 *   options={[
 *     { value: 'fr', label: 'France' },
 *     { value: 'de', label: 'Germany' },
 *   ]}
 *   value={country}
 *   onChange={setCountry}
 * />
 * ```
 */
export const SelectComponent = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      value,
      defaultValue,
      onChange,
      placeholder = 'Select an option',
      label,
      helperText,
      error,
      size = 'md',
      variant = 'default',
      disabled = false,
      required = false,
      clearable = false,
      searchable = false,
      className = '',
      id,
      name,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue || '');
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const currentValue = value !== undefined ? value : internalValue;
    const flatOptions = flattenOptions(options);
    const selectedOption = flatOptions.find(opt => opt.value === currentValue);

    const sizeStyle = sizeStyles[size];
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    // Filter options based on search query
    const filteredOptions = searchQuery
      ? options.map(opt => {
          if (isOptionGroup(opt)) {
            return {
              ...opt,
              options: opt.options.filter(o =>
                o.label.toLowerCase().includes(searchQuery.toLowerCase())
              ),
            };
          }
          return opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ? opt : null;
        }).filter(Boolean) as (SelectOption | SelectOptionGroup)[]
      : options;

    // Handle click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    // Focus search input when opened
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);

    const handleSelect = (optionValue: string) => {
      if (value === undefined) {
        setInternalValue(optionValue);
      }
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (value === undefined) {
        setInternalValue('');
      }
      onChange?.('');
    };

    return (
      <div ref={containerRef} className={`relative ${className}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-white/80 mb-2"
          >
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}

        {/* Select trigger */}
        <button
          ref={ref}
          type="button"
          id={selectId}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`
            w-full
            flex items-center justify-between gap-2
            ${sizeStyle.input}
            ${sizeStyle.text}
            border rounded-xl
            text-left
            transition-colors duration-200
            ${variantStyles[variant]}
            ${error ? 'border-red-500' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            focus:outline-none focus:ring-2 focus:ring-primary-500/30
          `}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={selectedOption ? 'text-white' : 'text-white/50'}>
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                {selectedOption.label}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-1">
            {clearable && currentValue && (
              <span
                onClick={handleClear}
                className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white"
              >
                <svg className={sizeStyle.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            )}
            <svg
              className={`${sizeStyle.icon} text-white/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Hidden native select for form submission */}
        {name && (
          <select name={name} value={currentValue} onChange={() => {}} className="sr-only">
            <option value="">{placeholder}</option>
            {flatOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {/* Dropdown */}
        {isOpen && (
          <div
            className="
              absolute z-50
              w-full mt-2
              bg-festival-dark/95 backdrop-blur-xl
              border border-white/10
              rounded-xl
              shadow-xl shadow-black/20
              overflow-hidden
              animate-in fade-in zoom-in-95 duration-150
            "
            role="listbox"
          >
            {/* Search input */}
            {searchable && (
              <div className="p-2 border-b border-white/10">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="
                    w-full px-3 py-2
                    bg-white/5 border border-white/10
                    rounded-lg text-white text-sm
                    placeholder:text-white/40
                    focus:outline-none focus:border-primary-500
                  "
                />
              </div>
            )}

            {/* Options */}
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredOptions.map((option, index) => {
                if (isOptionGroup(option)) {
                  if (option.options.length === 0) return null;
                  return (
                    <div key={option.label}>
                      <div className="px-4 py-2 text-xs font-medium text-white/50 uppercase tracking-wider">
                        {option.label}
                      </div>
                      {option.options.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => !opt.disabled && handleSelect(opt.value)}
                          disabled={opt.disabled}
                          className={`
                            w-full px-4 py-2.5
                            flex items-center gap-3
                            text-left ${sizeStyle.text}
                            transition-colors duration-150
                            ${opt.disabled ? 'text-white/30 cursor-not-allowed' : 'text-white/80 hover:bg-white/10 hover:text-white'}
                            ${currentValue === opt.value ? 'bg-primary-500/10 text-primary-400' : ''}
                          `}
                          role="option"
                          aria-selected={currentValue === opt.value}
                        >
                          {opt.icon && <span className={sizeStyle.icon}>{opt.icon}</span>}
                          <span className="flex-1">{opt.label}</span>
                          {currentValue === opt.value && (
                            <svg className={sizeStyle.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                }

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    disabled={option.disabled}
                    className={`
                      w-full px-4 py-2.5
                      flex items-center gap-3
                      text-left ${sizeStyle.text}
                      transition-colors duration-150
                      ${option.disabled ? 'text-white/30 cursor-not-allowed' : 'text-white/80 hover:bg-white/10 hover:text-white'}
                      ${currentValue === option.value ? 'bg-primary-500/10 text-primary-400' : ''}
                    `}
                    role="option"
                    aria-selected={currentValue === option.value}
                  >
                    {option.icon && <span className={sizeStyle.icon}>{option.icon}</span>}
                    <span className="flex-1">{option.label}</span>
                    {currentValue === option.value && (
                      <svg className={sizeStyle.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}

              {filteredOptions.length === 0 && (
                <div className="px-4 py-8 text-center text-white/40 text-sm">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Helper/Error text */}
        {(helperText || error) && (
          <p className={`mt-2 text-sm ${error ? 'text-red-400' : 'text-white/50'}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

SelectComponent.displayName = 'SelectComponent';
