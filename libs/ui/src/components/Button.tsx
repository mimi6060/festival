import React from 'react';

/**
 * Button variant types
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

/**
 * Button size types
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button component props
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Whether the button should take full width */
  fullWidth?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Left icon element */
  leftIcon?: React.ReactNode;
  /** Right icon element */
  rightIcon?: React.ReactNode;
  /** Children elements */
  children: React.ReactNode;
}

/**
 * Get CSS classes for button variant
 * Note: These are Tailwind CSS classes that need to be included in the consuming app
 */
const getVariantClasses = (variant: ButtonVariant): string => {
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 disabled:bg-primary-300',
    secondary:
      'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500 disabled:bg-secondary-300',
    outline:
      'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500 disabled:border-primary-300 disabled:text-primary-300',
    ghost: 'text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-500 disabled:text-neutral-400',
    danger:
      'bg-error-default text-white hover:bg-error-dark focus:ring-red-500 disabled:bg-red-300',
  };
  return variants[variant];
};

/**
 * Get CSS classes for button size
 */
const getSizeClasses = (size: ButtonSize): string => {
  const sizes: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  return sizes[size];
};

/**
 * Button component
 *
 * A reusable button component with multiple variants and sizes.
 * Designed to work with Tailwind CSS.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">
 *   Click me
 * </Button>
 *
 * <Button variant="outline" isLoading>
 *   Loading...
 * </Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed';
    const variantClasses = getVariantClasses(variant);
    const sizeClasses = getSizeClasses(size);
    const widthClasses = fullWidth ? 'w-full' : '';

    const combinedClasses = [baseClasses, variantClasses, sizeClasses, widthClasses, className]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} className={combinedClasses} disabled={disabled || isLoading} {...props}>
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
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
        )}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
