'use client';

import React, { forwardRef } from 'react';

/**
 * Switch size options
 */
export type SwitchSize = 'sm' | 'md' | 'lg';

/**
 * Switch color variants
 */
export type SwitchColor = 'primary' | 'success' | 'warning' | 'error';

/**
 * Props for the Switch component
 */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Label text */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Size of the switch */
  switchSize?: SwitchSize;
  /** Color when active */
  color?: SwitchColor;
  /** Position of the label */
  labelPosition?: 'left' | 'right';
  /** Additional CSS classes */
  className?: string;
}

const sizeStyles: Record<SwitchSize, { track: string; thumb: string; translate: string; label: string }> = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3',
    translate: 'translate-x-4',
    label: 'text-sm',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'w-5 h-5',
    translate: 'translate-x-5',
    label: 'text-base',
  },
  lg: {
    track: 'w-14 h-7',
    thumb: 'w-6 h-6',
    translate: 'translate-x-7',
    label: 'text-lg',
  },
};

const colorStyles: Record<SwitchColor, string> = {
  primary: 'peer-checked:bg-primary-500',
  success: 'peer-checked:bg-green-500',
  warning: 'peer-checked:bg-orange-500',
  error: 'peer-checked:bg-red-500',
};

/**
 * Switch toggle component for binary on/off states.
 *
 * @example
 * ```tsx
 * <Switch
 *   label="Enable notifications"
 *   checked={enabled}
 *   onChange={(e) => setEnabled(e.target.checked)}
 * />
 * ```
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      description,
      switchSize = 'md',
      color = 'primary',
      labelPosition = 'right',
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;
    const sizes = sizeStyles[switchSize];

    const switchElement = (
      <div className="relative flex-shrink-0">
        <input
          ref={ref}
          type="checkbox"
          id={switchId}
          disabled={disabled}
          className="sr-only peer"
          role="switch"
          {...props}
        />
        <div
          className={`
            ${sizes.track}
            rounded-full
            bg-white/20
            peer-focus:ring-2 peer-focus:ring-primary-500/30
            transition-colors duration-200
            ${colorStyles[color]}
          `}
        />
        <div
          className={`
            ${sizes.thumb}
            absolute top-0.5 left-0.5
            rounded-full
            bg-white
            shadow-md
            transition-transform duration-200
            peer-checked:${sizes.translate}
          `}
        />
      </div>
    );

    if (!label && !description) {
      return (
        <label
          htmlFor={switchId}
          className={`
            inline-flex cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
        >
          {switchElement}
        </label>
      );
    }

    return (
      <label
        htmlFor={switchId}
        className={`
          inline-flex items-start gap-3 cursor-pointer
          ${labelPosition === 'left' ? 'flex-row-reverse' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        {switchElement}
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
      </label>
    );
  }
);

Switch.displayName = 'Switch';
