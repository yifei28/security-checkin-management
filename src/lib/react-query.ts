import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime)
      retry: (failureCount, error: unknown) => {
        // Don't retry on 401/403 - let auth context handle it
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

// Error handler for React Query
export const queryErrorHandler = (error: unknown): void => {
  console.error('[REACT QUERY ERROR]', error);
  
  // Handle auth errors globally
  if (error?.status === 401) {
    console.log('[REACT QUERY] Authentication error, auth context should handle logout');
  }
  
  // Handle network errors
  if (error?.name === 'NetworkError' || error?.message?.includes('fetch')) {
    console.log('[REACT QUERY] Network error detected');
  }
};

// Query keys for consistent caching
export const queryKeys = {
  // Dashboard metrics
  dashboardMetrics: ['dashboard', 'metrics'] as const,
  
  // Guards
  guards: ['guards'] as const,
  guard: (id: string) => ['guards', id] as const,
  
  // Sites
  sites: ['sites'] as const,
  site: (id: string) => ['sites', id] as const,
  
  // Check-ins
  checkins: ['checkins'] as const,
  checkin: (id: string) => ['checkins', id] as const,
  checkinsByGuard: (guardId: string) => ['checkins', 'guard', guardId] as const,
  checkinsBySite: (siteId: string) => ['checkins', 'site', siteId] as const,
  
  // Reports
  reports: ['reports'] as const,
  reportsByDateRange: (startDate: string, endDate: string) => 
    ['reports', 'dateRange', startDate, endDate] as const,
};

// Common API fetch function
export const apiFetch = async (url: string, options?: RequestInit) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = new Error(`API Error: ${response.status}`);
    (error as any).status = response.status;
    (error as any).response = response;
    
    // Try to get error message from response
    try {
      const errorData = await response.json();
      (error as any).message = errorData.message || error.message;
    } catch {
      // If JSON parsing fails, use status text
      (error as any).message = response.statusText || error.message;
    }
    
    throw error;
  }

  return response.json();
};