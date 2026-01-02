// API Client Infrastructure
export { default as apiClient, tokenManager, get, post, put, patch, del } from '../api-client';
export type { ApiError, RefreshTokenResponse } from '../api-client';

// Festivals API
export * from './festivals';
export {
  getFestivals,
  getFestival,
  getFestivalBySlug,
  createFestival,
  updateFestival,
  deleteFestival,
  publishFestival,
  cancelFestival,
  getFestivalStats,
  duplicateFestival,
} from './festivals';

// Tickets API
export * from './tickets';
export {
  getTicketCategories,
  getTicketCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  activateCategory,
  deactivateCategory,
  getTickets,
  getTicket,
  validateTicket,
  cancelTicket,
  refundTicket,
  getTicketStats,
  getTicketQrCode,
  resendTicketEmail,
} from './tickets';

// Users API
export * from './users';
export {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  banUser,
  unbanUser,
  changeUserRole,
  resetUserPassword,
  sendVerificationEmail,
  getUserStats,
  getUserActivity,
  exportUsers,
} from './users';

// Program API (Artists, Stages, Lineup)
export * from './program';
export {
  getArtists,
  getArtist,
  createArtist,
  updateArtist,
  deleteArtist,
  getGenres,
  getStages,
  getStage,
  createStage,
  updateStage,
  deleteStage,
  getLineup,
  getFestivalArtists,
  getPerformance,
  createPerformance,
  updatePerformance,
  deletePerformance,
  cancelPerformance,
  checkConflicts,
} from './program';
