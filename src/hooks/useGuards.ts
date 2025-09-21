/**
 * Guards React Query Hooks
 * 
 * Custom hooks for guards management using React Query v5.
 * Provides CRUD operations, caching, and optimistic updates.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { guardsApi } from '../api/guardsApi';
import { queryKeys } from '../api/queryKeys';
import type {
  PaginatedResponse,
  ApiResponse,
  ApiResponseSingle,
  Guard,
  GuardFormData,
  EnhancedGuardSummary as GuardSummary,
  GuardBulkUpdateRequest,
} from '../types';

/**
 * Hook for fetching paginated guards list
 */
export const useGuards = (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  siteId?: string;
  sortBy?: 'name' | 'phoneNumber' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}) => {
  return useQuery({
    queryKey: queryKeys.guards.list(params),
    queryFn: (): Promise<PaginatedResponse<Guard>> => guardsApi.getGuards(params),
    
    // Cache for 2 minutes, consider stale after 30 seconds
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 2,
    
    // Enable by default
    enabled: true,
  });
};

/**
 * Hook for fetching a single guard by ID
 */
export const useGuard = (guardId: string) => {
  return useQuery({
    queryKey: queryKeys.guards.detail(guardId),
    queryFn: (): Promise<ApiResponse<Guard>> => guardsApi.getGuard(guardId),
    
    // Cache guard details for longer since they change less frequently
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
    
    // Only fetch if guardId is provided
    enabled: !!guardId,
  });
};

/**
 * Hook for fetching guards by site
 */
export const useGuardsBySite = (siteId: string) => {
  return useQuery({
    queryKey: queryKeys.guards.bySite(siteId),
    queryFn: (): Promise<ApiResponse<Guard[]>> => guardsApi.getGuardsBySite(siteId),
    
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    enabled: !!siteId,
  });
};

/**
 * Hook for fetching guard summary statistics
 */
export const useGuardSummary = (guardId: string) => {
  return useQuery({
    queryKey: queryKeys.guards.summaryDetail(guardId),
    queryFn: (): Promise<ApiResponse<GuardSummary>> => guardsApi.getGuardSummary(guardId),
    
    staleTime: 1000 * 60 * 1, // Summary data changes frequently
    gcTime: 1000 * 60 * 3,
    enabled: !!guardId,
  });
};

/**
 * Hook for fetching all guards summaries
 */
export const useGuardsSummary = () => {
  return useQuery({
    queryKey: queryKeys.guards.summaries(),
    queryFn: (): Promise<ApiResponse<GuardSummary[]>> => guardsApi.getAllGuardsSummary(),
    
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });
};

/**
 * Hook for creating a new guard
 */
export const useCreateGuard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (guardData: GuardFormData): Promise<ApiResponseSingle<Guard>> =>
      guardsApi.createGuard(guardData),
    
    onSuccess: (data) => {
      if (data.success && data.data) {
        const newGuard = data.data;
        
        // Add new guard to cache
        queryClient.setQueryData(queryKeys.guards.detail(newGuard.id), data);
        
        // Invalidate guards lists and summaries
        queryClient.invalidateQueries({ queryKey: queryKeys.guards.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.guards.summaries() });
        
        // Invalidate site-related queries if guard is assigned to a site
        if (newGuard.siteId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.guards.bySite(newGuard.siteId) });
        }
        
        console.log('[GUARDS HOOK] Guard created:', newGuard.name);
      }
    },
    
    onError: (error) => {
      console.error('[GUARDS HOOK] Failed to create guard:', error);
    },
  });
};

/**
 * Hook for updating a guard
 */
export const useUpdateGuard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ guardId, updates }: { guardId: string; updates: Partial<GuardFormData> }): Promise<ApiResponseSingle<Guard>> =>
      guardsApi.updateGuard(guardId, updates),
    
    // Optimistic update
    onMutate: async ({ guardId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.guards.detail(guardId) });

      // Snapshot previous value
      const previousGuard = queryClient.getQueryData<ApiResponseSingle<Guard>>(queryKeys.guards.detail(guardId));

      // Optimistically update
      if (previousGuard?.data) {
        const optimisticGuard = { ...previousGuard.data, ...updates };
        queryClient.setQueryData(queryKeys.guards.detail(guardId), {
          ...previousGuard,
          data: optimisticGuard,
        });
      }

      return { previousGuard, guardId };
    },
    
    onError: (error, { guardId }, context) => {
      // Rollback on error
      if (context?.previousGuard) {
        queryClient.setQueryData(queryKeys.guards.detail(guardId), context.previousGuard);
      }
      console.error('[GUARDS HOOK] Failed to update guard:', error);
    },
    
    onSuccess: (data, { guardId }) => {
      if (data.success && data.data) {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: queryKeys.guards.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.guards.summaries() });
        queryClient.invalidateQueries({ queryKey: queryKeys.guards.summaryDetail(guardId) });
        
        console.log('[GUARDS HOOK] Guard updated:', data.data.name);
      }
    },
  });
};

/**
 * Hook for deleting a guard
 */
export const useDeleteGuard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (guardId: string): Promise<ApiResponse<null>> =>
      guardsApi.deleteGuard(guardId),
    
    onSuccess: (data, guardId) => {
      if (data.success) {
        // Remove from cache
        queryClient.removeQueries({ queryKey: queryKeys.guards.detail(guardId) });
        
        // Invalidate lists and summaries
        queryClient.invalidateQueries({ queryKey: queryKeys.guards.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.guards.summaries() });
        
        // Invalidate site-related queries
        queryClient.invalidateQueries({ queryKey: queryKeys.guards.all });
        
        console.log('[GUARDS HOOK] Guard deleted:', guardId);
      }
    },
    
    onError: (error) => {
      console.error('[GUARDS HOOK] Failed to delete guard:', error);
    },
  });
};

/**
 * Hook for uploading guard photo
 */
export const useUploadGuardPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ guardId, photo }: { guardId: string; photo: File }): Promise<ApiResponseSingle<{ photoUrl: string }>> =>
      guardsApi.uploadGuardPhoto(guardId, photo),
    
    onSuccess: (data, { guardId }) => {
      if (data.success && data.data) {
        // Update guard's photo URL in cache
        const guardQuery = queryKeys.guards.detail(guardId);
        queryClient.setQueryData(guardQuery, (old: ApiResponseSingle<Guard> | undefined) => {
          if (old?.data) {
            return {
              ...old,
              data: { ...old.data, photoUrl: data.data!.photoUrl },
            };
          }
          return old;
        });
        
        // Invalidate lists to show updated photo
        queryClient.invalidateQueries({ queryKey: queryKeys.guards.lists() });
        
        console.log('[GUARDS HOOK] Guard photo uploaded:', guardId);
      }
    },
  });
};

/**
 * Hook for assigning guard to a site
 */
export const useAssignGuardToSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ guardId, siteId }: { guardId: string; siteId: string | null }): Promise<ApiResponse<Guard>> =>
      guardsApi.assignGuardToSite(guardId, siteId),
    
    onSuccess: (data, { guardId, siteId }) => {
      if (data.success) {
        // Update guard details
        queryClient.invalidateQueries({ queryKey: queryKeys.guards.detail(guardId) });
        
        // Invalidate site-related queries
        if (siteId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.guards.bySite(siteId) });
        }
        
        // Invalidate lists and summaries
        queryClient.invalidateQueries({ queryKey: queryKeys.guards.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.guards.summaries() });
        
        console.log('[GUARDS HOOK] Guard assigned to site:', guardId);
      }
    },
  });
};

/**
 * Hook for bulk operations on guards
 */
export const useBulkUpdateGuards = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: GuardBulkUpdateRequest[]): Promise<ApiResponse<Guard[]>> =>
      guardsApi.bulkUpdateGuards(updates),
    
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Invalidate all guard-related queries for bulk updates
        queryClient.invalidateQueries({ queryKey: queryKeys.guards.all });
        
        console.log('[GUARDS HOOK] Bulk update completed:', data.data.length, 'guards');
      }
    },
    
    onError: (error) => {
      console.error('[GUARDS HOOK] Bulk update failed:', error);
    },
  });
};

/**
 * Hook for searching guards
 */
export const useSearchGuards = (query: string, filters?: {
  siteIds?: string[];
  hasPhoto?: boolean;
  ageRange?: { min?: number; max?: number };
  heightRange?: { min?: number; max?: number };
}) => {
  return useQuery({
    queryKey: queryKeys.guards.search(query, filters),
    queryFn: (): Promise<ApiResponse<Guard[]>> => guardsApi.searchGuards(query, filters),
    
    // Only search if query is not empty
    enabled: query.length > 0,
    
    // Search results are more volatile
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 2,
  });
};

/**
 * Hook for fetching guards availability
 */
export const useGuardsAvailability = (dateRange: {
  startDate: string;
  endDate: string;
}) => {
  return useQuery({
    queryKey: queryKeys.guards.availability(dateRange),
    queryFn: (): Promise<ApiResponse<Array<{ guardId: string; availableDates: string[] }>>> =>
      guardsApi.getGuardsAvailability(dateRange),
    
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });
};

/**
 * Hook for exporting guards data
 */
export const useExportGuards = () => {
  return useMutation({
    mutationFn: (filters?: {
      siteIds?: string[];
      dateRange?: { startDate: string; endDate: string };
    }): Promise<ApiResponseSingle<{ downloadUrl: string; fileName: string }>> =>
      guardsApi.exportGuards(filters),
    
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Automatically download the file
        const link = document.createElement('a');
        link.href = data.data.downloadUrl;
        link.download = data.data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('[GUARDS HOOK] Export completed:', data.data.fileName);
      }
    },
    
    onError: (error) => {
      console.error('[GUARDS HOOK] Export failed:', error);
    },
  });
};