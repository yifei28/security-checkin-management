/**
 * WorkTrajectoryMap Component
 *
 * Displays a map showing work session trajectory:
 * - Start location (green marker)
 * - End location (red marker)
 * - Spot check locations (blue/orange markers)
 * - Site allowed radius circle
 */

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { CheckInRecord, SpotCheck, Site } from '../types';
import { SpotCheckStatus, SpotCheckStatusDisplayNames } from '../types';

// Fix for default markers in react-leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-expect-error - Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom marker icons
const createCustomIcon = (color: string, label?: string): L.DivIcon => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: bold;
      ">${label || ''}</div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const startIcon = createCustomIcon('#22c55e', '上'); // Green - Start
const endIcon = createCustomIcon('#ef4444', '下'); // Red - End
const spotCheckPassedIcon = createCustomIcon('#3b82f6'); // Blue - Passed
const spotCheckMissedIcon = createCustomIcon('#f97316'); // Orange - Missed
const spotCheckPendingIcon = createCustomIcon('#eab308'); // Yellow - Pending

interface WorkTrajectoryMapProps {
  workRecord: CheckInRecord;
  spotChecks: SpotCheck[];
  site?: Site;
  className?: string;
}

// Component to fit map bounds to all markers
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    }
  }, [map, bounds]);
  return null;
}

// Helper to format timestamp
const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function WorkTrajectoryMap({
  workRecord,
  spotChecks,
  site,
  className = '',
}: WorkTrajectoryMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Calculate all marker positions and bounds
  const { markers, bounds, center } = useMemo(() => {
    const allPositions: [number, number][] = [];
    const markerList: Array<{
      type: 'start' | 'end' | 'spotCheck';
      position: [number, number];
      data: SpotCheck | null;
      time?: string;
    }> = [];

    // Add start position (support both new and legacy field names)
    const startLat = workRecord.startLatitude || workRecord.location?.lat;
    const startLng = workRecord.startLongitude || workRecord.location?.lng;
    if (startLat && startLng) {
      const pos: [number, number] = [startLat, startLng];
      allPositions.push(pos);
      markerList.push({
        type: 'start',
        position: pos,
        data: null,
        time: workRecord.startTime || workRecord.timestamp,
      });
    }

    // Add end position
    if (workRecord.endLatitude && workRecord.endLongitude) {
      const pos: [number, number] = [workRecord.endLatitude, workRecord.endLongitude];
      allPositions.push(pos);
      markerList.push({
        type: 'end',
        position: pos,
        data: null,
        time: workRecord.endTime || undefined,
      });
    }

    // Add spot check positions
    spotChecks.forEach((sc) => {
      if (sc.latitude && sc.longitude) {
        const pos: [number, number] = [sc.latitude, sc.longitude];
        allPositions.push(pos);
        markerList.push({
          type: 'spotCheck',
          position: pos,
          data: sc,
          time: sc.completedAt || sc.createdAt,
        });
      }
    });

    // Add site center if available
    if (site) {
      allPositions.push([site.latitude, site.longitude]);
    }

    // Calculate bounds
    let boundsValue: L.LatLngBoundsExpression | null = null;
    let centerValue: [number, number] = [31.2304, 121.4737]; // Default: Shanghai

    if (allPositions.length > 0) {
      if (allPositions.length === 1) {
        centerValue = allPositions[0];
      } else {
        boundsValue = allPositions as L.LatLngBoundsExpression;
        // Calculate center as average of all positions
        const avgLat = allPositions.reduce((sum, p) => sum + p[0], 0) / allPositions.length;
        const avgLng = allPositions.reduce((sum, p) => sum + p[1], 0) / allPositions.length;
        centerValue = [avgLat, avgLng];
      }
    } else if (site) {
      centerValue = [site.latitude, site.longitude];
    }

    return {
      markers: markerList,
      bounds: boundsValue,
      center: centerValue,
    };
  }, [workRecord, spotChecks, site]);

  // Get spot check icon based on status
  const getSpotCheckIcon = (status: SpotCheckStatus): L.DivIcon => {
    switch (status) {
      case SpotCheckStatus.PASSED:
        return spotCheckPassedIcon;
      case SpotCheckStatus.MISSED:
        return spotCheckMissedIcon;
      case SpotCheckStatus.PENDING:
        return spotCheckPendingIcon;
      default:
        return spotCheckPendingIcon;
    }
  };

  if (markers.length === 0 && !site) {
    return (
      <div className={`flex items-center justify-center h-48 bg-muted/30 rounded-lg ${className}`}>
        <p className="text-muted-foreground text-sm">暂无位置数据</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <div className="text-sm font-medium text-muted-foreground mb-2">
        工作轨迹地图
      </div>
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={15}
        style={{ height: '250px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {bounds && <FitBounds bounds={bounds} />}

        {/* Site allowed radius circle */}
        {site && (
          <Circle
            center={[site.latitude, site.longitude]}
            radius={site.allowedRadiusMeters || 500}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5',
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-medium">{site.name}</div>
                <div className="text-muted-foreground">
                  允许范围: {site.allowedRadiusMeters || 500}m
                </div>
              </div>
            </Popup>
          </Circle>
        )}

        {/* Markers */}
        {markers.map((marker, index) => {
          let icon: L.DivIcon;
          let popupContent: React.ReactNode;

          if (marker.type === 'start') {
            icon = startIcon;
            popupContent = (
              <div className="text-sm">
                <div className="font-medium text-green-600">上岗位置</div>
                <div className="text-muted-foreground">
                  时间: {marker.time ? formatTime(marker.time) : '-'}
                </div>
                <div className="font-mono text-xs">
                  {marker.position[0].toFixed(6)}, {marker.position[1].toFixed(6)}
                </div>
              </div>
            );
          } else if (marker.type === 'end') {
            icon = endIcon;
            popupContent = (
              <div className="text-sm">
                <div className="font-medium text-red-600">下岗位置</div>
                <div className="text-muted-foreground">
                  时间: {marker.time ? formatTime(marker.time) : '-'}
                </div>
                <div className="font-mono text-xs">
                  {marker.position[0].toFixed(6)}, {marker.position[1].toFixed(6)}
                </div>
              </div>
            );
          } else {
            const spotCheck = marker.data as SpotCheck;
            icon = getSpotCheckIcon(spotCheck.status as SpotCheckStatus);
            const statusName = SpotCheckStatusDisplayNames[spotCheck.status as SpotCheckStatus] || '未知';
            popupContent = (
              <div className="text-sm">
                <div className="font-medium text-blue-600">
                  抽查验证 - {statusName}
                </div>
                <div className="text-muted-foreground">
                  时间: {marker.time ? formatTime(marker.time) : '-'}
                </div>
                <div className="font-mono text-xs">
                  {marker.position[0].toFixed(6)}, {marker.position[1].toFixed(6)}
                </div>
              </div>
            );
          }

          return (
            <Marker
              key={`${marker.type}-${index}`}
              position={marker.position}
              icon={icon}
            >
              <Popup>{popupContent}</Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>上岗</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>下岗</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>抽查通过</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>抽查未通过</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full border-2 border-dashed border-blue-500" />
          <span>允许范围</span>
        </div>
      </div>
    </div>
  );
}
