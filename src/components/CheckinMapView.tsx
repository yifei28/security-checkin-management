import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { Icon, DivIcon } from 'leaflet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Users, Calendar, Camera, CheckCircle2, XCircle, Clock, AlertCircle, Layers } from 'lucide-react';
import type { CheckInRecord, Site } from '../types';
import { WorkStatus } from '../types';

// Combined status type for both new WorkStatus and legacy values
type DisplayStatus = 'success' | 'failed' | 'pending' | 'active' | WorkStatus;

// Helper to normalize status to display status
const normalizeStatus = (status: string): DisplayStatus => {
  switch (status) {
    case WorkStatus.COMPLETED:
    case 'success':
      return 'success';
    case WorkStatus.TIMEOUT:
    case 'failed':
      return 'failed';
    case WorkStatus.ACTIVE:
    case 'pending':
      return 'pending';
    default:
      return 'pending';
  }
};

// Helper to get timestamp from record
const getRecordTimestamp = (record: CheckInRecord): string => {
  return record.startTime || record.timestamp || '';
};

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Extended interface for display with related data
interface CheckInRecordDisplay extends CheckInRecord {
  guardName: string;
  guardPhone: string;
  siteName: string;
  siteCoordinates: { lat: number; lng: number };
  distanceFromSite?: number;
}

interface CheckinMapViewProps {
  records: CheckInRecordDisplay[];
  sites: Site[];
  loading?: boolean;
  error?: string;
  onClose?: () => void;
}

// Fix for default Leaflet icon issue in React
delete (Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons for different check-in statuses
const createStatusIcon = (status: DisplayStatus): DivIcon => {
  const getStatusColor = (status: DisplayStatus): string => {
    switch (status) {
      case 'success': return '#10b981'; // green-500
      case 'failed': return '#ef4444'; // red-500
      case 'pending':
      case 'active': return '#f59e0b'; // amber-500
      default: return '#6b7280'; // gray-500
    }
  };

  const getStatusSymbol = (status: DisplayStatus): string => {
    switch (status) {
      case 'success': return '✓';
      case 'failed': return '✗';
      case 'pending':
      case 'active': return '?';
      default: return '•';
    }
  };

  return new DivIcon({
    html: `
      <div style="
        background: ${getStatusColor(status)};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">${getStatusSymbol(status)}</div>
    `,
    className: 'custom-marker-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Create site icon (larger, blue)
const createSiteIcon = (): DivIcon => {
  return new DivIcon({
    html: `
      <div style="
        background: #3b82f6;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
      ">S</div>
    `,
    className: 'custom-site-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

export default function CheckinMapView({ records, sites, loading = false, error, onClose }: CheckinMapViewProps) {
  const [showSites, setShowSites] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<DisplayStatus | 'all'>('all');

  // Filter records based on selected status
  const filteredRecords = useMemo(() => {
    if (selectedStatus === 'all') return records;
    return records.filter(record => normalizeStatus(record.status as string) === selectedStatus);
  }, [records, selectedStatus]);

  // Calculate map center and bounds based on records and sites
  const mapBounds = useMemo(() => {
    const allPoints: LatLngExpression[] = [];
    
    // Add check-in locations (only if records exist and have valid location data)
    if (filteredRecords && filteredRecords.length > 0) {
      filteredRecords.forEach(record => {
        if (record.location && typeof record.location.lat === 'number' && typeof record.location.lng === 'number') {
          allPoints.push([record.location.lat, record.location.lng]);
        }
      });
    }
    
    // Add site locations (only if sites exist and showSites is true)
    if (showSites && sites && sites.length > 0) {
      sites.forEach(site => {
        if (typeof site.latitude === 'number' && typeof site.longitude === 'number') {
          allPoints.push([site.latitude, site.longitude]);
        }
      });
    }
    
    if (allPoints.length === 0) {
      // Default to Beijing coordinates if no data
      return {
        center: [39.9042, 116.4074] as LatLngExpression,
        zoom: 10
      };
    }
    
    // Calculate center point
    const latSum = allPoints.reduce((sum, point) => sum + (point as [number, number])[0], 0);
    const lngSum = allPoints.reduce((sum, point) => sum + (point as [number, number])[1], 0);
    const center: LatLngExpression = [latSum / allPoints.length, lngSum / allPoints.length];
    
    return {
      center,
      zoom: allPoints.length === 1 ? 15 : 12
    };
  }, [filteredRecords, sites, showSites]);

  // Get status badge properties
  const getStatusBadge = (status: string) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case 'success':
        return {
          icon: CheckCircle2,
          text: '成功',
          className: 'bg-green-100 text-green-800 border-green-300'
        };
      case 'failed':
        return {
          icon: XCircle,
          text: '失败',
          className: 'bg-red-100 text-red-800 border-red-300'
        };
      case 'pending':
      case 'active':
        return {
          icon: Clock,
          text: '待处理',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
        };
      default:
        return {
          icon: AlertCircle,
          text: '未知',
          className: 'bg-gray-100 text-gray-800 border-gray-300'
        };
    }
  };

  // Statistics for the current filter
  const stats = useMemo(() => {
    const validRecords = filteredRecords || [];
    return {
      total: validRecords.length,
      successful: validRecords.filter(r => normalizeStatus(r.status as string) === 'success').length,
      failed: validRecords.filter(r => normalizeStatus(r.status as string) === 'failed').length,
      pending: validRecords.filter(r => normalizeStatus(r.status as string) === 'pending').length,
    };
  }, [filteredRecords]);

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
          <div className="w-full h-96 rounded-lg bg-muted animate-pulse flex items-center justify-center">
            <div className="text-muted-foreground">加载地图中...</div>
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
            <MapPin className="h-5 w-5" />
            <span>签到位置地图</span>
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
              <MapPin className="h-5 w-5 text-blue-600" />
              <span>签到位置地图</span>
            </CardTitle>
            <CardDescription>
              显示所有签到记录的地理位置分布，包含站点位置和地理围栏
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              关闭地图
            </Button>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">总计: {stats.total}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">成功: {stats.successful}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">失败: {stats.failed}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">待处理: {stats.pending}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mt-4">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">状态:</span>
            {(['all', 'success', 'failed', 'pending'] as const).map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus(status)}
                className="h-8"
              >
                {status === 'all' ? '全部' : getStatusBadge(status).text}
              </Button>
            ))}
          </div>
          
          {/* Layer Controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant={showSites ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowSites(!showSites)}
              className="h-8"
            >
              <MapPin className="h-3 w-3 mr-1" />
              站点
            </Button>
            <Button
              variant={showGeofences ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowGeofences(!showGeofences)}
              className="h-8"
            >
              <Layers className="h-3 w-3 mr-1" />
              围栏
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="w-full h-96 rounded-lg overflow-hidden border">
          <MapContainer
            center={mapBounds.center}
            zoom={mapBounds.zoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Site Markers and Geofences */}
            {showSites && sites && sites.length > 0 && sites.map((site) => (
              <React.Fragment key={`site-${site.id}`}>
                {/* Site Marker */}
                <Marker 
                  position={[site.latitude, site.longitude]}
                  icon={createSiteIcon()}
                >
                  <Popup>
                    <div className="p-2 min-w-48">
                      <div className="font-semibold text-blue-600 mb-2 flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {site.name}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>纬度: {site.latitude.toFixed(6)}</div>
                        <div>经度: {site.longitude.toFixed(6)}</div>
                        <div>分配保安: {site.assignedGuardIds?.length || 0} 人</div>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Geofence Circle */}
                {showGeofences && (
                  <Circle
                    center={[site.latitude, site.longitude]}
                    radius={200} // 200 meters default geofence
                    pathOptions={{
                      color: '#3b82f6',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.1,
                      weight: 2,
                      dashArray: '5, 5'
                    }}
                  />
                )}
              </React.Fragment>
            ))}

            {/* Check-in Record Markers */}
            {filteredRecords && filteredRecords.length > 0 && filteredRecords
              .filter(record => record.location?.lat && record.location?.lng)
              .map((record) => {
              const statusBadge = getStatusBadge(record.status as string);
              const StatusIcon = statusBadge.icon;
              const normalizedStatus = normalizeStatus(record.status as string);

              return (
                <Marker
                  key={record.id}
                  position={[record.location!.lat, record.location!.lng]}
                  icon={createStatusIcon(normalizedStatus)}
                >
                  <Popup>
                    <div className="p-2 min-w-64">
                      {/* Status Badge */}
                      <div className="mb-3">
                        <Badge className={statusBadge.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusBadge.text}
                        </Badge>
                      </div>

                      {/* Guard Info */}
                      <div className="mb-3">
                        <div className="font-semibold text-foreground flex items-center mb-1">
                          <Users className="h-4 w-4 mr-1" />
                          {record.guardName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {record.guardPhone}
                        </div>
                      </div>

                      {/* Site Info */}
                      <div className="mb-3">
                        <div className="font-medium text-foreground flex items-center mb-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {record.siteName}
                        </div>
                        {record.distanceFromSite !== undefined && (
                          <div className="text-sm text-muted-foreground">
                            距离站点: {record.distanceFromSite > 1000 
                              ? `${(record.distanceFromSite / 1000).toFixed(1)}km` 
                              : `${Math.round(record.distanceFromSite)}m`}
                            {record.distanceFromSite > 200 && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                距离异常
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Time Info */}
                      <div className="mb-3">
                        <div className="font-medium text-foreground flex items-center mb-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          签到时间
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(() => {
                            const timestamp = getRecordTimestamp(record);
                            return timestamp ? new Date(timestamp).toLocaleString('zh-CN') : '-';
                          })()}
                        </div>
                      </div>

                      {/* Location Info */}
                      <div className="mb-3">
                        <div className="text-sm text-muted-foreground font-mono">
                          纬度: {record.location!.lat.toFixed(6)}<br />
                          经度: {record.location!.lng.toFixed(6)}
                        </div>
                      </div>

                      {/* Face Image and Reason */}
                      <div className="flex items-center justify-between">
                        {record.faceImageUrl && (
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            <Camera className="h-4 w-4 mr-1" />
                            查看照片
                          </Button>
                        )}
                        {record.reason && (
                          <div className="text-xs text-muted-foreground max-w-32 truncate" title={record.reason}>
                            {record.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Map Legend */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="text-sm font-medium mb-2">图例说明:</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow"></div>
              <span>站点位置</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow"></div>
              <span>成功签到</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow"></div>
              <span>失败签到</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-amber-500 rounded-full border-2 border-white shadow"></div>
              <span>待处理签到</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-400 bg-blue-100 rounded-full opacity-50"></div>
              <span>地理围栏</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}