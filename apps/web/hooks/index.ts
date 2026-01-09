// Authentication hooks
export { useAuth, useRequireAuth, useRedirectIfAuthenticated } from './useAuth';

// Cart hooks
export { useCart } from './useCart';

// API hooks
export {
  queryKeys,
  useFestivals,
  useFestival,
  useFeaturedFestivals,
  useSearchFestivals,
  useTicketTypes,
  useUserTickets,
  useUserOrders,
  useOrder,
  useUserProfile,
  usePurchaseTickets,
  useUpdateProfile,
} from './useApi';

// Utility hooks
export {
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  useThrottledCallback,
} from './useDebounce';

// Accessibility hooks
export { useAnnounce, type AnnouncePoliteness } from './useAnnounce';
export { useFocusReturn } from './useFocusReturn';
export {
  useReducedMotion,
  getReducedMotionDuration,
} from './useReducedMotion';
export {
  useKeyboardNavigation,
} from './useKeyboardNavigation';
