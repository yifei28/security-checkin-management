/**
 * LocationManagementDialog Component
 *
 * Dialog for managing checkin locations for a site.
 * Supports viewing, adding, editing, and deleting locations.
 */

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Plus, Pencil, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { sitesApi } from '@/api/sitesApi';
import type { Site, CheckinLocation, CheckinLocationFormData } from '@/types';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationManagementDialogProps {
  site: Site;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationsUpdated?: () => void;
}

interface LocationFormState {
  name: string;
  latitude: string;
  longitude: string;
  allowedRadius: string;
}

const initialFormState: LocationFormState = {
  name: '',
  latitude: '',
  longitude: '',
  allowedRadius: '100',
};

// Map click handler component
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationManagementDialog({
  site,
  open,
  onOpenChange,
  onLocationsUpdated,
}: LocationManagementDialogProps) {
  const [locations, setLocations] = useState<CheckinLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<LocationFormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Map center based on site or first location
  const mapCenter: [number, number] = locations.length > 0
    ? [locations[0].latitude, locations[0].longitude]
    : [site.latitude || 39.9, site.longitude || 116.4];

  // Load locations when dialog opens
  const loadLocations = useCallback(async () => {
    if (!open) return;

    setLoading(true);
    setError(null);

    try {
      const response = await sitesApi.getLocations(site.id);
      if (response.success && response.data) {
        setLocations(response.data);
      } else {
        setLocations([]);
      }
    } catch (err) {
      console.error('[LocationManagement] Failed to load locations:', err);
      setError('加载签到地点失败');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [site.id, open]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '请输入地点名称';
    }

    const lat = parseFloat(formData.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitude = '请输入有效的纬度 (-90 到 90)';
    }

    const lng = parseFloat(formData.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.longitude = '请输入有效的经度 (-180 到 180)';
    }

    const radius = parseFloat(formData.allowedRadius);
    if (isNaN(radius) || radius <= 0 || radius > 10000) {
      errors.allowedRadius = '请输入有效的范围 (1-10000米)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle map click to set coordinates
  const handleMapClick = (lat: number, lng: number) => {
    if (isAddingNew || editingId !== null) {
      setFormData(prev => ({
        ...prev,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
      }));
    }
  };

  // Start adding new location
  const handleStartAdd = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData({
      ...initialFormState,
      latitude: site.latitude?.toString() || '',
      longitude: site.longitude?.toString() || '',
    });
    setFormErrors({});
  };

  // Start editing a location
  const handleStartEdit = (location: CheckinLocation) => {
    setEditingId(location.id);
    setIsAddingNew(false);
    setFormData({
      name: location.name,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      allowedRadius: location.allowedRadius.toString(),
    });
    setFormErrors({});
  };

  // Cancel add/edit
  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData(initialFormState);
    setFormErrors({});
  };

  // Save location (add or update)
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError(null);

    const locationData: CheckinLocationFormData = {
      name: formData.name.trim(),
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      allowedRadius: parseFloat(formData.allowedRadius),
    };

    try {
      if (isAddingNew) {
        const response = await sitesApi.addLocation(site.id, locationData);
        if (response.success && response.data) {
          setLocations(prev => [...prev, response.data]);
          handleCancel();
          onLocationsUpdated?.();
        } else {
          setError(response.message || '添加失败');
        }
      } else if (editingId !== null) {
        const response = await sitesApi.updateLocation(site.id, editingId, locationData);
        if (response.success && response.data) {
          setLocations(prev => prev.map(loc =>
            loc.id === editingId ? response.data : loc
          ));
          handleCancel();
          onLocationsUpdated?.();
        } else {
          setError(response.message || '更新失败');
        }
      }
    } catch (err) {
      console.error('[LocationManagement] Save failed:', err);
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // Delete location
  const handleDelete = async (locationId: number) => {
    if (!confirm('确定要删除这个签到地点吗？')) return;

    setSaving(true);
    setError(null);

    try {
      const response = await sitesApi.deleteLocation(site.id, locationId);
      if (response.success) {
        setLocations(prev => prev.filter(loc => loc.id !== locationId));
        if (editingId === locationId) {
          handleCancel();
        }
        onLocationsUpdated?.();
      } else {
        setError(response.message || '删除失败');
      }
    } catch (err) {
      console.error('[LocationManagement] Delete failed:', err);
      setError('删除失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // Circle colors for map
  const getCircleColor = (index: number) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return colors[index % colors.length];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            管理签到地点 - {site.name}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Location List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">签到地点列表</h3>
              <Button
                size="sm"
                onClick={handleStartAdd}
                disabled={isAddingNew || editingId !== null}
              >
                <Plus className="h-4 w-4 mr-1" />
                添加地点
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : locations.length === 0 && !isAddingNew ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无签到地点</p>
                <p className="text-xs">点击上方按钮添加</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {locations.map((location, index) => (
                  <Card
                    key={location.id}
                    className={`${editingId === location.id ? 'ring-2 ring-primary' : ''}`}
                  >
                    <CardContent className="p-3">
                      {editingId === location.id ? (
                        // Edit form
                        <LocationForm
                          formData={formData}
                          formErrors={formErrors}
                          onChange={setFormData}
                          onSave={handleSave}
                          onCancel={handleCancel}
                          saving={saving}
                        />
                      ) : (
                        // Display mode
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <div
                              className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                              style={{ backgroundColor: getCircleColor(index) }}
                            />
                            <div>
                              <p className="font-medium">{location.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                范围: {location.allowedRadius}米
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(location)}
                              disabled={isAddingNew || editingId !== null}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(location.id)}
                              disabled={saving}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Add new form */}
                {isAddingNew && (
                  <Card className="ring-2 ring-primary">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium mb-2">新签到地点</p>
                      <LocationForm
                        formData={formData}
                        formErrors={formErrors}
                        onChange={setFormData}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        saving={saving}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Right: Map Preview */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">地图预览</h3>
            <p className="text-xs text-muted-foreground">
              {isAddingNew || editingId !== null ? '点击地图选择坐标' : '显示所有签到地点'}
            </p>
            <div className="h-[400px] rounded-lg overflow-hidden border">
              <MapContainer
                center={mapCenter}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onMapClick={handleMapClick} />

                {/* Display all locations */}
                {locations.map((location, index) => (
                  <Circle
                    key={location.id}
                    center={[location.latitude, location.longitude]}
                    radius={location.allowedRadius}
                    pathOptions={{
                      color: getCircleColor(index),
                      fillColor: getCircleColor(index),
                      fillOpacity: 0.2,
                    }}
                  />
                ))}

                {/* Show marker for form position */}
                {(isAddingNew || editingId !== null) &&
                  formData.latitude &&
                  formData.longitude &&
                  !isNaN(parseFloat(formData.latitude)) &&
                  !isNaN(parseFloat(formData.longitude)) && (
                    <>
                      <Marker
                        position={[
                          parseFloat(formData.latitude),
                          parseFloat(formData.longitude),
                        ]}
                      />
                      <Circle
                        center={[
                          parseFloat(formData.latitude),
                          parseFloat(formData.longitude),
                        ]}
                        radius={parseFloat(formData.allowedRadius) || 100}
                        pathOptions={{
                          color: '#f97316',
                          fillColor: '#f97316',
                          fillOpacity: 0.3,
                          dashArray: '5, 5',
                        }}
                      />
                    </>
                  )}
              </MapContainer>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Location form component
function LocationForm({
  formData,
  formErrors,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  formData: LocationFormState;
  formErrors: Record<string, string>;
  onChange: (data: LocationFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="loc-name" className="text-xs">地点名称</Label>
        <Input
          id="loc-name"
          value={formData.name}
          onChange={(e) => onChange({ ...formData, name: e.target.value })}
          placeholder="如：东门、西门"
          className="h-8 text-sm"
        />
        {formErrors.name && (
          <p className="text-xs text-destructive mt-1">{formErrors.name}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="loc-lat" className="text-xs">纬度</Label>
          <Input
            id="loc-lat"
            value={formData.latitude}
            onChange={(e) => onChange({ ...formData, latitude: e.target.value })}
            placeholder="39.9"
            className="h-8 text-sm"
          />
          {formErrors.latitude && (
            <p className="text-xs text-destructive mt-1">{formErrors.latitude}</p>
          )}
        </div>
        <div>
          <Label htmlFor="loc-lng" className="text-xs">经度</Label>
          <Input
            id="loc-lng"
            value={formData.longitude}
            onChange={(e) => onChange({ ...formData, longitude: e.target.value })}
            placeholder="116.4"
            className="h-8 text-sm"
          />
          {formErrors.longitude && (
            <p className="text-xs text-destructive mt-1">{formErrors.longitude}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="loc-radius" className="text-xs">签到范围 (米)</Label>
        <Input
          id="loc-radius"
          value={formData.allowedRadius}
          onChange={(e) => onChange({ ...formData, allowedRadius: e.target.value })}
          placeholder="100"
          className="h-8 text-sm"
        />
        {formErrors.allowedRadius && (
          <p className="text-xs text-destructive mt-1">{formErrors.allowedRadius}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4 mr-1" />
          取消
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  );
}
