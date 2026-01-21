import React from 'react';

/**
 * Card variant types
 */
export type CardVariant = 'default' | 'elevated' | 'outlined';

/**
 * Card padding sizes
 */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * Card image aspect ratio
 */
export type CardImageAspectRatio = 'auto' | 'square' | 'video' | 'wide' | 'portrait';

/**
 * Card context for compound components
 */
interface CardContextValue {
  variant: CardVariant;
  padding: CardPadding;
  interactive: boolean;
}

const CardContext = React.createContext<CardContextValue | null>(null);

/**
 * Hook to access card context
 */
const useCardContext = (): CardContextValue => {
  const context = React.useContext(CardContext);
  if (!context) {
    throw new Error('Card compound components must be used within a Card component');
  }
  return context;
};

/**
 * Get CSS classes for card variant
 */
const getVariantClasses = (variant: CardVariant): string => {
  const variants: Record<CardVariant, string> = {
    default: 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800',
    elevated:
      'bg-white dark:bg-neutral-900 shadow-lg hover:shadow-xl transition-shadow duration-200',
    outlined:
      'bg-transparent border-2 border-neutral-300 dark:border-neutral-700 hover:border-primary-500 dark:hover:border-primary-400 transition-colors duration-200',
  };
  return variants[variant];
};

/**
 * Get CSS classes for card padding
 */
const getPaddingClasses = (padding: CardPadding): string => {
  const paddings: Record<CardPadding, string> = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };
  return paddings[padding];
};

/**
 * Get CSS classes for card image aspect ratio
 */
const getAspectRatioClasses = (aspectRatio: CardImageAspectRatio): string => {
  const ratios: Record<CardImageAspectRatio, string> = {
    auto: '',
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[21/9]',
    portrait: 'aspect-[3/4]',
  };
  return ratios[aspectRatio];
};

/**
 * Card component props
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant of the card */
  variant?: CardVariant;
  /** Padding size for the card */
  padding?: CardPadding;
  /** Whether the card is interactive (clickable) */
  interactive?: boolean;
  /** Children elements */
  children: React.ReactNode;
}

/**
 * Card Header component props
 */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Children elements */
  children: React.ReactNode;
}

/**
 * Card Body component props
 */
export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Children elements */
  children: React.ReactNode;
}

/**
 * Card Footer component props
 */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Children elements */
  children: React.ReactNode;
}

/**
 * Card Image component props
 */
export interface CardImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Aspect ratio for the image */
  aspectRatio?: CardImageAspectRatio;
  /** Alt text for the image (required for accessibility) */
  alt: string;
  /** Image source URL */
  src: string;
  /** Whether to show a placeholder on load error */
  showPlaceholder?: boolean;
}

/**
 * Card Title component props
 */
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level (h1-h6) */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** Children elements */
  children: React.ReactNode;
}

/**
 * Card Description component props
 */
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Children elements */
  children: React.ReactNode;
}

/**
 * Card component
 *
 * A flexible card component with compound components pattern for
 * building card-based UI layouts. Supports multiple variants, padding options,
 * and interactive states with keyboard navigation.
 *
 * @example
 * ```tsx
 * <Card variant="elevated" interactive onClick={() => console.log('clicked')}>
 *   <Card.Image src="/image.jpg" alt="Description" aspectRatio="video" />
 *   <Card.Header>
 *     <Card.Title>Card Title</Card.Title>
 *     <Card.Description>A brief description</Card.Description>
 *   </Card.Header>
 *   <Card.Body>
 *     <p>Main content goes here</p>
 *   </Card.Body>
 *   <Card.Footer>
 *     <Button>Action</Button>
 *   </Card.Footer>
 * </Card>
 * ```
 */
const CardRoot = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      interactive = false,
      children,
      className = '',
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const isClickable = interactive || !!onClick;

    const baseClasses = 'rounded-xl overflow-hidden';
    const variantClasses = getVariantClasses(variant);
    const interactiveClasses = isClickable
      ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]'
      : '';

    const combinedClasses = [baseClasses, variantClasses, interactiveClasses, className]
      .filter(Boolean)
      .join(' ');

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>);
      }
      onKeyDown?.(event);
    };

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(event);
    };

    const contextValue: CardContextValue = {
      variant,
      padding,
      interactive: isClickable,
    };

    return (
      <CardContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={combinedClasses}
          onClick={isClickable ? handleClick : undefined}
          onKeyDown={isClickable ? handleKeyDown : undefined}
          role={isClickable ? 'button' : undefined}
          tabIndex={isClickable ? 0 : undefined}
          aria-label={isClickable ? props['aria-label'] : undefined}
          {...props}
        >
          {children}
        </div>
      </CardContext.Provider>
    );
  }
);

CardRoot.displayName = 'Card';

/**
 * Card Header component
 *
 * Container for card title and description. Typically placed at the top of the card.
 */
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className = '', ...props }, ref) => {
    const { padding } = useCardContext();
    const paddingClasses = getPaddingClasses(padding);

    const combinedClasses = [
      'border-b border-neutral-200 dark:border-neutral-800',
      paddingClasses,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={combinedClasses} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'Card.Header';

/**
 * Card Body component
 *
 * Main content area of the card.
 */
const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className = '', ...props }, ref) => {
    const { padding } = useCardContext();
    const paddingClasses = getPaddingClasses(padding);

    const combinedClasses = [paddingClasses, className].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={combinedClasses} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'Card.Body';

/**
 * Card Footer component
 *
 * Container for card actions. Typically placed at the bottom of the card.
 */
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className = '', ...props }, ref) => {
    const { padding } = useCardContext();
    const paddingClasses = getPaddingClasses(padding);

    const combinedClasses = [
      'border-t border-neutral-200 dark:border-neutral-800',
      paddingClasses,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={combinedClasses} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'Card.Footer';

/**
 * Card Image component
 *
 * Image container with aspect ratio support and error handling.
 */
const CardImage = React.forwardRef<HTMLImageElement, CardImageProps>(
  ({ aspectRatio = 'auto', alt, src, showPlaceholder = true, className = '', ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    const aspectClasses = getAspectRatioClasses(aspectRatio);
    const baseClasses = 'w-full object-cover';

    const containerClasses = ['overflow-hidden', aspectClasses].filter(Boolean).join(' ');
    const imageClasses = [baseClasses, aspectRatio !== 'auto' ? 'h-full' : '', className]
      .filter(Boolean)
      .join(' ');

    const handleError = () => {
      setHasError(true);
    };

    if (hasError && showPlaceholder) {
      return (
        <div className={containerClasses}>
          <div className="w-full h-full min-h-[100px] bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-neutral-400 dark:text-neutral-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
      );
    }

    return (
      <div className={containerClasses}>
        <img
          ref={ref}
          src={src}
          alt={alt}
          className={imageClasses}
          onError={handleError}
          {...props}
        />
      </div>
    );
  }
);

CardImage.displayName = 'Card.Image';

/**
 * Card Title component
 *
 * Heading element for the card title.
 */
const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ as: Component = 'h3', children, className = '', ...props }, ref) => {
    const baseClasses = 'text-lg font-semibold text-neutral-900 dark:text-neutral-100';
    const combinedClasses = [baseClasses, className].filter(Boolean).join(' ');

    return (
      <Component ref={ref} className={combinedClasses} {...props}>
        {children}
      </Component>
    );
  }
);

CardTitle.displayName = 'Card.Title';

/**
 * Card Description component
 *
 * Paragraph element for the card description.
 */
const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className = '', ...props }, ref) => {
    const baseClasses = 'text-sm text-neutral-600 dark:text-neutral-400 mt-1';
    const combinedClasses = [baseClasses, className].filter(Boolean).join(' ');

    return (
      <p ref={ref} className={combinedClasses} {...props}>
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'Card.Description';

/**
 * Card compound component with all sub-components attached
 */
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
  Image: CardImage,
  Title: CardTitle,
  Description: CardDescription,
});

export default Card;
