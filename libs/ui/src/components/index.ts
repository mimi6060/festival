'use client';

/**
 * Festival UI - Component Exports
 *
 * This module exports all UI components available in the library.
 * Components are designed to be used with Tailwind CSS.
 */

// Button
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';

// Spinner / Loading
export {
  Spinner,
  LoadingScreen,
  LoadingInline,
  LoadingOverlay,
  type SpinnerProps,
  type SpinnerSize,
  type SpinnerColor,
  type LoadingScreenProps,
  type LoadingInlineProps,
  type LoadingOverlayProps,
} from './Spinner';

// Badge
export {
  Badge,
  BadgeLight,
  BadgeGroup,
  StatusBadge,
  type BadgeProps,
  type BadgeVariant,
  type BadgeSize,
  type BadgeGroupProps,
  type StatusBadgeProps,
  type StatusType,
} from './Badge';

// Card
export {
  Card,
  type CardVariant,
  type CardPadding,
  type CardImageAspectRatio,
  type CardProps,
  type CardHeaderProps,
  type CardBodyProps,
  type CardFooterProps,
  type CardImageProps,
  type CardTitleProps,
  type CardDescriptionProps,
} from './Card';

// Avatar
export {
  Avatar,
  AvatarGroup,
  getInitials,
  getInitialsFromNames,
  type AvatarProps,
  type AvatarGroupProps,
  type AvatarSize,
  type AvatarStatus,
} from './Avatar';

// Input / Form components
export {
  Input,
  Textarea,
  Select,
  type InputProps,
  type InputType,
  type InputVariant,
  type InputSize,
  type ValidationState,
  type TextareaProps,
  type SelectProps,
  type SelectOption,
} from './Input';

// EmptyState
export {
  EmptyState,
  EmptyStateIcons,
  type EmptyStateProps,
  type EmptyStateVariant,
  type EmptyStateIconSize,
} from './EmptyState';

// Modal
export {
  Modal,
  ConfirmModal,
  type ModalProps,
  type ModalSize,
  type ModalHeaderProps,
  type ModalBodyProps,
  type ModalFooterProps,
  type ConfirmModalProps,
  type ConfirmModalVariant,
} from './Modal';
