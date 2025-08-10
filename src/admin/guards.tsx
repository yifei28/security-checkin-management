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
import { Plus, Search, Users, Edit, Trash2, Phone, IdCard, MapPin, AlertCircle } from 'lucide-react';
// import { cn } from "@/lib/utils";

// Backend API interfaces (matching what the actual API expects)
interface GuardResponse {
  id: string
  name: string
  phoneNumber: string // Back to phoneNumber - this is what backend actually returns
  employeeId: string
  site: { id: string; name: string } | null
  active?: boolean
  isActive?: boolean // Backend returns both active and isActive
  createdAt?: string
}

interface SiteResponse {
  id: string // Changed to string to match API
  name: string
  latitude?: number
  longitude?: number
  allowedRadiusMeters?: number
  assignedGuardIds?: string[]
  active?: boolean // Changed from isActive to active
  createdAt?: string
}

// Form data interfaces
interface GuardFormData {
  name: string
  phoneNumber: string // Changed back to match API field name
  employeeId?: string
  siteId: string
}

// interface GuardUpdateData extends GuardFormData {
//   id: number
// }

export default function GuardManagement() {
  const [guards, setGuards] = useState<GuardResponse[]>([])
  const [sites, setSites] = useState<SiteResponse[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add form state
  const [addForm, setAddForm] = useState<GuardFormData>({
    name: '',
    phoneNumber: '',
    employeeId: '',
    siteId: ''
  })

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<GuardFormData>({
    name: '',
    phoneNumber: '',
    employeeId: '',
    siteId: ''
  })

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const [guardsRes, sitesRes] = await Promise.all([
          request(`${BASE_URL}/api/guards`),
          request(`${BASE_URL}/api/sites`)
        ]);
        
        if (!guardsRes.ok) {
          throw new Error(`获取保安数据失败: ${guardsRes.status}`);
        }
        if (!sitesRes.ok) {
          throw new Error(`获取站点数据失败: ${sitesRes.status}`);
        }
        
        const guardsResponse = await guardsRes.json();
        const sitesResponse = await sitesRes.json();
        
        // API returns { success: true, data: [...] } format
        const guardsData = guardsResponse.success && guardsResponse.data ? guardsResponse.data : [];
        const sitesData = sitesResponse.success && sitesResponse.data ? sitesResponse.data : [];
        
        setGuards(Array.isArray(guardsData) ? guardsData : []);
        setSites(Array.isArray(sitesData) ? sitesData : []);
      } catch (error: unknown) {
        console.error('[GUARDS] Fetch error:', error);
        setError(error instanceof Error ? error.message : '获取数据失败，请刷新页面重试');
        // Set empty data on error to prevent undefined access
        setGuards([]);
        setSites([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [])

  // Form validation helper
  const validateGuardForm = (formData: GuardFormData): string[] => {
    const errors: string[] = [];
    
    if (!formData.name?.trim()) {
      errors.push('姓名不能为空');
    }
    if (!formData.phoneNumber?.trim()) {
      errors.push('手机号不能为空');
    } else if (!/^1[3-9]\d{9}$/.test(formData.phoneNumber.trim())) {
      errors.push('请输入有效的手机号');
    }
    if (!formData.siteId?.trim()) {
      errors.push('请选择所属站点');
    }
    
    return errors;
  };

  const addGuard = async () => {
    const validationErrors = validateGuardForm(addForm);
    if (validationErrors.length > 0) {
      setError(validationErrors.join('，'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        name: addForm.name.trim(),
        phoneNumber: addForm.phoneNumber.trim(),
        employeeId: addForm.employeeId?.trim() || `EMP${Date.now()}`, // Generate if empty
        site: { id: Number(addForm.siteId) }
      };

      const res = await request(`${BASE_URL}/api/guards`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || '添加保安失败');
      }

      const newGuard: GuardResponse = await res.json();
      setGuards(prev => [...prev, newGuard]);
      
      // Reset form
      setAddForm({ name: '', phoneNumber: '', employeeId: '', siteId: '' });
      setIsAddDialogOpen(false);
    } catch (error: unknown) {
      console.error('[GUARDS] Add error:', error);
      setError(error instanceof Error ? error.message : '添加保安失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (guard: GuardResponse) => {
    setEditingId(guard.id);
    setEditForm({
      name: guard.name,
      phoneNumber: guard.phoneNumber,
      employeeId: guard.employeeId,
      siteId: guard.site?.id?.toString() ?? ''
    });
    setError(''); // Clear any existing errors
    setIsEditDialogOpen(true);
  };

  const saveEditing = async () => {
    const validationErrors = validateGuardForm(editForm);
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
      const payload = {
        id: editingId,
        name: editForm.name.trim(),
        employeeId: editForm.employeeId?.trim() || `EMP${Date.now()}`,
        phoneNumber: editForm.phoneNumber.trim(),
        site: { id: Number(editForm.siteId) }
      };

      const res = await request(`${BASE_URL}/api/guards/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || '更新保安信息失败');
      }

      const updated: GuardResponse = await res.json();
      setGuards(prev => prev.map(g => g.id === updated.id ? updated : g));
      
      // Reset edit state
      setEditingId(null);
      setEditForm({ name: '', phoneNumber: '', employeeId: '', siteId: '' });
      setIsEditDialogOpen(false);
    } catch (error: unknown) {
      console.error('[GUARDS] Update error:', error);
      setError(error instanceof Error ? error.message : '更新保安信息失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteGuard = async (id: string) => {
    const guard = guards.find(g => g.id === id);
    if (!guard) return;
    
    if (!confirm(`确认删除保安 "${guard.name}" 吗？此操作不可撤销。`)) {
      return;
    }

    setError('');

    try {
      const res = await request(`${BASE_URL}/api/guards/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || '删除保安失败');
      }

      setGuards(prev => prev.filter(g => g.id !== id));
    } catch (error: unknown) {
      console.error('[GUARDS] Delete error:', error);
      setError(error instanceof Error ? error.message : '删除保安失败');
    }
  };

  // Search and filter functions
  const filteredGuards = guards.filter(guard => {
    const searchLower = searchQuery.toLowerCase();
    return (
      guard.name.toLowerCase().includes(searchLower) ||
      guard.phoneNumber.includes(searchQuery) ||
      guard.employeeId.toLowerCase().includes(searchLower) ||
      guard.site?.name.toLowerCase().includes(searchLower)
    );
  });

  // Helper function to reset add form
  const resetAddForm = () => {
    setAddForm({ name: '', phoneNumber: '', employeeId: '', siteId: '' });
    setError('');
  };

  // Helper function to reset edit form
  const resetEditForm = () => {
    setEditForm({ name: '', phoneNumber: '', employeeId: '', siteId: '' });
    setEditingId(null);
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <Users className="h-8 w-8 text-blue-600" />
            <span>保安管理</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            管理保安信息和分配 · 共 {guards.length} 位保安
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetAddForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>添加保安</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>添加保安信息</span>
              </DialogTitle>
              <DialogDescription>
                请填写新保安的基本信息，系统将自动生成工号
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">姓名 *</label>
                <Input
                  placeholder="请输入保安姓名"
                  value={addForm.name}
                  onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">手机号 *</label>
                <Input
                  placeholder="请输入11位手机号"
                  value={addForm.phoneNumber}
                  onChange={(e) => setAddForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">工号</label>
                <Input
                  placeholder="选填，留空将自动生成"
                  value={addForm.employeeId}
                  onChange={(e) => setAddForm(prev => ({ ...prev, employeeId: e.target.value }))}
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">所属站点 *</label>
                <Select 
                  value={addForm.siteId} 
                  onValueChange={(value) => setAddForm(prev => ({ ...prev, siteId: value }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择所属站点" />
                  </SelectTrigger>
                  <SelectContent>
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
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
                <Button 
                  onClick={addGuard}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      添加中...
                    </>
                  ) : (
                    '添加保安'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Stats Section */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索保安姓名、手机号、工号或站点..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Badge variant="secondary">{filteredGuards.length}</Badge>
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
            <Users className="h-5 w-5" />
            <span>保安列表</span>
          </CardTitle>
          <CardDescription>
            当前系统中所有保安的详细信息和状态
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
          ) : filteredGuards.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                {searchQuery ? '没有找到匹配的保安' : '还没有保安记录'}
              </h3>
              <p className="mt-2 text-muted-foreground">
                {searchQuery 
                  ? '尝试调整搜索条件或清空搜索框查看所有保安'
                  : '点击上方"添加保安"按钮开始添加第一位保安'
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
                  <TableHead>保安信息</TableHead>
                  <TableHead>联系方式</TableHead>
                  <TableHead>工号</TableHead>
                  <TableHead>所属站点</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuards.map((guard) => (
                  <TableRow key={guard.id} className="hover:bg-muted/50" data-testid="guard-row">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">{guard.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {guard.isActive !== false ? (
                              <Badge variant="secondary" className="text-xs">活跃</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">未激活</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{guard.phoneNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm">
                        <IdCard className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono">{guard.employeeId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {guard.site ? (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{guard.site.name}</span>
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
                          onClick={() => startEditing(guard)}
                          className="h-8 px-2"
                          data-testid={`edit-guard-${guard.id}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteGuard(guard.id)}
                          className="h-8 px-2 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          data-testid={`delete-guard-${guard.id}`}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-blue-600" />
              <span>编辑保安信息</span>
            </DialogTitle>
            <DialogDescription>
              修改保安的基本信息和站点分配
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">姓名 *</label>
              <Input
                placeholder="请输入保安姓名"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">手机号 *</label>
              <Input
                placeholder="请输入11位手机号"
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">工号</label>
              <Input
                placeholder="工号不可为空"
                value={editForm.employeeId}
                onChange={(e) => setEditForm(prev => ({ ...prev, employeeId: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">所属站点 *</label>
              <Select 
                value={editForm.siteId} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, siteId: value }))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择所属站点" />
                </SelectTrigger>
                <SelectContent>
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
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
