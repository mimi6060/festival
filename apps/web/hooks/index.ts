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
export { useReducedMotion, getReducedMotionDuration } from './useReducedMotion';
export { useKeyboardNavigation } from './useKeyboardNavigation';

// Direction/RTL hooks
export { useDirection, useDirectionWithLocale, type UseDirectionReturn } from './useDirection';

// Formatting hooks (locale-aware)
export {
  useFormatDate,
  type UseFormatDateReturn,
  type DateFormatterOptions,
  type DateFormatStyle,
  type TimeFormatStyle,
} from './useFormatDate';

export {
  useFormatNumber,
  type UseFormatNumberReturn,
  type NumberFormatterOptions,
  type CompactDisplay,
  type PercentFormatterOptions,
} from './useFormatNumber';

export {
  useFormatCurrency,
  type UseFormatCurrencyReturn,
  type CurrencyFormatterOptions,
  type CurrencyDisplay,
  type CurrencySign,
  type CurrencyConfig,
} from './useFormatCurrency';

export {
  useRelativeTime,
  useLiveRelativeTime,
  useLiveCountdown,
  type UseRelativeTimeReturn,
  type CountdownResult,
  type RelativeTimeOptions,
  type RelativeTimeUnit,
  type RelativeTimeNumeric,
  type RelativeTimeStyle,
} from './useRelativeTime';
