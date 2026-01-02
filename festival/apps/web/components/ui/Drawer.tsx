'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

export type DrawerPosition = 'left' | 'right' | 'top' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: DrawerPosition;
  size?: DrawerSize;
  title?: string;
  description?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const horizontalSizes: Record<DrawerSize, string> = {
  sm: 'w-72',
  md: 'w-96',
  lg: 'w-[32rem]',
  xl: 'w-[40rem]',
  full: 'w-screen',
};

const verticalSizes: Record<DrawerSize, string> = {
  sm: 'h-48',
  md: 'h-72',
  lg: 'h-96',
  xl: 'h-[32rem]',
  full: 'h-screen',
};

const positionStyles: Record<DrawerPosition, { container: string; animation: string }> = {
  left: {
    container: 'left-0 top-0 h-full',
    animation: 'animate-in slide-in-from-left',
  },
  right: {
    container: 'right-0 top-0 h-full',
    animation: 'animate-in slide-in-from-right',
  },
  top: {
    container: 'top-0 left-0 w-full',
    animation: 'animate-in slide-in-from-top',
  },
  bottom: {
    container: 'bottom-0 left-0 w-full',
    animation: 'animate-in slide-in-from-bottom',
  },
};

export function Drawer({
  isOpen,
  onClose,
  children,
  position = 'right',
  size = 'md',
  title,
  description,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
}: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === overlayRef.current) {
        onClose();
      }
    },
    [closeOnOverlayClick, onClose]
  );

  // Lock body scroll and handle escape key
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);

      // Focus the drawer
      if (drawerRef.current) {
        drawerRef.current.focus();
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {return null;}

  const isHorizontal = position === 'left' || position === 'right';
  const sizeClass = isHorizontal ? horizontalSizes[size] : verticalSizes[size];
  const positionConfig = positionStyles[position];

  const drawerContent = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="
        fixed inset-0 z-50
        bg-black/60 backdrop-blur-sm
        animate-in fade-in duration-200
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'drawer-title' : undefined}
      aria-describedby={description ? 'drawer-description' : undefined}
    >
      <div
        ref={drawerRef}
        tabIndex={-1}
        className={`
          fixed ${positionConfig.container}
          ${sizeClass}
          bg-festival-dark/95 backdrop-blur-xl
          border-white/10
          ${isHorizontal ? 'border-l' : 'border-t'}
          shadow-xl shadow-black/20
          ${positionConfig.animation} duration-300
          flex flex-col
          ${className}
        `}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 border-b border-white/10 flex-shrink-0">
            <div>
              {title && (
                <h2 id="drawer-title" className="text-xl font-bold text-white">
                  {title}
                </h2>
              )}
              {description && (
                <p id="drawer-description" className="text-sm text-white/60 mt-1">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="
                  p-2 -mr-2 -mt-2
                  text-white/60 hover:text-white
                  hover:bg-white/10
                  rounded-lg
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-500/50
                "
                aria-label="Close drawer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body
  if (typeof window !== 'undefined') {
    return createPortal(drawerContent, document.body);
  }

  return null;
}

// Drawer Header Component
interface DrawerHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerHeader({ children, className = '' }: DrawerHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

// Drawer Title Component
interface DrawerTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerTitle({ children, className = '' }: DrawerTitleProps) {
  return (
    <h3 className={`text-lg font-semibold text-white ${className}`}>
      {children}
    </h3>
  );
}

// Drawer Body Component
interface DrawerBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerBody({ children, className = '' }: DrawerBodyProps) {
  return (
    <div className={`text-white/80 ${className}`}>
      {children}
    </div>
  );
}

// Drawer Footer Component
interface DrawerFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerFooter({ children, className = '' }: DrawerFooterProps) {
  return (
    <div className={`flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10 ${className}`}>
      {children}
    </div>
  );
}
