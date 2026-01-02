'use client';

import React, { forwardRef, createContext, useContext } from 'react';

export type RadioSize = 'sm' | 'md' | 'lg';

// Radio Group Context
interface RadioGroupContextValue {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  radioSize?: RadioSize;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

// Radio Group Component
interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  radioSize?: RadioSize;
  direction?: 'horizontal' | 'vertical';
  label?: string;
  error?: string;
}

export function RadioGroup({
  name,
  value,
  onChange,
  children,
  className = '',
  disabled = false,
  radioSize = 'md',
  direction = 'vertical',
  label,
  error,
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ name, value, onChange, disabled, radioSize }}>
      <div className={className} role="radiogroup" aria-label={label}>
        {label && (
          <span className="block text-sm font-medium text-white/80 mb-3">
            {label}
          </span>
        )}
        <div
          className={`
            flex gap-3
            ${direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'}
          `}
        >
          {children}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
      </div>
    </RadioGroupContext.Provider>
  );
}

// Radio Item Component
interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string;
  description?: string;
  radioSize?: RadioSize;
  value: string;
}

const sizeStyles: Record<RadioSize, { circle: string; dot: string; label: string }> = {
  sm: {
    circle: 'w-4 h-4',
    dot: 'w-2 h-2',
    label: 'text-sm',
  },
  md: {
    circle: 'w-5 h-5',
    dot: 'w-2.5 h-2.5',
    label: 'text-base',
  },
  lg: {
    circle: 'w-6 h-6',
    dot: 'w-3 h-3',
    label: 'text-lg',
  },
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      description,
      radioSize: propSize,
      value,
      className = '',
      id,
      disabled: propDisabled,
      ...props
    },
    ref
  ) => {
    const context = useContext(RadioGroupContext);
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

    const radioSize = propSize || context?.radioSize || 'md';
    const disabled = propDisabled || context?.disabled || false;
    const isChecked = context ? context.value === value : props.checked;
    const name = context?.name || props.name;

    const sizes = sizeStyles[radioSize];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (context?.onChange) {
        context.onChange(value);
      }
      props.onChange?.(e);
    };

    return (
      <label
        htmlFor={radioId}
        className={`
          inline-flex items-start gap-3 cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            type="radio"
            id={radioId}
            name={name}
            value={value}
            checked={isChecked}
            disabled={disabled}
            onChange={handleChange}
            className="sr-only peer"
            {...props}
          />
          <div
            className={`
              ${sizes.circle}
              rounded-full
              border-2 border-white/20
              bg-white/5
              transition-all duration-200
              peer-checked:border-primary-500
              peer-focus:ring-2 peer-focus:ring-primary-500/30
            `}
          />
          <div
            className={`
              ${sizes.dot}
              absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              rounded-full
              bg-primary-500
              opacity-0 scale-0
              peer-checked:opacity-100 peer-checked:scale-100
              transition-all duration-200
            `}
          />
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
    );
  }
);

Radio.displayName = 'Radio';
