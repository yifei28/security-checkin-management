/**
 * SiteDetailMap Component
 *
 * Displays a map showing:
 * - Site check-in radius circle
 * - Optional on-duty guard markers (toggleable)
 */

import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import type { Site, OnDutyGuard, CheckinLocation } from '@/types';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

// Custom guard marker icon
const createGuardIcon = (name: string): L.DivIcon => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: #22c55e;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 11px;
        font-weight: bold;
      ">${name.charAt(0)}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

interface SiteDetailMapProps {
  site: Site;
  locations?: CheckinLocation[];  // Optional: if provided, displays multiple location circles
  onDutyGuards?: OnDutyGuard[];
  showOnDutyMarkers: boolean;
  onToggleOnDutyMarkers: () => void;
}

// Circle colors for multiple locations
const locationColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const getLocationColor = (index: number): string => locationColors[index % locationColors.length];

export default function SiteDetailMap({
  site,
  locations = [],
  onDutyGuards = [],
  showOnDutyMarkers,
  onToggleOnDutyMarkers,
}: SiteDetailMapProps) {
  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Use locations if provided, otherwise fall back to legacy single location
  const hasMultipleLocations = locations.length > 0;

  // Calculate map center
  const mapCenter: [number, number] = hasMultipleLocations
    ? [
        locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length,
        locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length,
      ]
    : [site.latitude, site.longitude];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          签到位置
          {hasMultipleLocations && (
            <span className="text-muted-foreground ml-2">({locations.length}个地点)</span>
          )}
        </span>
        <Button
          variant={showOnDutyMarkers ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleOnDutyMarkers}
          className="gap-1"
        >
          <Users className="h-3 w-3" />
          显示在岗人员
        </Button>
      </div>

      <div className="h-64 w-full rounded-lg overflow-hidden border">
        <MapContainer
          center={mapCenter}
          zoom={hasMultipleLocations ? 14 : 15}
          className="h-full w-full"
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Multiple locations mode */}
          {hasMultipleLocations ? (
            locations.map((location, index) => (
              <Circle
                key={location.id}
                center={[location.latitude, location.longitude]}
                radius={location.allowedRadius}
                pathOptions={{
                  color: getLocationColor(index),
                  fillColor: getLocationColor(index),
                  fillOpacity: 0.15,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-medium">{location.name}</div>
                    <div className="text-muted-foreground">
                      签到范围: {location.allowedRadius}m
                    </div>
                    <div className="font-mono text-xs mt-1">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </div>
                  </div>
                </Popup>
              </Circle>
            ))
          ) : (
            // Legacy single location mode
            <Circle
              center={[site.latitude, site.longitude]}
              radius={site.allowedRadiusMeters}
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
                    签到范围: {site.allowedRadiusMeters}m
                  </div>
                </div>
              </Popup>
            </Circle>
          )}

          {/* On-duty guard markers */}
          {showOnDutyMarkers && onDutyGuards.map((guard) => (
            <Marker
              key={guard.id}
              position={[guard.lat, guard.lng]}
              icon={createGuardIcon(guard.name)}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-medium text-green-600">{guard.name}</div>
                  <div className="text-muted-foreground">
                    上岗时间: {formatTime(guard.startTime)}
                  </div>
                  <div className="font-mono text-xs mt-1">
                    {guard.lat.toFixed(6)}, {guard.lng.toFixed(6)}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {hasMultipleLocations ? (
          locations.map((location, index) => (
            <div key={location.id} className="flex items-center space-x-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getLocationColor(index) }}
              />
              <span>{location.name} ({location.allowedRadius}m)</span>
            </div>
          ))
        ) : (
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full border-2 border-dashed border-blue-500" />
            <span>签到范围 ({site.allowedRadiusMeters}m)</span>
          </div>
        )}
        {showOnDutyMarkers && onDutyGuards.length > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>在岗人员 ({onDutyGuards.length}人)</span>
          </div>
        )}
      </div>
    </div>
  );
}
