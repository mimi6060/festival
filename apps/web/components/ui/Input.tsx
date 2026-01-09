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
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-5 py-4 text-lg',
};

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
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const baseStyles = `
      rounded-xl
      text-theme-primary placeholder:text-theme-muted
      transition-all duration-300
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
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
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={inputClassName}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-sm text-theme-tertiary">{helperText}</p>
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
}

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
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;

    const baseStyles = `
      px-4 py-3 rounded-xl
      text-theme-primary placeholder:text-theme-muted
      transition-all duration-300
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      resize-none
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
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClassName}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-sm text-theme-tertiary">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select Component
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
}

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
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    const baseStyles = `
      rounded-xl
      text-theme-primary
      transition-all duration-300
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      appearance-none cursor-pointer
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
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={selectClassName}
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
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-theme-muted">
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
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
