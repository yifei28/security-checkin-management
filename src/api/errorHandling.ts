/**
 * React Query Error Handling Integration
 * 
 * Utilities for handling API errors in conjunction with React Query
 * and the APIErrorBoundary component.
 */

import { QueryCache, MutationCache } from '@tanstack/react-query';
import { queryClient } from './queryClient';

/**
 * Error types for classification
 */
export type APIErrorType = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR' 
  | 'SERVER_ERROR'
  | 'CLIENT_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Enhanced error interface with additional context
 */
export interface EnhancedAPIError extends Error {
  type: APIErrorType;
  status?: number;
  code?: string;
  timestamp: string;
  context?: Record<string, unknown>;
  retry?: () => Promise<void>;
}

/**
 * Classify API errors based on response and message
 */
export function classifyError(error: unknown): APIErrorType {
  // Network connectivity errors
  if (error.code === 'NETWORK_ERROR' || 
      error.message.includes('Network Error') ||
      error.message.includes('fetch') ||
      !navigator.onLine) {
    return 'NETWORK_ERROR';
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED' || 
      error.message.includes('timeout') ||
      error.message.includes('TIMEOUT')) {
    return 'TIMEOUT_ERROR';
  }

  // HTTP status-based classification
  if (error.response?.status) {
    const status = error.response.status;
    
    if (status === 401 || status === 403) {
      return 'AUTH_ERROR';
    }
    
    if (status >= 400 && status < 500) {
      return 'CLIENT_ERROR';
    }
    
    if (status >= 500) {
      return 'SERVER_ERROR';
    }
  }

  // Authentication-related errors
  if (error.message.includes('401') || 
      error.message.includes('Unauthorized') ||
      error.message.includes('Authentication') ||
      error.message.includes('Invalid token')) {
    return 'AUTH_ERROR';
  }

  // Server errors
  if (error.message.includes('500') || 
      error.message.includes('502') ||
      error.message.includes('503') ||
      error.message.includes('504')) {
    return 'SERVER_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Transform API errors into enhanced error objects
 */
export function transformAPIError(
  error: unknown, 
  context?: Record<string, unknown>
): EnhancedAPIError {
  const type = classifyError(error);
  const timestamp = new Date().toISOString();

  const enhancedError: EnhancedAPIError = {
    name: error.name || 'APIError',
    message: error.message || 'An API error occurred',
    type,
    timestamp,
    context,
    stack: error.stack,
  };

  // Add status code if available
  if (error.response?.status) {
    enhancedError.status = error.response.status;
  }

  // Add error code if available
  if (error.code) {
    enhancedError.code = error.code;
  }

  return enhancedError;
}

/**
 * Determine if an error should trigger a boundary
 */
export function shouldTriggerBoundary(error: EnhancedAPIError): boolean {
  // Always trigger boundary for these error types
  const boundaryTriggers: APIErrorType[] = [
    'NETWORK_ERROR',
    'SERVER_ERROR',
    'TIMEOUT_ERROR'
  ];

  return boundaryTriggers.includes(error.type);
}

/**
 * Log error for debugging and monitoring
 */
export function logError(error: EnhancedAPIError, context?: Record<string, unknown>) {
  // Use the centralized logger
  import('../util/logger').then(({ logger }) => {
    logger.error(`API Error: ${error.type}`, error, {
      ...error.context,
      ...context,
      errorType: error.type,
      status: error.status,
      code: error.code,
      component: 'API',
    });
  }).catch(() => {
    // Fallback to console if logger fails to load
    console.error(`[API ERROR] ${error.type}:`, error.message, { context, error });
  });
}

/**
 * Global query error handler
 */
export const globalQueryErrorHandler = (error: unknown) => {
  const enhancedError = transformAPIError(error, {
    source: 'React Query',
    type: 'Query Error'
  });

  logError(enhancedError);

  // Handle authentication errors globally
  if (enhancedError.type === 'AUTH_ERROR') {
    // Clear authentication state
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('superAdmin');
    
    // Redirect to login if not already there
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  // Trigger error boundary for severe errors
  if (shouldTriggerBoundary(enhancedError)) {
    throw enhancedError;
  }
};

/**
 * Global mutation error handler
 */
export const globalMutationErrorHandler = (error: unknown) => {
  const enhancedError = transformAPIError(error, {
    source: 'React Query',
    type: 'Mutation Error'
  });

  logError(enhancedError);

  // Handle authentication errors
  if (enhancedError.type === 'AUTH_ERROR') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('superAdmin');
    
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
};

/**
 * Create enhanced query client with error handling
 */
export function createQueryClientWithErrorHandling() {
  return new QueryCache({
    onError: globalQueryErrorHandler,
  });
}

/**
 * Create enhanced mutation cache with error handling
 */
export function createMutationCacheWithErrorHandling() {
  return new MutationCache({
    onError: globalMutationErrorHandler,
  });
}

/**
 * Utility to manually handle errors in components
 */
export function handleComponentError(error: unknown, componentName: string) {
  const enhancedError = transformAPIError(error, {
    source: 'Component',
    componentName
  });

  logError(enhancedError);

  // Return error info for component use
  return {
    error: enhancedError,
    shouldShowBoundary: shouldTriggerBoundary(enhancedError),
    canRetry: enhancedError.type === 'NETWORK_ERROR' || enhancedError.type === 'TIMEOUT_ERROR'
  };
}

/**
 * Retry helper for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const enhancedError = transformAPIError(error);
      
      // Don't retry client errors
      if (enhancedError.type === 'CLIENT_ERROR' || enhancedError.type === 'AUTH_ERROR') {
        throw enhancedError;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      
      console.log(`[RETRY] Attempt ${attempt}/${maxAttempts} failed, retrying...`);
    }
  }

  throw transformAPIError(lastError);
}

/**
 * Error boundary integration helper
 */
export function getErrorBoundaryResetFunction(queryKeys?: string[][]) {
  return async () => {
    if (queryKeys && queryKeys.length > 0) {
      // Invalidate specific queries
      await Promise.all(
        queryKeys.map(key => queryClient.invalidateQueries({ queryKey: key }))
      );
    } else {
      // Invalidate all queries
      await queryClient.invalidateQueries();
    }
    
    console.log('[ERROR BOUNDARY] Queries reset for retry');
  };
}