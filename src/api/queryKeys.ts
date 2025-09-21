/**
 * Query Keys Factory for React Query
 * 
 * Centralized query key management following React Query v5 best practices.
 * Provides type-safe, hierarchical query keys for cache invalidation and management.
 */

/**
 * Query key factory for authentication-related queries
 */
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
  token: () => [...authKeys.all, 'token'] as const,
  verify: () => [...authKeys.all, 'verify'] as const,
} as const;

/**
 * Query key factory for guards-related queries
 */
export const guardsKeys = {
  all: ['guards'] as const,
  lists: () => [...guardsKeys.all, 'list'] as const,
  list: (params?: Record<string, any>) => [...guardsKeys.lists(), params] as const,
  details: () => [...guardsKeys.all, 'detail'] as const,
  detail: (id: string) => [...guardsKeys.details(), id] as const,
  summary: () => [...guardsKeys.all, 'summary'] as const,
  summaries: () => [...guardsKeys.summary()] as const,
  summaryDetail: (id: string) => [...guardsKeys.summary(), id] as const,
  bySite: (siteId: string) => [...guardsKeys.all, 'by-site', siteId] as const,
  availability: (dateRange?: { startDate: string; endDate: string }) => 
    [...guardsKeys.all, 'availability', dateRange] as const,
  search: (query: string, filters?: Record<string, any>) => 
    [...guardsKeys.all, 'search', query, filters] as const,
} as const;

/**
 * Query key factory for sites-related queries
 */
export const sitesKeys = {
  all: ['sites'] as const,
  lists: () => [...sitesKeys.all, 'list'] as const,
  list: (params?: Record<string, any>) => [...sitesKeys.lists(), params] as const,
  details: () => [...sitesKeys.all, 'detail'] as const,
  detail: (id: string) => [...sitesKeys.details(), id] as const,
  summary: () => [...sitesKeys.all, 'summary'] as const,
  summaries: () => [...sitesKeys.summary()] as const,
  summaryDetail: (id: string) => [...sitesKeys.summary(), id] as const,
  byGuard: (guardId: string) => [...sitesKeys.all, 'by-guard', guardId] as const,
  inArea: (bounds: { northEast: unknown; southWest: unknown }) => 
    [...sitesKeys.all, 'in-area', bounds] as const,
  nearest: (location: { lat: number; lng: number }, limit?: number) => 
    [...sitesKeys.all, 'nearest', location, limit] as const,
  checkInStats: (siteId: string, dateRange: { startDate: string; endDate: string }) => 
    [...sitesKeys.all, 'checkin-stats', siteId, dateRange] as const,
  search: (query: string, filters?: Record<string, any>) => 
    [...sitesKeys.all, 'search', query, filters] as const,
} as const;

/**
 * Query key factory for check-ins related queries
 */
export const checkinsKeys = {
  all: ['checkins'] as const,
  lists: () => [...checkinsKeys.all, 'list'] as const,
  list: (params?: Record<string, any>) => [...checkinsKeys.lists(), params] as const,
  details: () => [...checkinsKeys.all, 'detail'] as const,
  detail: (id: string) => [...checkinsKeys.details(), id] as const,
  byGuard: (guardId: string, dateRange?: { startDate: string; endDate: string }) => 
    [...checkinsKeys.all, 'by-guard', guardId, dateRange] as const,
  bySite: (siteId: string, dateRange?: { startDate: string; endDate: string }) => 
    [...checkinsKeys.all, 'by-site', siteId, dateRange] as const,
  photo: (checkInId: string) => [...checkinsKeys.all, 'photo', checkInId] as const,
  summary: () => [...checkinsKeys.all, 'summary'] as const,
  summaryRange: (dateRange: { startDate: string; endDate: string }, groupBy?: string) => 
    [...checkinsKeys.summary(), dateRange, groupBy] as const,
  search: (query: string, filters?: Record<string, any>) => 
    [...checkinsKeys.all, 'search', query, filters] as const,
  anomalies: (dateRange: { startDate: string; endDate: string }) => 
    [...checkinsKeys.all, 'anomalies', dateRange] as const,
} as const;

/**
 * Query key factory for dashboard-related queries
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  statsRange: (dateRange?: { startDate: string; endDate: string }) => 
    [...dashboardKeys.stats(), dateRange] as const,
  todayStats: () => [...dashboardKeys.all, 'today'] as const,
  trends: (params: { period: string; dateRange: unknown; groupBy?: string }) => 
    [...dashboardKeys.all, 'trends', params] as const,
  heatmap: (dateRange: { startDate: string; endDate: string }) => 
    [...dashboardKeys.all, 'heatmap', dateRange] as const,
  guardPerformance: (dateRange: { startDate: string; endDate: string }) => 
    [...dashboardKeys.all, 'guard-performance', dateRange] as const,
  siteActivity: (dateRange: { startDate: string; endDate: string }) => 
    [...dashboardKeys.all, 'site-activity', dateRange] as const,
} as const;

/**
 * Query key factory for reports-related queries
 */
export const reportsKeys = {
  all: ['reports'] as const,
  attendance: (params: { dateRange: unknown; guardIds?: string[]; siteIds?: string[] }) => 
    [...reportsKeys.all, 'attendance', params] as const,
} as const;

/**
 * Master query keys object - combines all key factories
 */
export const queryKeys = {
  auth: authKeys,
  guards: guardsKeys,
  sites: sitesKeys,
  checkins: checkinsKeys,
  dashboard: dashboardKeys,
  reports: reportsKeys,
} as const;

/**
 * Type-safe query key utilities
 */
export type QueryKeys = typeof queryKeys;

/**
 * Helper function to get all keys for a specific entity type
 */
export const getEntityKeys = (entityType: keyof QueryKeys) => {
  return queryKeys[entityType].all;
};

/**
 * Helper function to invalidate all queries for an entity
 */
export const getInvalidationKey = (entityType: keyof QueryKeys) => {
  return { queryKey: queryKeys[entityType].all };
};

/**
 * Utility type for extracting query key from factory functions
 */
export type InferQueryKey<T> = T extends (...args: unknown[]) => infer K ? K : never;

/**
 * Common query key patterns for reusable components
 */
export const commonQueryKeys = {
  /**
   * Paginated list query key
   */
  paginatedList: (entity: string, params: { page?: number; pageSize?: number; [key: string]: unknown }) =>
    [entity, 'paginated', params] as const,
    
  /**
   * Search query key
   */
  search: (entity: string, query: string, filters?: Record<string, any>) =>
    [entity, 'search', { query, filters }] as const,
    
  /**
   * Detail with related data key
   */
  detailWithRelations: (entity: string, id: string, relations: string[]) =>
    [entity, 'detail-with-relations', id, relations] as const,
    
  /**
   * Stats/summary query key
   */
  stats: (entity: string, dateRange?: { startDate: string; endDate: string }) =>
    [entity, 'stats', dateRange] as const,
} as const;

/**
 * Export default as queryKeys for convenience
 */
export default queryKeys;