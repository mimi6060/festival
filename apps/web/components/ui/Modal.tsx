'use client';

import React, { useEffect, useCallback, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { FocusTrap } from '../a11y/FocusTrap';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  className?: string;
  /** Element to focus when modal opens (query selector) */
  initialFocus?: string;
  /** Custom aria-labelledby ID (defaults to modal-title-{id}) */
  labelledBy?: string;
  /** Custom aria-describedby ID (defaults to modal-description-{id}) */
  describedBy?: string;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

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
 *   description="Are you sure you want to continue?"
 * >
 *   <Button onClick={handleConfirm}>Confirm</Button>
 * </Modal>
 * ```
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className = '',
  initialFocus,
  labelledBy,
  describedBy,
}: ModalProps) {
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
    if (closeOnEsc) {
      onClose();
    }
  }, [closeOnEsc, onClose]);

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
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
          className={`
            relative w-full ${sizeStyles[size]}
            bg-gray-900 border border-white/10
            rounded-xl shadow-2xl
            animate-slideUp
            ${className}
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between p-6 border-b border-white/10">
              <div>
                {title && (
                  <h2 id={titleId} className="text-xl font-bold text-white">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id={descriptionId} className="mt-1 text-sm text-white/60">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  data-modal-close
                  className="
                    p-2 -m-2 text-white/50 hover:text-white
                    transition-colors rounded-lg hover:bg-white/5
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                    min-w-[44px] min-h-[44px] flex items-center justify-center
                  "
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

          {/* Content */}
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

// Confirmation Modal
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

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
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  isLoading = false,
}: ConfirmModalProps) {
  const variantStyles = {
    danger: 'bg-red-500 hover:bg-red-600 focus-visible:ring-red-500',
    warning: 'bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500',
    info: 'bg-primary-500 hover:bg-primary-600 focus-visible:ring-primary-500',
  };

  const iconColors = {
    danger: 'bg-red-500/20 text-red-400',
    warning: 'bg-orange-500/20 text-orange-400',
    info: 'bg-primary-500/20 text-primary-400',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      initialFocus="[data-confirm-cancel]"
    >
      <div className="text-center" role="alertdialog" aria-describedby="confirm-message">
        {/* Icon */}
        <div
          className={`
            w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center
            ${iconColors[variant]}
          `}
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

        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p id="confirm-message" className="text-white/60 text-sm mb-6">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            data-confirm-cancel
            className="
              flex-1 px-4 py-2 rounded-xl
              bg-white/10 text-white font-medium
              hover:bg-white/20 transition-colors
              disabled:opacity-50
              focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
              min-h-[44px]
            "
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            aria-busy={isLoading || undefined}
            className={`
              flex-1 px-4 py-2 rounded-xl
              text-white font-medium transition-colors
              disabled:opacity-50
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              min-h-[44px]
              ${variantStyles[variant]}
            `}
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

/**
 * ModalHeader - Standardized modal header component
 *
 * Styling: p-6 border-b border-white/10
 *
 * @example
 * ```tsx
 * <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
 *   <ModalHeader>
 *     <h2 className="text-xl font-bold text-white">Custom Header</h2>
 *   </ModalHeader>
 *   <ModalBody>Content here</ModalBody>
 *   <ModalFooter>Footer content</ModalFooter>
 * </Modal>
 * ```
 */
interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalHeader({ children, className = '' }: ModalHeaderProps) {
  return <div className={`p-6 border-b border-white/10 ${className}`}>{children}</div>;
}

/**
 * ModalBody - Standardized modal body component
 *
 * Styling: p-6
 *
 * @example
 * ```tsx
 * <ModalBody>
 *   <p>Modal content goes here</p>
 * </ModalBody>
 * ```
 */
interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

/**
 * ModalFooter - Standardized modal footer component
 *
 * Styling: p-6 border-t border-white/10
 *
 * @example
 * ```tsx
 * <ModalFooter>
 *   <Button variant="secondary" onClick={onClose}>Cancel</Button>
 *   <Button variant="primary" onClick={onConfirm}>Confirm</Button>
 * </ModalFooter>
 * ```
 */
interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return <div className={`p-6 border-t border-white/10 ${className}`}>{children}</div>;
}

Modal.displayName = 'Modal';
ConfirmModal.displayName = 'ConfirmModal';
ModalHeader.displayName = 'ModalHeader';
ModalBody.displayName = 'ModalBody';
ModalFooter.displayName = 'ModalFooter';
