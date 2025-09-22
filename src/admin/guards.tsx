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
import { Plus, Search, Users, Edit, Trash2, Phone, IdCard, MapPin, AlertCircle, Crown, User } from 'lucide-react';
import { GuardRole, GuardRoleDisplayNames } from '@/types/index';
// import { cn } from "@/lib/utils";

// Backend API interfaces (matching what the actual API expects)
interface GuardResponse {
  id: string
  name: string
  phoneNumber: string // Back to phoneNumber - this is what backend actually returns
  employeeId: string
  site: { id: string; name: string } | null
  role: GuardRole // 新增角色字段
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
  siteId: string
  role: GuardRole // 新增角色字段
}

// interface GuardUpdateData extends GuardFormData {
//   id: number
// }

// 辅助函数：去掉 ID 前缀，返回纯数字或原始字符串
const stripIdPrefix = (id: string | number, prefix: string): string => {
  const idStr = String(id);
  if (idStr && idStr.startsWith(prefix)) {
    return idStr.replace(prefix, '');
  }
  return idStr;
};

// 辅助函数：将带前缀的 ID 转换为数字
const extractNumberFromId = (id: string | number, prefix: string): number | null => {
  if (id === null || id === undefined) return null;
  const idStr = String(id).trim();
  if (idStr === '') return null;
  const stripped = stripIdPrefix(idStr, prefix);
  const num = Number(stripped);
  return isNaN(num) ? null : num;
};

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
    siteId: '',
    role: GuardRole.TEAM_MEMBER // 默认为队员
  })

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<GuardFormData>({
    name: '',
    phoneNumber: '',
    siteId: '',
    role: GuardRole.TEAM_MEMBER
  })

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 封装数据获取逻辑
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
        
        console.log('[GUARDS] Fetched sites:', sitesData);
        console.log('[GUARDS] First site example:', sitesData[0]);
        
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

  useEffect(() => {
    // Set page title
    document.title = '员工管理 - 都豪鼎盛内部系统';
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
      console.log('[GUARDS] Form state before submit:', addForm);
      console.log('[GUARDS] Site ID value:', addForm.siteId, 'Type:', typeof addForm.siteId, 'Length:', addForm.siteId.length);
      
      // site.id 必须是数字类型，使用辅助函数处理
      const siteIdNumber = extractNumberFromId(addForm.siteId, 'site_');
      
      const payload = {
        name: addForm.name.trim(),
        phoneNumber: addForm.phoneNumber.trim(),
        site: siteIdNumber !== null ? { id: siteIdNumber } : null,
        role: addForm.role // 包含角色字段
      };

      console.log('[GUARDS] Final payload:', payload);

      const res = await request(`${BASE_URL}/api/guards`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || '添加保安失败');
      }

      const newGuardResponse = await res.json();
      // 处理可能的响应格式差异
      const newGuardData = newGuardResponse.data || newGuardResponse;
      
      // 确保ID是字符串类型，避免startsWith错误
      const newGuard: GuardResponse = {
        ...newGuardData,
        id: String(newGuardData.id),
        site: newGuardData.site ? {
          ...newGuardData.site,
          id: String(newGuardData.site.id)
        } : null
      };
      
      console.log('[GUARDS] Add response:', newGuard);
      
      // 添加新保安到列表
      setGuards(prev => {
        const updatedList = [...prev, newGuard];
        console.log('[GUARDS] Updated guards list after add:', updatedList);
        return updatedList;
      });
      
      // Reset form
      setAddForm({ name: '', phoneNumber: '', siteId: '', role: GuardRole.TEAM_MEMBER });
      setIsAddDialogOpen(false);
      
      // 可选：重新获取数据以确保同步
      // await fetchData();
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
      siteId: guard.site?.id?.toString() ?? '',
      role: guard.role || GuardRole.TEAM_MEMBER // 确保有默认值
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
      // 使用辅助函数处理 ID
      const siteIdNumber = extractNumberFromId(editForm.siteId, 'site_');
      const guardIdForApi = stripIdPrefix(editingId, 'guard_');
      
      const payload = {
        id: guardIdForApi,  // 使用处理后的 ID
        name: editForm.name.trim(),
        phoneNumber: editForm.phoneNumber.trim(),
        site: siteIdNumber !== null ? { id: siteIdNumber } : null,
        role: editForm.role // 包含角色字段
      };

      const res = await request(`${BASE_URL}/api/guards/${guardIdForApi}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || '更新保安信息失败');
      }

      const updatedResponse = await res.json();
      // 处理可能的响应格式差异
      const updatedData = updatedResponse.data || updatedResponse;
      
      // 确保ID是字符串类型，避免startsWith错误
      const updated: GuardResponse = {
        ...updatedData,
        id: String(updatedData.id),
        site: updatedData.site ? {
          ...updatedData.site,
          id: String(updatedData.site.id)
        } : null
      };
      
      console.log('[GUARDS] Update response:', updated);
      console.log('[GUARDS] Current guards:', guards);
      
      // 更新列表中的保安信息
      setGuards(prev => {
        const newGuards = prev.map(g => {
          // 比较时确保 ID 格式一致
          if (g.id === editingId || g.id === updated.id) {
            console.log('[GUARDS] Updating guard in list:', g.id, '->', updated);
            return updated;
          }
          return g;
        });
        console.log('[GUARDS] Updated guards list:', newGuards);
        return newGuards;
      });
      
      // Reset edit state
      setEditingId(null);
      setEditForm({ name: '', phoneNumber: '', siteId: '', role: GuardRole.TEAM_MEMBER });
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
      // 使用辅助函数处理 guard ID
      const guardIdForApi = stripIdPrefix(id, 'guard_');
      
      const res = await request(`${BASE_URL}/api/guards/${guardIdForApi}`, {
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
      (guard.employeeId && guard.employeeId.toLowerCase().includes(searchLower)) ||
      guard.site?.name.toLowerCase().includes(searchLower)
    );
  });

  // Helper function to reset add form
  const resetAddForm = () => {
    setAddForm({ name: '', phoneNumber: '', siteId: '', role: GuardRole.TEAM_MEMBER });
    setError('');
  };

  // Helper function to reset edit form
  const resetEditForm = () => {
    setEditForm({ name: '', phoneNumber: '', siteId: '', role: GuardRole.TEAM_MEMBER });
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
            <span>员工管理</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            管理员工信息和分配 · 共 {guards.length} 位员工
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
                <label className="text-sm font-medium">角色 *</label>
                <Select 
                  value={addForm.role} 
                  onValueChange={(value) => setAddForm(prev => ({ ...prev, role: value as GuardRole }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GuardRole.TEAM_MEMBER}>
                      <div className="flex items-center space-x-2">
                        <User className="h-3 w-3 text-blue-500" />
                        <span>{GuardRoleDisplayNames[GuardRole.TEAM_MEMBER]}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={GuardRole.TEAM_LEADER}>
                      <div className="flex items-center space-x-2">
                        <Crown className="h-3 w-3 text-amber-500" />
                        <span>{GuardRoleDisplayNames[GuardRole.TEAM_LEADER]}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">所属站点 *</label>
                <Select 
                  value={addForm.siteId} 
                  onValueChange={(value) => {
                    console.log('[GUARDS] Select onValueChange triggered');
                    console.log('[GUARDS] Selected value:', value, 'Type:', typeof value);
                    console.log('[GUARDS] Previous form state:', addForm);
                    const newForm = { ...addForm, siteId: value };
                    console.log('[GUARDS] New form state:', newForm);
                    setAddForm(newForm);
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择所属站点" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => {
                      console.log('[GUARDS] Rendering site option:', site);
                      const siteIdStr = site.id ? site.id.toString() : '';
                      return (
                        <SelectItem key={site.id} value={siteIdStr}>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-3 w-3" />
                            <span>{site.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
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
                  <TableHead>角色</TableHead>
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
                      <div className="flex items-center space-x-1">
                        {guard.role === GuardRole.TEAM_LEADER ? (
                          <Crown className="h-3 w-3 text-amber-500" />
                        ) : (
                          <User className="h-3 w-3 text-blue-500" />
                        )}
                        <Badge
                          variant={guard.role === GuardRole.TEAM_LEADER ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {GuardRoleDisplayNames[guard.role] || '队员'}
                        </Badge>
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
              <label className="text-sm font-medium">角色 *</label>
              <Select 
                value={editForm.role} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value as GuardRole }))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GuardRole.TEAM_MEMBER}>
                    <div className="flex items-center space-x-2">
                      <User className="h-3 w-3 text-blue-500" />
                      <span>{GuardRoleDisplayNames[GuardRole.TEAM_MEMBER]}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={GuardRole.TEAM_LEADER}>
                    <div className="flex items-center space-x-2">
                      <Crown className="h-3 w-3 text-amber-500" />
                      <span>{GuardRoleDisplayNames[GuardRole.TEAM_LEADER]}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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
                    <SelectItem key={site.id} value={site.id.toString()}>
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
