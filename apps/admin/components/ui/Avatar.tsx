'use client';

import React from 'react';
import Image from 'next/image';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  className?: string;
  showRing?: boolean;
}

// Standardized avatar sizes across all apps
// sm: 32px, md: 40px, lg: 48px, xl: 64px, 2xl: 96px (profile pages)
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

// Get initials from name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Get initials from first and last name
export function getInitialsFromNames(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return (first + last).toUpperCase() || '?';
}

export function Avatar({
  src,
  alt = '',
  name,
  size = 'md',
  status,
  className = '',
  showRing = true,
}: AvatarProps) {
  const sizes = sizeStyles[size];
  const [imageError, setImageError] = React.useState(false);

  const showFallback = !src || imageError;
  const initials = name ? getInitials(name) : '?';

  // Standardized styling: rounded-full, ring-2 ring-white/10, bg-indigo-500 for placeholder
  const ringStyles = showRing ? 'ring-2 ring-white/10' : '';

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`
          ${sizes.container}
          rounded-full
          overflow-hidden
          flex items-center justify-center
          ${ringStyles}
          ${showFallback ? 'bg-indigo-500' : 'bg-white/10'}
        `}
      >
        {!showFallback ? (
          <Image
            src={src}
            alt={alt || name || 'Avatar'}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={`${sizes.text} font-semibold text-white`}>{initials}</span>
        )}
      </div>
      {status && (
        <span
          className={`
            absolute bottom-0 right-0
            ${sizes.status}
            ${statusColors[status]}
            rounded-full
            border-white dark:border-gray-900
          `}
        />
      )}
    </div>
  );
}

// Avatar Group for stacking multiple avatars
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({ children, max = 5, size = 'md', className = '' }: AvatarGroupProps) {
  const childArray = React.Children.toArray(children);
  const displayedChildren = childArray.slice(0, max);
  const remaining = childArray.length > max ? childArray.length - max : 0;
  const sizes = sizeStyles[size];

  return (
    <div className={`flex -space-x-2 ${className}`}>
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
          className={`
            ${sizes.container}
            rounded-full
            bg-indigo-500
            flex items-center justify-center
            ring-2 ring-white/10
          `}
          style={{ zIndex: 0 }}
        >
          <span className={`${sizes.text} font-medium text-white`}>+{remaining}</span>
        </div>
      )}
    </div>
  );
}

export default Avatar;
