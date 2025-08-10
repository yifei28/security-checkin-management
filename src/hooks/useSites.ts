/**
 * Sites React Query Hooks
 * 
 * Custom hooks for sites management using React Query v5.
 * Includes CRUD operations, geographic queries, and mapping features.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '../api/sitesApi';
import { queryKeys } from '../api/queryKeys';
import type {
  PaginatedResponse,
  ApiResponse,
  Site,
  SiteFormData,
  EnhancedSiteSummary as SiteSummary,
  SiteBulkUpdateRequest,
  Location,
} from '../types';

/**
 * Hook for fetching paginated sites list
 */
export const useSites = (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  guardId?: string;
  withinRadius?: { 
    center: Location; 
    radiusKm: number; 
  };
  sortBy?: 'name' | 'latitude' | 'longitude' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}) => {
  return useQuery({
    queryKey: queryKeys.sites.list(params),
    queryFn: (): Promise<PaginatedResponse<Site>> => sitesApi.getSites(params),
    
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 2, // 2 minutes
    enabled: true,
  });
};

/**
 * Hook for fetching a single site by ID
 */
export const useSite = (siteId: string) => {
  return useQuery({
    queryKey: queryKeys.sites.detail(siteId),
    queryFn: (): Promise<ApiResponse<Site>> => sitesApi.getSite(siteId),
    
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
    enabled: !!siteId,
  });
};

/**
 * Hook for fetching sites by guard
 */
export const useSitesByGuard = (guardId: string) => {
  return useQuery({
    queryKey: queryKeys.sites.byGuard(guardId),
    queryFn: (): Promise<ApiResponse<Site[]>> => sitesApi.getSitesByGuard(guardId),
    
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    enabled: !!guardId,
  });
};

/**
 * Hook for fetching site summary statistics
 */
export const useSiteSummary = (siteId: string) => {
  return useQuery({
    queryKey: queryKeys.sites.summaryDetail(siteId),
    queryFn: (): Promise<ApiResponse<SiteSummary>> => sitesApi.getSiteSummary(siteId),
    
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 3,    // 3 minutes
    enabled: !!siteId,
  });
};

/**
 * Hook for fetching all sites summaries
 */
export const useSitesSummary = () => {
  return useQuery({
    queryKey: queryKeys.sites.summaries(),
    queryFn: (): Promise<ApiResponse<SiteSummary[]>> => sitesApi.getAllSitesSummary(),
    
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });
};

/**
 * Hook for fetching sites within a geographic area
 */
export const useSitesInArea = (bounds: {
  northEast: Location;
  southWest: Location;
}) => {
  return useQuery({
    queryKey: queryKeys.sites.inArea(bounds),
    queryFn: (): Promise<ApiResponse<Site[]>> => sitesApi.getSitesInArea(bounds),
    
    // Geographic queries are more dynamic
    staleTime: 1000 * 15, // 15 seconds
    gcTime: 1000 * 60 * 2,
    enabled: !!bounds.northEast && !!bounds.southWest,
  });
};

/**
 * Hook for fetching nearest sites to a location
 */
export const useNearestSites = (location: Location, limit?: number) => {
  return useQuery({
    queryKey: queryKeys.sites.nearest(location, limit),
    queryFn: (): Promise<ApiResponse<Array<Site & { distance: number }>>> =>
      sitesApi.getNearestSites(location, limit),
    
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 3,
    enabled: !!location.lat && !!location.lng,
  });
};

/**
 * Hook for fetching site check-in statistics
 */
export const useSiteCheckInStats = (siteId: string, dateRange: {
  startDate: string;
  endDate: string;
}) => {
  return useQuery({
    queryKey: queryKeys.sites.checkInStats(siteId, dateRange),
    queryFn: (): Promise<ApiResponse<{
      totalCheckIns: number;
      successfulCheckIns: number;
      failedCheckIns: number;
      averageCheckInsPerDay: number;
      peakHours: Array<{ hour: number; count: number }>;
    }>> => sitesApi.getSiteCheckInStats(siteId, dateRange),
    
    staleTime: 1000 * 60 * 2, // Stats change frequently
    gcTime: 1000 * 60 * 5,
    enabled: !!siteId && !!dateRange.startDate && !!dateRange.endDate,
  });
};

/**
 * Hook for creating a new site
 */
export const useCreateSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (siteData: SiteFormData): Promise<ApiResponse<Site>> =>
      sitesApi.createSite(siteData),
    
    onSuccess: (data) => {
      if (data.success && data.data) {
        const newSite = data.data;
        
        // Add new site to cache
        queryClient.setQueryData(queryKeys.sites.detail(newSite.id), data);
        
        // Invalidate sites lists and summaries
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.summaries() });
        
        // Invalidate guard-related queries if site is assigned to guards
        if (newSite.assignedGuardIds.length > 0) {
          newSite.assignedGuardIds.forEach(guardId => {
            queryClient.invalidateQueries({ queryKey: queryKeys.sites.byGuard(guardId) });
          });
        }
        
        // Invalidate geographic queries
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.all });
        
        console.log('[SITES HOOK] Site created:', newSite.name);
      }
    },
    
    onError: (error) => {
      console.error('[SITES HOOK] Failed to create site:', error);
    },
  });
};

/**
 * Hook for updating a site
 */
export const useUpdateSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ siteId, updates }: { siteId: string; updates: Partial<SiteFormData> }): Promise<ApiResponse<Site>> =>
      sitesApi.updateSite(siteId, updates),
    
    // Optimistic update
    onMutate: async ({ siteId, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sites.detail(siteId) });

      const previousSite = queryClient.getQueryData<ApiResponse<Site>>(queryKeys.sites.detail(siteId));

      if (previousSite?.data) {
        const optimisticSite = { ...previousSite.data, ...updates };
        queryClient.setQueryData(queryKeys.sites.detail(siteId), {
          ...previousSite,
          data: optimisticSite,
        });
      }

      return { previousSite, siteId };
    },
    
    onError: (error, { siteId }, context) => {
      if (context?.previousSite) {
        queryClient.setQueryData(queryKeys.sites.detail(siteId), context.previousSite);
      }
      console.error('[SITES HOOK] Failed to update site:', error);
    },
    
    onSuccess: (data, { siteId }) => {
      if (data.success && data.data) {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.summaries() });
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.summaryDetail(siteId) });
        
        // Invalidate geographic queries since location might have changed
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.all });
        
        console.log('[SITES HOOK] Site updated:', data.data.name);
      }
    },
  });
};

/**
 * Hook for deleting a site
 */
export const useDeleteSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (siteId: string): Promise<ApiResponse<null>> =>
      sitesApi.deleteSite(siteId),
    
    onSuccess: (data, siteId) => {
      if (data.success) {
        // Remove from cache
        queryClient.removeQueries({ queryKey: queryKeys.sites.detail(siteId) });
        
        // Invalidate lists and summaries
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.summaries() });
        
        // Invalidate all site-related queries
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.all });
        
        console.log('[SITES HOOK] Site deleted:', siteId);
      }
    },
    
    onError: (error) => {
      console.error('[SITES HOOK] Failed to delete site:', error);
    },
  });
};

/**
 * Hook for assigning guards to a site
 */
export const useAssignGuardsToSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ siteId, guardIds }: { siteId: string; guardIds: string[] }): Promise<ApiResponse<Site>> =>
      sitesApi.assignGuardsToSite(siteId, guardIds),
    
    onSuccess: (data, { siteId, guardIds }) => {
      if (data.success) {
        // Update site details
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.detail(siteId) });
        
        // Invalidate guard-related queries
        guardIds.forEach(guardId => {
          queryClient.invalidateQueries({ queryKey: queryKeys.sites.byGuard(guardId) });
        });
        
        // Invalidate lists and summaries
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.summaries() });
        
        console.log('[SITES HOOK] Guards assigned to site:', siteId);
      }
    },
  });
};

/**
 * Hook for validating site location
 */
export const useValidateSiteLocation = () => {
  return useMutation({
    mutationFn: ({ location, address }: { location: Location; address?: string }): Promise<ApiResponse<{
      isValid: boolean;
      validatedLocation?: Location;
      validatedAddress?: string;
      suggestions?: string[];
    }>> => sitesApi.validateSiteLocation(location, address),
    
    onError: (error) => {
      console.error('[SITES HOOK] Location validation failed:', error);
    },
  });
};

/**
 * Hook for updating site geofence settings
 */
export const useUpdateSiteGeofence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ siteId, geofence }: { 
      siteId: string; 
      geofence: { radiusMeters: number; strictMode: boolean } 
    }): Promise<ApiResponse<Site>> =>
      sitesApi.updateSiteGeofence(siteId, geofence),
    
    onSuccess: (data, { siteId }) => {
      if (data.success && data.data) {
        // Update site in cache
        queryClient.setQueryData(queryKeys.sites.detail(siteId), data);
        
        // Invalidate lists to show updated geofence info
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.lists() });
        
        console.log('[SITES HOOK] Site geofence updated:', siteId);
      }
    },
    
    onError: (error) => {
      console.error('[SITES HOOK] Geofence update failed:', error);
    },
  });
};

/**
 * Hook for bulk operations on sites
 */
export const useBulkUpdateSites = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: SiteBulkUpdateRequest[]): Promise<ApiResponse<Site[]>> =>
      sitesApi.bulkUpdateSites(updates),
    
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Invalidate all site-related queries for bulk updates
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.all });
        
        console.log('[SITES HOOK] Bulk update completed:', data.data.length, 'sites');
      }
    },
    
    onError: (error) => {
      console.error('[SITES HOOK] Bulk update failed:', error);
    },
  });
};

/**
 * Hook for searching sites
 */
export const useSearchSites = (query: string, filters?: {
  guardIds?: string[];
  locationRadius?: {
    center: Location;
    radiusKm: number;
  };
  hasGuards?: boolean;
}) => {
  return useQuery({
    queryKey: queryKeys.sites.search(query, filters),
    queryFn: (): Promise<ApiResponse<Site[]>> => sitesApi.searchSites(query, filters),
    
    enabled: query.length > 0,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 2,
  });
};

/**
 * Hook for exporting sites data
 */
export const useExportSites = () => {
  return useMutation({
    mutationFn: (filters?: {
      guardIds?: string[];
      dateRange?: { startDate: string; endDate: string };
      locationBounds?: {
        northEast: Location;
        southWest: Location;
      };
    }): Promise<ApiResponse<{ downloadUrl: string; fileName: string }>> =>
      sitesApi.exportSites(filters),
    
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Automatically download the file
        const link = document.createElement('a');
        link.href = data.data.downloadUrl;
        link.download = data.data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('[SITES HOOK] Export completed:', data.data.fileName);
      }
    },
    
    onError: (error) => {
      console.error('[SITES HOOK] Export failed:', error);
    },
  });
};