'use client';

import React, { forwardRef, useId } from 'react';

export type InputVariant = 'default' | 'filled' | 'outline';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: InputVariant;
  inputSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  /** Whether the field is required (adds visual indicator) */
  required?: boolean;
  /** Custom ID for the error message (for aria-describedby) */
  errorId?: string;
  /** Custom ID for the helper text (for aria-describedby) */
  helperId?: string;
}

const variantStyles: Record<InputVariant, string> = {
  default: `
    bg-theme-input border border-theme
    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
  `,
  filled: `
    bg-theme-surface-hover border border-transparent
    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
  `,
  outline: `
    bg-transparent border-2 border-theme-hover
    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
  `,
};

const sizeStyles = {
  sm: 'px-3 py-2 text-sm min-h-[36px]',
  md: 'px-4 py-3 text-base min-h-[44px]',
  lg: 'px-5 py-4 text-lg min-h-[52px]',
};

/**
 * Input - Accessible text input component
 *
 * WCAG 2.1 AA Compliance:
 * - 1.3.1 Info and Relationships: Labels programmatically associated via htmlFor
 * - 1.3.5 Identify Input Purpose: Supports autocomplete attribute
 * - 2.4.7 Focus Visible: Clear focus indicator
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
 * <Input label="Password" error="Password is required" aria-invalid={true} />
 *
 * // Input with helper text
 * <Input label="Username" helperText="Must be at least 3 characters" />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      variant = 'default',
      inputSize = 'md',
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
    const inputId = id || generatedId;
    const errorId = customErrorId || `${inputId}-error`;
    const helperId = customHelperId || `${inputId}-helper`;

    // Build aria-describedby from error, helper text, and custom describedby
    const describedByIds: string[] = [];
    if (ariaDescribedBy) describedByIds.push(ariaDescribedBy);
    if (error) describedByIds.push(errorId);
    if (helperText && !error) describedByIds.push(helperId);

    const baseStyles = `
      rounded-xl
      text-theme-primary placeholder:text-theme-muted
      transition-all duration-300
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      focus-visible:ring-2 focus-visible:ring-offset-2
      focus-visible:ring-primary-500 focus-visible:ring-offset-festival-dark
    `;

    const inputClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[inputSize]}
      ${leftIcon ? 'pl-12' : ''}
      ${rightIcon ? 'pr-12' : ''}
      ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-theme-secondary mb-2"
          >
            {label}
            {required && (
              <span className="text-red-400 ml-1" aria-hidden="true">*</span>
            )}
            {required && (
              <span className="sr-only">(required)</span>
            )}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div
              className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={inputClassName}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedByIds.length > 0 ? describedByIds.join(' ') : undefined}
            aria-required={required}
            required={required}
            {...props}
          />
          {rightIcon && (
            <div
              className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="mt-2 text-sm text-red-400"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={helperId}
            className="mt-2 text-sm text-theme-tertiary"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: InputVariant;
  fullWidth?: boolean;
  /** Custom ID for the error message (for aria-describedby) */
  errorId?: string;
  /** Custom ID for the helper text (for aria-describedby) */
  helperId?: string;
}

/**
 * Textarea - Accessible multi-line text input component
 *
 * WCAG 2.1 AA Compliance:
 * - Same accessibility features as Input component
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
    if (ariaDescribedBy) describedByIds.push(ariaDescribedBy);
    if (error) describedByIds.push(errorId);
    if (helperText && !error) describedByIds.push(helperId);

    const baseStyles = `
      px-4 py-3 rounded-xl
      text-theme-primary placeholder:text-theme-muted
      transition-all duration-300
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      resize-none
      focus-visible:ring-2 focus-visible:ring-offset-2
      focus-visible:ring-primary-500 focus-visible:ring-offset-festival-dark
    `;

    const textareaClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-theme-secondary mb-2"
          >
            {label}
            {required && (
              <span className="text-red-400 ml-1" aria-hidden="true">*</span>
            )}
            {required && (
              <span className="sr-only">(required)</span>
            )}
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
          <p
            id={errorId}
            className="mt-2 text-sm text-red-400"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={helperId}
            className="mt-2 text-sm text-theme-tertiary"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select Component (basic native select for accessibility)
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  variant?: InputVariant;
  selectSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  /** Custom ID for the error message (for aria-describedby) */
  errorId?: string;
}

/**
 * Select - Accessible native select component
 *
 * WCAG 2.1 AA Compliance:
 * - Uses native select element for best screen reader support
 * - Proper labeling via htmlFor
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
      options,
      placeholder,
      variant = 'default',
      selectSize = 'md',
      fullWidth = true,
      className = '',
      id,
      required,
      errorId: customErrorId,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = customErrorId || `${selectId}-error`;

    // Build aria-describedby
    const describedByIds: string[] = [];
    if (ariaDescribedBy) describedByIds.push(ariaDescribedBy);
    if (error) describedByIds.push(errorId);

    const baseStyles = `
      rounded-xl
      text-theme-primary
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
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-theme-secondary mb-2"
          >
            {label}
            {required && (
              <span className="text-red-400 ml-1" aria-hidden="true">*</span>
            )}
            {required && (
              <span className="sr-only">(required)</span>
            )}
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
              <option value="" disabled className="bg-theme-bg text-theme-muted">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-theme-bg text-theme-primary"
              >
                {option.label}
              </option>
            ))}
          </select>
          <div
            className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-theme-muted"
            aria-hidden="true"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
          <p
            id={errorId}
            className="mt-2 text-sm text-red-400"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
