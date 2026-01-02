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
}

interface ButtonAsButton extends ButtonBaseProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> {
  as?: 'button';
  href?: never;
}

interface ButtonAsLink extends ButtonBaseProps, Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> {
  as: 'link';
  href: string;
}

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-primary-500 to-pink-500
    hover:from-primary-600 hover:to-pink-600
    text-white font-semibold
    shadow-lg hover:shadow-primary-500/25
  `,
  secondary: `
    border-2 border-white/20
    text-white font-semibold
    hover:bg-white/10 hover:border-white/30
  `,
  accent: `
    bg-secondary-400
    text-festival-dark font-bold
    hover:bg-secondary-300
    shadow-lg hover:shadow-secondary-400/25
  `,
  ghost: `
    text-white/70
    hover:text-white hover:bg-white/5
  `,
  danger: `
    bg-red-500/90
    text-white font-semibold
    hover:bg-red-600
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-6 py-3 text-base rounded-xl',
  lg: 'px-8 py-4 text-lg rounded-2xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    transition-all duration-300
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-primary-500/50
  `;

  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const content = (
    <>
      {isLoading ? (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </>
  );

  if (props.as === 'link') {
    const { as, href, ...linkProps } = props as ButtonAsLink;
    return (
      <Link href={href} className={combinedClassName} {...linkProps}>
        {content}
      </Link>
    );
  }

  const { as, ...buttonProps } = props as ButtonAsButton;
  return (
    <button
      className={combinedClassName}
      disabled={isLoading || buttonProps.disabled}
      {...buttonProps}
    >
      {content}
    </button>
  );
}
