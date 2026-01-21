'use client';

import React from 'react';

/**
 * Avatar size types
 * sm: 32px, md: 40px, lg: 48px, xl: 64px, 2xl: 96px (profile pages)
 */
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Avatar status indicator types
 */
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy';

/**
 * Avatar component props
 */
export interface AvatarProps {
  /** Image source URL */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  /** Name used to generate initials fallback */
  name?: string;
  /** Size of the avatar */
  size?: AvatarSize;
  /** Online status indicator */
  status?: AvatarStatus;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the ring around the avatar */
  showRing?: boolean;
  /** Custom image component (for Next.js Image optimization) */
  imageComponent?: React.ComponentType<{
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
    onError?: () => void;
  }>;
}

/**
 * AvatarGroup component props
 */
export interface AvatarGroupProps {
  /** Avatar children elements */
  children: React.ReactNode;
  /** Maximum number of avatars to display before +N indicator */
  max?: number;
  /** Size for all avatars in the group */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
}

// Standardized avatar sizes across all apps
const sizeStyles: Record<AvatarSize, { container: string; text: string; status: string }> = {
  sm: { container: 'w-8 h-8', text: 'text-sm', status: 'w-2 h-2 border' },
  md: { container: 'w-10 h-10', text: 'text-base', status: 'w-2.5 h-2.5 border-2' },
  lg: { container: 'w-12 h-12', text: 'text-lg', status: 'w-3 h-3 border-2' },
  xl: { container: 'w-16 h-16', text: 'text-xl', status: 'w-4 h-4 border-2' },
  '2xl': { container: 'w-24 h-24', text: 'text-2xl', status: 'w-5 h-5 border-2' },
};

const statusColors: Record<AvatarStatus, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

const statusLabels: Record<AvatarStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  away: 'Away',
  busy: 'Busy',
};

// Standard placeholder background color
const AVATAR_PLACEHOLDER_BG = 'bg-indigo-500';

/**
 * Get initials from a full name
 *
 * @param name - Full name string
 * @returns Uppercase initials (1-2 characters)
 *
 * @example
 * ```ts
 * getInitials('John Doe') // 'JD'
 * getInitials('Alice') // 'A'
 * getInitials('John Michael Doe') // 'JD' (first and last)
 * ```
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const firstPart = parts[0];
  const lastPart = parts[parts.length - 1];

  if (parts.length === 0 || !firstPart) {
    return '?';
  }
  if (parts.length === 1 || !lastPart) {
    return firstPart.charAt(0).toUpperCase();
  }
  return (firstPart.charAt(0) + lastPart.charAt(0)).toUpperCase();
}

/**
 * Get initials from separate first and last name
 *
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Uppercase initials (0-2 characters)
 *
 * @example
 * ```ts
 * getInitialsFromNames('John', 'Doe') // 'JD'
 * getInitialsFromNames('Alice', undefined) // 'A'
 * getInitialsFromNames(undefined, undefined) // '?'
 * ```
 */
export function getInitialsFromNames(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return (first + last).toUpperCase() || '?';
}

/**
 * Default image component using standard img tag
 * Override with imageComponent prop to use Next.js Image
 */
const DefaultImage: React.FC<{
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  onError?: () => void;
}> = ({ src, alt, className, onError }) => (
  <img
    src={src}
    alt={alt}
    className={`absolute inset-0 w-full h-full ${className || ''}`}
    onError={onError}
  />
);

/**
 * Avatar component
 *
 * Displays a user avatar with optional status indicator.
 * Falls back to initials when no image is provided or image fails to load.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Avatar name="John Doe" />
 *
 * // With image
 * <Avatar src="/avatar.jpg" name="John Doe" alt="John's avatar" />
 *
 * // With status indicator
 * <Avatar name="Jane" status="online" size="lg" />
 *
 * // With Next.js Image (for optimization)
 * import Image from 'next/image';
 * <Avatar src="/avatar.jpg" name="John" imageComponent={Image} />
 * ```
 */
export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt = '',
      name,
      size = 'md',
      status,
      className = '',
      showRing = true,
      imageComponent: ImageComponent = DefaultImage,
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const [imageError, setImageError] = React.useState(false);

    // Reset error state when src changes
    React.useEffect(() => {
      setImageError(false);
    }, [src]);

    const showFallback = !src || imageError;
    const initials = name ? getInitials(name) : '?';

    const ringClasses = showRing ? 'ring-2 ring-white/10' : '';

    const containerClasses = [
      sizes.container,
      'rounded-full',
      'overflow-hidden',
      'flex items-center justify-center',
      'relative',
      ringClasses,
      showFallback ? AVATAR_PLACEHOLDER_BG : 'bg-white/10',
    ]
      .filter(Boolean)
      .join(' ');

    const accessibleLabel = alt || name || 'User avatar';

    return (
      <div ref={ref} className={`relative inline-block ${className}`}>
        <div className={containerClasses} role="img" aria-label={accessibleLabel}>
          {!showFallback ? (
            <ImageComponent
              src={src}
              alt={accessibleLabel}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <span
              className={`${sizes.text} font-semibold text-white select-none`}
              aria-hidden="true"
            >
              {initials}
            </span>
          )}
        </div>
        {status && (
          <span
            className={`absolute bottom-0 right-0 ${sizes.status} ${statusColors[status]} rounded-full border-white dark:border-gray-900`}
            role="status"
            aria-label={statusLabels[status]}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

/**
 * AvatarGroup component
 *
 * Displays a stack of overlapping avatars with a +N indicator for overflow.
 *
 * @example
 * ```tsx
 * <AvatarGroup max={3}>
 *   <Avatar name="Alice" />
 *   <Avatar name="Bob" />
 *   <Avatar name="Charlie" />
 *   <Avatar name="Diana" />
 * </AvatarGroup>
 * ```
 */
export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ children, max = 5, size = 'md', className = '' }, ref) => {
    const childArray = React.Children.toArray(children);
    const displayedChildren = childArray.slice(0, max);
    const remaining = childArray.length > max ? childArray.length - max : 0;
    const sizes = sizeStyles[size];

    return (
      <div
        ref={ref}
        className={`flex -space-x-2 ${className}`}
        role="group"
        aria-label={`Group of ${childArray.length} avatars`}
      >
        {displayedChildren.map((child, index) => (
          <div
            key={index}
            className="ring-2 ring-white/10 rounded-full"
            style={{ zIndex: displayedChildren.length - index }}
          >
            {React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<AvatarProps>, {
                  size,
                  showRing: false,
                })
              : child}
          </div>
        ))}
        {remaining > 0 && (
          <div
            className={`${sizes.container} rounded-full ${AVATAR_PLACEHOLDER_BG} flex items-center justify-center ring-2 ring-white/10`}
            style={{ zIndex: 0 }}
            aria-label={`${remaining} more`}
          >
            <span className={`${sizes.text} font-medium text-white select-none`}>+{remaining}</span>
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

export default Avatar;
