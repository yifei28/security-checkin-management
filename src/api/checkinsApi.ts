/**
 * Check-ins API Service
 * 
 * Provides typed methods for all check-in record related API endpoints
 * including viewing records, dashboard statistics, and data export.
 */

import { api } from './client';
import type {
  ApiResponse,
  ApiResponseSingle,
  PaginatedResponse,
  CheckInRecord,
  CheckInRecordSummary,
  DashboardStats,
  CheckInStatus,
  Location,
  PaginationResponse,
  PaginationMeta,
} from '../types';

/**
 * Convert PaginationResponse to PaginationMeta
 */
function convertPagination(paginationResponse?: PaginationResponse): PaginationMeta | undefined {
  if (!paginationResponse) return undefined;
  
  const { total, page, pageSize, totalPages } = paginationResponse;
  return {
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Check-ins API service object
 * Contains all methods for check-in records and analytics
 */
export const checkinsApi = {

  /**
   * Get all check-in records with filtering and pagination
   */
  async getCheckInRecords(params?: {
    page?: number;
    pageSize?: number;
    guardId?: string;
    siteId?: string;
    status?: CheckInStatus;
    dateRange?: {
      startDate: string;
      endDate: string;
    };
    sortBy?: 'timestamp' | 'guardId' | 'siteId' | 'status';
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<CheckInRecord>> {
    try {
      const response = await api.get<ApiResponse<CheckInRecord>>('/api/checkin', {
        params: {
          page: params?.page ?? 1,
          pageSize: params?.pageSize ?? 20,
          guardId: params?.guardId,
          siteId: params?.siteId,
          status: params?.status,
          startDate: params?.dateRange?.startDate,
          endDate: params?.dateRange?.endDate,
          sortBy: params?.sortBy ?? 'timestamp',
          sortOrder: params?.sortOrder ?? 'desc',
        }
      });
      
      console.log('[CHECKINS API] Retrieved check-in records');
      
      // Convert ApiResponse to PaginatedResponse format
      const apiData = response.data;
      const paginatedResponse: PaginatedResponse<CheckInRecord> = {
        success: apiData.success,
        data: Array.isArray(apiData.data) ? apiData.data as unknown as CheckInRecord[] : [],
        message: apiData.message || '',
        pagination: convertPagination(apiData.pagination)!,
      };
      
      return paginatedResponse;
    } catch (error) {
      console.error('[CHECKINS API] Failed to get check-in records:', error);
      throw error;
    }
  },

  /**
   * Get a specific check-in record by ID
   */
  async getCheckInRecord(checkInId: string): Promise<ApiResponse<CheckInRecord>> {
    try {
      const response = await api.get<CheckInRecord>(`/api/checkins/${checkInId}`);
      
      console.log(`[CHECKINS API] Retrieved check-in record: ${checkInId}`);
      return response.data;
    } catch (error) {
      console.error(`[CHECKINS API] Failed to get check-in record ${checkInId}:`, error);
      throw error;
    }
  },

  /**
   * Get check-in records for a specific guard
   */
  async getCheckInsByGuard(guardId: string, dateRange?: {
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<CheckInRecord[]>> {
    try {
      const params: Record<string, unknown> = {};
      if (dateRange) {
        params.startDate = dateRange.startDate;
        params.endDate = dateRange.endDate;
      }

      const response = await api.get<CheckInRecord[]>(`/api/guards/${guardId}/checkins`, {
        params
      });
      
      console.log(`[CHECKINS API] Retrieved check-ins for guard: ${guardId}`);
      return response.data;
    } catch (error) {
      console.error(`[CHECKINS API] Failed to get check-ins for guard ${guardId}:`, error);
      throw error;
    }
  },

  /**
   * Get check-in records for a specific site
   */
  async getCheckInsBySite(siteId: string, dateRange?: {
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<CheckInRecord[]>> {
    try {
      const params: Record<string, unknown> = {};
      if (dateRange) {
        params.startDate = dateRange.startDate;
        params.endDate = dateRange.endDate;
      }

      // 处理 site ID 前缀
      const siteIdForApi = siteId.startsWith('site_') ? siteId.replace('site_', '') : siteId;
      const response = await api.get<CheckInRecord[]>(`/api/sites/${siteIdForApi}/checkins`, {
        params
      });
      
      console.log(`[CHECKINS API] Retrieved check-ins for site: ${siteId}`);
      return response.data;
    } catch (error) {
      console.error(`[CHECKINS API] Failed to get check-ins for site ${siteId}:`, error);
      throw error;
    }
  },

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(dateRange?: {
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<DashboardStats>> {
    try {
      const params: Record<string, unknown> = {};
      if (dateRange) {
        params.startDate = dateRange.startDate;
        params.endDate = dateRange.endDate;
      }

      const response = await api.get<DashboardStats>('/api/dashboard/stats', {
        params
      });
      
      console.log('[CHECKINS API] Retrieved dashboard statistics');
      return response.data;
    } catch (error) {
      console.error('[CHECKINS API] Failed to get dashboard stats:', error);
      throw error;
    }
  },

  /**
   * Get real-time dashboard statistics (today's data)
   */
  async getTodayStats(): Promise<ApiResponse<{
    totalCheckInsToday: number;
    successfulCheckInsToday: number;
    failedCheckInsToday: number;
    activeGuards: number;
    activeSites: number;
    averageCheckInTime: number;
    recentCheckIns: CheckInRecord[];
  }>> {
    try {
      const response = await api.get<{
        totalCheckInsToday: number;
        successfulCheckInsToday: number;
        failedCheckInsToday: number;
        activeGuards: number;
        activeSites: number;
        averageCheckInTime: number;
        recentCheckIns: CheckInRecord[];
      }>('/api/dashboard/today');
      
      console.log('[CHECKINS API] Retrieved today\'s statistics');
      return response.data;
    } catch (error) {
      console.error('[CHECKINS API] Failed to get today\'s stats:', error);
      throw error;
    }
  },

  /**
   * Get check-in trends for charts and analytics
   */
  async getCheckInTrends(params: {
    period: 'daily' | 'weekly' | 'monthly';
    dateRange: {
      startDate: string;
      endDate: string;
    };
    groupBy?: 'guard' | 'site' | 'status';
  }): Promise<ApiResponse<Array<{
    date: string;
    totalCheckIns: number;
    successfulCheckIns: number;
    failedCheckIns: number;
    [key: string]: unknown;
  }>>> {
    try {
      const response = await api.post<Array<{
        date: string;
        totalCheckIns: number;
        successfulCheckIns: number;
        failedCheckIns: number;
        [key: string]: unknown;
      }>>('/api/dashboard/trends', params);
      
      console.log('[CHECKINS API] Retrieved check-in trends');
      return response.data;
    } catch (error) {
      console.error('[CHECKINS API] Failed to get check-in trends:', error);
      throw error;
    }
  },

  /**
   * Get check-in heatmap data for geographic visualization
   */
  async getCheckInHeatmap(dateRange: {
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<Array<{
    location: Location;
    count: number;
    successRate: number;
  }>>> {
    try {
      const response = await api.post<Array<{
        location: Location;
        count: number;
        successRate: number;
      }>>('/api/dashboard/heatmap', dateRange);
      
      console.log('[CHECKINS API] Retrieved check-in heatmap data');
      return response.data;
    } catch (error) {
      console.error('[CHECKINS API] Failed to get check-in heatmap:', error);
      throw error;
    }
  },

  /**
   * Get guard performance analytics
   */
  async getGuardPerformance(dateRange: {
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<Array<{
    guardId: string;
    guardName: string;
    totalCheckIns: number;
    successfulCheckIns: number;
    failedCheckIns: number;
    successRate: number;
    averageCheckInTime: number;
    sitesVisited: number;
  }>>> {
    try {
      const response = await api.post<Array<{
        guardId: string;
        guardName: string;
        totalCheckIns: number;
        successfulCheckIns: number;
        failedCheckIns: number;
        successRate: number;
        averageCheckInTime: number;
        sitesVisited: number;
      }>>('/api/dashboard/guard-performance', dateRange);
      
      console.log('[CHECKINS API] Retrieved guard performance data');
      return response.data;
    } catch (error) {
      console.error('[CHECKINS API] Failed to get guard performance:', error);
      throw error;
    }
  },

  /**
   * Get site activity analytics
   */
  async getSiteActivity(dateRange: {
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<Array<{
    siteId: string;
    siteName: string;
    totalCheckIns: number;
    successfulCheckIns: number;
    failedCheckIns: number;
    successRate: number;
    uniqueGuards: number;
    averageVisitsPerDay: number;
    peakHours: Array<{ hour: number; count: number }>;
  }>>> {
    try {
      const response = await api.post<Array<{
        siteId: string;
        siteName: string;
        totalCheckIns: number;
        successfulCheckIns: number;
        failedCheckIns: number;
        successRate: number;
        uniqueGuards: number;
        averageVisitsPerDay: number;
        peakHours: Array<{ hour: number; count: number }>;
      }>>('/api/dashboard/site-activity', dateRange);
      
      console.log('[CHECKINS API] Retrieved site activity data');
      return response.data;
    } catch (error) {
      console.error('[CHECKINS API] Failed to get site activity:', error);
      throw error;
    }
  },

  /**
   * Search check-in records with advanced filtering
   */
  async searchCheckIns(query: string, filters?: {
    guardIds?: string[];
    siteIds?: string[];
    statuses?: CheckInStatus[];
    dateRange?: {
      startDate: string;
      endDate: string;
    };
    locationRadius?: {
      center: Location;
      radiusKm: number;
    };
  }): Promise<ApiResponse<CheckInRecord[]>> {
    try {
      const response = await api.post<CheckInRecord[]>('/api/checkins/search', {
        query,
        filters,
      });
      
      console.log(`[CHECKINS API] Searched check-ins with query: "${query}"`);
      return response.data;
    } catch (error) {
      console.error('[CHECKINS API] Failed to search check-ins:', error);
      throw error;
    }
  },

  /**
   * Get check-in records summary for reporting
   */
  async getCheckInsSummary(dateRange: {
    startDate: string;
    endDate: string;
  }, groupBy?: 'day' | 'week' | 'month'): Promise<ApiResponse<CheckInRecordSummary[]>> {
    try {
      const response = await api.post<CheckInRecordSummary[]>('/api/checkins/summary', {
        dateRange,
        groupBy: groupBy ?? 'day',
      });
      
      console.log('[CHECKINS API] Retrieved check-ins summary');
      return response.data;
    } catch (error) {
      console.error('[CHECKINS API] Failed to get check-ins summary:', error);
      throw error;
    }
  },

  /**
   * Get check-in anomalies and alerts
   */
  async getCheckInAnomalies(dateRange: {
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<Array<{
    type: 'missed_checkin' | 'suspicious_location' | 'multiple_failures' | 'unusual_timing';
    severity: 'low' | 'medium' | 'high';
    guardId: string;
    siteId: string;
    timestamp: string;
    description: string;
    details: Record<string, unknown>;
  }>>> {
    try {
      const response = await api.post<Array<{
        type: 'missed_checkin' | 'suspicious_location' | 'multiple_failures' | 'unusual_timing';
        severity: 'low' | 'medium' | 'high';
        guardId: string;
        siteId: string;
        timestamp: string;
        description: string;
        details: Record<string, unknown>;
      }>>('/api/checkins/anomalies', dateRange);
      
      console.log('[CHECKINS API] Retrieved check-in anomalies');
      return response.data;
    } catch (error) {
      console.error('[CHECKINS API] Failed to get check-in anomalies:', error);
      throw error;
    }
  },

  /**
   * Export check-in records to various formats
   */
  async exportCheckIns(params: {
    format: 'csv' | 'excel' | 'pdf';
    dateRange: {
      startDate: string;
      endDate: string;
    };
    filters?: {
      guardIds?: string[];
      siteIds?: string[];
      statuses?: CheckInStatus[];
    };
    includePhotos?: boolean;
  }): Promise<ApiResponseSingle<{ downloadUrl: string; fileName: string }>> {
    try {
      const response = await api.postSingle<{ downloadUrl: string; fileName: string }>(
        '/api/checkins/export',
        params
      );
      
      if (response.data.success) {
        console.log(`[CHECKINS API] Generated ${params.format.toUpperCase()} export`);
      }
      
      return response.data;
    } catch (error) {
      console.error('[CHECKINS API] Failed to export check-ins:', error);
      throw error;
    }
  },

  /**
   * Get check-in photo by record ID
   */
  async getCheckInPhoto(checkInId: string): Promise<ApiResponse<{ 
    photoUrl: string; 
    thumbnailUrl?: string; 
    metadata?: Record<string, unknown>; 
  }>> {
    try {
      const response = await api.get<{ 
        photoUrl: string; 
        thumbnailUrl?: string; 
        metadata?: Record<string, unknown>; 
      }>(`/api/checkins/${checkInId}/photo`);
      
      console.log(`[CHECKINS API] Retrieved photo for check-in: ${checkInId}`);
      return response.data;
    } catch (error) {
      console.error(`[CHECKINS API] Failed to get photo for check-in ${checkInId}:`, error);
      throw error;
    }
  },

  /**
   * Get attendance report for guards
   */
  async getAttendanceReport(params: {
    dateRange: {
      startDate: string;
      endDate: string;
    };
    guardIds?: string[];
    siteIds?: string[];
    includeNoShows?: boolean;
  }): Promise<ApiResponse<Array<{
    guardId: string;
    guardName: string;
    totalScheduledDays: number;
    daysWorked: number;
    daysAbsent: number;
    attendanceRate: number;
    checkInDetails: Array<{
      date: string;
      siteId: string;
      siteName: string;
      checkInTime?: string;
      status: 'present' | 'absent' | 'late';
    }>;
  }>>> {
    try {
      const response = await api.post<Array<{
        guardId: string;
        guardName: string;
        totalScheduledDays: number;
        daysWorked: number;
        daysAbsent: number;
        attendanceRate: number;
        checkInDetails: Array<{
          date: string;
          siteId: string;
          siteName: string;
          checkInTime?: string;
          status: 'present' | 'absent' | 'late';
        }>;
      }>>('/api/reports/attendance', params);
      
      console.log('[CHECKINS API] Retrieved attendance report');
      return response.data;
    } catch (error) {
      console.error('[CHECKINS API] Failed to get attendance report:', error);
      throw error;
    }
  },
};

/**
 * Export individual methods for advanced usage
 */
export const {
  getCheckInRecords,
  getCheckInRecord,
  getCheckInsByGuard,
  getCheckInsBySite,
  getDashboardStats,
  getTodayStats,
  getCheckInTrends,
  getCheckInHeatmap,
  getGuardPerformance,
  getSiteActivity,
  searchCheckIns,
  getCheckInsSummary,
  getCheckInAnomalies,
  exportCheckIns,
  getCheckInPhoto,
  getAttendanceReport,
} = checkinsApi;

/**
 * Export default as checkinsApi for convenience
 */
export default checkinsApi;