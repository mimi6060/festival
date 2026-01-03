// API Hooks - React Query based data fetching hooks
// This is the central export file for all API hooks

// Festival hooks
export {
  useFestivals,
  useFestival,
  useFestivalStats,
  useCreateFestival,
  useUpdateFestival,
  useDeleteFestival,
  festivalQueryKeys,
} from './useFestivals';

// Ticket category hooks
export {
  useTicketCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  ticketCategoryQueryKeys,
} from './useTicketCategories';

// User hooks
export {
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useBanUser,
  useUnbanUser,
  useDeleteUser,
  userQueryKeys,
} from './useUsers';
export type { UserListParams, CreateUserData, UpdateUserData } from './useUsers';

// Program hooks (Artists, Stages, Lineup)
export {
  // Artists
  useArtists,
  useArtistsByFestival,
  useArtist,
  useArtistGenres,
  useCreateArtist,
  useUpdateArtist,
  useDeleteArtist,
  artistQueryKeys,
  // Stages
  useStages,
  useStage,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  stageQueryKeys,
  // Lineup / Performances
  useLineup,
  usePerformance,
  useCreatePerformance,
  useUpdatePerformance,
  useDeletePerformance,
  useCancelPerformance,
  lineupQueryKeys,
} from './useProgram';
export type { ArtistListParams, LineupParams } from './useProgram';

// Vendor hooks
export {
  useVendors,
  useVendor,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
  useToggleVendorOpen,
  vendorQueryKeys,
} from './useVendors';

// POI hooks
export {
  usePois,
  usePoi,
  useCreatePoi,
  useUpdatePoi,
  useDeletePoi,
  useTogglePoiActive,
  poiQueryKeys,
} from './usePois';

// Camping hooks
export {
  useCampingZones,
  useCampingZone,
  useCreateCampingZone,
  useUpdateCampingZone,
  useDeleteCampingZone,
  campingQueryKeys,
} from './useCamping';
