/**
 * Cache TTL values in seconds
 */
export const CACHE_TTL = {
  /** Default TTL: 5 minutes */
  DEFAULT: 300,

  /** Festival list: 5 minutes */
  FESTIVAL_LIST: 300,

  /** Festival detail: 1 minute */
  FESTIVAL_DETAIL: 60,

  /** Festival program: 10 minutes */
  FESTIVAL_PROGRAM: 600,

  /** Analytics data: 30 seconds */
  ANALYTICS: 30,

  /** User session data: 15 minutes */
  USER_SESSION: 900,

  /** Static content: 1 hour */
  STATIC: 3600,
} as const;

/**
 * Cache key prefixes for organized key management
 */
export const CACHE_KEYS = {
  /** Festival-related cache keys */
  FESTIVAL: {
    LIST: 'festival:list',
    DETAIL: (id: string) => `festival:detail:${id}`,
    SLUG: (slug: string) => `festival:slug:${slug}`,
    PROGRAM: (festivalId: string) => `festival:program:${festivalId}`,
    STATS: (festivalId: string) => `festival:stats:${festivalId}`,
  },

  /** Ticket-related cache keys */
  TICKET: {
    CATEGORIES: (festivalId: string) => `ticket:categories:${festivalId}`,
  },

  /** Analytics cache keys */
  ANALYTICS: {
    FESTIVAL: (festivalId: string) => `analytics:festival:${festivalId}`,
    GLOBAL: 'analytics:global',
  },
} as const;

/**
 * Cache patterns for invalidation
 */
export const CACHE_PATTERNS = {
  /** All festival-related caches */
  ALL_FESTIVALS: 'festival:*',

  /** Specific festival and its related data */
  FESTIVAL_AND_RELATED: (festivalId: string) => `*:*${festivalId}*`,

  /** All analytics caches */
  ALL_ANALYTICS: 'analytics:*',
} as const;
