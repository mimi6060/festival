'use client';

import React from 'react';
import Link from 'next/link';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Loading text for screen readers (defaults to "Loading...") */
  loadingText?: string;
  /** Accessible label for icon-only buttons */
  'aria-label'?: string;
}

interface ButtonAsButton
  extends ButtonBaseProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> {
  as?: 'button';
  href?: never;
}

interface ButtonAsLink
  extends ButtonBaseProps,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> {
  as: 'link';
  href: string;
}

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-primary-500 hover:bg-primary-600
    text-white font-semibold
  `,
  secondary: `
    bg-white/10 hover:bg-white/20
    text-white font-semibold
  `,
  accent: `
    bg-secondary-400 hover:bg-secondary-300
    text-festival-dark font-bold
  `,
  ghost: `
    bg-transparent hover:bg-white/10
    text-white
  `,
  danger: `
    bg-red-500 hover:bg-red-600
    text-white font-semibold
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg min-h-[36px] min-w-[36px]',
  md: 'px-5 py-2.5 text-base rounded-lg min-h-[44px] min-w-[44px]',
  lg: 'px-6 py-3 text-lg rounded-lg min-h-[52px] min-w-[52px]',
};

/**
 * Button - Accessible button component
 *
 * WCAG 2.1 AA Compliance:
 * - 2.4.7 Focus Visible: Clear focus indicator with ring
 * - 1.4.3 Contrast: High contrast text and background
 * - 2.5.5 Target Size: Minimum 44x44px touch target (WCAG 2.2 AAA, good practice)
 * - 4.1.2 Name, Role, Value: Proper ARIA states for loading/disabled
 *
 * @example
 * ```tsx
 * // Standard button
 * <Button variant="primary">Click me</Button>
 *
 * // Loading state (automatically sets aria-busy and aria-disabled)
 * <Button isLoading loadingText="Saving...">Save</Button>
 *
 * // Icon-only button (requires aria-label)
 * <Button variant="ghost" aria-label="Close menu">
 *   <CloseIcon />
 * </Button>
 * ```
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  loadingText = 'Loading...',
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    focus-visible:ring-primary-500 focus-visible:ring-offset-festival-dark
  `;

  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `
    .trim()
    .replace(/\s+/g, ' ');

  const loadingSpinner = (
    <svg
      className="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const content = (
    <>
      {isLoading ? (
        <>
          {loadingSpinner}
          <span className="sr-only">{loadingText}</span>
        </>
      ) : (
        leftIcon
      )}
      <span aria-hidden={isLoading ? true : undefined}>{children}</span>
      {!isLoading && rightIcon}
    </>
  );

  if (props.as === 'link') {
    const { as: _as, href, ...linkProps } = props as ButtonAsLink;
    return (
      <Link href={href} className={combinedClassName} {...linkProps}>
        {content}
      </Link>
    );
  }

  const { as: _as2, disabled, ...buttonProps } = props as ButtonAsButton;
  const isDisabled = isLoading || disabled;

  return (
    <button
      className={combinedClassName}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={isLoading || undefined}
      {...buttonProps}
    >
      {content}
    </button>
  );
}

Button.displayName = 'Button';
