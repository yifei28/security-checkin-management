/**
 * Axios Interceptors for Authentication and Error Handling
 * 
 * This file contains request and response interceptors that handle:
 * - Automatic Bearer token injection for authenticated requests
 * - 401 error handling with automatic logout and redirect
 * - Consistent error transformation and logging
 */

import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { logout } from '../util/auth';
import { STORAGE_KEYS } from '../types';

/**
 * Request interceptor to automatically add Bearer token from localStorage
 * This interceptor runs before every API request is sent
 */
export const requestInterceptor = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  try {
    // Get the JWT token from localStorage
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    
    if (token) {
      // Add Authorization header with Bearer token if token exists
      if (!config.headers) {
        config.headers = {} as any;
      }
      config.headers.Authorization = `Bearer ${token}`;
      
      // Log successful token injection (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] Adding Bearer token to request: ${config.method?.toUpperCase()} ${config.url}`);
      }
    } else {
      // Log when no token is available (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] No token available for request: ${config.method?.toUpperCase()} ${config.url}`);
      }
    }
    
    // Add request timestamp for debugging
    config.metadata = {
      ...config.metadata,
      requestTime: Date.now(),
    };
    
    return config;
  } catch (error) {
    console.error('[API] Error in request interceptor:', error);
    return config;
  }
};

/**
 * Request error interceptor
 * Handles errors that occur before the request is sent
 */
export const requestErrorInterceptor = (error: unknown): Promise<any> => {
  console.error('[API] Request interceptor error:', error);
  return Promise.reject(error);
};

/**
 * Response interceptor for successful responses
 * Handles response transformation and logging
 */
export const responseInterceptor = (response: AxiosResponse): AxiosResponse => {
  try {
    // Add response timestamp for debugging
    const requestTime = response.config.metadata?.requestTime;
    const responseTime = Date.now();
    const duration = requestTime ? responseTime - requestTime : 0;
    
    // Log successful requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[API] ✓ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`
      );
    }
    
    // Add performance metadata to response
    response.metadata = {
      requestTime,
      responseTime,
      duration,
    };
    
    return response;
  } catch (error) {
    console.error('[API] Error in response interceptor:', error);
    return response;
  }
};

/**
 * Response error interceptor
 * Handles HTTP errors, especially 401 unauthorized responses
 */
export const responseErrorInterceptor = (error: AxiosError): Promise<any> => {
  try {
    const { response, config } = error;
    
    // Log the error in development
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[API] ✗ ${config?.method?.toUpperCase()} ${config?.url} - ${response?.status || 'Network Error'}`
      );
    }
    
    // Handle 401 Unauthorized errors
    if (response?.status === 401) {
      console.warn('[API] 401 Unauthorized - Token invalid or expired, logging out user');
      
      // Clear authentication data
      logout();
      
      // Clear super admin flag if it exists
      localStorage.removeItem(STORAGE_KEYS.SUPER_ADMIN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      
      // Redirect to login page
      // Check if we're already on the login page to avoid infinite redirects
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        console.log('[API] Redirecting to login page due to authentication failure');
        window.location.href = '/login';
      }
      
      // Create a more descriptive error message
      const authError = new Error('Authentication failed. Please log in again.');
      authError.name = 'AuthenticationError';
      return Promise.reject(authError);
    }
    
    // Handle 403 Forbidden errors
    if (response?.status === 403) {
      console.warn('[API] 403 Forbidden - Insufficient permissions');
      const permissionError = new Error('You do not have permission to access this resource.');
      permissionError.name = 'PermissionError';
      return Promise.reject(permissionError);
    }
    
    // Handle network errors
    if (!response) {
      console.error('[API] Network error - Unable to reach server');
      const networkError = new Error('Network error. Please check your internet connection.');
      networkError.name = 'NetworkError';
      return Promise.reject(networkError);
    }
    
    // Handle server errors (5xx)
    if (response.status >= 500) {
      console.error(`[API] Server error ${response.status}`);
      const serverError = new Error('Server error. Please try again later.');
      serverError.name = 'ServerError';
      return Promise.reject(serverError);
    }
    
    // Handle client errors (4xx)
    if (response.status >= 400 && response.status < 500) {
      console.warn(`[API] Client error ${response.status}`);
      let errorMessage = 'Request failed. Please check your input.';
      
      // Try to extract error message from response
      if (response.data && typeof response.data === 'object') {
        if ('message' in response.data) {
          errorMessage = response.data.message as string;
        } else if ('error' in response.data) {
          errorMessage = response.data.error as string;
        }
      }
      
      const clientError = new Error(errorMessage);
      clientError.name = 'ClientError';
      return Promise.reject(clientError);
    }
    
    // For any other errors, return the original error
    return Promise.reject(error);
    
  } catch (interceptorError) {
    console.error('[API] Error in response error interceptor:', interceptorError);
    // If there's an error in our error handling, return the original error
    return Promise.reject(error);
  }
};

/**
 * Error transformer utility
 * Converts axios errors to a consistent format for the application
 */
export const transformApiError = (error: unknown): {
  message: string;
  status?: number;
  type: string;
} => {
  // Handle our custom error types
  if (error.name === 'AuthenticationError') {
    return {
      message: error.message,
      status: 401,
      type: 'authentication',
    };
  }
  
  if (error.name === 'PermissionError') {
    return {
      message: error.message,
      status: 403,
      type: 'permission',
    };
  }
  
  if (error.name === 'NetworkError') {
    return {
      message: error.message,
      type: 'network',
    };
  }
  
  if (error.name === 'ServerError') {
    return {
      message: error.message,
      status: error.response?.status,
      type: 'server',
    };
  }
  
  if (error.name === 'ClientError') {
    return {
      message: error.message,
      status: error.response?.status,
      type: 'client',
    };
  }
  
  // Handle generic axios errors
  if (error.response) {
    return {
      message: error.response.data?.message || error.message || 'Request failed',
      status: error.response.status,
      type: 'http',
    };
  }
  
  // Handle generic errors
  return {
    message: error.message || 'An unexpected error occurred',
    type: 'unknown',
  };
};

/**
 * Utility to check if user should be logged out based on error
 */
export const shouldLogout = (error: unknown): boolean => {
  return error.name === 'AuthenticationError' || 
         (error.response?.status === 401);
};

// Extend the InternalAxiosRequestConfig type to include our custom metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      requestTime?: number;
      [key: string]: unknown;
    };
  }
  
  interface AxiosResponse {
    metadata?: {
      requestTime?: number;
      responseTime?: number;
      duration?: number;
      [key: string]: unknown;
    };
  }
}