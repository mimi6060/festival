'use client';

import React from 'react';
import Image from 'next/image';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  className?: string;
  rounded?: 'full' | 'lg' | 'md';
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; status: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-xs', status: 'w-1.5 h-1.5 border' },
  sm: { container: 'w-8 h-8', text: 'text-sm', status: 'w-2 h-2 border' },
  md: { container: 'w-10 h-10', text: 'text-base', status: 'w-2.5 h-2.5 border-2' },
  lg: { container: 'w-12 h-12', text: 'text-lg', status: 'w-3 h-3 border-2' },
  xl: { container: 'w-16 h-16', text: 'text-xl', status: 'w-4 h-4 border-2' },
  '2xl': { container: 'w-20 h-20', text: 'text-2xl', status: 'w-5 h-5 border-2' },
};

const statusColors: Record<AvatarStatus, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

const roundedStyles: Record<string, string> = {
  full: 'rounded-full',
  lg: 'rounded-lg',
  md: 'rounded-md',
};

// Generate consistent color from name
function getColorFromName(name: string): string {
  const colors = [
    'bg-primary-500',
    'bg-pink-500',
    'bg-purple-500',
    'bg-indigo-500',
    'bg-blue-500',
    'bg-cyan-500',
    'bg-teal-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-orange-500',
    'bg-red-500',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({
  src,
  alt = '',
  name,
  size = 'md',
  status,
  className = '',
  rounded = 'full',
}: AvatarProps) {
  const sizes = sizeStyles[size];
  const [imageError, setImageError] = React.useState(false);

  const showFallback = !src || imageError;
  const initials = name ? getInitials(name) : '?';
  const bgColor = name ? getColorFromName(name) : 'bg-gray-500';

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`
          ${sizes.container}
          ${roundedStyles[rounded]}
          overflow-hidden
          flex items-center justify-center
          ${showFallback ? bgColor : 'bg-white/10'}
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
          <span className={`${sizes.text} font-semibold text-white`}>
            {initials}
          </span>
        )}
      </div>
      {status && (
        <span
          className={`
            absolute bottom-0 right-0
            ${sizes.status}
            ${statusColors[status]}
            ${roundedStyles[rounded]}
            border-festival-dark
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

export function AvatarGroup({
  children,
  max = 5,
  size = 'md',
  className = '',
}: AvatarGroupProps) {
  const childArray = React.Children.toArray(children);
  const displayedChildren = childArray.slice(0, max);
  const remaining = childArray.length > max ? childArray.length - max : 0;
  const sizes = sizeStyles[size];

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {displayedChildren.map((child, index) => (
        <div
          key={index}
          className="ring-2 ring-festival-dark rounded-full"
          style={{ zIndex: displayedChildren.length - index }}
        >
          {React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<AvatarProps>, { size })
            : child}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`
            ${sizes.container}
            rounded-full
            bg-white/20
            flex items-center justify-center
            ring-2 ring-festival-dark
          `}
          style={{ zIndex: 0 }}
        >
          <span className={`${sizes.text} font-medium text-white`}>
            +{remaining}
          </span>
        </div>
      )}
    </div>
  );
}
