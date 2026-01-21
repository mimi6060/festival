'use client';

import React, { forwardRef, useId, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input type options supported by the Input component
 */
export type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';

/**
 * Input variant types
 */
export type InputVariant = 'default' | 'filled' | 'outline';

/**
 * Input size types
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Validation state for visual feedback
 */
export type ValidationState = 'default' | 'error' | 'success';

// ============================================================================
// INPUT COMPONENT
// ============================================================================

/**
 * Input component props
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label?: string;
  /** Placeholder text inside the input */
  placeholder?: string;
  /** Error message (displays in error state) */
  error?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the field is required (adds visual indicator) */
  required?: boolean;
  /** Icon displayed on the left side of the input */
  leftIcon?: React.ReactNode;
  /** Icon displayed on the right side of the input */
  rightIcon?: React.ReactNode;
  /** Whether the input can be cleared with a button */
  clearable?: boolean;
  /** Callback when clear button is clicked */
  onClear?: () => void;
  /** Visual style variant */
  variant?: InputVariant;
  /** Size of the input */
  inputSize?: InputSize;
  /** Whether the input should take full width */
  fullWidth?: boolean;
  /** Validation state for visual feedback */
  validationState?: ValidationState;
  /** Success message (displays in success state) */
  successMessage?: string;
  /** Custom ID for the error message (for aria-describedby) */
  errorId?: string;
  /** Custom ID for the helper text (for aria-describedby) */
  helperId?: string;
  /** Custom ID for the success message (for aria-describedby) */
  successId?: string;
}

const variantStyles: Record<InputVariant, string> = {
  default: `
    bg-white/5 border border-white/10
    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
  `,
  filled: `
    bg-white/10 border border-transparent
    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
  `,
  outline: `
    bg-transparent border-2 border-white/10
    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
  `,
};

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-sm min-h-[36px]',
  md: 'px-4 py-3 text-base min-h-[44px]',
  lg: 'px-4 py-3 text-lg min-h-[52px]',
};

const iconSizeStyles: Record<InputSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

/**
 * Input - Accessible text input component
 *
 * WCAG 2.1 AA Compliance:
 * - 1.3.1 Info and Relationships: Labels programmatically associated via htmlFor
 * - 1.3.5 Identify Input Purpose: Supports autocomplete attribute
 * - 2.4.7 Focus Visible: Clear focus indicator with ring
 * - 3.3.1 Error Identification: Errors identified via aria-invalid and aria-describedby
 * - 3.3.2 Labels or Instructions: Visible labels and helper text
 * - 4.1.2 Name, Role, Value: Proper ARIA attributes
 *
 * @example
 * ```tsx
 * // Basic input with label
 * <Input label="Email" type="email" autoComplete="email" />
 *
 * // Input with error
 * <Input label="Password" error="Password is required" />
 *
 * // Input with helper text and icons
 * <Input
 *   label="Search"
 *   leftIcon={<SearchIcon />}
 *   helperText="Search for items"
 *   clearable
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      placeholder,
      error,
      helperText,
      disabled = false,
      required = false,
      leftIcon,
      rightIcon,
      clearable = false,
      onClear,
      variant = 'default',
      inputSize = 'md',
      fullWidth = true,
      validationState = 'default',
      successMessage,
      className = '',
      id,
      type = 'text',
      value,
      onChange,
      errorId: customErrorId,
      helperId: customHelperId,
      successId: customSuccessId,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = customErrorId || `${inputId}-error`;
    const helperId = customHelperId || `${inputId}-helper`;
    const successId = customSuccessId || `${inputId}-success`;

    // Determine actual validation state
    const actualValidationState = error ? 'error' : validationState;

    // Check if input has a value (for clearable functionality)
    const hasValue = value !== undefined && value !== '';

    // Build aria-describedby from error, helper text, success message, and custom describedby
    const describedByIds: string[] = [];
    if (ariaDescribedBy) {
      describedByIds.push(ariaDescribedBy);
    }
    if (error) {
      describedByIds.push(errorId);
    }
    if (helperText && !error) {
      describedByIds.push(helperId);
    }
    if (actualValidationState === 'success' && successMessage) {
      describedByIds.push(successId);
    }

    const handleClear = useCallback(() => {
      if (onClear) {
        onClear();
      }
    }, [onClear]);

    const baseStyles = `
      rounded-lg
      text-white placeholder:text-white/50
      transition-all duration-300
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      focus-visible:ring-2 focus-visible:ring-offset-2
      focus-visible:ring-primary-500 focus-visible:ring-offset-festival-dark
    `;

    const validationStyles = {
      default: '',
      error: 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
      success: 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
    };

    const inputClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[inputSize]}
      ${leftIcon ? 'pl-12' : ''}
      ${rightIcon || clearable ? 'pr-12' : ''}
      ${validationStyles[actualValidationState]}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `
      .trim()
      .replace(/\s+/g, ' ');

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-white/80 mb-2">
            {label}
            {required && (
              <span className="text-red-400 ml-1" aria-hidden="true">
                *
              </span>
            )}
            {required && <span className="sr-only">(required)</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div
              className={`absolute left-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none ${iconSizeStyles[inputSize]}`}
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={inputClassName}
            placeholder={placeholder}
            disabled={disabled}
            value={value}
            onChange={onChange}
            aria-invalid={actualValidationState === 'error' ? true : undefined}
            aria-describedby={describedByIds.length > 0 ? describedByIds.join(' ') : undefined}
            aria-required={required}
            required={required}
            {...props}
          />
          {/* Right side: clearable button or right icon */}
          {clearable && hasValue && !disabled ? (
            <button
              type="button"
              onClick={handleClear}
              className={`absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors ${iconSizeStyles[inputSize]}`}
              aria-label="Clear input"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : rightIcon ? (
            <div
              className={`absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none ${iconSizeStyles[inputSize]}`}
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          ) : null}
        </div>
        {/* Error message */}
        {error && (
          <p id={errorId} className="mt-2 text-sm text-red-400" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        {/* Success message */}
        {actualValidationState === 'success' && successMessage && !error && (
          <p id={successId} className="mt-2 text-sm text-green-400" role="status">
            {successMessage}
          </p>
        )}
        {/* Helper text */}
        {helperText && !error && !(actualValidationState === 'success' && successMessage) && (
          <p id={helperId} className="mt-2 text-sm text-white/50">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================================================
// TEXTAREA COMPONENT
// ============================================================================

/**
 * Textarea component props
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label text displayed above the textarea */
  label?: string;
  /** Error message (displays in error state) */
  error?: string;
  /** Helper text displayed below the textarea */
  helperText?: string;
  /** Visual style variant */
  variant?: InputVariant;
  /** Whether the textarea should take full width */
  fullWidth?: boolean;
  /** Whether the textarea is resizable */
  resizable?: boolean;
  /** Custom ID for the error message (for aria-describedby) */
  errorId?: string;
  /** Custom ID for the helper text (for aria-describedby) */
  helperId?: string;
}

/**
 * Textarea - Accessible multi-line text input component
 *
 * WCAG 2.1 AA Compliance:
 * - 1.3.1 Info and Relationships: Labels programmatically associated via htmlFor
 * - 2.4.7 Focus Visible: Clear focus indicator with ring
 * - 3.3.1 Error Identification: Errors identified via aria-invalid and aria-describedby
 * - 3.3.2 Labels or Instructions: Visible labels and helper text
 * - 4.1.2 Name, Role, Value: Proper ARIA attributes
 *
 * @example
 * ```tsx
 * <Textarea
 *   label="Description"
 *   helperText="Max 500 characters"
 *   rows={4}
 * />
 * ```
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      variant = 'default',
      fullWidth = true,
      resizable = false,
      className = '',
      id,
      required,
      errorId: customErrorId,
      helperId: customHelperId,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = customErrorId || `${textareaId}-error`;
    const helperId = customHelperId || `${textareaId}-helper`;

    // Build aria-describedby from error, helper text, and custom describedby
    const describedByIds: string[] = [];
    if (ariaDescribedBy) {
      describedByIds.push(ariaDescribedBy);
    }
    if (error) {
      describedByIds.push(errorId);
    }
    if (helperText && !error) {
      describedByIds.push(helperId);
    }

    const baseStyles = `
      px-4 py-3 rounded-lg
      text-white placeholder:text-white/50
      transition-all duration-300
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      focus-visible:ring-2 focus-visible:ring-offset-2
      focus-visible:ring-primary-500 focus-visible:ring-offset-festival-dark
    `;

    const textareaClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
      ${fullWidth ? 'w-full' : ''}
      ${resizable ? 'resize-y' : 'resize-none'}
      ${className}
    `
      .trim()
      .replace(/\s+/g, ' ');

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-white/80 mb-2">
            {label}
            {required && (
              <span className="text-red-400 ml-1" aria-hidden="true">
                *
              </span>
            )}
            {required && <span className="sr-only">(required)</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClassName}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedByIds.length > 0 ? describedByIds.join(' ') : undefined}
          aria-required={required}
          required={required}
          {...props}
        />
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

Textarea.displayName = 'Textarea';

// ============================================================================
// SELECT COMPONENT (Native)
// ============================================================================

/**
 * Option type for native Select
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Select component props (native select for best accessibility)
 */
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Label text displayed above the select */
  label?: string;
  /** Error message (displays in error state) */
  error?: string;
  /** Helper text displayed below the select */
  helperText?: string;
  /** Select options */
  options: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Visual style variant */
  variant?: InputVariant;
  /** Size of the select */
  selectSize?: InputSize;
  /** Whether the select should take full width */
  fullWidth?: boolean;
  /** Custom ID for the error message (for aria-describedby) */
  errorId?: string;
  /** Custom ID for the helper text (for aria-describedby) */
  helperId?: string;
}

/**
 * Select - Accessible native select component
 *
 * Uses native select element for best screen reader support and mobile compatibility.
 *
 * WCAG 2.1 AA Compliance:
 * - 1.3.1 Info and Relationships: Labels programmatically associated via htmlFor
 * - 2.4.7 Focus Visible: Clear focus indicator with ring
 * - 3.3.1 Error Identification: Errors identified via aria-invalid and aria-describedby
 * - 3.3.2 Labels or Instructions: Visible labels and helper text
 * - 4.1.2 Name, Role, Value: Uses native select for proper semantics
 *
 * @example
 * ```tsx
 * <Select
 *   label="Country"
 *   options={[
 *     { value: 'fr', label: 'France' },
 *     { value: 'de', label: 'Germany' },
 *   ]}
 *   placeholder="Select a country"
 * />
 * ```
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      variant = 'default',
      selectSize = 'md',
      fullWidth = true,
      className = '',
      id,
      required,
      errorId: customErrorId,
      helperId: customHelperId,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = customErrorId || `${selectId}-error`;
    const helperId = customHelperId || `${selectId}-helper`;

    // Build aria-describedby
    const describedByIds: string[] = [];
    if (ariaDescribedBy) {
      describedByIds.push(ariaDescribedBy);
    }
    if (error) {
      describedByIds.push(errorId);
    }
    if (helperText && !error) {
      describedByIds.push(helperId);
    }

    const baseStyles = `
      rounded-lg
      text-white
      transition-all duration-300
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      appearance-none cursor-pointer
      focus-visible:ring-2 focus-visible:ring-offset-2
      focus-visible:ring-primary-500 focus-visible:ring-offset-festival-dark
    `;

    const selectClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[selectSize]}
      ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
      ${fullWidth ? 'w-full' : ''}
      pr-10
      ${className}
    `
      .trim()
      .replace(/\s+/g, ' ');

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-white/80 mb-2">
            {label}
            {required && (
              <span className="text-red-400 ml-1" aria-hidden="true">
                *
              </span>
            )}
            {required && <span className="sr-only">(required)</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={selectClassName}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedByIds.length > 0 ? describedByIds.join(' ') : undefined}
            aria-required={required}
            required={required}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-gray-900 text-white/50">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="bg-gray-900 text-white"
              >
                {option.label}
              </option>
            ))}
          </select>
          <div
            className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50 ${iconSizeStyles[selectSize]}`}
            aria-hidden="true"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
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

Select.displayName = 'Select';

// ============================================================================
// EXPORTS
// ============================================================================

export default Input;
