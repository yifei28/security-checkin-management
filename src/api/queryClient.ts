/**
 * React Query Client Configuration
 * 
 * Centralized configuration for React Query including cache settings,
 * retry logic, and error handling integration.
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import type { QueryClientConfig } from '@tanstack/react-query';
import { globalQueryErrorHandler, globalMutationErrorHandler } from './errorHandling';

/**
 * Default query options for all queries
 */
const defaultQueryOptions = {
  // How long data stays in cache when components unmount (5 minutes)
  gcTime: 1000 * 60 * 5,
  
  // How long data is considered fresh and won't trigger a refetch (2 minutes)
  staleTime: 1000 * 60 * 2,
  
  // Retry failed requests 3 times with exponential backoff
  retry: (failureCount: number, error: unknown) => {
    // Don't retry on 4xx errors (client errors)
    if (error?.response?.status >= 400 && error?.response?.status < 500) {
      return false;
    }
    
    // Retry up to 3 times for network errors and 5xx errors
    return failureCount < 3;
  },
  
  // Retry delay with exponential backoff (1s, 2s, 4s)
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  
  // Background refetch settings
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchOnMount: true,
};

/**
 * Default mutation options for all mutations
 */
const defaultMutationOptions = {
  // Retry mutations once (for network errors only)
  retry: (failureCount: number, error: unknown) => {
    // Don't retry client errors (4xx)
    if (error?.response?.status >= 400 && error?.response?.status < 500) {
      return false;
    }
    
    // Only retry once for network/server errors
    return failureCount < 1;
  },
  
  // Shorter retry delay for mutations (500ms)
  retryDelay: 500,
};

/**
 * React Query client configuration
 */
const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: defaultQueryOptions,
    mutations: defaultMutationOptions,
  },
  
  // Global error handlers
  queryCache: new QueryCache({
    onError: globalQueryErrorHandler,
  }),
  
  mutationCache: new MutationCache({
    onError: globalMutationErrorHandler,
  }),
};

/**
 * Create and configure the React Query client
 */
export const queryClient = new QueryClient(queryClientConfig);

/**
 * Query client configuration for development/debugging
 */
if (process.env.NODE_ENV === 'development') {
  // Enhanced logging for development
  console.log('[REACT QUERY] QueryClient initialized with enhanced logging');
}

/**
 * Query invalidation utilities
 */
export const queryInvalidation = {
  /**
   * Invalidate all queries for a specific entity type
   */
  invalidateEntity: (entityType: 'guards' | 'sites' | 'checkins' | 'auth') => {
    return queryClient.invalidateQueries({ queryKey: [entityType] });
  },
  
  /**
   * Invalidate specific entity by ID
   */
  invalidateEntityById: (entityType: 'guards' | 'sites' | 'checkins', id: string) => {
    return queryClient.invalidateQueries({ queryKey: [entityType, id] });
  },
  
  /**
   * Invalidate dashboard and summary queries
   */
  invalidateDashboard: () => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['guards', 'summary'] }),
      queryClient.invalidateQueries({ queryKey: ['sites', 'summary'] }),
      queryClient.invalidateQueries({ queryKey: ['checkins', 'summary'] }),
    ]);
  },
  
  /**
   * Invalidate all cached data (nuclear option)
   */
  invalidateAll: () => {
    return queryClient.invalidateQueries();
  },
  
  /**
   * Remove all cached data and reset client
   */
  resetAll: () => {
    return queryClient.resetQueries();
  },
};

/**
 * Cache utilities for manual cache operations
 */
export const cacheUtils = {
  /**
   * Get cached data for a specific query
   */
  getCachedData: <T>(queryKey: unknown[]) => {
    return queryClient.getQueryData<T>(queryKey);
  },
  
  /**
   * Set cached data for a specific query
   */
  setCachedData: <T>(queryKey: unknown[], data: T) => {
    return queryClient.setQueryData(queryKey, data);
  },
  
  /**
   * Update cached data with a function
   */
  updateCachedData: <T>(queryKey: unknown[], updater: (old: T | undefined) => T) => {
    return queryClient.setQueryData(queryKey, updater);
  },
  
  /**
   * Prefetch data for better UX
   */
  prefetchQuery: (queryKey: unknown[], queryFn: () => Promise<unknown>) => {
    return queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: defaultQueryOptions.staleTime,
    });
  },
};

/**
 * Export query client instance as default
 */
export default queryClient;