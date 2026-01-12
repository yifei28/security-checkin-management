import { useState, useEffect, useCallback } from 'react'
import { request } from '../util/request';
import { BASE_URL } from '../util/config';
import { usePagination } from '@/hooks/usePagination';
import type { PaginationResponse } from '@/hooks/usePagination';
import { TablePagination } from '@/components/TablePagination';
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
import { Plus, Search, Users, Edit, Trash2, Phone, IdCard, MapPin, AlertCircle, Crown, User, Ruler, Calendar, Award } from 'lucide-react';
import { CertificateRangeFilter } from '@/components/CertificateRangeFilter';
import { HeightRangeFilter } from '@/components/HeightRangeFilter';
import GuardBulkImport from '@/components/GuardBulkImport';
import {
  GuardRole,
  GuardRoleDisplayNames,
  Gender,
  GenderDisplayNames,
  EmploymentStatus,
  EmploymentStatusDisplayNames
} from '@/types/index';
// import { cn } from "@/lib/utils";

// Backend API interfaces (matching what the actual API expects)
interface GuardResponse {
  id: string
  name: string
  phoneNumber: string
  employeeId: string
  site: { id: string; name: string } | null
  role: GuardRole
  active?: boolean
  isActive?: boolean
  createdAt?: string
  // New fields
  idCardNumber?: string
  gender?: Gender
  birthDate?: string
  age?: number
  height?: number
  employmentStatus?: EmploymentStatus
  originalHireDate?: string
  latestHireDate?: string
  resignDate?: string | null
  // Certificate levels (1-5, undefined = no certificate)
  firefightingCertLevel?: number
  securityGuardCertLevel?: number
  securityCheckCertLevel?: number
}

interface SiteResponse {
  id: string
  name: string
  latitude?: number
  longitude?: number
  allowedRadiusMeters?: number
  assignedGuardIds?: string[]
  active?: boolean
  createdAt?: string
}

// Form data interfaces
interface GuardFormData {
  name: string
  phoneNumber: string
  siteId: string
  role: GuardRole
  // New fields
  idCardNumber: string
  gender: Gender | ''
  birthDate: string
  height: string // Use string for input, convert to number when submitting
  employmentStatus: EmploymentStatus
  originalHireDate: string
  latestHireDate: string
  // Certificate levels (1-5, empty string = no certificate)
  firefightingCertLevel: string
  securityGuardCertLevel: string
  securityCheckCertLevel: string
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

  // Default form values
  const defaultFormValues: GuardFormData = {
    name: '',
    phoneNumber: '',
    siteId: '',
    role: GuardRole.TEAM_MEMBER,
    idCardNumber: '',
    gender: '',
    birthDate: '',
    height: '',
    employmentStatus: EmploymentStatus.ACTIVE,
    originalHireDate: '',
    latestHireDate: '',
    firefightingCertLevel: '',
    securityGuardCertLevel: '',
    securityCheckCertLevel: ''
  };

  // Add form state
  const [addForm, setAddForm] = useState<GuardFormData>(defaultFormValues)

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<GuardFormData>(defaultFormValues)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Certificate filter type
  type CertRange = { min?: number; max?: number } | null

  // Server-side filter state
  const [filters, setFilters] = useState({
    name: '',
    siteId: '',
    employmentStatus: '',
    role: ''
  })

  // Certificate filters (separate for cleaner code)
  const [certFilters, setCertFilters] = useState<{
    firefighting: CertRange
    securityGuard: CertRange
    securityCheck: CertRange
  }>({
    firefighting: null,
    securityGuard: null,
    securityCheck: null
  })

  // Height filter
  const [heightFilter, setHeightFilter] = useState<{ min?: number; max?: number } | null>(null)
  // Debounced name search
  const [searchInput, setSearchInput] = useState('')

  // 分页状态
  const pagination = usePagination({
    initialPageSize: 20,
    initialSortBy: 'name',
    initialSortOrder: 'asc'
  });

  // Debounce search input - update filters.name after 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.name !== searchInput) {
        setFilters(prev => ({ ...prev, name: searchInput }))
        pagination.setPage(1) // Reset to first page when search changes
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // 封装数据获取逻辑
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      // 构建分页参数
      const queryString = pagination.getQueryString();

      // 构建筛选参数 - 只添加非空值
      const filterParams = new URLSearchParams();
      if (filters.name) filterParams.append('name', filters.name);
      if (filters.siteId && filters.siteId !== 'all') filterParams.append('siteId', filters.siteId);
      if (filters.employmentStatus && filters.employmentStatus !== 'all') filterParams.append('employmentStatus', filters.employmentStatus);
      if (filters.role && filters.role !== 'all') filterParams.append('role', filters.role);

      // 证书筛选参数
      if (certFilters.firefighting) {
        if (certFilters.firefighting.min) filterParams.append('firefightingCertMin', certFilters.firefighting.min.toString());
        if (certFilters.firefighting.max) filterParams.append('firefightingCertMax', certFilters.firefighting.max.toString());
      }
      if (certFilters.securityGuard) {
        if (certFilters.securityGuard.min) filterParams.append('securityGuardCertMin', certFilters.securityGuard.min.toString());
        if (certFilters.securityGuard.max) filterParams.append('securityGuardCertMax', certFilters.securityGuard.max.toString());
      }
      if (certFilters.securityCheck) {
        if (certFilters.securityCheck.min) filterParams.append('securityCheckCertMin', certFilters.securityCheck.min.toString());
        if (certFilters.securityCheck.max) filterParams.append('securityCheckCertMax', certFilters.securityCheck.max.toString());
      }

      // 身高筛选参数
      if (heightFilter) {
        if (heightFilter.min) filterParams.append('heightMin', heightFilter.min.toString());
        if (heightFilter.max) filterParams.append('heightMax', heightFilter.max.toString());
      }

      const filterString = filterParams.toString();
      const fullQueryString = filterString ? `${queryString}&${filterString}` : queryString;

      const [guardsRes, sitesRes] = await Promise.all([
        request(`${BASE_URL}/api/guards?${fullQueryString}`),
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

        // API returns { success: true, data: [...], pagination: {...} } format
        const guardsData = guardsResponse.success && guardsResponse.data ? guardsResponse.data : [];
        const sitesData = sitesResponse.success && sitesResponse.data ? sitesResponse.data : [];

        // 更新分页状态
        if (guardsResponse.pagination) {
          pagination.updateFromResponse(guardsResponse.pagination as PaginationResponse);
        }

        console.log('[GUARDS] Fetched with pagination:', guardsResponse.pagination);

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
    }, [pagination.page, pagination.pageSize, pagination.sortBy, pagination.sortOrder, filters.name, filters.siteId, filters.employmentStatus, filters.role, certFilters.firefighting, certFilters.securityGuard, certFilters.securityCheck, heightFilter]);

  useEffect(() => {
    // Set page title
    document.title = '员工管理 - 都豪鼎盛内部系统';
  }, []);

  // 当分页参数变化时重新获取数据
  useEffect(() => {
    fetchData();
  }, [fetchData])

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
    // New field validations
    if (!formData.idCardNumber?.trim()) {
      errors.push('身份证号不能为空');
    } else if (!/^\d{17}[\dXx]$/.test(formData.idCardNumber.trim())) {
      errors.push('请输入有效的18位身份证号');
    }
    if (!formData.gender) {
      errors.push('请选择性别');
    }
    if (!formData.birthDate?.trim()) {
      errors.push('请选择出生日期');
    }
    if (formData.height && (Number(formData.height) < 150 || Number(formData.height) > 210)) {
      errors.push('身高必须在150-210cm之间');
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
        role: addForm.role,
        // New fields
        idCardNumber: addForm.idCardNumber.trim(),
        gender: addForm.gender || undefined,
        birthDate: addForm.birthDate || undefined,
        height: addForm.height ? Number(addForm.height) : undefined,
        employmentStatus: addForm.employmentStatus,
        originalHireDate: addForm.originalHireDate || undefined,
        latestHireDate: addForm.latestHireDate || undefined,
        // Certificate levels
        firefightingCertLevel: addForm.firefightingCertLevel ? Number(addForm.firefightingCertLevel) : undefined,
        securityGuardCertLevel: addForm.securityGuardCertLevel ? Number(addForm.securityGuardCertLevel) : undefined,
        securityCheckCertLevel: addForm.securityCheckCertLevel ? Number(addForm.securityCheckCertLevel) : undefined
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
      setAddForm(defaultFormValues);
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
      role: guard.role || GuardRole.TEAM_MEMBER,
      // New fields
      idCardNumber: guard.idCardNumber || '',
      gender: guard.gender || '',
      birthDate: guard.birthDate || '',
      height: guard.height?.toString() || '',
      employmentStatus: guard.employmentStatus || EmploymentStatus.ACTIVE,
      originalHireDate: guard.originalHireDate || '',
      latestHireDate: guard.latestHireDate || '',
      // Certificate levels
      firefightingCertLevel: guard.firefightingCertLevel?.toString() || '',
      securityGuardCertLevel: guard.securityGuardCertLevel?.toString() || '',
      securityCheckCertLevel: guard.securityCheckCertLevel?.toString() || ''
    });
    setError('');
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
        id: guardIdForApi,
        name: editForm.name.trim(),
        phoneNumber: editForm.phoneNumber.trim(),
        site: siteIdNumber !== null ? { id: siteIdNumber } : null,
        role: editForm.role,
        // New fields
        idCardNumber: editForm.idCardNumber.trim(),
        gender: editForm.gender || undefined,
        birthDate: editForm.birthDate || undefined,
        height: editForm.height ? Number(editForm.height) : undefined,
        employmentStatus: editForm.employmentStatus,
        originalHireDate: editForm.originalHireDate || undefined,
        latestHireDate: editForm.latestHireDate || undefined,
        // Certificate levels
        firefightingCertLevel: editForm.firefightingCertLevel ? Number(editForm.firefightingCertLevel) : undefined,
        securityGuardCertLevel: editForm.securityGuardCertLevel ? Number(editForm.securityGuardCertLevel) : undefined,
        securityCheckCertLevel: editForm.securityCheckCertLevel ? Number(editForm.securityCheckCertLevel) : undefined
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
      setEditForm(defaultFormValues);
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

  // Handle filter changes - reset to page 1 when filter changes
  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    pagination.setPage(1) // Reset to first page when filter changes
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({ name: '', siteId: '', employmentStatus: '', role: '' })
    setCertFilters({ firefighting: null, securityGuard: null, securityCheck: null })
    setHeightFilter(null)
    setSearchInput('')
    pagination.setPage(1)
  }

  // Check if any filters are active
  const hasActiveFilters = filters.name || filters.siteId || filters.employmentStatus || filters.role ||
    certFilters.firefighting || certFilters.securityGuard || certFilters.securityCheck || heightFilter

  // Certificate filter change handler
  const handleCertFilterChange = (type: 'firefighting' | 'securityGuard' | 'securityCheck', value: { min?: number; max?: number } | null) => {
    setCertFilters(prev => ({ ...prev, [type]: value }))
    pagination.setPage(1)
  }

  // Height filter change handler
  const handleHeightFilterChange = (value: { min?: number; max?: number } | null) => {
    setHeightFilter(value)
    pagination.setPage(1)
  }

  // Helper function to reset add form
  const resetAddForm = () => {
    setAddForm(defaultFormValues);
    setError('');
  };

  // Helper function to reset edit form
  const resetEditForm = () => {
    setEditForm(defaultFormValues);
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
            管理员工信息和分配 · 共 {pagination.total} 位员工
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <GuardBulkImport
            sites={sites.map(s => ({ id: s.id, name: s.name }))}
            onImportComplete={fetchData}
          />
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
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

              <Separator className="my-4" />

              {/* New Fields Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">身份证号 *</label>
                  <Input
                    placeholder="请输入18位身份证号"
                    value={addForm.idCardNumber}
                    onChange={(e) => setAddForm(prev => ({ ...prev, idCardNumber: e.target.value }))}
                    disabled={isSubmitting}
                    maxLength={18}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">性别 *</label>
                  <Select
                    value={addForm.gender}
                    onValueChange={(value) => setAddForm(prev => ({ ...prev, gender: value as Gender }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择性别" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Gender.MALE}>
                        <span>{GenderDisplayNames[Gender.MALE]}</span>
                      </SelectItem>
                      <SelectItem value={Gender.FEMALE}>
                        <span>{GenderDisplayNames[Gender.FEMALE]}</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">出生日期 *</label>
                  <Input
                    type="date"
                    value={addForm.birthDate}
                    onChange={(e) => setAddForm(prev => ({ ...prev, birthDate: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center space-x-1">
                    <Ruler className="h-3 w-3" />
                    <span>身高 (cm)</span>
                  </label>
                  <Input
                    type="number"
                    placeholder="例如：175"
                    value={addForm.height}
                    onChange={(e) => setAddForm(prev => ({ ...prev, height: e.target.value }))}
                    disabled={isSubmitting}
                    min={150}
                    max={210}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">在职状态</label>
                  <Select
                    value={addForm.employmentStatus}
                    onValueChange={(value) => setAddForm(prev => ({ ...prev, employmentStatus: value as EmploymentStatus }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EmploymentStatusDisplayNames).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>入职日期</span>
                  </label>
                  <Input
                    type="date"
                    value={addForm.originalHireDate}
                    onChange={(e) => setAddForm(prev => ({ ...prev, originalHireDate: e.target.value, latestHireDate: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <Separator className="my-4" />

              {/* Certificate Fields */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center space-x-1">
                  <Award className="h-3 w-3" />
                  <span>持有证书</span>
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">消防证</label>
                    <Select
                      value={addForm.firefightingCertLevel}
                      onValueChange={(value) => setAddForm(prev => ({ ...prev, firefightingCertLevel: value === 'none' ? '' : value }))}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="无" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        <SelectItem value="5">5级（初级）</SelectItem>
                        <SelectItem value="4">4级（中级）</SelectItem>
                        <SelectItem value="3">3级（高级）</SelectItem>
                        <SelectItem value="2">2级（技师）</SelectItem>
                        <SelectItem value="1">1级（高级技师）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">保安证</label>
                    <Select
                      value={addForm.securityGuardCertLevel}
                      onValueChange={(value) => setAddForm(prev => ({ ...prev, securityGuardCertLevel: value === 'none' ? '' : value }))}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="无" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        <SelectItem value="5">5级（初级）</SelectItem>
                        <SelectItem value="4">4级（中级）</SelectItem>
                        <SelectItem value="3">3级（高级）</SelectItem>
                        <SelectItem value="2">2级（管理师）</SelectItem>
                        <SelectItem value="1">1级（高级管理师）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">安检证</label>
                    <Select
                      value={addForm.securityCheckCertLevel}
                      onValueChange={(value) => setAddForm(prev => ({ ...prev, securityCheckCertLevel: value === 'none' ? '' : value }))}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="无" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        <SelectItem value="5">5级（初级）</SelectItem>
                        <SelectItem value="4">4级（中级）</SelectItem>
                        <SelectItem value="3">3级（高级）</SelectItem>
                        <SelectItem value="2">2级（技师）</SelectItem>
                        <SelectItem value="1">1级（高级技师）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4">
            {/* Search row */}
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索姓名..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter dropdowns */}
              <Select value={filters.siteId || 'all'} onValueChange={(value) => handleFilterChange('siteId', value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="全部单位" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部单位</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.employmentStatus || 'all'} onValueChange={(value) => handleFilterChange('employmentStatus', value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {Object.entries(EmploymentStatusDisplayNames).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.role || 'all'} onValueChange={(value) => handleFilterChange('role', value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="全部角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部角色</SelectItem>
                  <SelectItem value={GuardRole.TEAM_LEADER}>
                    {GuardRoleDisplayNames[GuardRole.TEAM_LEADER]}
                  </SelectItem>
                  <SelectItem value={GuardRole.TEAM_MEMBER}>
                    {GuardRoleDisplayNames[GuardRole.TEAM_MEMBER]}
                  </SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  清除筛选
                </Button>
              )}
            </div>

            {/* Certificate and height filters row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">证书筛选:</span>
              <CertificateRangeFilter
                label="消防证"
                value={certFilters.firefighting}
                onChange={(value) => handleCertFilterChange('firefighting', value)}
              />
              <CertificateRangeFilter
                label="保安证"
                value={certFilters.securityGuard}
                onChange={(value) => handleCertFilterChange('securityGuard', value)}
              />
              <CertificateRangeFilter
                label="安检证"
                value={certFilters.securityCheck}
                onChange={(value) => handleCertFilterChange('securityCheck', value)}
              />
              <span className="text-sm text-muted-foreground ml-4">其他筛选:</span>
              <HeightRangeFilter
                value={heightFilter}
                onChange={handleHeightFilterChange}
              />
            </div>

            {/* Stats row */}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Badge variant="secondary">{pagination.total}</Badge>
                <span>条记录</span>
              </div>
              {pagination.totalPages > 1 && (
                <span>（第 {pagination.page}/{pagination.totalPages} 页）</span>
              )}
              {hasActiveFilters && (
                <Badge variant="outline" className="text-xs">已筛选</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
          ) : guards.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                {hasActiveFilters ? '没有找到匹配的保安' : '还没有保安记录'}
              </h3>
              <p className="mt-2 text-muted-foreground">
                {hasActiveFilters
                  ? '尝试调整筛选条件或清除筛选查看所有保安'
                  : '点击上方"添加保安"按钮开始添加第一位保安'
                }
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  清除筛选
                </Button>
              )}
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>保安信息</TableHead>
                  <TableHead>联系方式</TableHead>
                  <TableHead>身份证号</TableHead>
                  <TableHead>性别/年龄</TableHead>
                  <TableHead>身高</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>持有证书</TableHead>
                  <TableHead>在职状态</TableHead>
                  <TableHead>所属站点</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guards.map((guard) => (
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
                        <span className="font-mono">{guard.idCardNumber || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{guard.gender ? GenderDisplayNames[guard.gender] : '-'}</div>
                        <div className="text-muted-foreground">
                          {guard.age !== undefined ? `${guard.age}岁` : '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm">
                        <Ruler className="h-3 w-3 text-muted-foreground" />
                        <span>{guard.height ? `${guard.height}cm` : '-'}</span>
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
                      <div className="flex flex-wrap gap-1">
                        {guard.firefightingCertLevel && (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                            <Award className="h-3 w-3 mr-1" />
                            消防证{guard.firefightingCertLevel}级
                            {guard.firefightingCertLevel === 5 && '（初级）'}
                            {guard.firefightingCertLevel === 4 && '（中级）'}
                            {guard.firefightingCertLevel === 3 && '（高级）'}
                            {guard.firefightingCertLevel === 2 && '（技师）'}
                            {guard.firefightingCertLevel === 1 && '（高级技师）'}
                          </Badge>
                        )}
                        {guard.securityGuardCertLevel && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            <Award className="h-3 w-3 mr-1" />
                            保安证{guard.securityGuardCertLevel}级
                            {guard.securityGuardCertLevel === 5 && '（初级）'}
                            {guard.securityGuardCertLevel === 4 && '（中级）'}
                            {guard.securityGuardCertLevel === 3 && '（高级）'}
                            {guard.securityGuardCertLevel === 2 && '（管理师）'}
                            {guard.securityGuardCertLevel === 1 && '（高级管理师）'}
                          </Badge>
                        )}
                        {guard.securityCheckCertLevel && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            <Award className="h-3 w-3 mr-1" />
                            安检证{guard.securityCheckCertLevel}级
                            {guard.securityCheckCertLevel === 5 && '（初级）'}
                            {guard.securityCheckCertLevel === 4 && '（中级）'}
                            {guard.securityCheckCertLevel === 3 && '（高级）'}
                            {guard.securityCheckCertLevel === 2 && '（技师）'}
                            {guard.securityCheckCertLevel === 1 && '（高级技师）'}
                          </Badge>
                        )}
                        {!guard.firefightingCertLevel && !guard.securityGuardCertLevel && !guard.securityCheckCertLevel && (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {guard.employmentStatus ? (
                        <Badge
                          variant={
                            guard.employmentStatus === EmploymentStatus.ACTIVE ? 'default' :
                            guard.employmentStatus === EmploymentStatus.PROBATION ? 'secondary' :
                            guard.employmentStatus === EmploymentStatus.RESIGNED ? 'destructive' :
                            'outline'
                          }
                          className="text-xs"
                        >
                          {EmploymentStatusDisplayNames[guard.employmentStatus]}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">在职</Badge>
                      )}
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

            {/* 分页组件 */}
            <TablePagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetEditForm();
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

            <Separator className="my-4" />

            {/* New Fields Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">身份证号 *</label>
                <Input
                  placeholder="请输入18位身份证号"
                  value={editForm.idCardNumber}
                  onChange={(e) => setEditForm(prev => ({ ...prev, idCardNumber: e.target.value }))}
                  disabled={isSubmitting}
                  maxLength={18}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">性别 *</label>
                <Select
                  value={editForm.gender}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, gender: value as Gender }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择性别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Gender.MALE}>
                      <span>{GenderDisplayNames[Gender.MALE]}</span>
                    </SelectItem>
                    <SelectItem value={Gender.FEMALE}>
                      <span>{GenderDisplayNames[Gender.FEMALE]}</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">出生日期 *</label>
                <Input
                  type="date"
                  value={editForm.birthDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, birthDate: e.target.value }))}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center space-x-1">
                  <Ruler className="h-3 w-3" />
                  <span>身高 (cm)</span>
                </label>
                <Input
                  type="number"
                  placeholder="例如：175"
                  value={editForm.height}
                  onChange={(e) => setEditForm(prev => ({ ...prev, height: e.target.value }))}
                  disabled={isSubmitting}
                  min={150}
                  max={210}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">在职状态</label>
                <Select
                  value={editForm.employmentStatus}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, employmentStatus: value as EmploymentStatus }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EmploymentStatusDisplayNames).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>最近入职日期</span>
                </label>
                <Input
                  type="date"
                  value={editForm.latestHireDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, latestHireDate: e.target.value }))}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Separator className="my-4" />

            {/* Certificate Fields */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-1">
                <Award className="h-3 w-3" />
                <span>持有证书</span>
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">消防证</label>
                  <Select
                    value={editForm.firefightingCertLevel}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, firefightingCertLevel: value === 'none' ? '' : value }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="无" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="5">5级（初级）</SelectItem>
                      <SelectItem value="4">4级（中级）</SelectItem>
                      <SelectItem value="3">3级（高级）</SelectItem>
                      <SelectItem value="2">2级（技师）</SelectItem>
                      <SelectItem value="1">1级（高级技师）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">保安证</label>
                  <Select
                    value={editForm.securityGuardCertLevel}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, securityGuardCertLevel: value === 'none' ? '' : value }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="无" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="5">5级（初级）</SelectItem>
                      <SelectItem value="4">4级（中级）</SelectItem>
                      <SelectItem value="3">3级（高级）</SelectItem>
                      <SelectItem value="2">2级（技师）</SelectItem>
                      <SelectItem value="1">1级（高级技师）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">安检证</label>
                  <Select
                    value={editForm.securityCheckCertLevel}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, securityCheckCertLevel: value === 'none' ? '' : value }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="无" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="5">5级（初级）</SelectItem>
                      <SelectItem value="4">4级（中级）</SelectItem>
                      <SelectItem value="3">3级（高级）</SelectItem>
                      <SelectItem value="2">2级（技师）</SelectItem>
                      <SelectItem value="1">1级（高级技师）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
