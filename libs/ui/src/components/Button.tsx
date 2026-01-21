'use client';

import React from 'react';
import { cn } from '../utils';

/**
 * Button variant types
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

/**
 * Button size types
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Base props shared across all button types
 */
interface ButtonBaseProps {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Whether the button should take full width */
  fullWidth?: boolean;
  /** Loading state - disables button and shows spinner */
  isLoading?: boolean;
  /** Text announced by screen readers during loading (defaults to "Loading...") */
  loadingText?: string;
  /** Left icon element */
  leftIcon?: React.ReactNode;
  /** Right icon element */
  rightIcon?: React.ReactNode;
  /** Children elements */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Disabled state (for links, renders as non-interactive span) */
  disabled?: boolean;
}

/**
 * Props when rendering as a button element
 */
interface ButtonAsButton
  extends ButtonBaseProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> {
  /** Render as button element (default) */
  as?: 'button';
  /** href is not allowed for button */
  href?: never;
}

/**
 * Props when rendering as an anchor element
 */
interface ButtonAsAnchor
  extends ButtonBaseProps,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> {
  /** Render as anchor element */
  as: 'a';
  /** URL for the link */
  href: string;
}

/**
 * Props when rendering as a custom component (e.g., Next.js Link)
 * The component receives href and className at minimum
 */
interface ButtonAsLink
  extends ButtonBaseProps,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> {
  /** Render as Next.js Link or similar component */
  as: 'link';
  /** URL for the link */
  href: string;
  /** Link component to use (e.g., Next.js Link) */
  LinkComponent: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }>;
}

/**
 * Combined button props supporting polymorphism
 */
export type ButtonProps = ButtonAsButton | ButtonAsAnchor | ButtonAsLink;

/**
 * Variant styles mapping
 * Uses Tailwind CSS classes with focus-visible for WCAG 2.4.7 compliance
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-primary-600 text-white font-semibold',
    'hover:bg-primary-700',
    'focus-visible:ring-primary-500',
    'disabled:bg-primary-300 disabled:text-white/70'
  ),
  secondary: cn(
    'bg-secondary-600 text-white font-semibold',
    'hover:bg-secondary-700',
    'focus-visible:ring-secondary-500',
    'disabled:bg-secondary-300 disabled:text-white/70'
  ),
  outline: cn(
    'border-2 border-primary-600 text-primary-600 font-semibold bg-transparent',
    'hover:bg-primary-50',
    'focus-visible:ring-primary-500',
    'disabled:border-primary-300 disabled:text-primary-300'
  ),
  ghost: cn(
    'text-neutral-700 font-medium bg-transparent',
    'hover:bg-neutral-100',
    'focus-visible:ring-neutral-500',
    'disabled:text-neutral-400'
  ),
  danger: cn(
    'bg-red-600 text-white font-semibold',
    'hover:bg-red-700',
    'focus-visible:ring-red-500',
    'disabled:bg-red-300 disabled:text-white/70'
  ),
};

/**
 * Size styles mapping
 * Includes min-height/min-width for WCAG 2.5.5 touch target size (44x44px minimum)
 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg min-h-[36px] min-w-[36px]',
  md: 'px-4 py-2 text-base rounded-lg min-h-[44px] min-w-[44px]',
  lg: 'px-6 py-3 text-lg rounded-lg min-h-[52px] min-w-[52px]',
};

/**
 * Base styles applied to all button variants
 */
const baseStyles = cn(
  'inline-flex items-center justify-center gap-2',
  'transition-colors duration-200',
  'disabled:cursor-not-allowed',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
);

/**
 * Loading spinner component
 * Uses aria-hidden since loading state is announced via aria-busy on the button
 */
const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('animate-spin h-4 w-4', className)}
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

/**
 * Button component
 *
 * A polymorphic, accessible button component with multiple variants and sizes.
 * Supports rendering as a button, anchor, or custom Link component.
 * Designed to work with Tailwind CSS.
 *
 * WCAG 2.1 AA Compliance:
 * - 2.4.7 Focus Visible: Clear focus indicator with ring using focus-visible
 * - 1.4.3 Contrast: High contrast text and background colors
 * - 2.5.5 Target Size: Minimum 44x44px touch target for md/lg sizes
 * - 4.1.2 Name, Role, Value: Proper ARIA states for loading/disabled
 *
 * @example
 * ```tsx
 * // Standard button
 * <Button variant="primary" size="md">
 *   Click me
 * </Button>
 *
 * // Loading state (automatically sets aria-busy and aria-disabled)
 * <Button variant="primary" isLoading loadingText="Saving...">
 *   Save
 * </Button>
 *
 * // With icons
 * <Button variant="outline" leftIcon={<PlusIcon />}>
 *   Add Item
 * </Button>
 *
 * // As anchor link
 * <Button as="a" href="/page" variant="ghost">
 *   Go to page
 * </Button>
 *
 * // With Next.js Link
 * import Link from 'next/link';
 * <Button as="link" href="/dashboard" LinkComponent={Link} variant="primary">
 *   Dashboard
 * </Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      loadingText = 'Loading...',
      leftIcon,
      rightIcon,
      children,
      className,
      disabled = false,
      ...restProps
    } = props;

    // Combine all classes
    const combinedClassName = cn(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      className
    );

    // Content with loading state handling
    const content = (
      <>
        {isLoading ? (
          <>
            <LoadingSpinner />
            <span className="sr-only">{loadingText}</span>
          </>
        ) : (
          leftIcon
        )}
        <span aria-hidden={isLoading || undefined}>{children}</span>
        {!isLoading && rightIcon}
      </>
    );

    // Render as Next.js Link or similar component
    if (props.as === 'link') {
      const {
        as: _as,
        href,
        LinkComponent,
        ...linkProps
      } = restProps as Omit<ButtonAsLink, keyof ButtonBaseProps>;

      // Links cannot be disabled, so we prevent navigation for "disabled" state
      if (disabled || isLoading) {
        return (
          <span
            className={cn(combinedClassName, 'pointer-events-none opacity-50')}
            aria-disabled="true"
          >
            {content}
          </span>
        );
      }

      return (
        <LinkComponent
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={combinedClassName}
          {...linkProps}
        >
          {content}
        </LinkComponent>
      );
    }

    // Render as anchor element
    if (props.as === 'a') {
      const {
        as: _as,
        href,
        ...anchorProps
      } = restProps as Omit<ButtonAsAnchor, keyof ButtonBaseProps>;

      // Anchors cannot be disabled, so we render as span for "disabled" state
      if (disabled || isLoading) {
        return (
          <span
            className={cn(combinedClassName, 'pointer-events-none opacity-50')}
            aria-disabled="true"
          >
            {content}
          </span>
        );
      }

      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={combinedClassName}
          {...anchorProps}
        >
          {content}
        </a>
      );
    }

    // Render as button element (default)
    const { as: _as, ...buttonProps } = restProps as Omit<ButtonAsButton, keyof ButtonBaseProps>;
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
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
);

Button.displayName = 'Button';

export default Button;
