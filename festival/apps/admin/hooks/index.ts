export { useAuth } from './useAuth';
export { usePagination } from './usePagination';
export { useDebounce, useDebouncedCallback } from './useDebounce';
export { useWebSocket } from './useWebSocket';
export type { WebSocketMessage, UseWebSocketOptions, UseWebSocketReturn } from './useWebSocket';
export { useRealtimeData } from './useRealTimeData';
export type { RealtimeStats, RealtimeTransaction, RealtimeAlert, UseRealtimeDataOptions, UseRealtimeDataReturn } from './useRealTimeData';
export { useUsers, useUser, useCreateUser, useUpdateUser, useBanUser, useUnbanUser, useDeleteUser, userQueryKeys } from './useUsers';
export type { CreateUserData, UpdateUserData } from './useUsers';
export { useTicketCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, ticketCategoryKeys } from './useTicketCategories';

// Festival hooks
export {
  useFestivals,
  useFestival,
  useFestivalStats,
  useCreateFestival,
  useUpdateFestival,
  useDeleteFestival,
  festivalQueryKeys,
} from './api/useFestivals';

// Program hooks (stages, artists, performances/lineup)
export {
  useStages,
  useStage,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useArtists,
  useArtist,
  useArtistsByFestival,
  useGenres,
  useCreateArtist,
  useUpdateArtist,
  useDeleteArtist,
  useLineup,
  usePerformance,
  useCreatePerformance,
  useUpdatePerformance,
  useDeletePerformance,
  useCancelPerformance,
} from './useProgram';
