/**
 * Guards API Service
 * 
 * Provides typed methods for all guard-related API endpoints
 * including CRUD operations, site assignments, and guard management.
 */

import { api } from './client';
import type {
  ApiResponse,
  ApiResponseSingle,
  PaginatedResponse,
  Guard,
  GuardFormData,
  EnhancedGuardSummary as GuardSummary,
  GuardAssignmentRequest,
  GuardBulkUpdateRequest,
} from '../types';

/**
 * Guards API service object
 * Contains all methods for guard management operations
 */
export const guardsApi = {
  /**
   * Get all guards with optional filtering and pagination
   */
  async getGuards(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    siteId?: string;
    sortBy?: 'name' | 'phoneNumber' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Guard>> {
    try {
      const response = await api.get<Guard[]>('/api/guards', {
        params: {
          page: params?.page ?? 1,
          pageSize: params?.pageSize ?? 20,
          search: params?.search,
          siteId: params?.siteId,
          sortBy: params?.sortBy ?? 'name',
          sortOrder: params?.sortOrder ?? 'asc',
        }
      });
      
      console.log('[GUARDS API] Retrieved guards list');
      
      // The server should return a PaginatedResponse, but we need to handle the ApiResponse wrapper
      const apiResponse = response.data as unknown as PaginatedResponse<Guard>;
      return apiResponse;
    } catch (error) {
      console.error('[GUARDS API] Failed to get guards:', error);
      throw error;
    }
  },

  /**
   * Get a specific guard by ID
   */
  async getGuard(guardId: string): Promise<ApiResponse<Guard>> {
    try {
      const response = await api.get<Guard>(`/api/guards/${guardId}`);
      
      console.log(`[GUARDS API] Retrieved guard: ${guardId}`);
      return response.data;
    } catch (error) {
      console.error(`[GUARDS API] Failed to get guard ${guardId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new guard
   */
  async createGuard(guardData: GuardFormData): Promise<ApiResponseSingle<Guard>> {
    try {
      const response = await api.postSingle<Guard>('/api/guards', guardData);
      
      if (response.data.success && response.data.data) {
        console.log(`[GUARDS API] Created guard: ${response.data.data.name}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('[GUARDS API] Failed to create guard:', error);
      throw error;
    }
  },

  /**
   * Update an existing guard
   */
  async updateGuard(guardId: string, guardData: Partial<GuardFormData>): Promise<ApiResponseSingle<Guard>> {
    try {
      const response = await api.putSingle<Guard>(`/api/guards/${guardId}`, guardData);
      
      if (response.data.success && response.data.data) {
        console.log(`[GUARDS API] Updated guard: ${response.data.data.name}`);
      }
      
      return response.data;
    } catch (error) {
      console.error(`[GUARDS API] Failed to update guard ${guardId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a guard
   */
  async deleteGuard(guardId: string): Promise<ApiResponse<null>> {
    try {
      const response = await api.delete<null>(`/api/guards/${guardId}`);
      
      console.log(`[GUARDS API] Deleted guard: ${guardId}`);
      return response.data;
    } catch (error) {
      console.error(`[GUARDS API] Failed to delete guard ${guardId}:`, error);
      throw error;
    }
  },

  /**
   * Upload guard photo
   */
  async uploadGuardPhoto(guardId: string, photoFile: File): Promise<ApiResponseSingle<{ photoUrl: string }>> {
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      
      const response = await api.postSingle<{ photoUrl: string }>(
        `/api/guards/${guardId}/photo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      if (response.data.success && response.data.data) {
        console.log(`[GUARDS API] Uploaded photo for guard: ${guardId}`);
      }
      
      return response.data;
    } catch (error) {
      console.error(`[GUARDS API] Failed to upload photo for guard ${guardId}:`, error);
      throw error;
    }
  },

  /**
   * Delete guard photo
   */
  async deleteGuardPhoto(guardId: string): Promise<ApiResponse<null>> {
    try {
      const response = await api.delete<null>(`/api/guards/${guardId}/photo`);
      
      console.log(`[GUARDS API] Deleted photo for guard: ${guardId}`);
      return response.data;
    } catch (error) {
      console.error(`[GUARDS API] Failed to delete photo for guard ${guardId}:`, error);
      throw error;
    }
  },

  /**
   * Get guards assigned to a specific site
   */
  async getGuardsBySite(siteId: string): Promise<ApiResponse<Guard[]>> {
    try {
      // 处理 site ID 前缀
      const siteIdForApi = siteId.startsWith('site_') ? siteId.replace('site_', '') : siteId;
      const response = await api.get<Guard[]>(`/api/sites/${siteIdForApi}/guards`);
      
      console.log(`[GUARDS API] Retrieved guards for site: ${siteId}`);
      return response.data;
    } catch (error) {
      console.error(`[GUARDS API] Failed to get guards for site ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Assign a guard to a site
   */
  async assignGuardToSite(guardId: string, siteId: string | null): Promise<ApiResponse<Guard>> {
    try {
      const assignmentData: GuardAssignmentRequest = {
        guardId,
        siteId,
      };
      
      const response = await api.post<Guard>('/api/guards/assign', assignmentData);
      
      if (response.data.success) {
        console.log(`[GUARDS API] Assigned guard ${guardId} to site ${siteId}`);
      }
      
      return response.data;
    } catch (error) {
      console.error(`[GUARDS API] Failed to assign guard ${guardId} to site:`, error);
      throw error;
    }
  },

  /**
   * Remove guard from site
   */
  async unassignGuardFromSite(guardId: string): Promise<ApiResponse<Guard>> {
    try {
      const response = await api.post<Guard>('/api/guards/unassign', {
        guardId,
      });
      
      if (response.data.success) {
        console.log(`[GUARDS API] Unassigned guard ${guardId} from site`);
      }
      
      return response.data;
    } catch (error) {
      console.error(`[GUARDS API] Failed to unassign guard ${guardId} from site:`, error);
      throw error;
    }
  },

  /**
   * Get guard summary statistics
   */
  async getGuardSummary(guardId: string): Promise<ApiResponse<GuardSummary>> {
    try {
      const response = await api.get<GuardSummary>(`/api/guards/${guardId}/summary`);
      
      console.log(`[GUARDS API] Retrieved summary for guard: ${guardId}`);
      return response.data;
    } catch (error) {
      console.error(`[GUARDS API] Failed to get guard summary ${guardId}:`, error);
      throw error;
    }
  },

  /**
   * Get guards summary for dashboard
   */
  async getAllGuardsSummary(): Promise<ApiResponse<GuardSummary[]>> {
    try {
      const response = await api.get<GuardSummary[]>('/api/guards/summary');
      
      console.log('[GUARDS API] Retrieved guards summary');
      return response.data;
    } catch (error) {
      console.error('[GUARDS API] Failed to get guards summary:', error);
      throw error;
    }
  },

  /**
   * Bulk update multiple guards
   */
  async bulkUpdateGuards(updates: GuardBulkUpdateRequest[]): Promise<ApiResponse<Guard[]>> {
    try {
      const response = await api.post<Guard[]>('/api/guards/bulk-update', { updates });
      
      if (response.data.success) {
        console.log(`[GUARDS API] Bulk updated ${updates.length} guards`);
      }
      
      return response.data;
    } catch (error) {
      console.error('[GUARDS API] Failed to bulk update guards:', error);
      throw error;
    }
  },

  /**
   * Bulk delete multiple guards
   */
  async bulkDeleteGuards(guardIds: string[]): Promise<ApiResponse<{ deletedCount: number }>> {
    try {
      const response = await api.post<{ deletedCount: number }>('/api/guards/bulk-delete', { 
        guardIds 
      });
      
      if (response.data.success) {
        console.log(`[GUARDS API] Bulk deleted ${guardIds.length} guards`);
      }
      
      return response.data;
    } catch (error) {
      console.error('[GUARDS API] Failed to bulk delete guards:', error);
      throw error;
    }
  },

  /**
   * Search guards with advanced filtering
   */
  async searchGuards(query: string, filters?: {
    siteIds?: string[];
    hasPhoto?: boolean;
    ageRange?: { min?: number; max?: number };
    heightRange?: { min?: number; max?: number };
  }): Promise<ApiResponse<Guard[]>> {
    try {
      const response = await api.post<Guard[]>('/api/guards/search', {
        query,
        filters,
      });
      
      console.log(`[GUARDS API] Searched guards with query: "${query}"`);
      return response.data;
    } catch (error) {
      console.error('[GUARDS API] Failed to search guards:', error);
      throw error;
    }
  },

  /**
   * Get guards availability for scheduling
   */
  async getGuardsAvailability(dateRange: {
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<Array<{ guardId: string; availableDates: string[] }>>> {
    try {
      const response = await api.post<Array<{ guardId: string; availableDates: string[] }>>(
        '/api/guards/availability',
        dateRange
      );
      
      console.log('[GUARDS API] Retrieved guards availability');
      return response.data;
    } catch (error) {
      console.error('[GUARDS API] Failed to get guards availability:', error);
      throw error;
    }
  },

  /**
   * Export guards data to CSV
   */
  async exportGuards(filters?: {
    siteIds?: string[];
    dateRange?: { startDate: string; endDate: string };
  }): Promise<ApiResponseSingle<{ downloadUrl: string; fileName: string }>> {
    try {
      const response = await api.postSingle<{ downloadUrl: string; fileName: string }>(
        '/api/guards/export',
        { filters }
      );
      
      if (response.data.success) {
        console.log('[GUARDS API] Generated guards export');
      }
      
      return response.data;
    } catch (error) {
      console.error('[GUARDS API] Failed to export guards:', error);
      throw error;
    }
  },
};

/**
 * Export individual methods for advanced usage
 */
export const {
  getGuards,
  getGuard,
  createGuard,
  updateGuard,
  deleteGuard,
  uploadGuardPhoto,
  deleteGuardPhoto,
  getGuardsBySite,
  assignGuardToSite,
  unassignGuardFromSite,
  getGuardSummary,
  getAllGuardsSummary,
  bulkUpdateGuards,
  bulkDeleteGuards,
  searchGuards,
  getGuardsAvailability,
  exportGuards,
} = guardsApi;

/**
 * Export default as guardsApi for convenience
 */
export default guardsApi;