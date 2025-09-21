/**
 * Check-ins React Query Hooks
 * 
 * Custom hooks for check-ins management and analytics using React Query v5.
 * Includes dashboard statistics, reporting, and data visualization features.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkinsApi } from '../api/checkinsApi';
import { queryKeys } from '../api/queryKeys';
import type {
  PaginatedResponse,
  ApiResponse,
  ApiResponseSingle,
  CheckInRecord,
  CheckInRecordSummary,
  DashboardStats,
  CheckInStatus,
  Location,
} from '../types';

/**
 * Hook for fetching paginated check-in records
 */
export const useCheckInRecords = (params?: {
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
}) => {
  return useQuery({
    queryKey: queryKeys.checkins.list(params),
    queryFn: (): Promise<PaginatedResponse<CheckInRecord>> => 
      checkinsApi.getCheckInRecords(params),
    
    // Check-in data is relatively fresh, cache for shorter time
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 2, // 2 minutes
    enabled: true,
  });
};

/**
 * Hook for fetching a single check-in record
 */
export const useCheckInRecord = (checkInId: string) => {
  return useQuery({
    queryKey: queryKeys.checkins.detail(checkInId),
    queryFn: (): Promise<ApiResponse<CheckInRecord>> => 
      checkinsApi.getCheckInRecord(checkInId),
    
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
    enabled: !!checkInId,
  });
};

/**
 * Hook for fetching check-ins by guard
 */
export const useCheckInsByGuard = (guardId: string, dateRange?: {
  startDate: string;
  endDate: string;
}) => {
  return useQuery({
    queryKey: queryKeys.checkins.byGuard(guardId, dateRange),
    queryFn: (): Promise<ApiResponse<CheckInRecord[]>> => 
      checkinsApi.getCheckInsByGuard(guardId, dateRange),
    
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 3,    // 3 minutes
    enabled: !!guardId,
  });
};

/**
 * Hook for fetching check-ins by site
 */
export const useCheckInsBySite = (siteId: string, dateRange?: {
  startDate: string;
  endDate: string;
}) => {
  return useQuery({
    queryKey: queryKeys.checkins.bySite(siteId, dateRange),
    queryFn: (): Promise<ApiResponse<CheckInRecord[]>> => 
      checkinsApi.getCheckInsBySite(siteId, dateRange),
    
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 3,    // 3 minutes
    enabled: !!siteId,
  });
};

/**
 * Hook for fetching dashboard statistics
 */
export const useDashboardStats = (dateRange?: {
  startDate: string;
  endDate: string;
}) => {
  return useQuery({
    queryKey: queryKeys.dashboard.statsRange(dateRange),
    queryFn: (): Promise<ApiResponse<DashboardStats>> => 
      checkinsApi.getDashboardStats(dateRange),
    
    // Dashboard data updates frequently
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5,    // 5 minutes
    refetchInterval: 1000 * 60 * 2, // Auto-refetch every 2 minutes
  });
};

/**
 * Hook for fetching today's real-time statistics
 */
export const useTodayStats = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.todayStats(),
    queryFn: (): Promise<ApiResponse<{
      totalCheckInsToday: number;
      successfulCheckInsToday: number;
      failedCheckInsToday: number;
      activeGuards: number;
      activeSites: number;
      averageCheckInTime: number;
      recentCheckIns: CheckInRecord[];
    }>> => checkinsApi.getTodayStats(),
    
    // Real-time data needs frequent updates
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 1, // Auto-refetch every minute
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook for fetching check-in trends for analytics
 */
export const useCheckInTrends = (params: {
  period: 'daily' | 'weekly' | 'monthly';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  groupBy?: 'guard' | 'site' | 'status';
}) => {
  return useQuery({
    queryKey: queryKeys.dashboard.trends(params),
    queryFn: (): Promise<ApiResponse<Array<{
      date: string;
      totalCheckIns: number;
      successfulCheckIns: number;
      failedCheckIns: number;
      [key: string]: unknown;
    }>>> => checkinsApi.getCheckInTrends(params),
    
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15,   // 15 minutes
    enabled: !!params.dateRange.startDate && !!params.dateRange.endDate,
  });
};

/**
 * Hook for fetching check-in heatmap data
 */
export const useCheckInHeatmap = (dateRange: {
  startDate: string;
  endDate: string;
}) => {
  return useQuery({
    queryKey: queryKeys.dashboard.heatmap(dateRange),
    queryFn: (): Promise<ApiResponse<Array<{
      location: Location;
      count: number;
      successRate: number;
    }>>> => checkinsApi.getCheckInHeatmap(dateRange),
    
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 20,    // 20 minutes
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });
};

/**
 * Hook for fetching guard performance analytics
 */
export const useGuardPerformance = (dateRange: {
  startDate: string;
  endDate: string;
}) => {
  return useQuery({
    queryKey: queryKeys.dashboard.guardPerformance(dateRange),
    queryFn: (): Promise<ApiResponse<Array<{
      guardId: string;
      guardName: string;
      totalCheckIns: number;
      successfulCheckIns: number;
      failedCheckIns: number;
      successRate: number;
      averageCheckInTime: number;
      sitesVisited: number;
    }>>> => checkinsApi.getGuardPerformance(dateRange),
    
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15,
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });
};

/**
 * Hook for fetching site activity analytics
 */
export const useSiteActivity = (dateRange: {
  startDate: string;
  endDate: string;
}) => {
  return useQuery({
    queryKey: queryKeys.dashboard.siteActivity(dateRange),
    queryFn: (): Promise<ApiResponse<Array<{
      siteId: string;
      siteName: string;
      totalCheckIns: number;
      successfulCheckIns: number;
      failedCheckIns: number;
      successRate: number;
      uniqueGuards: number;
      averageVisitsPerDay: number;
      peakHours: Array<{ hour: number; count: number }>;
    }>>> => checkinsApi.getSiteActivity(dateRange),
    
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15,
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });
};

/**
 * Hook for fetching check-in photo
 */
export const useCheckInPhoto = (checkInId: string) => {
  return useQuery({
    queryKey: queryKeys.checkins.photo(checkInId),
    queryFn: (): Promise<ApiResponse<{ 
      photoUrl: string; 
      thumbnailUrl?: string; 
      metadata?: Record<string, unknown>; 
    }>> => checkinsApi.getCheckInPhoto(checkInId),
    
    // Photos don't change once uploaded
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 2,     // 2 hours
    enabled: !!checkInId,
  });
};

/**
 * Hook for searching check-in records
 */
export const useSearchCheckIns = (query: string, filters?: {
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
}) => {
  return useQuery({
    queryKey: queryKeys.checkins.search(query, filters),
    queryFn: (): Promise<ApiResponse<CheckInRecord[]>> => 
      checkinsApi.searchCheckIns(query, filters),
    
    enabled: query.length > 0,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 2,
  });
};

/**
 * Hook for fetching check-ins summary
 */
export const useCheckInsSummary = (dateRange: {
  startDate: string;
  endDate: string;
}, groupBy?: 'day' | 'week' | 'month') => {
  return useQuery({
    queryKey: queryKeys.checkins.summaryRange(dateRange, groupBy),
    queryFn: (): Promise<ApiResponse<CheckInRecordSummary[]>> => 
      checkinsApi.getCheckInsSummary(dateRange, groupBy),
    
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15,
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });
};

/**
 * Hook for fetching check-in anomalies
 */
export const useCheckInAnomalies = (dateRange: {
  startDate: string;
  endDate: string;
}) => {
  return useQuery({
    queryKey: queryKeys.checkins.anomalies(dateRange),
    queryFn: (): Promise<ApiResponse<Array<{
      type: 'missed_checkin' | 'suspicious_location' | 'multiple_failures' | 'unusual_timing';
      severity: 'low' | 'medium' | 'high';
      guardId: string;
      siteId: string;
      timestamp: string;
      description: string;
      details: Record<string, unknown>;
    }>>> => checkinsApi.getCheckInAnomalies(dateRange),
    
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,    // 30 minutes
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });
};

/**
 * Hook for fetching attendance report
 */
export const useAttendanceReport = (params: {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  guardIds?: string[];
  siteIds?: string[];
  includeNoShows?: boolean;
}) => {
  return useQuery({
    queryKey: queryKeys.reports.attendance(params),
    queryFn: (): Promise<ApiResponse<Array<{
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
    }>>> => checkinsApi.getAttendanceReport(params),
    
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,
    enabled: !!params.dateRange.startDate && !!params.dateRange.endDate,
  });
};

/**
 * Hook for exporting check-in records
 */
export const useExportCheckIns = () => {
  return useMutation({
    mutationFn: (params: {
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
    }): Promise<ApiResponseSingle<{ downloadUrl: string; fileName: string }>> =>
      checkinsApi.exportCheckIns(params),
    
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Automatically download the file
        const link = document.createElement('a');
        link.href = data.data.downloadUrl;
        link.download = data.data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('[CHECKINS HOOK] Export completed:', data.data.fileName);
      }
    },
    
    onError: (error) => {
      console.error('[CHECKINS HOOK] Export failed:', error);
    },
  });
};

/**
 * Compound hook for dashboard overview
 * Combines multiple dashboard queries for comprehensive stats
 */
export const useDashboardOverview = (dateRange?: {
  startDate: string;
  endDate: string;
}) => {
  const todayStats = useTodayStats();
  const dashboardStats = useDashboardStats(dateRange);
  const trends = useCheckInTrends({
    period: 'daily',
    dateRange: dateRange || {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
  });

  return {
    todayStats,
    dashboardStats,
    trends,
    isLoading: todayStats.isLoading || dashboardStats.isLoading || trends.isLoading,
    isError: todayStats.isError || dashboardStats.isError || trends.isError,
    error: todayStats.error || dashboardStats.error || trends.error,
  };
};

/**
 * Hook for real-time dashboard updates
 * Provides manual refresh capabilities for real-time views
 */
export const useRealTimeDashboard = () => {
  const queryClient = useQueryClient();

  const refreshDashboard = () => {
    // Invalidate all dashboard-related queries
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.checkins.all });
  };

  const refreshTodayStats = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.todayStats() });
  };

  return {
    refreshDashboard,
    refreshTodayStats,
  };
};