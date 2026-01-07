import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  MapPin, 
  Users, 
  AlertCircle,
  Activity,
  Target,
  Award,
  Zap
} from 'lucide-react';
import type { CheckInRecord, Guard, Site } from '../types';
import { WorkStatus } from '../types';

// Helper functions to check status (handles both WorkStatus and legacy values)
const isSuccessful = (status: string) => status === WorkStatus.COMPLETED || status === 'success';
const isFailed = (status: string) => status === WorkStatus.TIMEOUT || status === 'failed';
const isPending = (status: string) => status === WorkStatus.ACTIVE || status === 'pending';

// Helper to get timestamp from record (supports both new and legacy fields)
const getRecordTimestamp = (record: CheckInRecord): string => {
  return record.startTime || record.timestamp || '';
};

// Extended interface for display with related data
interface CheckInRecordDisplay extends CheckInRecord {
  guardName: string;
  guardPhone: string;
  siteName: string;
  siteCoordinates: { lat: number; lng: number };
  distanceFromSite?: number;
}

interface CheckinAnalyticsProps {
  records: CheckInRecordDisplay[];
  guards: Guard[];
  sites: Site[];
  loading?: boolean;
  error?: string;
  onClose?: () => void;
}

// Analytics time period options
type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';

interface GuardStats {
  guardId: string;
  guardName: string;
  totalCheckins: number;
  successfulCheckins: number;
  failedCheckins: number;
  successRate: number;
  lastCheckin?: Date;
  avgDistance?: number;
}

interface SiteStats {
  siteId: string;
  siteName: string;
  totalCheckins: number;
  successfulCheckins: number;
  failedCheckins: number;
  successRate: number;
  lastCheckin?: Date;
  uniqueGuards: number;
}

interface TimeStats {
  hour: number;
  totalCheckins: number;
  successfulCheckins: number;
  successRate: number;
}

interface DayStats {
  date: string;
  totalCheckins: number;
  successfulCheckins: number;
  failedCheckins: number;
  successRate: number;
}

export default function CheckinAnalytics({ 
  records, 
  loading = false, 
  error, 
  onClose 
}: CheckinAnalyticsProps) {
  // Note: guards and sites parameters removed as they're not currently used
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week');
  const [selectedMetric, setSelectedMetric] = useState<'volume' | 'success_rate' | 'distance'>('volume');

  // Filter records based on selected time period
  const filteredRecords = useMemo(() => {
    if (!records || records.length === 0) return [];
    
    const now = new Date();
    const startDate = new Date();
    
    switch (selectedPeriod) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'quarter':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return records.filter(record => {
      const timestamp = getRecordTimestamp(record);
      return timestamp ? new Date(timestamp) >= startDate : false;
    });
  }, [records, selectedPeriod]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const validRecords = filteredRecords || [];
    const successful = validRecords.filter(r => isSuccessful(r.status as string)).length;
    const failed = validRecords.filter(r => isFailed(r.status as string)).length;
    const pending = validRecords.filter(r => isPending(r.status as string)).length;
    const total = validRecords.length;
    
    return {
      total,
      successful,
      failed,
      pending,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      avgDistance: validRecords.length > 0 
        ? Math.round(validRecords.reduce((sum, r) => sum + (r.distanceFromSite || 0), 0) / validRecords.length)
        : 0,
      uniqueGuards: new Set(validRecords.map(r => r.guardId)).size,
      uniqueSites: new Set(validRecords.map(r => r.siteId)).size,
    };
  }, [filteredRecords]);

  // Calculate guard performance statistics
  const guardStats = useMemo((): GuardStats[] => {
    if (!filteredRecords || filteredRecords.length === 0) return [];
    
    const guardMap = new Map<string, GuardStats>();
    
    filteredRecords.forEach(record => {
      const guardId = record.guardId;
      const existing = guardMap.get(guardId) || {
        guardId,
        guardName: record.guardName,
        totalCheckins: 0,
        successfulCheckins: 0,
        failedCheckins: 0,
        successRate: 0,
        avgDistance: 0,
      };
      
      existing.totalCheckins++;
      if (isSuccessful(record.status as string)) existing.successfulCheckins++;
      if (isFailed(record.status as string)) existing.failedCheckins++;

      const timestamp = getRecordTimestamp(record);
      if (timestamp) {
        const recordDate = new Date(timestamp);
        if (!existing.lastCheckin || recordDate > existing.lastCheckin) {
          existing.lastCheckin = recordDate;
        }
      }

      guardMap.set(guardId, existing);
    });
    
    return Array.from(guardMap.values())
      .map(guard => ({
        ...guard,
        successRate: guard.totalCheckins > 0 
          ? Math.round((guard.successfulCheckins / guard.totalCheckins) * 100)
          : 0,
        avgDistance: filteredRecords
          .filter(r => r.guardId === guard.guardId && r.distanceFromSite !== undefined)
          .reduce((sum, r) => sum + (r.distanceFromSite || 0), 0) / 
          filteredRecords.filter(r => r.guardId === guard.guardId && r.distanceFromSite !== undefined).length || 0
      }))
      .sort((a, b) => b.totalCheckins - a.totalCheckins);
  }, [filteredRecords]);

  // Calculate site performance statistics
  const siteStats = useMemo((): SiteStats[] => {
    if (!filteredRecords || filteredRecords.length === 0) return [];
    
    const siteMap = new Map<string, SiteStats>();
    
    filteredRecords.forEach(record => {
      const siteId = record.siteId;
      const existing = siteMap.get(siteId) || {
        siteId,
        siteName: record.siteName,
        totalCheckins: 0,
        successfulCheckins: 0,
        failedCheckins: 0,
        successRate: 0,
        uniqueGuards: 0,
      };
      
      existing.totalCheckins++;
      if (isSuccessful(record.status as string)) existing.successfulCheckins++;
      if (isFailed(record.status as string)) existing.failedCheckins++;

      const timestamp = getRecordTimestamp(record);
      if (timestamp) {
        const recordDate = new Date(timestamp);
        if (!existing.lastCheckin || recordDate > existing.lastCheckin) {
          existing.lastCheckin = recordDate;
        }
      }

      siteMap.set(siteId, existing);
    });
    
    return Array.from(siteMap.values())
      .map(site => ({
        ...site,
        successRate: site.totalCheckins > 0 
          ? Math.round((site.successfulCheckins / site.totalCheckins) * 100)
          : 0,
        uniqueGuards: new Set(
          filteredRecords.filter(r => r.siteId === site.siteId).map(r => r.guardId)
        ).size
      }))
      .sort((a, b) => b.totalCheckins - a.totalCheckins);
  }, [filteredRecords]);

  // Calculate hourly patterns
  const hourlyStats = useMemo((): TimeStats[] => {
    if (!filteredRecords || filteredRecords.length === 0) {
      return Array.from({ length: 24 }, (_, hour) => ({
        hour,
        totalCheckins: 0,
        successfulCheckins: 0,
        successRate: 0,
      }));
    }
    
    const hourMap = new Map<number, TimeStats>();
    
    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourMap.set(hour, {
        hour,
        totalCheckins: 0,
        successfulCheckins: 0,
        successRate: 0,
      });
    }
    
    filteredRecords.forEach(record => {
      const timestamp = getRecordTimestamp(record);
      if (!timestamp) return;

      const hour = new Date(timestamp).getHours();
      const existing = hourMap.get(hour)!;

      existing.totalCheckins++;
      if (isSuccessful(record.status as string)) existing.successfulCheckins++;

      existing.successRate = existing.totalCheckins > 0
        ? Math.round((existing.successfulCheckins / existing.totalCheckins) * 100)
        : 0;

      hourMap.set(hour, existing);
    });
    
    return Array.from(hourMap.values()).sort((a, b) => a.hour - b.hour);
  }, [filteredRecords]);

  // Calculate daily trends (for the selected period)
  const dailyStats = useMemo((): DayStats[] => {
    if (!filteredRecords || filteredRecords.length === 0) return [];
    
    const dayMap = new Map<string, DayStats>();
    
    filteredRecords.forEach(record => {
      const timestamp = getRecordTimestamp(record);
      if (!timestamp) return;

      const date = new Date(timestamp).toISOString().split('T')[0];
      const existing = dayMap.get(date) || {
        date,
        totalCheckins: 0,
        successfulCheckins: 0,
        failedCheckins: 0,
        successRate: 0,
      };

      existing.totalCheckins++;
      if (isSuccessful(record.status as string)) existing.successfulCheckins++;
      if (isFailed(record.status as string)) existing.failedCheckins++;

      existing.successRate = existing.totalCheckins > 0
        ? Math.round((existing.successfulCheckins / existing.totalCheckins) * 100)
        : 0;

      dayMap.set(date, existing);
    });
    
    return Array.from(dayMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredRecords]);

  // Get peak activity hours
  const peakHours = useMemo(() => {
    const sortedHours = [...hourlyStats].sort((a, b) => b.totalCheckins - a.totalCheckins);
    return sortedHours.slice(0, 3);
  }, [hourlyStats]);

  // Get top performers
  const topPerformers = useMemo(() => {
    return {
      bestGuard: guardStats.length > 0 ? guardStats.reduce((best, current) => 
        current.successRate > best.successRate ? current : best
      ) : null,
      bestSite: siteStats.length > 0 ? siteStats.reduce((best, current) => 
        current.successRate > best.successRate ? current : best
      ) : null,
      mostActiveGuard: guardStats.length > 0 ? guardStats[0] : null,
      mostActiveSite: siteStats.length > 0 ? siteStats[0] : null,
    };
  }, [guardStats, siteStats]);

  if (loading) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>签到数据分析</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span>签到数据分析</span>
            </CardTitle>
            <CardDescription>
              深入分析签到数据，了解趋势、模式和绩效表现
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              关闭分析
            </Button>
          )}
        </div>

        {/* Time Period Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">时间范围:</span>
            <Select value={selectedPeriod} onValueChange={(value: TimePeriod) => setSelectedPeriod(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">今天</SelectItem>
                <SelectItem value="week">最近一周</SelectItem>
                <SelectItem value="month">最近一月</SelectItem>
                <SelectItem value="quarter">最近三月</SelectItem>
                <SelectItem value="year">最近一年</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">关键指标:</span>
            <Select value={selectedMetric} onValueChange={(value: 'volume' | 'success_rate' | 'distance') => setSelectedMetric(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volume">签到量</SelectItem>
                <SelectItem value="success_rate">成功率</SelectItem>
                <SelectItem value="distance">距离偏差</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">总签到数</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-2">{overallStats.total}</div>
              <div className="text-xs text-muted-foreground mt-1">
                涉及 {overallStats.uniqueGuards} 名保安，{overallStats.uniqueSites} 个站点
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">成功率</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-2">{overallStats.successRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {overallStats.successful} 成功 / {overallStats.failed} 失败
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-muted-foreground">平均距离</span>
              </div>
              <div className="text-2xl font-bold text-orange-600 mt-2">
                {overallStats.avgDistance > 1000 
                  ? `${(overallStats.avgDistance / 1000).toFixed(1)}km`
                  : `${overallStats.avgDistance}m`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                距站点平均偏差
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-muted-foreground">峰值时段</span>
              </div>
              <div className="text-2xl font-bold text-purple-600 mt-2">
                {peakHours.length > 0 ? `${peakHours[0].hour}:00` : '--'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                最活跃时间段
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Highlights */}
        {(topPerformers.bestGuard || topPerformers.mostActiveGuard) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Award className="h-4 w-4 text-yellow-600" />
                  <span>表现优异</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topPerformers.bestGuard && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{topPerformers.bestGuard.guardName}</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {topPerformers.bestGuard.successRate}% 成功率
                    </Badge>
                  </div>
                )}
                {topPerformers.bestSite && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{topPerformers.bestSite.siteName}</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {topPerformers.bestSite.successRate}% 成功率
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-orange-600" />
                  <span>活跃度最高</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topPerformers.mostActiveGuard && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{topPerformers.mostActiveGuard.guardName}</span>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">
                      {topPerformers.mostActiveGuard.totalCheckins} 次签到
                    </Badge>
                  </div>
                )}
                {topPerformers.mostActiveSite && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{topPerformers.mostActiveSite.siteName}</span>
                    </div>
                    <Badge className="bg-indigo-100 text-indigo-800">
                      {topPerformers.mostActiveSite.totalCheckins} 次签到
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Separator />

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Guard Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>保安绩效排行</span>
              </CardTitle>
              <CardDescription>
                按{selectedMetric === 'volume' ? '签到量' : selectedMetric === 'success_rate' ? '成功率' : '距离精度'}排序
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {guardStats.slice(0, 5).map((guard, index) => (
                  <div key={guard.guardId} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                          #{index + 1}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{guard.guardName}</div>
                        <div className="text-sm text-muted-foreground">
                          {guard.totalCheckins} 次签到
                          {guard.lastCheckin && ` • 最近: ${new Date(guard.lastCheckin).toLocaleDateString('zh-CN')}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {selectedMetric === 'volume' ? `${guard.totalCheckins} 次` : 
                         selectedMetric === 'success_rate' ? `${guard.successRate}%` : 
                         `${Math.round(guard.avgDistance || 0)}m`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        成功率 {guard.successRate}%
                      </div>
                    </div>
                  </div>
                ))}
                {guardStats.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>暂无保安数据</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Site Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>站点活跃度排行</span>
              </CardTitle>
              <CardDescription>
                按{selectedMetric === 'volume' ? '签到量' : selectedMetric === 'success_rate' ? '成功率' : '覆盖范围'}排序
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {siteStats.slice(0, 5).map((site, index) => (
                  <div key={site.siteId} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-sm">
                          #{index + 1}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{site.siteName}</div>
                        <div className="text-sm text-muted-foreground">
                          {site.totalCheckins} 次签到 • {site.uniqueGuards} 名保安
                          {site.lastCheckin && ` • 最近: ${new Date(site.lastCheckin).toLocaleDateString('zh-CN')}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {selectedMetric === 'volume' ? `${site.totalCheckins} 次` : 
                         selectedMetric === 'success_rate' ? `${site.successRate}%` : 
                         `${site.uniqueGuards} 名保安`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        成功率 {site.successRate}%
                      </div>
                    </div>
                  </div>
                ))}
                {siteStats.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>暂无站点数据</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Pattern Analysis */}
        {hourlyStats.some(h => h.totalCheckins > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>时间分布模式</span>
              </CardTitle>
              <CardDescription>
                24小时签到活跃度分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-8 md:grid-cols-12 gap-2">
                {hourlyStats.map((hourStat) => (
                  <div key={hourStat.hour} className="text-center">
                    <div 
                      className="w-full bg-gray-200 rounded-lg overflow-hidden mb-1"
                      style={{ height: '60px' }}
                    >
                      <div 
                        className={`bg-gradient-to-t from-blue-500 to-blue-300 transition-all duration-300 ${
                          hourStat.totalCheckins > 0 ? 'opacity-100' : 'opacity-20'
                        }`}
                        style={{ 
                          height: `${Math.max((hourStat.totalCheckins / Math.max(...hourlyStats.map(h => h.totalCheckins), 1)) * 100, hourStat.totalCheckins > 0 ? 10 : 0)}%` 
                        }}
                      />
                    </div>
                    <div className="text-xs font-medium">{hourStat.hour}</div>
                    <div className="text-xs text-muted-foreground">{hourStat.totalCheckins}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>0:00</span>
                <span>签到活跃度分布 (24小时制)</span>
                <span>23:00</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Trend */}
        {dailyStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>每日趋势</span>
              </CardTitle>
              <CardDescription>
                {selectedPeriod === 'today' ? '今日' : selectedPeriod === 'week' ? '最近7天' : 
                 selectedPeriod === 'month' ? '最近30天' : selectedPeriod === 'quarter' ? '最近90天' : '最近一年'}签到趋势
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dailyStats.slice(-10).map((dayStat, index) => {
                  const prevDay = index > 0 ? dailyStats[dailyStats.indexOf(dayStat) - 1] : null;
                  const trend = prevDay ? dayStat.totalCheckins - prevDay.totalCheckins : 0;
                  
                  return (
                    <div key={dayStat.date} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium">
                          {new Date(dayStat.date).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        {trend !== 0 && (
                          <div className={`flex items-center space-x-1 text-xs ${
                            trend > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            <span>{Math.abs(trend)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="text-sm font-semibold">{dayStat.totalCheckins}</div>
                          <div className="text-xs text-muted-foreground">总数</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-sm font-semibold ${
                            dayStat.successRate >= 80 ? 'text-green-600' : 
                            dayStat.successRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {dayStat.successRate}%
                          </div>
                          <div className="text-xs text-muted-foreground">成功率</div>
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 rounded-full h-2 transition-all duration-300"
                            style={{ 
                              width: `${Math.max(dayStat.totalCheckins / Math.max(...dailyStats.map(d => d.totalCheckins), 1) * 100, 0)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}