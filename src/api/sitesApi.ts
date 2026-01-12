/**
 * Sites API Service
 * 
 * Provides typed methods for all site-related API endpoints
 * including CRUD operations, guard assignments, and geolocation management.
 */

import { api } from './client';
import type {
  ApiResponse,
  ApiResponseSingle,
  PaginatedResponse,
  Site,
  SiteFormData,
  EnhancedSiteSummary as SiteSummary,
  SiteAssignmentRequest,
  SiteBulkUpdateRequest,
  Location,
  CheckinLocation,
  CheckinLocationFormData,
} from '../types';

/**
 * Helper function to strip ID prefix
 * Handles both string and number IDs
 */
const stripIdPrefix = (id: string | number, prefix: string): string => {
  const idStr = String(id);
  if (idStr && idStr.startsWith(prefix)) {
    return idStr.replace(prefix, '');
  }
  return idStr;
};

/**
 * Sites API service object
 * Contains all methods for site management operations
 */
export const sitesApi = {
  /**
   * Get all sites with optional filtering and pagination
   */
  async getSites(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    guardId?: string;
    withinRadius?: { 
      center: Location; 
      radiusKm: number; 
    };
    sortBy?: 'name' | 'latitude' | 'longitude' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Site>> {
    try {
      const response = await api.get<Site[]>('/api/sites', {
        params: {
          page: params?.page ?? 1,
          pageSize: params?.pageSize ?? 20,
          search: params?.search,
          guardId: params?.guardId,
          withinRadius: params?.withinRadius ? JSON.stringify(params.withinRadius) : undefined,
          sortBy: params?.sortBy ?? 'name',
          sortOrder: params?.sortOrder ?? 'asc',
        }
      });
      
      console.log('[SITES API] Retrieved sites list');
      
      // The server should return a PaginatedResponse, but we need to handle the ApiResponse wrapper
      const apiResponse = response.data as unknown as PaginatedResponse<Site>;
      return apiResponse;
    } catch (error) {
      console.error('[SITES API] Failed to get sites:', error);
      throw error;
    }
  },

  /**
   * Get a specific site by ID
   */
  async getSite(siteId: string): Promise<ApiResponseSingle<Site>> {
    try {
      const siteIdForApi = stripIdPrefix(siteId, 'site_');
      const response = await api.getSingle<Site>(`/api/sites/${siteIdForApi}`);

      console.log(`[SITES API] Retrieved site: ${siteId}`);
      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to get site ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new site
   */
  async createSite(siteData: SiteFormData): Promise<ApiResponseSingle<Site>> {
    try {
      const response = await api.postSingle<Site>('/api/sites', siteData);

      if (response.data.success && response.data.data) {
        console.log(`[SITES API] Created site: ${response.data.data.name}`);
      }

      return response.data;
    } catch (error) {
      console.error('[SITES API] Failed to create site:', error);
      throw error;
    }
  },

  /**
   * Update an existing site
   */
  async updateSite(siteId: string, siteData: Partial<SiteFormData>): Promise<ApiResponseSingle<Site>> {
    try {
      const siteIdForApi = stripIdPrefix(siteId, 'site_');
      const response = await api.putSingle<Site>(`/api/sites/${siteIdForApi}`, siteData);

      if (response.data.success && response.data.data) {
        console.log(`[SITES API] Updated site: ${response.data.data.name}`);
      }

      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to update site ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a site
   */
  async deleteSite(siteId: string): Promise<ApiResponseSingle<null>> {
    try {
      const siteIdForApi = stripIdPrefix(siteId, 'site_');
      const response = await api.deleteSingle<null>(`/api/sites/${siteIdForApi}`);

      console.log(`[SITES API] Deleted site: ${siteId}`);
      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to delete site ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Get sites assigned to a specific guard
   */
  async getSitesByGuard(guardId: string): Promise<ApiResponse<Site[]>> {
    try {
      const response = await api.get<Site[]>(`/api/guards/${guardId}/sites`);
      
      console.log(`[SITES API] Retrieved sites for guard: ${guardId}`);
      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to get sites for guard ${guardId}:`, error);
      throw error;
    }
  },

  /**
   * Assign guards to a site
   */
  async assignGuardsToSite(siteId: string, guardIds: string[]): Promise<ApiResponseSingle<Site>> {
    try {
      const assignmentData: SiteAssignmentRequest = {
        siteId,
        guardIds,
      };

      const response = await api.postSingle<Site>('/api/sites/assign', assignmentData);

      if (response.data.success) {
        console.log(`[SITES API] Assigned ${guardIds.length} guards to site: ${siteId}`);
      }

      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to assign guards to site ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Remove guards from a site
   */
  async unassignGuardsFromSite(siteId: string, guardIds: string[]): Promise<ApiResponseSingle<Site>> {
    try {
      const response = await api.postSingle<Site>('/api/sites/unassign', {
        siteId,
        guardIds,
      });

      if (response.data.success) {
        console.log(`[SITES API] Unassigned ${guardIds.length} guards from site: ${siteId}`);
      }

      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to unassign guards from site ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Get site summary statistics
   */
  async getSiteSummary(siteId: string): Promise<ApiResponseSingle<SiteSummary>> {
    try {
      const siteIdForApi = stripIdPrefix(siteId, 'site_');
      const response = await api.getSingle<SiteSummary>(`/api/sites/${siteIdForApi}/summary`);

      console.log(`[SITES API] Retrieved summary for site: ${siteId}`);
      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to get site summary ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Get sites summary for dashboard
   */
  async getAllSitesSummary(): Promise<ApiResponse<SiteSummary[]>> {
    try {
      const response = await api.get<SiteSummary[]>('/api/sites/summary');
      
      console.log('[SITES API] Retrieved sites summary');
      return response.data;
    } catch (error) {
      console.error('[SITES API] Failed to get sites summary:', error);
      throw error;
    }
  },

  /**
   * Get sites within a geographic area (for map display)
   */
  async getSitesInArea(bounds: {
    northEast: Location;
    southWest: Location;
  }): Promise<ApiResponse<Site[]>> {
    try {
      const response = await api.post<Site[]>('/api/sites/in-area', bounds);
      
      console.log('[SITES API] Retrieved sites in geographic area');
      return response.data;
    } catch (error) {
      console.error('[SITES API] Failed to get sites in area:', error);
      throw error;
    }
  },

  /**
   * Get nearest sites to a location
   */
  async getNearestSites(location: Location, limit?: number): Promise<ApiResponse<Array<Site & { distance: number }>>> {
    try {
      const response = await api.post<Array<Site & { distance: number }>>(
        '/api/sites/nearest',
        {
          location,
          limit: limit ?? 10,
        }
      );
      
      console.log('[SITES API] Retrieved nearest sites');
      return response.data;
    } catch (error) {
      console.error('[SITES API] Failed to get nearest sites:', error);
      throw error;
    }
  },

  /**
   * Validate site coordinates and address
   */
  async validateSiteLocation(location: Location, address?: string): Promise<ApiResponse<{
    isValid: boolean;
    validatedLocation?: Location;
    validatedAddress?: string;
    suggestions?: string[];
  }>> {
    try {
      const response = await api.post<{
        isValid: boolean;
        validatedLocation?: Location;
        validatedAddress?: string;
        suggestions?: string[];
      }>('/api/sites/validate-location', {
        location,
        address,
      });
      
      console.log('[SITES API] Validated site location');
      return response.data;
    } catch (error) {
      console.error('[SITES API] Failed to validate site location:', error);
      throw error;
    }
  },

  /**
   * Bulk update multiple sites
   */
  async bulkUpdateSites(updates: SiteBulkUpdateRequest[]): Promise<ApiResponse<Site[]>> {
    try {
      const response = await api.post<Site[]>('/api/sites/bulk-update', { updates });
      
      if (response.data.success) {
        console.log(`[SITES API] Bulk updated ${updates.length} sites`);
      }
      
      return response.data;
    } catch (error) {
      console.error('[SITES API] Failed to bulk update sites:', error);
      throw error;
    }
  },

  /**
   * Bulk delete multiple sites
   */
  async bulkDeleteSites(siteIds: string[]): Promise<ApiResponse<{ deletedCount: number }>> {
    try {
      const response = await api.post<{ deletedCount: number }>('/api/sites/bulk-delete', { 
        siteIds 
      });
      
      if (response.data.success) {
        console.log(`[SITES API] Bulk deleted ${siteIds.length} sites`);
      }
      
      return response.data;
    } catch (error) {
      console.error('[SITES API] Failed to bulk delete sites:', error);
      throw error;
    }
  },

  /**
   * Search sites with advanced filtering
   */
  async searchSites(query: string, filters?: {
    guardIds?: string[];
    locationRadius?: {
      center: Location;
      radiusKm: number;
    };
    hasGuards?: boolean;
  }): Promise<ApiResponse<Site[]>> {
    try {
      const response = await api.post<Site[]>('/api/sites/search', {
        query,
        filters,
      });
      
      console.log(`[SITES API] Searched sites with query: "${query}"`);
      return response.data;
    } catch (error) {
      console.error('[SITES API] Failed to search sites:', error);
      throw error;
    }
  },

  /**
   * Get site check-in statistics
   */
  async getSiteCheckInStats(siteId: string, dateRange: {
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<{
    totalCheckIns: number;
    successfulCheckIns: number;
    failedCheckIns: number;
    averageCheckInsPerDay: number;
    peakHours: Array<{ hour: number; count: number }>;
  }>> {
    try {
      const response = await api.post<{
        totalCheckIns: number;
        successfulCheckIns: number;
        failedCheckIns: number;
        averageCheckInsPerDay: number;
        peakHours: Array<{ hour: number; count: number }>;
      }>(`/api/sites/${stripIdPrefix(siteId, 'site_')}/checkin-stats`, dateRange);
      
      console.log(`[SITES API] Retrieved check-in stats for site: ${siteId}`);
      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to get check-in stats for site ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Update site geofence settings
   */
  async updateSiteGeofence(siteId: string, geofence: {
    radiusMeters: number;
    strictMode: boolean;
  }): Promise<ApiResponseSingle<Site>> {
    try {
      const response = await api.putSingle<Site>(`/api/sites/${stripIdPrefix(siteId, 'site_')}/geofence`, geofence);

      if (response.data.success) {
        console.log(`[SITES API] Updated geofence for site: ${siteId}`);
      }

      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to update geofence for site ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Export sites data to CSV
   */
  async exportSites(filters?: {
    guardIds?: string[];
    dateRange?: { startDate: string; endDate: string };
    locationBounds?: {
      northEast: Location;
      southWest: Location;
    };
  }): Promise<ApiResponseSingle<{ downloadUrl: string; fileName: string }>> {
    try {
      const response = await api.postSingle<{ downloadUrl: string; fileName: string }>(
        '/api/sites/export',
        { filters }
      );

      if (response.data.success) {
        console.log('[SITES API] Generated sites export');
      }

      return response.data;
    } catch (error) {
      console.error('[SITES API] Failed to export sites:', error);
      throw error;
    }
  },

  // =========================================================================
  // Checkin Location Management APIs
  // =========================================================================

  /**
   * Get all checkin locations for a site
   */
  async getLocations(siteId: string): Promise<ApiResponseSingle<CheckinLocation[]>> {
    try {
      const siteIdForApi = stripIdPrefix(siteId, 'site_');
      const response = await api.getSingle<CheckinLocation[]>(`/api/sites/${siteIdForApi}/locations`);

      console.log(`[SITES API] Retrieved locations for site: ${siteId}`);
      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to get locations for site ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Add a new checkin location to a site
   */
  async addLocation(siteId: string, locationData: CheckinLocationFormData): Promise<ApiResponseSingle<CheckinLocation>> {
    try {
      const siteIdForApi = stripIdPrefix(siteId, 'site_');
      const response = await api.postSingle<CheckinLocation>(`/api/sites/${siteIdForApi}/locations`, locationData);

      if (response.data.success && response.data.data) {
        console.log(`[SITES API] Added location "${locationData.name}" to site: ${siteId}`);
      }

      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to add location to site ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Update an existing checkin location
   */
  async updateLocation(siteId: string, locationId: number, locationData: CheckinLocationFormData): Promise<ApiResponseSingle<CheckinLocation>> {
    try {
      const siteIdForApi = stripIdPrefix(siteId, 'site_');
      const response = await api.putSingle<CheckinLocation>(`/api/sites/${siteIdForApi}/locations/${locationId}`, locationData);

      if (response.data.success && response.data.data) {
        console.log(`[SITES API] Updated location ${locationId} for site: ${siteId}`);
      }

      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to update location ${locationId} for site ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a checkin location
   */
  async deleteLocation(siteId: string, locationId: number): Promise<ApiResponseSingle<null>> {
    try {
      const siteIdForApi = stripIdPrefix(siteId, 'site_');
      const response = await api.deleteSingle<null>(`/api/sites/${siteIdForApi}/locations/${locationId}`);

      console.log(`[SITES API] Deleted location ${locationId} from site: ${siteId}`);
      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to delete location ${locationId} from site ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Get site statistics (guards, checkin rate, etc.)
   */
  async getSiteStatistics(siteId: string): Promise<ApiResponseSingle<{
    siteId: number;
    siteName: string;
    guardCount: number;
    todayStats: {
      checkinCount: number;
      uniqueGuards: number;
      checkinRate: number;
      onDutyNow: number;
    };
    weeklyStats: {
      totalCheckins: number;
      avgDailyCheckins: number;
    };
  }>> {
    try {
      const siteIdForApi = stripIdPrefix(siteId, 'site_');
      const response = await api.getSingle<{
        siteId: number;
        siteName: string;
        guardCount: number;
        todayStats: {
          checkinCount: number;
          uniqueGuards: number;
          checkinRate: number;
          onDutyNow: number;
        };
        weeklyStats: {
          totalCheckins: number;
          avgDailyCheckins: number;
        };
      }>(`/api/sites/${siteIdForApi}/statistics`);

      console.log(`[SITES API] Retrieved statistics for site: ${siteId}`);
      return response.data;
    } catch (error) {
      console.error(`[SITES API] Failed to get statistics for site ${siteId}:`, error);
      throw error;
    }
  },
};

/**
 * Export individual methods for advanced usage
 */
export const {
  getSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  getSitesByGuard,
  assignGuardsToSite,
  unassignGuardsFromSite,
  getSiteSummary,
  getAllSitesSummary,
  getSitesInArea,
  getNearestSites,
  validateSiteLocation,
  bulkUpdateSites,
  bulkDeleteSites,
  searchSites,
  getSiteCheckInStats,
  updateSiteGeofence,
  exportSites,
  // Location management
  getLocations,
  addLocation,
  updateLocation,
  deleteLocation,
  getSiteStatistics,
} = sitesApi;

/**
 * Export default as sitesApi for convenience
 */
export default sitesApi;