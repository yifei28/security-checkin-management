/**
 * React Query Hooks Exports
 * 
 * Centralized exports for all React Query hooks in the application.
 */

// Authentication hooks
export * from './useAuth';

// Guards hooks
export * from './useGuards';

// Sites hooks
export * from './useSites';

// Check-ins hooks
export * from './useCheckIns';

// Re-export React Query core hooks for convenience
export {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useQueries,
  useMutationState,
  useIsFetching,
  useIsMutating,
} from '@tanstack/react-query';

// Re-export query client and utilities
export { queryClient, queryInvalidation, cacheUtils } from '../api/queryClient';
export { queryKeys } from '../api/queryKeys';