/**
 * Axios HTTP Client Configuration
 * 
 * Base axios instance with default configuration for the security check-in
 * management system API. This client will be extended with interceptors
 * for authentication and error handling in subsequent tasks.
 */

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { BASE_URL } from '../util/config';
import type { ApiResponse, ApiResponseSingle } from '../types';
import {
  requestInterceptor,
  requestErrorInterceptor,
  responseInterceptor,
  responseErrorInterceptor,
} from './interceptors';

/**
 * API client configuration interface
 */
export interface ApiClientConfig {
  /** Base URL for all API requests */
  baseURL: string;
  
  /** Request timeout in milliseconds */
  timeout: number;
  
  /** Default headers for all requests */
  headers: Record<string, string>;
  
  /** Whether to automatically parse JSON responses */
  withCredentials: boolean;
}

/**
 * Default configuration for the API client
 */
export const defaultConfig: ApiClientConfig = {
  baseURL: BASE_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
};

/**
 * Create base axios instance with default configuration
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: defaultConfig.baseURL,
  timeout: defaultConfig.timeout,
  headers: defaultConfig.headers,
  withCredentials: defaultConfig.withCredentials,
});

// Set up interceptors on the base instance
apiClient.interceptors.request.use(requestInterceptor, requestErrorInterceptor);
apiClient.interceptors.response.use(responseInterceptor, responseErrorInterceptor);

/**
 * Type-safe API response wrapper for arrays
 * Ensures all API responses conform to our ApiResponse interface
 */
export interface ApiClientResponse<T> extends AxiosResponse {
  data: ApiResponse<T>;
}

/**
 * Type-safe API response wrapper for single objects
 * Ensures all API responses conform to our ApiResponseSingle interface
 */
export interface ApiClientResponseSingle<T> extends AxiosResponse {
  data: ApiResponseSingle<T>;
}

/**
 * Enhanced request configuration with our custom types
 */
export interface ApiRequestConfig extends AxiosRequestConfig {
  /** Skip automatic error handling for this request */
  skipErrorHandling?: boolean;
  
  /** Custom timeout for this specific request */
  requestTimeout?: number;
  
  /** Whether to show loading indicators */
  showLoading?: boolean;
}

/**
 * API client class wrapper for additional functionality
 */
export class ApiClient {
  private instance: AxiosInstance;
  private requestInterceptorId?: number;
  private responseInterceptorId?: number;

  constructor(config: Partial<ApiClientConfig> = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    
    this.instance = axios.create({
      baseURL: finalConfig.baseURL,
      timeout: finalConfig.timeout,
      headers: finalConfig.headers,
      withCredentials: finalConfig.withCredentials,
    });

    // Automatically set up authentication and error handling interceptors
    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   * Private method called during initialization
   */
  private setupInterceptors(): void {
    // Add request interceptor for authentication
    this.requestInterceptorId = this.instance.interceptors.request.use(
      requestInterceptor,
      requestErrorInterceptor
    );

    // Add response interceptor for error handling
    this.responseInterceptorId = this.instance.interceptors.response.use(
      responseInterceptor,
      responseErrorInterceptor
    );
  }

  /**
   * Get the underlying axios instance
   */
  get axios(): AxiosInstance {
    return this.instance;
  }

  /**
   * Make a GET request
   */
  async get<T>(url: string, config?: ApiRequestConfig): Promise<ApiClientResponse<T>> {
    return this.instance.get(url, config);
  }

  /**
   * Make a POST request
   */
  async post<T>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiClientResponse<T>> {
    return this.instance.post(url, data, config);
  }

  /**
   * Make a PUT request
   */
  async put<T>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiClientResponse<T>> {
    return this.instance.put(url, data, config);
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiClientResponse<T>> {
    return this.instance.patch(url, data, config);
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string, config?: ApiRequestConfig): Promise<ApiClientResponse<T>> {
    return this.instance.delete(url, config);
  }

  /**
   * Make a GET request expecting a single object response
   */
  async getSingle<T>(url: string, config?: ApiRequestConfig): Promise<ApiClientResponseSingle<T>> {
    return this.instance.get(url, config);
  }

  /**
   * Make a POST request expecting a single object response
   */
  async postSingle<T>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiClientResponseSingle<T>> {
    return this.instance.post(url, data, config);
  }

  /**
   * Make a PUT request expecting a single object response
   */
  async putSingle<T>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiClientResponseSingle<T>> {
    return this.instance.put(url, data, config);
  }

  /**
   * Make a PATCH request expecting a single object response
   */
  async patchSingle<T>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiClientResponseSingle<T>> {
    return this.instance.patch(url, data, config);
  }

  /**
   * Make a DELETE request expecting a single object response
   */
  async deleteSingle<T>(url: string, config?: ApiRequestConfig): Promise<ApiClientResponseSingle<T>> {
    return this.instance.delete(url, config);
  }

  /**
   * Update the base URL for all requests
   */
  updateBaseURL(baseURL: string): void {
    this.instance.defaults.baseURL = baseURL;
  }

  /**
   * Set default timeout for all requests
   */
  setTimeout(timeout: number): void {
    this.instance.defaults.timeout = timeout;
  }

  /**
   * Add a request interceptor
   */
  addRequestInterceptor(
    fulfilled: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>,
    rejected?: (error: any) => any
  ): number {
    return this.instance.interceptors.request.use(fulfilled, rejected);
  }

  /**
   * Add a response interceptor
   */
  addResponseInterceptor(
    fulfilled: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>,
    rejected?: (error: any) => any
  ): number {
    return this.instance.interceptors.response.use(fulfilled, rejected);
  }

  /**
   * Remove a request interceptor
   */
  removeRequestInterceptor(interceptorId: number): void {
    this.instance.interceptors.request.eject(interceptorId);
  }

  /**
   * Remove a response interceptor
   */
  removeResponseInterceptor(interceptorId: number): void {
    this.instance.interceptors.response.eject(interceptorId);
  }

  /**
   * Reset interceptors to default authentication and error handling
   */
  resetInterceptors(): void {
    // Remove existing interceptors if they exist
    if (this.requestInterceptorId !== undefined) {
      this.instance.interceptors.request.eject(this.requestInterceptorId);
    }
    if (this.responseInterceptorId !== undefined) {
      this.instance.interceptors.response.eject(this.responseInterceptorId);
    }

    // Re-setup default interceptors
    this.setupInterceptors();
  }

  /**
   * Remove all interceptors (including authentication)
   * Use with caution - this disables automatic auth and error handling
   */
  clearAllInterceptors(): void {
    this.instance.interceptors.request.clear();
    this.instance.interceptors.response.clear();
    this.requestInterceptorId = undefined;
    this.responseInterceptorId = undefined;
  }

  /**
   * Clean up resources and interceptors
   * Call this when the client is no longer needed
   */
  destroy(): void {
    this.clearAllInterceptors();
  }
}

/**
 * Default API client instance
 * This will be used throughout the application
 */
export const api = new ApiClient();

/**
 * Export the raw axios instance for direct use when needed
 */
export { apiClient as axiosInstance };

/**
 * Type guard to check if a response is a valid API response
 */
export function isValidApiResponse<T>(response: any): response is ApiResponse<T> {
  return (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    'success' in response &&
    'message' in response &&
    typeof response.success === 'boolean' &&
    typeof response.message === 'string'
  );
}

// Export interceptor utilities for advanced usage
export {
  transformApiError,
  shouldLogout,
} from './interceptors';

// Export types for use in other modules
export type { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios';