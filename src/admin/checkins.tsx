import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import * as Papa from 'papaparse';
import { request } from '../util/request';
import { BASE_URL } from '../util/config';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem 
} from "@/components/ui/pagination";
import { CheckCircle2, XCircle, Clock, MapPin, Calendar, Search, Filter, Users, FileText, AlertCircle, Camera, Navigation, Map as MapIcon, BarChart3, Download } from 'lucide-react';
import type { CheckInRecord, CheckInStatus, Guard, Site, PaginationParams, ApiResponse } from '../types';
import CheckinMapView from '../components/CheckinMapView';
import CheckinAnalytics from '../components/CheckinAnalytics';

// Development debug helper
if (process.env.NODE_ENV === 'development') {
  import('../util/test-date-filter');
}

// Extended interface for display with related data
interface CheckInRecordDisplay extends CheckInRecord {
  guardName: string;
  guardPhone: string;
  siteName: string;
  siteCoordinates: { lat: number; lng: number };
  distanceFromSite?: number;
}

// Statistics interface for complete/current page flag
interface StatsDisplay {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  successRate: number;
  isComplete?: boolean;
  isCurrentPageOnly?: boolean;
}

// Helper function to parse API timestamp as Beijing time
const parseBeijingTime = (timestamp: string): Date => {
  // API now returns local time format without Z suffix (e.g., "2025-08-09T23:55:03")
  // JavaScript Date constructor treats this as local time automatically
  return new Date(timestamp);
};

export default function CheckinRecords() {
  const [records, setRecords] = useState<CheckInRecordDisplay[]>([]);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CheckInStatus | 'all'>('all');
  const [guardFilter, setGuardFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  
  // View state
  const [showMapView, setShowMapView] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0, // 0-based for TanStack Table
    pageSize: 20
  });
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  
  // Store the full API response to access statistics
  const [apiResponse, setApiResponse] = useState<ApiResponse<CheckInRecord> | null>(null);
  
  // Store complete statistics from separate API call
  const [completeStatistics, setCompleteStatistics] = useState<{
    totalRecords: number;
    successCount: number;
    failedCount: number;
    pendingCount: number;
    successRate: number;
  } | null>(null);
  
  // Request debouncing and caching
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const requestCacheRef = useRef<Map<string, { data: {
    recordsResponse: ApiResponse<CheckInRecord>;
    guardsData: Guard[];
    sitesData: Site[];
  }; timestamp: number }>>(new Map<string, { data: {
    recordsResponse: ApiResponse<CheckInRecord>;
    guardsData: Guard[];
    sitesData: Site[];
  }; timestamp: number }>());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Helper function to calculate distance between two points
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }, []);

  // Helper function to reset pagination when filters change
  const resetPaginationAndSetFilter = function <T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  // Create paginated fetch function with filters (moved up for use in fetchCompleteStatistics)
  const fetchRecordsWithPagination = async (paginationParams: PaginationParams, filters?: {
    dateRange?: 'today' | 'week' | 'month' | 'all';
    status?: CheckInStatus | 'all';
    guardId?: string;
    siteId?: string;
  }) => {
    const params = new URLSearchParams({
      page: paginationParams.page.toString(),
      pageSize: paginationParams.pageSize.toString(),
      sortBy: paginationParams.sortBy || 'timestamp',
      sortOrder: paginationParams.sortOrder || 'desc'
    });
    
    // Add date range filter (API expects and returns Beijing time)
    if (filters?.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate = '';
      let endDate = '';
      
      // Helper function to format date as local time string (YYYY-MM-DDTHH:mm:ss)
      const formatLocalDateTime = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };
      
      switch (filters.dateRange) {
        case 'today': {
          // 今天的开始时间 (00:00:00)
          const today = new Date(now);
          today.setHours(0, 0, 0, 0);
          startDate = formatLocalDateTime(today);
          
          // 今天的结束时间 (23:59:59)
          const todayEnd = new Date(now);
          todayEnd.setHours(23, 59, 59, 999);
          endDate = formatLocalDateTime(todayEnd);
          break;
        }
          
        case 'week': {
          // 7天前的开始时间
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          weekAgo.setHours(0, 0, 0, 0);
          startDate = formatLocalDateTime(weekAgo);
          
          // 当前时间作为结束时间
          endDate = formatLocalDateTime(now);
          break;
        }
          
        case 'month': {
          // 30天前的开始时间
          const monthAgo = new Date(now);
          monthAgo.setDate(monthAgo.getDate() - 30);
          monthAgo.setHours(0, 0, 0, 0);
          startDate = formatLocalDateTime(monthAgo);
          
          // 当前时间作为结束时间
          endDate = formatLocalDateTime(now);
          break;
        }
      }
      
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
    }
    
    // Add other filters
    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.guardId && filters.guardId !== 'all') {
      params.append('guardId', filters.guardId);
    }
    if (filters?.siteId && filters.siteId !== 'all') {
      params.append('siteId', filters.siteId);
    }
    
    return request(`${BASE_URL}/api/checkin?${params}`);
  };

  // Extract statistics from API response - no longer need separate API call
  const extractStatisticsFromResponse = useCallback((response: ApiResponse<CheckInRecord>) => {
    // Check if API response includes statistics field
    if (response.statistics) {
      setCompleteStatistics({
        totalRecords: response.statistics.totalRecords,
        successCount: response.statistics.successCount,
        failedCount: response.statistics.failedCount,
        pendingCount: response.statistics.pendingCount,
        successRate: response.statistics.successRate
      });
      console.log('[CHECKINS] Using complete statistics from API response:', response.statistics);
    } else {
      // API doesn't include statistics field, clear complete statistics
      setCompleteStatistics(null);
      console.log('[CHECKINS] API response does not include statistics, using current page statistics');
    }
  }, []);

  // Debounced fetch function with caching
  const debouncedFetchData = useCallback(async () => {
    // Generate cache key from current filters and pagination
    const cacheKey = JSON.stringify({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      dateFilter,
      statusFilter,
      guardFilter,
      siteFilter
    });
    
    // Check cache first
    const cachedData = requestCacheRef.current.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
      // Use cached data
      const { recordsResponse, guardsData, sitesData } = cachedData.data;
      setApiResponse(recordsResponse);
      
      if (recordsResponse.pagination) {
        setTotalCount(recordsResponse.pagination.total);
        setPageCount(recordsResponse.pagination.totalPages);
      }
      
      setGuards(guardsData);
      setSites(sitesData);
      
      // Process records with existing logic
      const guardMap = new Map();
      const siteMap = new Map();
      
      (guardsData as Guard[]).forEach((guard: Guard) => {
        guardMap.set(guard.id, guard);
      });
      
      (sitesData as Site[]).forEach((site: Site) => {
        siteMap.set(site.id, site);
      });
      
      const recordsData = recordsResponse.success && recordsResponse.data ? recordsResponse.data : [];
      const enrichedRecords = (Array.isArray(recordsData) ? recordsData : []).map((record: CheckInRecord) => {
        const guard = guardMap.get(record.guardId);
        const site = siteMap.get(record.siteId);
        
        const normalizedStatus = record.status.toLowerCase() as CheckInStatus;
        const validStatuses: CheckInStatus[] = ['success', 'failed', 'pending'];
        const mappedStatus = validStatuses.includes(normalizedStatus) ? normalizedStatus : 'pending';
        
        const distanceFromSite = (site && record.location.lat && record.location.lng) 
          ? calculateDistance(
              record.location.lat, 
              record.location.lng, 
              site.latitude, 
              site.longitude
            )
          : undefined;
        
        return {
          ...record,
          status: mappedStatus,
          guardName: guard?.name || `未知保安 (ID: ${record.guardId})`,
          guardPhone: guard?.phoneNumber || '',
          siteName: site?.name || `未知站点 (ID: ${record.siteId})`,
          siteCoordinates: site ? { lat: site.latitude, lng: site.longitude } : { lat: 0, lng: 0 },
          distanceFromSite
        };
      });
      
      setRecords(enrichedRecords);
      setLoading(false);
      return;
    }
    
    // Fetch fresh data
    setLoading(true);
    setError('');
    
    try {
      // Fetch all required data in parallel
      const [recordsRes, guardsRes, sitesRes] = await Promise.all([
        fetchRecordsWithPagination({ 
          page: pagination.pageIndex + 1, // Convert to 1-based
          pageSize: pagination.pageSize 
        }, {
          dateRange: dateFilter,
          status: statusFilter,
          guardId: guardFilter,
          siteId: siteFilter
        }),
        request(`${BASE_URL}/api/guards`),
        request(`${BASE_URL}/api/sites`)
      ]);

        if (!recordsRes.ok) {
          throw new Error(`获取签到记录失败: ${recordsRes.status}`);
        }
        if (!guardsRes.ok) {
          throw new Error(`获取保安数据失败: ${guardsRes.status}`);
        }
        if (!sitesRes.ok) {
          throw new Error(`获取站点数据失败: ${sitesRes.status}`);
        }

        const recordsResponse: ApiResponse<CheckInRecord> = await recordsRes.json();
        const guardsResponse = await guardsRes.json();
        const sitesResponse = await sitesRes.json();

        // Store the full response for statistics
        setApiResponse(recordsResponse);
        
        // Extract statistics from API response if available
        extractStatisticsFromResponse(recordsResponse);

        // API returns { success: true, data: [...], pagination?: {...} } format
        const recordsData = recordsResponse.success && recordsResponse.data ? recordsResponse.data : [];
        const guardsData = guardsResponse.success && guardsResponse.data ? guardsResponse.data : [];
        const sitesData = sitesResponse.success && sitesResponse.data ? sitesResponse.data : [];
        
        // Update pagination state
        if (recordsResponse.pagination) {
          setTotalCount(recordsResponse.pagination.total);
          setPageCount(recordsResponse.pagination.totalPages);
        }

        // Store basic data
        setGuards(Array.isArray(guardsData) ? guardsData : []);
        setSites(Array.isArray(sitesData) ? sitesData : []);

              // Create efficient lookup maps for better performance
        const guardMap = new Map();
        const siteMap = new Map();
        
        guardsData.forEach((guard: Guard) => {
          guardMap.set(guard.id, guard);
        });
        
        sitesData.forEach((site: Site) => {
          siteMap.set(site.id, site);
        });

        // Transform and enrich records with guard and site data using optimized lookups
        const enrichedRecords: CheckInRecordDisplay[] = (Array.isArray(recordsData) ? recordsData : [])
          .map((record: CheckInRecord) => {
            const guard = guardMap.get(record.guardId);
            const site = siteMap.get(record.siteId);
            
            // Improved status mapping with consistent lowercase format
            // API returns lowercase status as per new documentation
            const normalizedStatus = record.status.toLowerCase() as CheckInStatus;
            const validStatuses: CheckInStatus[] = ['success', 'failed', 'pending'];
            const mappedStatus = validStatuses.includes(normalizedStatus) ? normalizedStatus : 'pending';
            
            // Calculate distance only if we have valid coordinates
            const distanceFromSite = (site && record.location.lat && record.location.lng) 
              ? calculateDistance(
                  record.location.lat, 
                  record.location.lng, 
                  site.latitude, 
                  site.longitude
                )
              : undefined;
            
            return {
              ...record,
              status: mappedStatus,
              guardName: guard?.name || `未知保安 (ID: ${record.guardId})`,
              guardPhone: guard?.phoneNumber || '',
              siteName: site?.name || `未知站点 (ID: ${record.siteId})`,
              siteCoordinates: site ? { lat: site.latitude, lng: site.longitude } : { lat: 0, lng: 0 },
              distanceFromSite
            };
          });

        setRecords(enrichedRecords);
        
        // Cache the result
        requestCacheRef.current.set(cacheKey, {
          data: { recordsResponse, guardsData, sitesData },
          timestamp: now
        });
        
        // Clean up old cache entries
        for (const [key, value] of requestCacheRef.current.entries()) {
          if (now - value.timestamp > CACHE_DURATION) {
            requestCacheRef.current.delete(key);
          }
        }
        
      } catch (error: unknown) {
        console.error('[CHECKINS] Fetch error:', error);
        const errorMessage = error instanceof Error ? error.message : '获取数据失败，请刷新页面重试';
        setError(errorMessage);
        setRecords([]);
        setGuards([]);
        setSites([]);
        
        // Show user-friendly error for common issues
        if (errorMessage.includes('401') || errorMessage.includes('403')) {
          setError('登录已过期，请重新登录');
        } else if (errorMessage.includes('Network Error') || errorMessage.includes('fetch')) {
          setError('网络连接失败，请检查网络连接后重试');
        }
        
      } finally {
        setLoading(false);
      }
    },
    [pagination, dateFilter, statusFilter, guardFilter, siteFilter, fetchRecordsWithPagination, calculateDistance, extractStatisticsFromResponse, CACHE_DURATION]
  );

  useEffect(() => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set up debounced fetch (300ms delay)
    debounceTimerRef.current = setTimeout(() => {
      debouncedFetchData();
    }, 300);
    
    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [debouncedFetchData]);



  // Get status badge properties
  const getStatusBadge = (status: CheckInStatus) => {
    switch (status) {
      case 'success':
        return { 
          variant: 'default' as const, 
          icon: CheckCircle2, 
          text: '成功',
          className: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300'
        };
      case 'failed':
        return { 
          variant: 'destructive' as const, 
          icon: XCircle, 
          text: '失败',
          className: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-300'
        };
      case 'pending':
        return { 
          variant: 'secondary' as const, 
          icon: Clock, 
          text: '待处理',
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300'
        };
      default:
        return { 
          variant: 'outline' as const, 
          icon: AlertCircle, 
          text: '未知',
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300'
        };
    }
  };

  // For server-side pagination, we use records directly
  // Filtering will be implemented server-side in a future update
  const displayRecords = records;

  // Calculate statistics - prioritize complete statistics, then API statistics, then current page
  const stats = useMemo((): StatsDisplay => {
    // First priority: Complete statistics from dedicated API (all filtered records)
    if (completeStatistics) {
      return {
        total: completeStatistics.totalRecords,
        successful: completeStatistics.successCount,
        failed: completeStatistics.failedCount,
        pending: completeStatistics.pendingCount,
        successRate: completeStatistics.successRate,
        isComplete: true // Flag to indicate these are complete statistics
      };
    }
    
    // Second priority: API response statistics (if available)
    if (apiResponse?.statistics) {
      return {
        total: apiResponse.statistics.totalRecords,
        successful: apiResponse.statistics.successCount,
        failed: apiResponse.statistics.failedCount,
        pending: apiResponse.statistics.pendingCount,
        successRate: apiResponse.statistics.successRate,
        isComplete: true
      };
    }
    
    // Fallback: Current page statistics with a note
    const currentPageStats: StatsDisplay = {
      total: totalCount, // This is the total from all filtered records
      successful: displayRecords.filter(r => r.status === 'success').length,
      failed: displayRecords.filter(r => r.status === 'failed').length,
      pending: displayRecords.filter(r => r.status === 'pending').length,
      successRate: displayRecords.length > 0 
        ? Math.round((displayRecords.filter(r => r.status === 'success').length / displayRecords.length) * 100)
        : 0,
      isCurrentPageOnly: true // Flag to indicate this is only current page
    };
    
    return currentPageStats;
  }, [completeStatistics, apiResponse, totalCount, displayRecords]);

  // Export to CSV function
  const exportToCSV = () => {
    if (displayRecords.length === 0) {
      return;
    }

    // Prepare data for CSV export
    const csvData = displayRecords.map(record => ({
      '签到时间': parseBeijingTime(record.timestamp).toLocaleString('zh-CN'),
      '保安姓名': record.guardName,
      '保安电话': record.guardPhone,
      '站点名称': record.siteName,
      '签到状态': record.status === 'success' ? '成功' : record.status === 'failed' ? '失败' : '待处理',
      '纬度': record.location.lat.toFixed(6),
      '经度': record.location.lng.toFixed(6),
      '距离站点(米)': record.distanceFromSite ? Math.round(record.distanceFromSite) : '',
      '验证原因': record.reason || '',
      '是否有照片': record.faceImageUrl ? '是' : '否'
    }));

    // Convert to CSV
    const csv = Papa.unparse(csvData, {
      header: true
    });

    // Add BOM for Excel compatibility with Chinese characters
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csv;

    // Create and trigger download
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Generate filename with current timestamp
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
    const filename = `签到记录_${dateStr}_${timeStr}.csv`;
    
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-4" />
                </div>
                <Skeleton className="h-8 w-12 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Table skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="loading-skeleton">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <FileText className="h-8 w-8 text-blue-600" />
            <span>签到记录查询</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            查看保安人员的签到记录、位置信息和验证状态
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant={showMapView ? "default" : "outline"} 
            size="sm"
            onClick={() => {
              setShowMapView(!showMapView);
              setShowAnalytics(false);
            }}
          >
            <MapIcon className="h-4 w-4 mr-2" />
            {showMapView ? '列表视图' : '地图视图'}
          </Button>
          <Button 
            variant={showAnalytics ? "default" : "outline"} 
            size="sm"
            onClick={() => {
              setShowAnalytics(!showAnalytics);
              setShowMapView(false);
            }}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showAnalytics ? '列表视图' : '数据分析'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToCSV}
            disabled={displayRecords.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            导出当前页 ({displayRecords.length})
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats.isCurrentPageOnly && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            注意：以下统计数据仅包含当前页面的 {pagination.pageSize} 条记录。
            完整统计API暂时不可用，正在尝试获取完整数据。
          </AlertDescription>
        </Alert>
      )}
      {stats.isComplete && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ✓ 以下统计数据为所有筛选条件下的完整统计信息。
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">总记录</span>
              </div>
            </div>
            <div className="text-2xl font-bold mt-2">
              {stats.total}
              {stats.isCurrentPageOnly && (
                <span className="text-xs text-muted-foreground ml-2">(全部)</span>
              )}
              {stats.isComplete && (
                <span className="text-xs text-green-600 ml-2">(完整)</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">成功签到</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              {stats.successful}
              {stats.isCurrentPageOnly && (
                <span className="text-xs text-muted-foreground ml-2">(本页)</span>
              )}
              {stats.isComplete && (
                <span className="text-xs text-green-600 ml-2">(全部)</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-muted-foreground">失败签到</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-red-600 mt-2">
              {stats.failed}
              {stats.isCurrentPageOnly && (
                <span className="text-xs text-muted-foreground ml-2">(本页)</span>
              )}
              {stats.isComplete && (
                <span className="text-xs text-green-600 ml-2">(全部)</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Navigation className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">成功率</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              {stats.successRate}%
              {stats.isCurrentPageOnly && (
                <span className="text-xs text-muted-foreground ml-2">(本页)</span>
              )}
              {stats.isComplete && (
                <span className="text-xs text-green-600 ml-2">(全部)</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>搜索和筛选</span>
          </CardTitle>
          <CardDescription>
            使用以下选项来筛选签到记录，支持多条件组合筛选
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            {/* Search Input */}
            <div className="flex-1 min-w-64">
              <label className="text-sm font-medium mb-2 block">搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索保安姓名、手机号或站点..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="min-w-32">
              <label className="text-sm font-medium mb-2 block">状态</label>
              <Select value={statusFilter} onValueChange={(value: CheckInStatus | 'all') => resetPaginationAndSetFilter(setStatusFilter, value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="success">成功</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                  <SelectItem value="pending">待处理</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Guard Filter */}
            <div className="min-w-32">
              <label className="text-sm font-medium mb-2 block">保安</label>
              <Select value={guardFilter} onValueChange={(value) => resetPaginationAndSetFilter(setGuardFilter, value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择保安" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部保安</SelectItem>
                  {guards.map((guard) => (
                    <SelectItem key={guard.id} value={guard.id}>
                      <div className="flex items-center space-x-2">
                        <Users className="h-3 w-3" />
                        <span>{guard.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Site Filter */}
            <div className="min-w-32">
              <label className="text-sm font-medium mb-2 block">站点</label>
              <Select value={siteFilter} onValueChange={(value) => resetPaginationAndSetFilter(setSiteFilter, value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择站点" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部站点</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-3 w-3" />
                        <span>{site.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="min-w-32">
              <label className="text-sm font-medium mb-2 block">时间范围</label>
              <Select value={dateFilter} onValueChange={(value: 'today' | 'week' | 'month' | 'all') => resetPaginationAndSetFilter(setDateFilter, value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">今天</SelectItem>
                  <SelectItem value="week">最近一周</SelectItem>
                  <SelectItem value="month">最近一月</SelectItem>
                  <SelectItem value="all">全部时间</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Badge variant="secondary">{displayRecords.length}</Badge>
                <span>条结果</span>
              </div>
              <span>（第{pagination.pageIndex + 1}页，共{pageCount}页）</span>
            </div>

            {/* Clear Filters */}
            {(searchQuery || statusFilter !== 'all' || guardFilter !== 'all' || siteFilter !== 'all' || dateFilter !== 'today') && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setGuardFilter('all');
                  setSiteFilter('all');
                  setDateFilter('today');
                }}
              >
                清空筛选
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map View, Analytics, or Records Table */}
      {showMapView ? (
        <CheckinMapView
          records={displayRecords}
          sites={sites}
          loading={loading}
          error={error}
          onClose={() => setShowMapView(false)}
        />
      ) : showAnalytics ? (
        <CheckinAnalytics
          records={displayRecords}
          guards={guards}
          sites={sites}
          loading={loading}
          error={error}
          onClose={() => setShowAnalytics(false)}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>签到记录</span>
            </CardTitle>
            <CardDescription>
              按时间倒序排列的签到记录列表，包含状态验证和位置信息
            </CardDescription>
          </CardHeader>
          <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : displayRecords.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery || statusFilter !== 'all' || guardFilter !== 'all' || siteFilter !== 'all' 
                  ? '没有找到匹配的签到记录' 
                  : '还没有签到记录'
                }
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || guardFilter !== 'all' || siteFilter !== 'all'
                  ? '尝试调整搜索条件或筛选器查看更多记录'
                  : '保安人员签到后，记录将显示在这里'
                }
              </p>
              {(searchQuery || statusFilter !== 'all' || guardFilter !== 'all' || siteFilter !== 'all' || dateFilter !== 'today') && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setGuardFilter('all');
                    setSiteFilter('all');
                    setDateFilter('today');
                  }}
                >
                  清空所有筛选
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">状态</TableHead>
                    <TableHead>保安信息</TableHead>
                    <TableHead>站点信息</TableHead>
                    <TableHead>签到时间</TableHead>
                    <TableHead>位置信息</TableHead>
                    <TableHead>验证信息</TableHead>
                    <TableHead className="w-24">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRecords.map((record) => {
                    const statusBadge = getStatusBadge(record.status);
                    const StatusIcon = statusBadge.icon;
                    
                    return (
                      <TableRow key={record.id} className="hover:bg-muted/50" data-testid="checkin-row">
                        <TableCell>
                          <Badge className={statusBadge.className}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusBadge.text}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Users className="h-4 w-4 text-blue-600" />
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">{record.guardName}</div>
                              <div className="text-sm text-muted-foreground">{record.guardPhone}</div>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{record.siteName}</div>
                              {record.distanceFromSite !== undefined && (
                                <div className="text-sm text-muted-foreground">
                                  距离: {record.distanceFromSite > 1000 
                                    ? `${(record.distanceFromSite / 1000).toFixed(1)}km` 
                                    : `${Math.round(record.distanceFromSite)}m`
                                  }
                                  {(() => {
                                    const site = sites.find(s => s.id === record.siteId);
                                    const threshold = site?.allowedRadiusMeters || 500; // 默认500米
                                    return record.distanceFromSite > threshold && (
                                      <Badge variant="destructive" className="ml-2 text-xs">
                                        距离异常 (&gt;{threshold}m)
                                      </Badge>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {parseBeijingTime(record.timestamp).toLocaleDateString('zh-CN')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {parseBeijingTime(record.timestamp).toLocaleTimeString('zh-CN')}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-mono">
                              纬度: {record.location.lat.toFixed(6)}
                            </div>
                            <div className="font-mono text-muted-foreground">
                              经度: {record.location.lng.toFixed(6)}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {record.faceImageUrl && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0"
                                  >
                                    <Camera className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center space-x-2">
                                      <Camera className="h-5 w-5" />
                                      <span>面部验证照片</span>
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="text-sm text-muted-foreground space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium">保安:</span>
                                        <span>{record.guardName}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium">站点:</span>
                                        <span>{record.siteName}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium">时间:</span>
                                        <span>{parseBeijingTime(record.timestamp).toLocaleString('zh-CN')}</span>
                                      </div>
                                    </div>
                                    <div className="flex justify-center">
                                      <img
                                        src={record.faceImageUrl}
                                        alt={`${record.guardName}的签到照片`}
                                        className="max-w-full max-h-96 rounded-lg shadow-lg"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaXoOazleWKoOi9veWbvueTiTwvdGV4dD48L3N2Zz4=';
                                        }}
                                      />
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                            {record.reason && (
                              <div className="text-xs text-muted-foreground max-w-32 truncate" title={record.reason}>
                                {record.reason}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="在地图上查看">
                              <Navigation className="h-3 w-3" />
                            </Button>
                            {record.faceImageUrl && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0" 
                                    title="查看照片"
                                  >
                                    <Camera className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center space-x-2">
                                      <Camera className="h-5 w-5" />
                                      <span>面部验证照片</span>
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="text-sm text-muted-foreground space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium">保安:</span>
                                        <span>{record.guardName}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium">站点:</span>
                                        <span>{record.siteName}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium">时间:</span>
                                        <span>{parseBeijingTime(record.timestamp).toLocaleString('zh-CN')}</span>
                                      </div>
                                    </div>
                                    <div className="flex justify-center">
                                      <img
                                        src={record.faceImageUrl}
                                        alt={`${record.guardName}的签到照片`}
                                        className="max-w-full max-h-96 rounded-lg shadow-lg"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaXoOazleWKoOi9veWbvueTiTwvdGV4dD48L3N2Zz4=';
                                        }}
                                      />
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {pageCount > 1 && (
                <div className="flex items-center justify-center py-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => setPagination(prev => ({ 
                            ...prev, 
                            pageIndex: Math.max(0, prev.pageIndex - 1) 
                          }))}
                          disabled={pagination.pageIndex === 0}
                          className="gap-1 pl-2.5"
                        >
                          Previous
                        </Button>
                      </PaginationItem>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                        const pageNum = pagination.pageIndex < 3 
                          ? i + 1
                          : pagination.pageIndex > pageCount - 3
                          ? pageCount - 4 + i
                          : pagination.pageIndex - 1 + i;
                          
                        if (pageNum < 1 || pageNum > pageCount) return null;
                        
                        return (
                          <PaginationItem key={pageNum}>
                            <Button
                              variant={pagination.pageIndex === pageNum - 1 ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setPagination(prev => ({ 
                                ...prev, 
                                pageIndex: pageNum - 1 
                              }))}
                              className="w-9 h-9 p-0"
                            >
                              {pageNum}
                            </Button>
                          </PaginationItem>
                        );
                      })}
                      
                      {pageCount > 5 && pagination.pageIndex < pageCount - 3 && (
                        <>
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                          <PaginationItem>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPagination(prev => ({ 
                                ...prev, 
                                pageIndex: pageCount - 1 
                              }))}
                              className="w-9 h-9 p-0"
                            >
                              {pageCount}
                            </Button>
                          </PaginationItem>
                        </>
                      )}
                      
                      <PaginationItem>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => setPagination(prev => ({ 
                            ...prev, 
                            pageIndex: Math.min(pageCount - 1, prev.pageIndex + 1) 
                          }))}
                          disabled={pagination.pageIndex >= pageCount - 1}
                          className="gap-1 pr-2.5"
                        >
                          Next
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}