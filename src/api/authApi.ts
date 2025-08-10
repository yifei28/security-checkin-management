/**
 * Authentication API Service
 * 
 * Provides typed methods for all authentication-related API endpoints
 * including login, logout, token refresh, and user management.
 */

import { api } from './client';
import { setAuthData } from '../util/auth';
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  User,
} from '../types';

/**
 * Authentication API service object
 * Contains all methods for user authentication and session management
 */
export const authApi = {
  /**
   * User login with username and password
   * Stores authentication data on successful login
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await api.post<LoginResponse>('/api/login', credentials);
      
      // Store authentication data in localStorage on successful login
      if (response.data.success && response.data.data) {
        const { token, user } = response.data.data;
        const isSuperAdmin = user.role === 'superAdmin';
        
        setAuthData(token, user, isSuperAdmin);
        
        console.log('[AUTH] Login successful, user data stored');
      }
      
      return response.data;
    } catch (error) {
      console.error('[AUTH] Login failed:', error);
      throw error;
    }
  },

  /**
   * User logout
   * Clears local authentication data and optionally notifies server
   */
  async logout(): Promise<ApiResponse<null>> {
    try {
      // Attempt to notify server of logout (optional, may fail if token expired)
      const response = await api.post<null>('/api/logout');
      
      console.log('[AUTH] Logout successful');
      return response.data;
    } catch (error) {
      // Even if server logout fails, we should clear local data
      console.warn('[AUTH] Server logout failed, but continuing with local cleanup:', error);
      
      // Return a mock successful response for local cleanup
      return {
        data: null,
        success: true,
        message: '登出成功',
      };
    }
  },

  /**
   * Refresh JWT token
   * Extends user session by getting a new token
   */
  async refreshToken(refreshToken: RefreshTokenRequest): Promise<ApiResponse<RefreshTokenResponse>> {
    try {
      const response = await api.post<RefreshTokenResponse>('/api/auth/refresh', refreshToken);
      
      // Update stored token if refresh successful
      if (response.data.success && response.data.data) {
        const { token } = response.data.data;
        
        // Update only the token, keep existing user data
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const isSuperAdmin = localStorage.getItem('superAdmin') === 'true';
        
        setAuthData(token, currentUser, isSuperAdmin);
        
        console.log('[AUTH] Token refreshed successfully');
      }
      
      return response.data;
    } catch (error) {
      console.error('[AUTH] Token refresh failed:', error);
      throw error;
    }
  },

  /**
   * Get current user profile/information
   * Fetches fresh user data from server
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await api.get<User>('/api/auth/me');
      
      // Update stored user data with fresh info from server
      if (response.data.success && response.data.data) {
        const user = response.data.data;
        const currentToken = localStorage.getItem('token');
        const isSuperAdmin = user.role === 'superAdmin';
        
        if (currentToken) {
          setAuthData(currentToken, user, isSuperAdmin);
        }
        
        console.log('[AUTH] User profile updated');
      }
      
      return response.data;
    } catch (error) {
      console.error('[AUTH] Failed to get current user:', error);
      throw error;
    }
  },

  /**
   * Update user profile information
   * Allows users to modify their profile data
   */
  async updateProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await api.put<User>('/api/auth/profile', updates);
      
      // Update stored user data with new profile info
      if (response.data.success && response.data.data) {
        const user = response.data.data;
        const currentToken = localStorage.getItem('token');
        const isSuperAdmin = user.role === 'superAdmin';
        
        if (currentToken) {
          setAuthData(currentToken, user, isSuperAdmin);
        }
        
        console.log('[AUTH] Profile updated successfully');
      }
      
      return response.data;
    } catch (error) {
      console.error('[AUTH] Profile update failed:', error);
      throw error;
    }
  },

  /**
   * Change user password
   * Requires current password for verification
   */
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ApiResponse<null>> {
    try {
      const response = await api.post<null>('/api/auth/change-password', data);
      
      console.log('[AUTH] Password changed successfully');
      return response.data;
    } catch (error) {
      console.error('[AUTH] Password change failed:', error);
      throw error;
    }
  },

  /**
   * Request password reset
   * Sends password reset email/instructions
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<null>> {
    try {
      const response = await api.post<null>('/api/auth/forgot-password', { email });
      
      console.log('[AUTH] Password reset requested');
      return response.data;
    } catch (error) {
      console.error('[AUTH] Password reset request failed:', error);
      throw error;
    }
  },

  /**
   * Verify user session/token validity
   * Checks if current token is still valid without refreshing
   */
  async verifyToken(): Promise<ApiResponse<{ valid: boolean; user?: User }>> {
    try {
      const response = await api.get<{ valid: boolean; user?: User }>('/api/auth/verify');
      
      // If token is valid but user data changed, update local storage
      if (response.data.success && response.data.data?.valid && response.data.data.user) {
        const user = response.data.data.user;
        const currentToken = localStorage.getItem('token');
        const isSuperAdmin = user.role === 'superAdmin';
        
        if (currentToken) {
          setAuthData(currentToken, user, isSuperAdmin);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('[AUTH] Token verification failed:', error);
      throw error;
    }
  },
};

/**
 * Export individual methods for advanced usage
 */
export const {
  login,
  logout,
  refreshToken,
  getCurrentUser,
  updateProfile,
  changePassword,
  requestPasswordReset,
  verifyToken,
} = authApi;

/**
 * Export default as authApi for convenience
 */
export default authApi;