'use client';

import React, { useState, useRef, useEffect, forwardRef, useId, useCallback } from 'react';

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
    input: 'px-3 py-2 min-h-[36px]',
    text: 'text-sm',
    icon: 'w-4 h-4',
  },
  md: {
    input: 'px-4 py-3 min-h-[44px]',
    text: 'text-base',
    icon: 'w-5 h-5',
  },
  lg: {
    input: 'px-5 py-4 min-h-[52px]',
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
 * WCAG 2.1 AA Compliance:
 * - 1.3.1 Info and Relationships: Proper ARIA roles (combobox, listbox, option)
 * - 2.1.1 Keyboard: Full keyboard navigation (arrows, home, end, type-ahead)
 * - 2.4.7 Focus Visible: Clear focus indicators
 * - 4.1.2 Name, Role, Value: Proper ARIA attributes
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
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listboxRef = useRef<HTMLDivElement>(null);

    const generatedId = useId();
    const selectId = id || generatedId;
    const labelId = `${selectId}-label`;
    const listboxId = `${selectId}-listbox`;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    const currentValue = value !== undefined ? value : internalValue;
    const flatOptions = flattenOptions(options);
    const selectedOption = flatOptions.find(opt => opt.value === currentValue);

    const sizeStyle = sizeStyles[size];

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

    const filteredFlatOptions = flattenOptions(filteredOptions).filter(opt => !opt.disabled);

    // Handle click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
          setActiveIndex(-1);
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

    // Scroll active option into view
    useEffect(() => {
      if (isOpen && activeIndex >= 0 && listboxRef.current) {
        const activeOption = listboxRef.current.querySelector(`[data-index="${activeIndex}"]`);
        if (activeOption) {
          activeOption.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [activeIndex, isOpen]);

    const handleSelect = useCallback((optionValue: string) => {
      if (value === undefined) {
        setInternalValue(optionValue);
      }
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery('');
      setActiveIndex(-1);
    }, [value, onChange]);

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (value === undefined) {
        setInternalValue('');
      }
      onChange?.('');
    };

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (disabled) {return;}

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen && activeIndex >= 0) {
            const option = filteredFlatOptions[activeIndex];
            if (option && !option.disabled) {
              handleSelect(option.value);
            }
          } else {
            setIsOpen(true);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          setActiveIndex(-1);
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setActiveIndex(prev =>
              prev < filteredFlatOptions.length - 1 ? prev + 1 : 0
            );
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setActiveIndex(prev =>
              prev > 0 ? prev - 1 : filteredFlatOptions.length - 1
            );
          }
          break;

        case 'Home':
          e.preventDefault();
          if (isOpen) {
            setActiveIndex(0);
          }
          break;

        case 'End':
          e.preventDefault();
          if (isOpen) {
            setActiveIndex(filteredFlatOptions.length - 1);
          }
          break;

        case 'Tab':
          if (isOpen) {
            setIsOpen(false);
            setSearchQuery('');
            setActiveIndex(-1);
          }
          break;
      }
    }, [disabled, isOpen, activeIndex, filteredFlatOptions, handleSelect]);

    // Build aria-describedby
    const describedByIds: string[] = [];
    if (error) {describedByIds.push(errorId);}
    if (helperText && !error) {describedByIds.push(helperId);}

    let flatIndex = -1;

    return (
      <div ref={containerRef} className={`relative ${className}`}>
        {/* Label */}
        {label && (
          <label
            id={labelId}
            htmlFor={selectId}
            className="block text-sm font-medium text-white/80 mb-2"
          >
            {label}
            {required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
            {required && <span className="sr-only">(required)</span>}
          </label>
        )}

        {/* Select trigger */}
        <button
          ref={ref}
          type="button"
          id={selectId}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
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
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
            focus-visible:ring-offset-2 focus-visible:ring-offset-festival-dark
          `}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={describedByIds.length > 0 ? describedByIds.join(' ') : undefined}
          aria-invalid={error ? true : undefined}
          aria-required={required}
          aria-activedescendant={activeIndex >= 0 ? `${selectId}-option-${activeIndex}` : undefined}
        >
          <span className={selectedOption ? 'text-white' : 'text-white/50'}>
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon && <span aria-hidden="true">{selectedOption.icon}</span>}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClear(e as unknown as React.MouseEvent);
                  }
                }}
                role="button"
                tabIndex={0}
                className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white min-w-[28px] min-h-[28px] flex items-center justify-center"
                aria-label="Clear selection"
              >
                <svg className={sizeStyle.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Hidden native select for form submission */}
        {name && (
          <select
            name={name}
            value={currentValue}
            onChange={() => { /* Hidden select for form submission, controlled via custom UI */ }}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          >
            <option value="">{placeholder}</option>
            {flatOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={label ? labelId : undefined}
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
          >
            {/* Search input */}
            {searchable && (
              <div className="p-2 border-b border-white/10">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search..."
                  className="
                    w-full px-3 py-2
                    bg-white/5 border border-white/10
                    rounded-lg text-white text-sm
                    placeholder:text-white/40
                    focus:outline-none focus:border-primary-500
                    min-h-[40px]
                  "
                  aria-label="Search options"
                  aria-controls={listboxId}
                />
              </div>
            )}

            {/* Options */}
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredOptions.map((option, groupIndex) => {
                if (isOptionGroup(option)) {
                  if (option.options.length === 0) {return null;}
                  return (
                    <div key={option.label} role="group" aria-labelledby={`${selectId}-group-${groupIndex}`}>
                      <div
                        id={`${selectId}-group-${groupIndex}`}
                        className="px-4 py-2 text-xs font-medium text-white/50 uppercase tracking-wider"
                        role="presentation"
                      >
                        {option.label}
                      </div>
                      {option.options.map(opt => {
                        if (!opt.disabled) {flatIndex++;}
                        const currentFlatIndex = opt.disabled ? -1 : flatIndex;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            id={currentFlatIndex >= 0 ? `${selectId}-option-${currentFlatIndex}` : undefined}
                            data-index={currentFlatIndex >= 0 ? currentFlatIndex : undefined}
                            onClick={() => !opt.disabled && handleSelect(opt.value)}
                            disabled={opt.disabled}
                            className={`
                              w-full px-4 py-2.5
                              flex items-center gap-3
                              text-left ${sizeStyle.text}
                              transition-colors duration-150
                              ${opt.disabled ? 'text-white/30 cursor-not-allowed' : 'text-white/80 hover:bg-white/10 hover:text-white'}
                              ${currentValue === opt.value ? 'bg-primary-500/10 text-primary-400' : ''}
                              ${currentFlatIndex === activeIndex ? 'bg-white/10' : ''}
                              focus:outline-none focus:bg-white/10
                              min-h-[44px]
                            `}
                            role="option"
                            aria-selected={currentValue === opt.value}
                            aria-disabled={opt.disabled}
                          >
                            {opt.icon && <span className={sizeStyle.icon} aria-hidden="true">{opt.icon}</span>}
                            <span className="flex-1">{opt.label}</span>
                            {currentValue === opt.value && (
                              <svg className={sizeStyle.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                }

                if (!option.disabled) {flatIndex++;}
                const currentFlatIndex = option.disabled ? -1 : flatIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    id={currentFlatIndex >= 0 ? `${selectId}-option-${currentFlatIndex}` : undefined}
                    data-index={currentFlatIndex >= 0 ? currentFlatIndex : undefined}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    disabled={option.disabled}
                    className={`
                      w-full px-4 py-2.5
                      flex items-center gap-3
                      text-left ${sizeStyle.text}
                      transition-colors duration-150
                      ${option.disabled ? 'text-white/30 cursor-not-allowed' : 'text-white/80 hover:bg-white/10 hover:text-white'}
                      ${currentValue === option.value ? 'bg-primary-500/10 text-primary-400' : ''}
                      ${currentFlatIndex === activeIndex ? 'bg-white/10' : ''}
                      focus:outline-none focus:bg-white/10
                      min-h-[44px]
                    `}
                    role="option"
                    aria-selected={currentValue === option.value}
                    aria-disabled={option.disabled}
                  >
                    {option.icon && <span className={sizeStyle.icon} aria-hidden="true">{option.icon}</span>}
                    <span className="flex-1">{option.label}</span>
                    {currentValue === option.value && (
                      <svg className={sizeStyle.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}

              {filteredOptions.length === 0 && (
                <div className="px-4 py-8 text-center text-white/40 text-sm" role="status">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Helper/Error text */}
        {error && (
          <p id={errorId} className="mt-2 text-sm text-red-400" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-2 text-sm text-white/50">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

SelectComponent.displayName = 'SelectComponent';
