import { useState, useEffect } from 'react'
import { request } from '../util/request';
import { BASE_URL } from '../util/config';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, MapPin, Edit, Trash2, Users, AlertCircle, Target, Map } from 'lucide-react';
// import { cn } from "@/lib/utils";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

// Backend API interfaces (matching actual API)
interface SiteResponse {
  id: string // Updated to match types/index.ts
  name: string
  latitude: number
  longitude: number
  allowedRadiusMeters: number
  assignedGuardIds?: string[] // Added for guard assignment
  isActive?: boolean
  createdAt?: string
}

interface GuardResponse {
  id: string
  name: string
  phoneNumber: string
  employeeId: string
  site: { id: string; name: string } | null
  isActive?: boolean
}

// Form data interfaces
interface SiteFormData {
  name: string
  latitude: string
  longitude: string
  allowedRadiusMeters: string
  assignedGuardIds: string[]
}

// interface SiteUpdateData extends SiteFormData {
//   id: string
// }

// 辅助函数：去掉 ID 前缀，返回纯数字或原始字符串
const stripIdPrefix = (id: string | number, prefix: string): string => {
  const idStr = String(id);
  if (idStr && idStr.startsWith(prefix)) {
    return idStr.replace(prefix, '');
  }
  return idStr;
};

// Map click handler component
interface LocationSelectorProps {
  position: [number, number]
  onLocationSelect: (lat: number, lng: number) => void
  radius: number
}

function LocationSelector({ position, onLocationSelect, radius }: LocationSelectorProps) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <>
      <Marker position={position} />
      <Circle
        center={position}
        radius={radius || 100}
        pathOptions={{
          fillColor: 'blue',
          fillOpacity: 0.1,
          color: 'blue',
          weight: 2
        }}
      />
    </>
  );
}

export default function SiteManagement() {
  const [sites, setSites] = useState<SiteResponse[]>([])
  const [guards, setGuards] = useState<GuardResponse[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add form state
  const [addForm, setAddForm] = useState<SiteFormData>({
    name: '',
    latitude: '',
    longitude: '',
    allowedRadiusMeters: '',
    assignedGuardIds: []
  })

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<SiteFormData>({
    name: '',
    latitude: '',
    longitude: '',
    allowedRadiusMeters: '',
    assignedGuardIds: []
  })

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mapCenter] = useState<[number, number]>([39.9042, 116.4074]) // Beijing default

  // 封装数据获取逻辑
  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const [sitesRes, guardsRes] = await Promise.all([
        request(`${BASE_URL}/api/sites`),
        request(`${BASE_URL}/api/guards`)
      ]);
        
        if (!sitesRes.ok) {
          throw new Error(`获取站点数据失败: ${sitesRes.status}`);
        }
        if (!guardsRes.ok) {
          throw new Error(`获取保安数据失败: ${guardsRes.status}`);
        }
        
        const sitesResponse = await sitesRes.json();
        const guardsResponse = await guardsRes.json();
        
        // API returns { success: true, data: [...] } format
        const sitesData = sitesResponse.success && sitesResponse.data ? sitesResponse.data : [];
        const guardsData = guardsResponse.success && guardsResponse.data ? guardsResponse.data : [];
        
        setSites(Array.isArray(sitesData) ? sitesData : []);
        setGuards(Array.isArray(guardsData) ? guardsData : []);
      } catch (error: unknown) {
        console.error('[SITES] Fetch error:', error);
        setError(error instanceof Error ? error.message : '获取数据失败，请刷新页面重试');
        setSites([]);
        setGuards([]);
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    // Set page title
    document.title = '单位管理 - 都豪鼎盛内部系统';
    fetchData();
  }, [])

  // Form validation helper
  const validateSiteForm = (formData: SiteFormData): string[] => {
    const errors: string[] = [];
    
    if (!formData.name?.trim()) {
      errors.push('站点名称不能为空');
    }
    if (!formData.latitude?.trim()) {
      errors.push('纬度不能为空');
    } else if (isNaN(parseFloat(formData.latitude)) || parseFloat(formData.latitude) < -90 || parseFloat(formData.latitude) > 90) {
      errors.push('请输入有效的纬度(-90到90之间)');
    }
    if (!formData.longitude?.trim()) {
      errors.push('经度不能为空');
    } else if (isNaN(parseFloat(formData.longitude)) || parseFloat(formData.longitude) < -180 || parseFloat(formData.longitude) > 180) {
      errors.push('请输入有效的经度(-180到180之间)');
    }
    if (!formData.allowedRadiusMeters?.trim()) {
      errors.push('签到半径不能为空');
    } else if (isNaN(parseFloat(formData.allowedRadiusMeters)) || parseFloat(formData.allowedRadiusMeters) <= 0) {
      errors.push('请输入有效的签到半径(大于0的数字)');
    }
    
    return errors;
  };

  const addSite = async () => {
    const validationErrors = validateSiteForm(addForm);
    if (validationErrors.length > 0) {
      setError(validationErrors.join('，'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        name: addForm.name.trim(),
        latitude: parseFloat(addForm.latitude),
        longitude: parseFloat(addForm.longitude), 
        allowedRadiusMeters: parseFloat(addForm.allowedRadiusMeters),
        assignedGuardIds: addForm.assignedGuardIds
      };

      const res = await request(`${BASE_URL}/api/sites`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || '添加站点失败');
      }

      const newSiteResponse = await res.json();
      // 处理可能的响应格式差异
      const newSiteData = newSiteResponse.data || newSiteResponse;
      
      // 确保ID是字符串类型，避免startsWith错误
      const newSite: SiteResponse = {
        ...newSiteData,
        id: String(newSiteData.id),
        assignedGuardIds: newSiteData.assignedGuardIds?.map((id: string | number) => String(id)) || []
      };
      
      console.log('[SITES] Add response:', newSite);
      
      // 添加新站点到列表
      setSites(prev => {
        const updatedList = [...prev, newSite];
        console.log('[SITES] Updated sites list after add:', updatedList);
        return updatedList;
      });
      
      // Reset form
      setAddForm({ name: '', latitude: '', longitude: '', allowedRadiusMeters: '', assignedGuardIds: [] });
      setIsAddDialogOpen(false);
    } catch (error: unknown) {
      console.error('[SITES] Add error:', error);
      setError(error instanceof Error ? error.message : '添加站点失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (site: SiteResponse) => {
    setEditingId(site.id);
    setEditForm({
      name: site.name,
      latitude: site.latitude.toString(),
      longitude: site.longitude.toString(),
      allowedRadiusMeters: site.allowedRadiusMeters.toString(),
      assignedGuardIds: site.assignedGuardIds || []
    });
    setError(''); // Clear any existing errors
    setIsEditDialogOpen(true);
  };


  const saveEditing = async () => {
    const validationErrors = validateSiteForm(editForm);
    if (validationErrors.length > 0) {
      setError(validationErrors.join('，'));
      return;
    }

    if (!editingId) {
      setError('编辑数据错误');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 处理 site ID，去掉可能的 'site_' 前缀
      const siteIdForApi = stripIdPrefix(editingId, 'site_');
      
      const payload = {
        id: siteIdForApi,  // 使用处理后的 ID
        name: editForm.name.trim(),
        latitude: parseFloat(editForm.latitude),
        longitude: parseFloat(editForm.longitude),
        allowedRadiusMeters: parseFloat(editForm.allowedRadiusMeters),
        assignedGuardIds: editForm.assignedGuardIds
      };

      const res = await request(`${BASE_URL}/api/sites/${siteIdForApi}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || '更新站点信息失败');
      }

      const updatedResponse = await res.json();
      // 处理可能的响应格式差异
      const updatedData = updatedResponse.data || updatedResponse;
      
      // 确保ID是字符串类型，避免startsWith错误
      const updated: SiteResponse = {
        ...updatedData,
        id: String(updatedData.id),
        assignedGuardIds: updatedData.assignedGuardIds?.map((id: string | number) => String(id)) || []
      };
      
      console.log('[SITES] Update response:', updated);
      console.log('[SITES] Current sites:', sites);
      
      // 更新列表中的站点信息
      setSites(prev => {
        const newSites = prev.map(s => {
          // 比较时确保 ID 格式一致
          if (s.id === editingId || s.id === updated.id) {
            console.log('[SITES] Updating site in list:', s.id, '->', updated);
            return updated;
          }
          return s;
        });
        console.log('[SITES] Updated sites list:', newSites);
        return newSites;
      });
      
      // Reset edit state
      setEditingId(null);
      setEditForm({ name: '', latitude: '', longitude: '', allowedRadiusMeters: '', assignedGuardIds: [] });
      setIsEditDialogOpen(false);
    } catch (error: unknown) {
      console.error('[SITES] Update error:', error);
      setError(error instanceof Error ? error.message : '更新站点信息失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSite = async (id: string) => {
    const site = sites.find(s => s.id === id);
    if (!site) return;
    
    if (!confirm(`确认删除站点 "${site.name}" 吗？此操作不可撤销。`)) {
      return;
    }

    setError('');

    try {
      // 处理 site ID，去掉可能的 'site_' 前缀
      const siteIdForApi = stripIdPrefix(id, 'site_');
      
      const res = await request(`${BASE_URL}/api/sites/${siteIdForApi}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || '删除站点失败');
      }

      setSites(prev => prev.filter(s => s.id !== id));
    } catch (error: unknown) {
      console.error('[SITES] Delete error:', error);
      setError(error instanceof Error ? error.message : '删除站点失败');
    }
  };

  // Search and filter functions
  const filteredSites = sites.filter(site => {
    const searchLower = searchQuery.toLowerCase();
    return (
      site.name.toLowerCase().includes(searchLower)
    );
  });

  // Helper functions to reset forms
  const resetAddForm = () => {
    setAddForm({ name: '', latitude: '', longitude: '', allowedRadiusMeters: '', assignedGuardIds: [] });
    setError('');
  };

  const resetEditForm = () => {
    setEditForm({ name: '', latitude: '', longitude: '', allowedRadiusMeters: '', assignedGuardIds: [] });
    setEditingId(null);
    setError('');
  };

  // Map location selection handlers
  const handleAddLocationSelect = (lat: number, lng: number) => {
    setAddForm(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
  };

  const handleEditLocationSelect = (lat: number, lng: number) => {
    setEditForm(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
  };

  // Get available guards (not assigned to the current site being edited)
  const getAvailableGuards = (currentSiteId?: string) => {
    return guards.filter(guard => 
      !guard.site || guard.site.id === currentSiteId
    );
  };


  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <MapPin className="h-8 w-8 text-green-600" />
            <span>单位管理</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            管理站点位置、签到范围和保安分配 · 共 {sites.length} 个站点
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetAddForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>添加站点</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-green-600" />
                <span>添加站点信息</span>
              </DialogTitle>
              <DialogDescription>
                请填写新站点的基本信息、位置坐标和分配保安
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column: Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">站点名称 *</label>
                  <Input
                    placeholder="请输入站点名称"
                    value={addForm.name}
                    onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">纬度 *</label>
                    <Input
                      placeholder="点击地图选择"
                      type="number"
                      step="any"
                      value={addForm.latitude}
                      onChange={(e) => setAddForm(prev => ({ ...prev, latitude: e.target.value }))}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">经度 *</label>
                    <Input
                      placeholder="点击地图选择"
                      type="number"
                      step="any"
                      value={addForm.longitude}
                      onChange={(e) => setAddForm(prev => ({ ...prev, longitude: e.target.value }))}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">签到半径 *</label>
                  <Input
                    placeholder="允许签到的半径范围（米）"
                    type="number"
                    min="1"
                    value={addForm.allowedRadiusMeters}
                    onChange={(e) => setAddForm(prev => ({ ...prev, allowedRadiusMeters: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">分配保安</label>
                  <Select 
                    value="" 
                    onValueChange={(value) => {
                      if (!addForm.assignedGuardIds.includes(value)) {
                        setAddForm(prev => ({
                          ...prev,
                          assignedGuardIds: [...prev.assignedGuardIds, value]
                        }));
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择要分配的保安" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableGuards().map((guard) => (
                        <SelectItem key={guard.id} value={guard.id}>
                          <div className="flex items-center space-x-2">
                            <Users className="h-3 w-3" />
                            <span>{guard.name} ({guard.employeeId})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Display assigned guards */}
                  {addForm.assignedGuardIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {addForm.assignedGuardIds.map(guardId => {
                        const guard = guards.find(g => g.id === guardId);
                        if (!guard) return null;
                        return (
                          <Badge key={guardId} variant="secondary" className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{guard.name}</span>
                            <button
                              onClick={() => setAddForm(prev => ({
                                ...prev,
                                assignedGuardIds: prev.assignedGuardIds.filter(id => id !== guardId)
                              }))}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
              
              {/* Right column: Map */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center space-x-1">
                  <Map className="h-3 w-3" />
                  <span>位置选择</span>
                </label>
                <div className="h-64 w-full border rounded-lg overflow-hidden">
                  <MapContainer
                    center={[
                      parseFloat(addForm.latitude) || mapCenter[0],
                      parseFloat(addForm.longitude) || mapCenter[1]
                    ]}
                    zoom={13}
                    className="h-full w-full"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <LocationSelector
                      position={[
                        parseFloat(addForm.latitude) || mapCenter[0],
                        parseFloat(addForm.longitude) || mapCenter[1]
                      ]}
                      onLocationSelect={handleAddLocationSelect}
                      radius={parseFloat(addForm.allowedRadiusMeters) || 100}
                    />
                  </MapContainer>
                </div>
                <p className="text-xs text-muted-foreground">
                  点击地图选择站点位置，蓝色圆圈表示签到范围
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button 
                onClick={addSite}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    添加中...
                  </>
                ) : (
                  '添加站点'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Stats Section */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索站点名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Badge variant="secondary">{filteredSites.length}</Badge>
            <span>个结果</span>
          </div>
        </div>
      </div>

      {/* Global Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>站点列表</span>
          </CardTitle>
          <CardDescription>
            当前系统中所有站点的详细信息、位置坐标和分配保安
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4" data-testid="loading-skeleton">
              {/* Loading Skeleton */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" data-testid="skeleton" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" data-testid="skeleton" />
                    <Skeleton className="h-4 w-[200px]" data-testid="skeleton" />
                  </div>
                  <div className="space-x-2">
                    <Skeleton className="h-8 w-16" data-testid="skeleton" />
                    <Skeleton className="h-8 w-16" data-testid="skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                {searchQuery ? '没有找到匹配的站点' : '还没有站点记录'}
              </h3>
              <p className="mt-2 text-muted-foreground">
                {searchQuery 
                  ? '尝试调整搜索条件或清空搜索框查看所有站点'
                  : '点击上方"添加站点"按钮开始添加第一个站点'
                }
              </p>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  onClick={() => setSearchQuery('')}
                  className="mt-4"
                >
                  清空搜索
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>站点信息</TableHead>
                  <TableHead>位置坐标</TableHead>
                  <TableHead>签到范围</TableHead>
                  <TableHead>分配保安</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSites.map((site) => (
                  <TableRow key={site.id} className="hover:bg-muted/50" data-testid="site-row">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-green-600" />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">{site.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {site.isActive !== false ? (
                              <Badge variant="secondary" className="text-xs">活跃</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">未激活</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center space-x-1">
                          <span className="text-muted-foreground">纬度:</span>
                          <span className="font-mono">{site.latitude.toFixed(6)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-muted-foreground">经度:</span>
                          <span className="font-mono">{site.longitude.toFixed(6)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{site.allowedRadiusMeters}m</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {site.assignedGuardIds && site.assignedGuardIds.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{site.assignedGuardIds.length}位保安</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {site.assignedGuardIds.slice(0, 2).map(guardId => {
                              const guard = guards.find(g => g.id === guardId);
                              return guard ? (
                                <Badge key={guardId} variant="outline" className="text-xs">
                                  {guard.name}
                                </Badge>
                              ) : null;
                            })}
                            {site.assignedGuardIds.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{site.assignedGuardIds.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          未分配
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(site)}
                          className="h-8 px-2"
                          data-testid={`edit-site-${site.id}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSite(site.id)}
                          className="h-8 px-2 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          data-testid={`delete-site-${site.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetEditForm();
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-green-600" />
              <span>编辑站点信息</span>
            </DialogTitle>
            <DialogDescription>
              修改站点的基本信息、位置坐标和保安分配
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column: Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">站点名称 *</label>
                <Input
                  placeholder="请输入站点名称"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">纬度 *</label>
                  <Input
                    placeholder="点击地图选择"
                    type="number"
                    step="any"
                    value={editForm.latitude}
                    onChange={(e) => setEditForm(prev => ({ ...prev, latitude: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">经度 *</label>
                  <Input
                    placeholder="点击地图选择"
                    type="number"
                    step="any"
                    value={editForm.longitude}
                    onChange={(e) => setEditForm(prev => ({ ...prev, longitude: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">签到半径 *</label>
                <Input
                  placeholder="允许签到的半径范围（米）"
                  type="number"
                  min="1"
                  value={editForm.allowedRadiusMeters}
                  onChange={(e) => setEditForm(prev => ({ ...prev, allowedRadiusMeters: e.target.value }))}
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">分配保安</label>
                <Select 
                  value="" 
                  onValueChange={(value) => {
                    if (!editForm.assignedGuardIds.includes(value)) {
                      setEditForm(prev => ({
                        ...prev,
                        assignedGuardIds: [...prev.assignedGuardIds, value]
                      }));
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择要分配的保安" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableGuards(editingId || undefined).map((guard) => (
                      <SelectItem key={guard.id} value={guard.id}>
                        <div className="flex items-center space-x-2">
                          <Users className="h-3 w-3" />
                          <span>{guard.name} ({guard.employeeId})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Display assigned guards */}
                {editForm.assignedGuardIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editForm.assignedGuardIds.map(guardId => {
                      const guard = guards.find(g => g.id === guardId);
                      if (!guard) return null;
                      return (
                        <Badge key={guardId} variant="secondary" className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{guard.name}</span>
                          <button
                            onClick={() => setEditForm(prev => ({
                              ...prev,
                              assignedGuardIds: prev.assignedGuardIds.filter(id => id !== guardId)
                            }))}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            
            {/* Right column: Map */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-1">
                <Map className="h-3 w-3" />
                <span>位置选择</span>
              </label>
              <div className="h-64 w-full border rounded-lg overflow-hidden">
                <MapContainer
                  center={[
                    parseFloat(editForm.latitude) || mapCenter[0],
                    parseFloat(editForm.longitude) || mapCenter[1]
                  ]}
                  zoom={13}
                  className="h-full w-full"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationSelector
                    position={[
                      parseFloat(editForm.latitude) || mapCenter[0],
                      parseFloat(editForm.longitude) || mapCenter[1]
                    ]}
                    onLocationSelect={handleEditLocationSelect}
                    radius={parseFloat(editForm.allowedRadiusMeters) || 100}
                  />
                </MapContainer>
              </div>
              <p className="text-xs text-muted-foreground">
                点击地图选择站点位置，蓝色圆圈表示签到范围
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button 
              onClick={saveEditing}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  保存中...
                </>
              ) : (
                '保存更改'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
