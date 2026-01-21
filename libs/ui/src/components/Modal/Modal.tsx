'use client';

import React, { useEffect, useCallback, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

/**
 * Modal size options
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Modal variant for ConfirmModal
 */
export type ConfirmModalVariant = 'danger' | 'warning' | 'info';

/**
 * Modal component props
 */
export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title (optional, used for accessibility) */
  title?: string;
  /** Modal description (optional, used for accessibility) */
  description?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Modal size */
  size?: ModalSize;
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Whether clicking the overlay closes the modal */
  closeOnOverlayClick?: boolean;
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean;
  /** Additional CSS classes for the modal container */
  className?: string;
  /** Element to focus when modal opens (query selector) */
  initialFocus?: string;
  /** Custom aria-labelledby ID */
  labelledBy?: string;
  /** Custom aria-describedby ID */
  describedBy?: string;
}

/**
 * Modal Header component props
 */
export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Children elements */
  children: React.ReactNode;
}

/**
 * Modal Body component props
 */
export interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Children elements */
  children: React.ReactNode;
}

/**
 * Modal Footer component props
 */
export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Children elements */
  children: React.ReactNode;
}

/**
 * Confirm Modal component props
 */
export interface ConfirmModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when user confirms */
  onConfirm: () => void;
  /** Modal title */
  title: string;
  /** Confirmation message */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Visual variant */
  variant?: ConfirmModalVariant;
  /** Whether confirm action is loading */
  isLoading?: boolean;
}

// Size styles mapping
const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

// Focusable element selector
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Internal FocusTrap component for modal
 */
interface FocusTrapProps {
  active: boolean;
  children: React.ReactNode;
  onEscape?: () => void;
  initialFocus?: string;
  lockScroll?: boolean;
}

function FocusTrap({
  active,
  children,
  onEscape,
  initialFocus,
  lockScroll = true,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) {
      return [];
    }
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  // Handle initial focus when trap activates
  useEffect(() => {
    if (!active) {
      return;
    }

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Lock body scroll
    if (lockScroll) {
      document.body.style.overflow = 'hidden';
    }

    // Set initial focus
    const setInitialFocus = () => {
      if (initialFocus) {
        const element = containerRef.current?.querySelector<HTMLElement>(initialFocus);
        if (element) {
          element.focus();
          return;
        }
      }

      // Default: focus the first focusable element
      const focusableElements = getFocusableElements();
      const firstFocusable = focusableElements[0];
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        // If no focusable elements, focus the container itself
        containerRef.current?.focus();
      }
    };

    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(setInitialFocus, 10);

    return () => {
      clearTimeout(timeoutId);

      // Restore body scroll
      if (lockScroll) {
        document.body.style.overflow = '';
      }

      // Return focus to the previously focused element
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function'
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [active, initialFocus, lockScroll, getFocusableElements]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!active) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
        return;
      }

      // Handle Tab key for focus trapping
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        if (!firstElement || !lastElement) {
          event.preventDefault();
          return;
        }

        // Shift + Tab on first element -> focus last element
        if (event.shiftKey && activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
          return;
        }

        // Tab on last element -> focus first element
        if (!event.shiftKey && activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
          return;
        }

        // If focus is outside the trap, bring it back
        if (!containerRef.current?.contains(activeElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onEscape, getFocusableElements]);

  // Handle focus moving outside
  useEffect(() => {
    if (!active) {
      return;
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const focusableElements = getFocusableElements();
        const firstFocusable = focusableElements[0];
        if (firstFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [active, getFocusableElements]);

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} tabIndex={-1}>
      {children}
    </div>
  );
}

/**
 * Modal - Accessible modal dialog component
 *
 * WCAG 2.1 AA Compliance:
 * - 2.1.2 No Keyboard Trap: Focus is trapped but escape key closes modal
 * - 2.4.3 Focus Order: Focus is managed within the modal
 * - 1.3.1 Info and Relationships: Proper ARIA roles and relationships
 * - 4.1.2 Name, Role, Value: aria-modal, aria-labelledby, aria-describedby
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 *   size="md"
 * >
 *   <Modal.Header>
 *     <h2>Modal Title</h2>
 *   </Modal.Header>
 *   <Modal.Body>
 *     <p>Modal content goes here</p>
 *   </Modal.Body>
 *   <Modal.Footer>
 *     <Button onClick={onClose}>Cancel</Button>
 *     <Button onClick={onConfirm}>Confirm</Button>
 *   </Modal.Footer>
 * </Modal>
 * ```
 */
const ModalRoot = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      children,
      size = 'md',
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      className,
      initialFocus,
      labelledBy,
      describedBy,
    },
    ref
  ) => {
    const modalId = useId();
    const titleId = labelledBy || `modal-title-${modalId}`;
    const descriptionId = describedBy || `modal-description-${modalId}`;
    const triggerRef = useRef<HTMLElement | null>(null);

    // Store the element that triggered the modal
    useEffect(() => {
      if (isOpen) {
        triggerRef.current = document.activeElement as HTMLElement;
      }
    }, [isOpen]);

    // Return focus to trigger element when modal closes
    useEffect(() => {
      if (!isOpen && triggerRef.current) {
        triggerRef.current.focus();
      }
    }, [isOpen]);

    // Handle overlay click
    const handleOverlayClick = (event: React.MouseEvent) => {
      if (event.target === event.currentTarget && closeOnOverlayClick) {
        onClose();
      }
    };

    // Handle escape key callback for FocusTrap
    const handleEscape = useCallback(() => {
      if (closeOnEscape) {
        onClose();
      }
    }, [closeOnEscape, onClose]);

    if (!isOpen) {
      return null;
    }

    const modalContent = (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4',
          'bg-black/60 backdrop-blur-sm',
          'animate-in fade-in duration-200'
        )}
        onClick={handleOverlayClick}
        role="presentation"
      >
        <FocusTrap
          active={isOpen}
          onEscape={handleEscape}
          initialFocus={initialFocus || (showCloseButton ? '[data-modal-close]' : undefined)}
          lockScroll={true}
        >
          <div
            ref={ref}
            className={cn(
              'relative w-full',
              sizeStyles[size],
              'bg-white dark:bg-neutral-900',
              'border border-neutral-200 dark:border-neutral-800',
              'rounded-xl shadow-2xl',
              'animate-in slide-in-from-bottom-4 duration-300',
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
          >
            {/* Built-in header with title/description */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
                <div>
                  {title && (
                    <h2 id={titleId} className="text-xl font-bold text-neutral-900 dark:text-white">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      id={descriptionId}
                      className="mt-1 text-sm text-neutral-600 dark:text-neutral-400"
                    >
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    data-modal-close
                    className={cn(
                      'p-2 -m-2 text-neutral-500 hover:text-neutral-900',
                      'dark:text-neutral-400 dark:hover:text-white',
                      'transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                      'min-w-[44px] min-h-[44px] flex items-center justify-center'
                    )}
                    aria-label="Close dialog"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content area */}
            <div className="p-6">{children}</div>
          </div>
        </FocusTrap>
      </div>
    );

    // Use portal to render modal at document root
    if (typeof document !== 'undefined') {
      return createPortal(modalContent, document.body);
    }

    return null;
  }
);

ModalRoot.displayName = 'Modal';

/**
 * Modal Header component
 *
 * Use for custom header content when not using the built-in title prop.
 * Styling: p-6 border-b border-neutral-200 dark:border-neutral-800
 *
 * @example
 * ```tsx
 * <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
 *   <Modal.Header>
 *     <h2 className="text-xl font-bold">Custom Header</h2>
 *   </Modal.Header>
 *   <Modal.Body>Content here</Modal.Body>
 *   <Modal.Footer>Footer content</Modal.Footer>
 * </Modal>
 * ```
 */
const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('p-6 border-b border-neutral-200 dark:border-neutral-800', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModalHeader.displayName = 'Modal.Header';

/**
 * Modal Body component
 *
 * Main content area of the modal.
 * Styling: p-6
 *
 * @example
 * ```tsx
 * <Modal.Body>
 *   <p>Modal content goes here</p>
 * </Modal.Body>
 * ```
 */
const ModalBody = React.forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('p-6', className)} {...props}>
        {children}
      </div>
    );
  }
);

ModalBody.displayName = 'Modal.Body';

/**
 * Modal Footer component
 *
 * Container for modal actions.
 * Styling: p-6 border-t border-neutral-200 dark:border-neutral-800
 *
 * @example
 * ```tsx
 * <Modal.Footer>
 *   <Button variant="secondary" onClick={onClose}>Cancel</Button>
 *   <Button variant="primary" onClick={onConfirm}>Confirm</Button>
 * </Modal.Footer>
 * ```
 */
const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('p-6 border-t border-neutral-200 dark:border-neutral-800', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModalFooter.displayName = 'Modal.Footer';

/**
 * ConfirmModal - Accessible confirmation dialog
 *
 * A pre-built modal for confirmation actions with proper
 * accessibility support.
 *
 * @example
 * ```tsx
 * <ConfirmModal
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Item"
 *   message="Are you sure you want to delete this item?"
 *   variant="danger"
 *   confirmText="Delete"
 * />
 * ```
 */
export const ConfirmModal = React.forwardRef<HTMLDivElement, ConfirmModalProps>(
  (
    {
      isOpen,
      onClose,
      onConfirm,
      title,
      message,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      variant = 'info',
      isLoading = false,
    },
    ref
  ) => {
    const variantStyles: Record<ConfirmModalVariant, string> = {
      danger: 'bg-red-500 hover:bg-red-600 focus-visible:ring-red-500',
      warning: 'bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500',
      info: 'bg-primary-500 hover:bg-primary-600 focus-visible:ring-primary-500',
    };

    const iconColors: Record<ConfirmModalVariant, string> = {
      danger: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
      warning: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
      info: 'bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400',
    };

    return (
      <Modal
        ref={ref}
        isOpen={isOpen}
        onClose={onClose}
        size="sm"
        showCloseButton={false}
        initialFocus="[data-confirm-cancel]"
      >
        <div className="text-center" role="alertdialog" aria-describedby="confirm-message">
          {/* Icon */}
          <div
            className={cn(
              'w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center',
              iconColors[variant]
            )}
            aria-hidden="true"
          >
            {variant === 'danger' && (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
            {variant === 'warning' && (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {variant === 'info' && (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>

          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{title}</h3>
          <p id="confirm-message" className="text-neutral-600 dark:text-neutral-400 text-sm mb-6">
            {message}
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              data-confirm-cancel
              className={cn(
                'flex-1 px-4 py-2 rounded-xl',
                'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium',
                'hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors',
                'disabled:opacity-50',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500',
                'min-h-[44px]'
              )}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              aria-busy={isLoading || undefined}
              className={cn(
                'flex-1 px-4 py-2 rounded-xl',
                'text-white font-medium transition-colors',
                'disabled:opacity-50',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                'min-h-[44px]',
                variantStyles[variant]
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Loading...</span>
                  <span className="sr-only">Please wait</span>
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </Modal>
    );
  }
);

ConfirmModal.displayName = 'ConfirmModal';

/**
 * Modal compound component with all sub-components attached
 */
export const Modal = Object.assign(ModalRoot, {
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
});

export default Modal;
