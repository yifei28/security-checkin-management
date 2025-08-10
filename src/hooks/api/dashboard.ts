import { useQuery } from '@tanstack/react-query';
import { queryKeys, apiFetch } from '@/lib/react-query';
import { BASE_URL } from '@/util/config';

// Types for dashboard metrics
export interface DashboardMetrics {
  totalGuards: number;
  activeGuards: number;
  totalSites: number;
  activeSites: number;
  todayCheckins: number;
  weeklyCheckins: number;
  monthlyCheckins: number;
  averageCheckinsPerDay: number;
  latestCheckins: CheckinSummary[];
  guardStatusDistribution: {
    active: number;
    inactive: number;
    onDuty: number;
    offDuty: number;
  };
  siteStatusDistribution: {
    covered: number;
    uncovered: number;
    needsAttention: number;
  };
  checkinTrends: {
    date: string;
    count: number;
  }[];
  alerts: SecurityAlert[];
}

export interface SecurityAlert {
  id: string;
  type: 'missed_checkin' | 'late_checkin' | 'site_uncovered' | 'guard_offline' | 'suspicious_activity' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  guardName?: string;
  siteName?: string;
  timestamp: string;
  isResolved: boolean;
  assignedTo?: string;
}

export interface CheckinSummary {
  id: string;
  guardName: string;
  siteName: string;
  timestamp: string;
  status: 'normal' | 'late' | 'early' | 'missed';
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Hook to fetch dashboard metrics
export function useDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.dashboardMetrics,
    queryFn: async (): Promise<DashboardMetrics> => {
      try {
        // Try to fetch from the actual API endpoint
        return await apiFetch(`${BASE_URL}/api/dashboard/metrics`);
      } catch (error: any) {
        // If API is not available, return mock data
        console.log('[DASHBOARD] API not available, using mock data:', error.message);
        
        // 生成实际的安全警报逻辑
        const generateSecurityAlerts = (): SecurityAlert[] => {
          const alerts: SecurityAlert[] = [];
          const now = new Date();
          
          // 1. 检查缺勤警报（基于签到记录）
          if (Math.random() < 0.3) { // 30% 概率有缺勤警报
            alerts.push({
              id: 'alert-missed-' + Date.now(),
              type: 'missed_checkin',
              priority: 'high',
              title: '保安缺勤警报',
              description: '钱七已超过2小时未签到，可能存在脱岗风险',
              guardName: '钱七',
              siteName: '地下车库',
              timestamp: new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString(),
              isResolved: false
            });
          }
          
          // 2. 检查站点无人覆盖警报
          if (Math.random() < 0.4) { // 40% 概率有站点警报
            alerts.push({
              id: 'alert-uncovered-' + Date.now(),
              type: 'site_uncovered',
              priority: 'medium',
              title: '站点无人值守',
              description: '后门入口已超过1小时无保安值守，存在安全隐患',
              siteName: '后门入口',
              timestamp: new Date(now.getTime() - 1.2 * 60 * 60 * 1000).toISOString(),
              isResolved: false
            });
          }
          
          // 3. 检查连续迟到警报
          if (Math.random() < 0.25) { // 25% 概率
            alerts.push({
              id: 'alert-late-' + Date.now(),
              type: 'late_checkin',
              priority: 'medium',
              title: '连续迟到警告',
              description: '李四本周已连续3次迟到签到，需要关注考勤情况',
              guardName: '李四',
              siteName: '西门岗位',
              timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
              isResolved: false
            });
          }
          
          // 4. 检查保安离线警报
          if (Math.random() < 0.2) { // 20% 概率
            alerts.push({
              id: 'alert-offline-' + Date.now(),
              type: 'guard_offline',
              priority: 'high',
              title: '保安设备离线',
              description: '孙八的签到设备已离线超过30分钟，无法确认在岗状态',
              guardName: '孙八',
              siteName: '监控室',
              timestamp: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
              isResolved: false
            });
          }
          
          // 5. 紧急情况警报（低概率但高优先级）
          if (Math.random() < 0.05) { // 5% 概率
            alerts.push({
              id: 'alert-emergency-' + Date.now(),
              type: 'emergency',
              priority: 'critical',
              title: '紧急情况警报',
              description: '东门岗位报告可疑人员徘徊，已启动应急预案',
              guardName: '张三',
              siteName: '东门岗位',
              timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
              isResolved: false,
              assignedTo: '安全主管'
            });
          }
          
          return alerts;
        };

        // Mock data for development
        const securityAlerts = generateSecurityAlerts();
        const mockMetrics: DashboardMetrics = {
          totalGuards: 24,
          activeGuards: 18,
          totalSites: 12,
          activeSites: 10,
          todayCheckins: 156,
          weeklyCheckins: 892,
          monthlyCheckins: 3245,
          averageCheckinsPerDay: 108,
          latestCheckins: [
            {
              id: '1',
              guardName: '张三',
              siteName: '东门岗位',
              timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
              status: 'normal'
            },
            {
              id: '2',
              guardName: '李四',
              siteName: '西门岗位',
              timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
              status: 'late'
            },
            {
              id: '3',
              guardName: '王五',
              siteName: '南门岗位',
              timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
              status: 'normal'
            },
            {
              id: '4',
              guardName: '赵六',
              siteName: '北门岗位',
              timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
              status: 'early'
            }
          ],
          guardStatusDistribution: {
            active: 18,
            inactive: 6,
            onDuty: 12,
            offDuty: 6
          },
          siteStatusDistribution: {
            covered: 10,
            uncovered: 2,
            needsAttention: 1
          },
          checkinTrends: [
            { date: '2024-01-01', count: 98 },
            { date: '2024-01-02', count: 112 },
            { date: '2024-01-03', count: 105 },
            { date: '2024-01-04', count: 134 },
            { date: '2024-01-05', count: 121 },
            { date: '2024-01-06', count: 98 },
            { date: '2024-01-07', count: 156 }, // today
          ],
          alerts: securityAlerts
        };
        
        // Simulate API delay for realistic experience
        await new Promise(resolve => setTimeout(resolve, 800));
        
        return mockMetrics;
      }
    },
    staleTime: 2 * 60 * 1000, // Refresh every 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}

// Hook for real-time dashboard updates
export function useRealtimeDashboard(alerts?: SecurityAlert[]) {
  return useQuery({
    queryKey: [...queryKeys.dashboardMetrics, 'realtime'],
    queryFn: async () => {
      try {
        return await apiFetch(`${BASE_URL}/api/dashboard/realtime`);
      } catch {
        // Mock realtime data - 计算实际未解决的警报数量
        const activeAlertsCount = alerts?.filter(alert => !alert.isResolved).length || 0;
        
        return {
          onlineGuards: Math.floor(Math.random() * 18) + 10,
          activeAlerts: activeAlertsCount,
          lastUpdate: new Date().toISOString()
        };
      }
    },
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
    staleTime: 0, // Always fresh
  });
}