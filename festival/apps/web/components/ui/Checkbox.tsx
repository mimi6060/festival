'use client';

import React, { forwardRef } from 'react';

export type CheckboxSize = 'sm' | 'md' | 'lg';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string;
  description?: string;
  error?: string;
  checkboxSize?: CheckboxSize;
  indeterminate?: boolean;
}

const sizeStyles: Record<CheckboxSize, { box: string; icon: string; label: string }> = {
  sm: {
    box: 'w-4 h-4',
    icon: 'w-2.5 h-2.5',
    label: 'text-sm',
  },
  md: {
    box: 'w-5 h-5',
    icon: 'w-3 h-3',
    label: 'text-base',
  },
  lg: {
    box: 'w-6 h-6',
    icon: 'w-4 h-4',
    label: 'text-lg',
  },
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      error,
      checkboxSize = 'md',
      indeterminate = false,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
    const sizes = sizeStyles[checkboxSize];

    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current!, []);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    return (
      <div className={className}>
        <label
          htmlFor={checkboxId}
          className={`
            inline-flex items-start gap-3 cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              ref={inputRef}
              type="checkbox"
              id={checkboxId}
              disabled={disabled}
              className="sr-only peer"
              {...props}
            />
            <div
              className={`
                ${sizes.box}
                rounded-md
                border-2 border-white/20
                bg-white/5
                transition-all duration-200
                peer-checked:bg-primary-500
                peer-checked:border-primary-500
                peer-focus:ring-2 peer-focus:ring-primary-500/30
                peer-indeterminate:bg-primary-500
                peer-indeterminate:border-primary-500
                ${error ? 'border-red-500' : ''}
              `}
            />
            {/* Check Icon */}
            <svg
              className={`
                ${sizes.icon}
                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                text-white
                opacity-0 peer-checked:opacity-100
                transition-opacity duration-200
                pointer-events-none
              `}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {/* Indeterminate Icon */}
            <svg
              className={`
                ${sizes.icon}
                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                text-white
                opacity-0 peer-indeterminate:opacity-100
                transition-opacity duration-200
                pointer-events-none
              `}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12h14"
              />
            </svg>
          </div>
          {(label || description) && (
            <div className="flex flex-col">
              {label && (
                <span className={`${sizes.label} font-medium text-white`}>
                  {label}
                </span>
              )}
              {description && (
                <span className="text-sm text-white/60 mt-0.5">
                  {description}
                </span>
              )}
            </div>
          )}
        </label>
        {error && (
          <p className="mt-2 text-sm text-red-400 ml-8">{error}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
