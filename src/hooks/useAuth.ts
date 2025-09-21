/**
 * Authentication React Query Hooks
 * 
 * Custom hooks for authentication operations using React Query v5.
 * Provides type-safe, cached authentication state management.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { queryKeys } from '../api/queryKeys';
import { logout as authLogout } from '../util/auth';
import type {
  ApiResponseSingle,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  User,
} from '../types';

/**
 * Hook for user login mutation
 */
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest): Promise<ApiResponseSingle<LoginResponse>> =>
      authApi.login(credentials),
    
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Cache user data immediately after successful login
        const loginData = data.data as unknown as LoginResponse;
        queryClient.setQueryData(queryKeys.auth.me(), loginData.user);
        
        // Invalidate auth-related queries to refresh state
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
        
        console.log('[AUTH HOOK] Login successful, cache updated');
      }
    },
    
    onError: (error) => {
      console.error('[AUTH HOOK] Login failed:', error);
      // Clear any stale auth data on login failure
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
    },
  });
};

/**
 * Hook for user logout mutation
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (): Promise<ApiResponseSingle<null>> => authApi.logout(),
    
    onMutate: async () => {
      // Optimistically clear auth state immediately
      authLogout();
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
      
      // Clear all cached data on logout for security
      queryClient.clear();
    },
    
    onSuccess: () => {
      console.log('[AUTH HOOK] Logout successful, cache cleared');
    },
    
    onError: (error) => {
      console.warn('[AUTH HOOK] Logout request failed, but local cleanup completed:', error);
    },
  });
};

/**
 * Hook for getting current user data
 */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: (): Promise<ApiResponseSingle<User>> => authApi.getCurrentUser(),
    
    // Only fetch if we have a token
    enabled: !!localStorage.getItem('token'),
    
    // Cache user data for 5 minutes
    staleTime: 1000 * 60 * 5,
    
    // Keep in cache for 10 minutes when component unmounts
    gcTime: 1000 * 60 * 10,
    
    // Retry on failure (network errors only)
    retry: (failureCount, error: unknown) => {
      // Don't retry on 401/403 errors
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * Hook for token refresh mutation
 */
export const useRefreshToken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (refreshToken: RefreshTokenRequest): Promise<ApiResponseSingle<RefreshTokenResponse>> =>
      authApi.refreshToken(refreshToken),
    
    onSuccess: (data) => {
      if (data.success && data.data) {
        console.log('[AUTH HOOK] Token refreshed successfully');
        
        // Invalidate current user query to fetch fresh data
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      }
    },
    
    onError: (error) => {
      console.error('[AUTH HOOK] Token refresh failed:', error);
      
      // Clear auth state if refresh fails
      authLogout();
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
    },
  });
};

/**
 * Hook for updating user profile
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<User>): Promise<ApiResponseSingle<User>> =>
      authApi.updateProfile(updates),
    
    // Optimistic update
    onMutate: async (newUserData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.auth.me() });

      // Snapshot previous value
      const previousUser = queryClient.getQueryData<User>(queryKeys.auth.me());

      // Optimistically update to new value
      if (previousUser) {
        queryClient.setQueryData(queryKeys.auth.me(), {
          ...previousUser,
          ...newUserData,
        });
      }

      // Return context with previous and new data
      return { previousUser, newUserData };
    },
    
    // On error, rollback to previous value
    onError: (error, _newUserData, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.auth.me(), context.previousUser);
      }
      console.error('[AUTH HOOK] Profile update failed:', error);
    },
    
    // Always refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
};

/**
 * Hook for changing password
 */
export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }): Promise<ApiResponseSingle<null>> => authApi.changePassword(data),
    
    onSuccess: () => {
      console.log('[AUTH HOOK] Password changed successfully');
    },
    
    onError: (error) => {
      console.error('[AUTH HOOK] Password change failed:', error);
    },
  });
};

/**
 * Hook for requesting password reset
 */
export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: (email: string): Promise<ApiResponseSingle<null>> =>
      authApi.requestPasswordReset(email),
    
    onSuccess: () => {
      console.log('[AUTH HOOK] Password reset requested');
    },
    
    onError: (error) => {
      console.error('[AUTH HOOK] Password reset request failed:', error);
    },
  });
};

/**
 * Hook for token verification
 */
export const useVerifyToken = () => {
  return useQuery({
    queryKey: queryKeys.auth.verify(),
    queryFn: (): Promise<ApiResponseSingle<{ valid: boolean; user?: User }>> =>
      authApi.verifyToken(),
    
    // Only run if we have a token
    enabled: !!localStorage.getItem('token'),
    
    // Check token validity every 5 minutes
    staleTime: 1000 * 60 * 5,
    
    // Don't cache verification results for long
    gcTime: 1000 * 60 * 2,
    
    // Don't retry token verification failures
    retry: false,
    
    // Don't refetch on window focus for security
    refetchOnWindowFocus: false,
  });
};

/**
 * Compound hook that provides complete auth state
 */
export const useAuthState = () => {
  const currentUserQuery = useCurrentUser();
  const verifyTokenQuery = useVerifyToken();
  
  const isAuthenticated = !!localStorage.getItem('token') && 
                          currentUserQuery.data?.success === true;
  
  const user = currentUserQuery.data?.data;
  const isLoading = currentUserQuery.isLoading || verifyTokenQuery.isLoading;
  const error = currentUserQuery.error || verifyTokenQuery.error;

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    // Auth state queries
    currentUserQuery,
    verifyTokenQuery,
  };
};