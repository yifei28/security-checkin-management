import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Shield,
  Eye,
  Activity,
  XCircle,
  PlayCircle,
  StopCircle,
  Timer
} from 'lucide-react'
import { request } from '../util/request'
import { BASE_URL } from '../util/config'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { WorkStatus, WorkStatusDisplayNames } from '@/types'

// Types for real dashboard data
interface DashboardData {
  totalGuards: number
  totalSites: number
  todayCheckins: number
  weeklyCheckins: number
  latestCheckins: CheckinRecord[]
  // New statistics
  averageAge: number
  teamLeaderCount: number
  teamMemberCount: number
  todayCheckinRate: number // 今日签到率 = 今日签到人数 / 总员工数
  todayCheckedInCount: number // 今日已签到人数（去重）
  weeklyTrend: { date: string; count: number }[] // 本周每天签到次数
  onDutyCount: number // 当前在岗人数
}

interface CheckinRecord {
  id: string
  guardId: string
  siteId: string
  guardName: string
  siteName: string
  timestamp: string
  status: WorkStatus | 'success' | 'failed' | 'pending'
  location: {
    lat: number
    lng: number
  }
  reason?: string
}

interface Guard {
  id: string
  name: string
  phoneNumber: string
  employeeId: string
  site: { id: string; name: string } | null
  active?: boolean
  isActive?: boolean
  age?: number
  role?: 'TEAM_LEADER' | 'TEAM_MEMBER'
}

interface Site {
  id: string
  name: string
  latitude: number
  longitude: number
  allowedRadiusMeters: number
  assignedGuardIds?: string[]
  active?: boolean
  isActive?: boolean
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const dashboardCards = [
    {
      title: "员工管理",
      description: "添加、编辑、删除保安信息",
      link: "/admin/guards",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "单位管理", 
      description: "设置单位位置与分配保安",
      link: "/admin/sites",
      icon: MapPin,
      color: "text-green-600"
    },
    {
      title: "签到记录查询",
      description: "查询保安每日签到详情", 
      link: "/admin/checkins",
      icon: CheckCircle2,
      color: "text-purple-600"
    }
  ]

  useEffect(() => {
    // Set page title
    document.title = '管理控制台 - 都豪鼎盛内部系统';

    const fetchDashboardData = async () => {
      setLoading(true)
      setError('')

      try {
        // Try the new statistics API first
        const statsRes = await request(`${BASE_URL}/api/statistics/dashboard`)

        if (statsRes.ok) {
          const statsResponse = await statsRes.json()

          if (statsResponse.success && statsResponse.data) {
            const { guards, sites, checkins, latestCheckins } = statsResponse.data

            // Format weekly trend dates for display
            const weeklyTrend = checkins.weekly.trend.map((item: { date: string; count: number }) => {
              const date = new Date(item.date)
              return {
                date: date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
                count: item.count
              }
            })

            // Map latestCheckins to our format
            const formattedLatestCheckins: CheckinRecord[] = latestCheckins.map((item: {
              id: string
              guardName: string
              siteName: string
              timestamp: string
              status?: string
              workStatus?: string  // Backend might use this field name
              reason?: string
            }) => ({
              id: item.id,
              guardId: '',
              siteId: '',
              guardName: item.guardName,
              siteName: item.siteName,
              timestamp: item.timestamp,
              // Try both status and workStatus fields
              status: (item.status || item.workStatus || 'LEGACY') as WorkStatus | 'success' | 'failed' | 'pending',
              location: { lat: 0, lng: 0 },
              reason: item.reason
            }))

            setDashboardData({
              totalGuards: guards.total,
              totalSites: sites.total,
              todayCheckins: checkins.today.total,
              weeklyCheckins: checkins.weekly.total,
              latestCheckins: formattedLatestCheckins,
              averageAge: guards.averageAge,
              teamLeaderCount: guards.teamLeaderCount,
              teamMemberCount: guards.teamMemberCount,
              todayCheckinRate: checkins.today.checkinRate,
              todayCheckedInCount: checkins.today.uniqueGuards,
              weeklyTrend,
              onDutyCount: checkins.today.onDutyCount || 0
            })
            return
          }
        }

        // Fallback: fetch from individual endpoints if statistics API not available
        console.log('[DASHBOARD] Statistics API not available, using fallback method')
        await fetchDashboardDataFallback()
      } catch (error: unknown) {
        console.error('[DASHBOARD] Fetch error:', error)
        setError(error instanceof Error ? error.message : '获取数据失败，请刷新页面重试')
      } finally {
        setLoading(false)
      }
    }

    // Fallback method using individual APIs
    const fetchDashboardDataFallback = async () => {
      const [guardsRes, sitesRes, checkinsRes] = await Promise.all([
        request(`${BASE_URL}/api/guards?pageSize=1000`),
        request(`${BASE_URL}/api/sites?pageSize=1000`),
        request(`${BASE_URL}/api/checkin?pageSize=1000`)
      ])

      if (!guardsRes.ok || !sitesRes.ok || !checkinsRes.ok) {
        throw new Error('获取数据失败')
      }

      const [guardsResponse, sitesResponse, checkinsResponse] = await Promise.all([
        guardsRes.json(),
        sitesRes.json(),
        checkinsRes.json()
      ])

      const guardsData: Guard[] = guardsResponse.success && guardsResponse.data ? guardsResponse.data : []
      const sitesData: Site[] = sitesResponse.success && sitesResponse.data ? sitesResponse.data : []
      const checkinsData: CheckinRecord[] = checkinsResponse.success && checkinsResponse.data ? checkinsResponse.data : []

      const totalGuards = guardsResponse.pagination?.total ?? guardsData.length
      const totalSites = sitesResponse.pagination?.total ?? sitesData.length

      const guardsWithAge = guardsData.filter(g => g.age && g.age > 0)
      const averageAge = guardsWithAge.length > 0
        ? Math.round(guardsWithAge.reduce((sum, g) => sum + (g.age || 0), 0) / guardsWithAge.length)
        : 0

      const teamLeaderCount = guardsData.filter(g => g.role === 'TEAM_LEADER').length
      const teamMemberCount = guardsData.filter(g => g.role === 'TEAM_MEMBER').length

      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

      const enrichedCheckins: CheckinRecord[] = checkinsData.map((record: CheckinRecord) => {
        const guard = guardsData.find(g => g.id === record.guardId)
        const site = sitesData.find(s => s.id === record.siteId)
        // Keep original status - supports both new WorkStatus and legacy values
        return {
          ...record,
          status: record.status,
          guardName: guard?.name || '未知保安',
          siteName: site?.name || '未知站点'
        }
      })

      const todayCheckinsRecords = enrichedCheckins.filter(r => new Date(r.timestamp) >= todayStart)
      const todayCheckins = todayCheckinsRecords.length
      const todayCheckedInGuards = new Set(todayCheckinsRecords.map(r => r.guardId))
      const todayCheckinRate = totalGuards > 0 ? Math.round((todayCheckedInGuards.size / totalGuards) * 100) : 0

      const weeklyCheckinsRecords = enrichedCheckins.filter(r => new Date(r.timestamp) >= weekStart)
      const weeklyCheckins = weeklyCheckinsRecords.length

      const weeklyTrend: { date: string; count: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
        const count = enrichedCheckins.filter(r => {
          const ts = new Date(r.timestamp)
          return ts >= dayStart && ts < dayEnd
        }).length
        weeklyTrend.push({ date: dateStr, count })
      }

      const latestCheckins = enrichedCheckins
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5)

      setDashboardData({
        totalGuards, totalSites, todayCheckins, weeklyCheckins,
        latestCheckins,
        averageAge, teamLeaderCount, teamMemberCount,
        todayCheckinRate, todayCheckedInCount: todayCheckedInGuards.size, weeklyTrend,
        onDutyCount: 0 // Fallback doesn't have real-time on-duty count
      })
    }

    fetchDashboardData()
  }, [])

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: WorkStatus | 'success' | 'failed' | 'pending' | string) => {
    // Normalize status to uppercase for comparison (for enum values)
    const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : status;

    switch (normalizedStatus) {
      // New WorkStatus values (uppercase)
      case 'ACTIVE':
        return {
          variant: 'default' as const,
          icon: PlayCircle,
          text: WorkStatusDisplayNames[WorkStatus.ACTIVE],
          className: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300'
        }
      case 'COMPLETED':
        return {
          variant: 'default' as const,
          icon: StopCircle,
          text: WorkStatusDisplayNames[WorkStatus.COMPLETED],
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300'
        }
      case 'TIMEOUT':
        return {
          variant: 'destructive' as const,
          icon: Timer,
          text: WorkStatusDisplayNames[WorkStatus.TIMEOUT],
          className: 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300'
        }
      case 'LEGACY':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          text: WorkStatusDisplayNames[WorkStatus.LEGACY],
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300'
        }
      // Legacy status values for backward compatibility
      case 'SUCCESS':
        return {
          variant: 'default' as const,
          icon: CheckCircle2,
          text: '成功',
          className: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300'
        }
      case 'FAILED':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          text: '失败',
          className: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-300'
        }
      case 'PENDING':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          text: '待处理',
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300'
        }
      default:
        // Handle Chinese display names from backend statistics API
        switch (status) {
          case '在岗中':
            return {
              variant: 'default' as const,
              icon: PlayCircle,
              text: '在岗中',
              className: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300'
            }
          case '已下岗':
            return {
              variant: 'default' as const,
              icon: StopCircle,
              text: '已下岗',
              className: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300'
            }
          case '超时下岗':
            return {
              variant: 'destructive' as const,
              icon: Timer,
              text: '超时下岗',
              className: 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300'
            }
          case '旧数据':
            return {
              variant: 'secondary' as const,
              icon: Clock,
              text: '旧数据',
              className: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300'
            }
          default:
            return {
              variant: 'outline' as const,
              icon: AlertTriangle,
              text: '未知',
              className: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300'
            }
        }
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">管理控制台</h1>
          <p className="text-muted-foreground">欢迎使用都豪鼎盛内部系统</p>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        
        {/* Fallback navigation cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashboardCards.map((card, index) => {
            const Icon = card.icon
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Icon className={cn("h-5 w-5", card.color)} />
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                  </div>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to={card.link}>
                    <Button className="w-full">
                      进入管理
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">管理控制台</h1>
          <p className="text-muted-foreground">
            欢迎回来，{user?.username || '管理员'}
            <span className="ml-2 text-sm">
              • 最后更新: {new Date().toLocaleTimeString('zh-CN')}
            </span>
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-green-500" />
          <span className="text-sm text-muted-foreground">
            系统运行正常
          </span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <Skeleton className="h-8 w-12 mb-2" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Content cards skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(4)].map((_, j) => (
                      <Skeleton key={j} className="h-12 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Metrics Cards */}
      {dashboardData && (
        <>
          {/* First row: 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Guards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">员工总数</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{dashboardData.totalGuards}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  队长 {dashboardData.teamLeaderCount} / 队员 {dashboardData.teamMemberCount}
                </p>
              </CardContent>
            </Card>

            {/* Total Sites */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">单位总数</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{dashboardData.totalSites}</div>
                <p className="text-sm text-muted-foreground mt-1">个签到单位</p>
              </CardContent>
            </Card>

            {/* Average Age */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均年龄</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{dashboardData.averageAge} <span className="text-xl">岁</span></div>
                <p className="text-sm text-muted-foreground mt-1">员工平均年龄</p>
              </CardContent>
            </Card>
          </div>

          {/* Second row: On Duty Count + Today's Check-in Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* On Duty Count */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">当前在岗</CardTitle>
                <PlayCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{dashboardData.onDutyCount}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  人正在工作中
                </p>
              </CardContent>
            </Card>

            {/* Today's Check-in Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">今日签到率</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{dashboardData.todayCheckinRate}%</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {dashboardData.todayCheckedInCount}/{dashboardData.totalGuards} 人已签到，共 {dashboardData.todayCheckins} 次
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Statistics and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Trend Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>本周签到趋势</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2 px-2" style={{ height: '120px' }}>
                  {dashboardData.weeklyTrend.map((day, index) => {
                    const maxCount = Math.max(...dashboardData.weeklyTrend.map(d => d.count), 1)
                    const barHeight = Math.max((day.count / maxCount) * 100, 10)
                    const isToday = index === dashboardData.weeklyTrend.length - 1
                    return (
                      <div key={day.date} className="flex flex-col items-center flex-1 group">
                        <div className={cn(
                          "text-xs font-medium mb-1",
                          isToday ? "text-blue-600" : "text-muted-foreground"
                        )}>
                          {day.count}
                        </div>
                        <div
                          className={cn(
                            "w-8 rounded-t-md transition-all duration-300",
                            isToday
                              ? "bg-blue-500"
                              : "bg-blue-200"
                          )}
                          style={{ height: `${barHeight}px` }}
                        />
                        <div className={cn(
                          "text-xs mt-2",
                          isToday ? "font-bold text-blue-600" : "text-muted-foreground"
                        )}>
                          {day.date}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="pt-3 text-center border-t mt-3">
                  <span className="text-sm text-muted-foreground">
                    本周共 <span className="font-semibold text-foreground">{dashboardData.weeklyCheckins}</span> 次签到
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Check-ins */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>最近签到记录</span>
                </CardTitle>
                <CardDescription>最新的签到动态</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.latestCheckins.slice(0, 4).map((checkin) => {
                    const statusBadge = getStatusBadge(checkin.status)
                    const StatusIcon = statusBadge.icon
                    
                    return (
                      <div key={checkin.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{checkin.guardName}</span>
                            <Badge className={statusBadge.className}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusBadge.text}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{checkin.siteName}</p>
                          {checkin.reason && (
                            <p className="text-xs text-red-600">{checkin.reason}</p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(checkin.timestamp)}
                        </div>
                      </div>
                    )
                  })}
                  
                  {dashboardData.latestCheckins.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      暂无签到记录
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      
    </div>
  )
}