/**
 * API Module Exports
 * 
 * Centralized exports for the API layer including HTTP client,
 * interceptors, API services, and utility functions.
 */

// Main API client exports
export {
  // Client instances
  api,
  apiClient,
  axiosInstance,
  
  // Client classes and configuration
  ApiClient,
  defaultConfig,
  isValidApiResponse,
  
  // Interceptor utilities
  transformApiError,
  shouldLogout,
  
  // Type exports
  type ApiClientConfig,
  type ApiRequestConfig,
  type ApiClientResponse,
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosInstance,
} from './client';

// Interceptor functions (for advanced usage)
export {
  requestInterceptor,
  requestErrorInterceptor,
  responseInterceptor,
  responseErrorInterceptor,
} from './interceptors';

// API Service modules
export { default as authApi } from './authApi';
export { default as guardsApi } from './guardsApi';
export { default as sitesApi } from './sitesApi';
export { default as checkinsApi } from './checkinsApi';

// Individual service method exports for convenience
export {
  // Auth methods
  login,
  logout,
  refreshToken,
  getCurrentUser,
  updateProfile,
  changePassword,
  requestPasswordReset,
  verifyToken,
} from './authApi';

export {
  // Guards methods
  getGuards,
  getGuard,
  createGuard,
  updateGuard,
  deleteGuard,
  uploadGuardPhoto,
  deleteGuardPhoto,
  getGuardsBySite,
  assignGuardToSites,
  unassignGuardFromSites,
  getGuardSummary,
  getAllGuardsSummary,
  bulkUpdateGuards,
  bulkDeleteGuards,
  searchGuards,
  getGuardsAvailability,
  exportGuards,
} from './guardsApi';

export {
  // Sites methods
  getSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  getSitesByGuard,
  assignGuardsToSite,
  unassignGuardsFromSite,
  getSiteSummary,
  getAllSitesSummary,
  getSitesInArea,
  getNearestSites,
  validateSiteLocation,
  bulkUpdateSites,
  bulkDeleteSites,
  searchSites,
  getSiteCheckInStats,
  updateSiteGeofence,
  exportSites,
} from './sitesApi';

export {
  // Check-ins methods
  getCheckInRecords,
  getCheckInRecord,
  getCheckInsByGuard,
  getCheckInsBySite,
  getDashboardStats,
  getTodayStats,
  getCheckInTrends,
  getCheckInHeatmap,
  getGuardPerformance,
  getSiteActivity,
  searchCheckIns,
  getCheckInsSummary,
  getCheckInAnomalies,
  exportCheckIns,
  getCheckInPhoto,
  getAttendanceReport,
} from './checkinsApi';