import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Users, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Shield,
  Eye,
  Calendar,
  Activity,
  XCircle
} from 'lucide-react'
import { request } from '../util/request'
import { BASE_URL } from '../util/config'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

// Types for real dashboard data
interface DashboardData {
  totalGuards: number
  activeGuards: number
  totalSites: number
  activeSites: number
  todayCheckins: number
  weeklyCheckins: number
  successfulCheckins: number
  failedCheckins: number
  successRate: number
  latestCheckins: CheckinRecord[]
}

interface CheckinRecord {
  id: string
  guardId: string
  siteId: string
  guardName: string
  siteName: string
  timestamp: string
  status: 'success' | 'failed' | 'pending'
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
        // Fetch data from all endpoints in parallel
        const [guardsRes, sitesRes, checkinsRes] = await Promise.all([
          request(`${BASE_URL}/api/guards`),
          request(`${BASE_URL}/api/sites`),
          request(`${BASE_URL}/api/checkin`)
        ])

        if (!guardsRes.ok || !sitesRes.ok || !checkinsRes.ok) {
          throw new Error('获取数据失败')
        }

        const [guardsResponse, sitesResponse, checkinsResponse] = await Promise.all([
          guardsRes.json(),
          sitesRes.json(),
          checkinsRes.json()
        ])

        // Parse API responses (handle wrapped format)
        const guardsData: Guard[] = guardsResponse.success && guardsResponse.data ? guardsResponse.data : []
        const sitesData: Site[] = sitesResponse.success && sitesResponse.data ? sitesResponse.data : []
        const checkinsData: CheckinRecord[] = checkinsResponse.success && checkinsResponse.data ? checkinsResponse.data : []

        // Calculate dashboard metrics
        const totalGuards = guardsData.length
        const activeGuards = guardsData.filter(g => g.isActive !== false).length
        const totalSites = sitesData.length
        const activeSites = sitesData.filter(s => s.isActive !== false).length

        // Process checkin data
        const today = new Date()
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

        const enrichedCheckins: CheckinRecord[] = checkinsData.map((record: CheckinRecord) => {
          const guard = guardsData.find(g => g.id === record.guardId)
          const site = sitesData.find(s => s.id === record.siteId)
          
          // Map status format
          const statusMapping: { [key: string]: 'success' | 'failed' | 'pending' } = {
            'success': 'success',
            'failed': 'failed',
            'pending': 'pending',
            'SUCCESS': 'success',
            'FAILED': 'failed',
            'PENDING': 'pending'
          }

          return {
            ...record,
            status: statusMapping[record.status] || 'pending',
            guardName: guard?.name || '未知保安',
            siteName: site?.name || '未知站点'
          }
        })

        const todayCheckins = enrichedCheckins.filter(r => 
          new Date(r.timestamp) >= todayStart
        ).length

        const weeklyCheckins = enrichedCheckins.filter(r => 
          new Date(r.timestamp) >= weekStart
        ).length

        const successfulCheckins = enrichedCheckins.filter(r => r.status === 'success').length
        const failedCheckins = enrichedCheckins.filter(r => r.status === 'failed').length
        const successRate = enrichedCheckins.length > 0 
          ? Math.round((successfulCheckins / enrichedCheckins.length) * 100) 
          : 0

        // Get latest 5 checkins, sorted by timestamp
        const latestCheckins = enrichedCheckins
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5)

        setDashboardData({
          totalGuards,
          activeGuards,
          totalSites,
          activeSites,
          todayCheckins,
          weeklyCheckins,
          successfulCheckins,
          failedCheckins,
          successRate,
          latestCheckins
        })
      } catch (error: unknown) {
        console.error('[DASHBOARD] Fetch error:', error)
        setError(error instanceof Error ? error.message : '获取数据失败，请刷新页面重试')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: 'success' | 'failed' | 'pending') => {
    switch (status) {
      case 'success':
        return { 
          variant: 'default' as const, 
          icon: CheckCircle2, 
          text: '成功',
          className: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300'
        }
      case 'failed':
        return { 
          variant: 'destructive' as const, 
          icon: XCircle, 
          text: '失败',
          className: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-300'
        }
      case 'pending':
        return { 
          variant: 'secondary' as const, 
          icon: Clock, 
          text: '待处理',
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300'
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Guards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">员工总数</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.totalGuards}</div>
                <div className="flex items-center space-x-2 mt-2">
                  <Progress 
                    value={dashboardData.totalGuards > 0 ? (dashboardData.activeGuards / dashboardData.totalGuards) * 100 : 0} 
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    {dashboardData.activeGuards} 活跃
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Total Sites */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">站点总数</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.totalSites}</div>
                <div className="flex items-center space-x-2 mt-2">
                  <Progress 
                    value={dashboardData.totalSites > 0 ? (dashboardData.activeSites / dashboardData.totalSites) * 100 : 0} 
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    {dashboardData.activeSites} 活跃
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Today's Check-ins */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">今日签到</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.todayCheckins}</div>
                <p className="text-xs text-muted-foreground">
                  本周共 {dashboardData.weeklyCheckins} 次
                </p>
              </CardContent>
            </Card>

            {/* Success Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">签到成功率</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dashboardData.successRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.successfulCheckins} 成功 / {dashboardData.failedCheckins} 失败
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Statistics and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>签到状态统计</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">成功签到</span>
                    <span className="text-sm font-medium text-green-600">{dashboardData.successfulCheckins}</span>
                  </div>
                  <Progress 
                    value={dashboardData.latestCheckins.length > 0 ? (dashboardData.successfulCheckins / (dashboardData.successfulCheckins + dashboardData.failedCheckins) * 100) : 0} 
                    className="[&>div]:bg-green-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">失败签到</span>
                    <span className="text-sm font-medium text-red-600">{dashboardData.failedCheckins}</span>
                  </div>
                  <Progress 
                    value={dashboardData.latestCheckins.length > 0 ? (dashboardData.failedCheckins / (dashboardData.successfulCheckins + dashboardData.failedCheckins) * 100) : 0}
                    className="[&>div]:bg-red-500"
                  />
                </div>
                
                <div className="pt-2 text-center">
                  <span className="text-sm text-muted-foreground">
                    总计签到记录: {dashboardData.successfulCheckins + dashboardData.failedCheckins}
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
      
      {/* Navigation Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>快速操作</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashboardCards.map((card, index) => {
            const Icon = card.icon
            return (
              <Card key={index} className="hover:shadow-md transition-all duration-200 hover:scale-105">
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
    </div>
  )
}