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

// Future components will be exported here:
// export { Card, type CardProps } from './Card';
// export { Input, type InputProps } from './Input';
// export { Modal, type ModalProps } from './Modal';
// export { Avatar, type AvatarProps } from './Avatar';
