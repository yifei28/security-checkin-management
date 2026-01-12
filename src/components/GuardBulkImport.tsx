import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Info
} from 'lucide-react';
import { request } from '@/util/request';
import { BASE_URL } from '@/util/config';
import { getToken } from '@/util/auth';
import {
  GuardRole,
  Gender,
  EmploymentStatus,
} from '@/types/index';

// Site interface for matching
interface SiteOption {
  id: string;
  name: string;
}

// Raw data from file
interface RawGuardData {
  姓名?: string;
  手机号?: string;
  身份证号?: string;
  性别?: string;
  出生日期?: string;
  所属单位?: string;
  角色?: string;
  '身高(cm)'?: string;
  在职状态?: string;
  入职日期?: string;
  消防证等级?: string;
  保安证等级?: string;
  安检证等级?: string;
  [key: string]: string | undefined;
}

// Validated guard data ready for API
interface ValidatedGuardData {
  name: string;
  phoneNumber: string;
  idCardNumber: string;
  gender: Gender;
  birthDate: string;
  siteId: number;
  siteName: string;
  role: GuardRole;
  height?: number;
  employmentStatus: EmploymentStatus;
  originalHireDate?: string;
  latestHireDate?: string;
  firefightingCertLevel?: number;
  securityGuardCertLevel?: number;
  securityCheckCertLevel?: number;
}

// Import error
interface ImportError {
  row: number;
  field: string;
  value: string;
  message: string;
}

// Import result
interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

interface GuardBulkImportProps {
  sites: SiteOption[];
  onImportComplete: () => void;
}

// Helper: Convert Chinese gender to enum
const parseGender = (value: string | undefined): Gender | null => {
  if (!value) return null;
  const v = value.trim();
  if (v === '男' || v === 'MALE' || v === 'male') return Gender.MALE;
  if (v === '女' || v === 'FEMALE' || v === 'female') return Gender.FEMALE;
  return null;
};

// Helper: Convert Chinese role to enum
const parseRole = (value: string | undefined): GuardRole => {
  if (!value) return GuardRole.TEAM_MEMBER;
  const v = value.trim();
  if (v === '队长' || v === 'TEAM_LEADER') return GuardRole.TEAM_LEADER;
  return GuardRole.TEAM_MEMBER;
};

// Helper: Convert Chinese employment status to enum
const parseEmploymentStatus = (value: string | undefined): EmploymentStatus => {
  if (!value) return EmploymentStatus.ACTIVE;
  const v = value.trim();
  if (v === '在职' || v === 'ACTIVE') return EmploymentStatus.ACTIVE;
  if (v === '试用' || v === 'PROBATION') return EmploymentStatus.PROBATION;
  if (v === '离职' || v === 'RESIGNED') return EmploymentStatus.RESIGNED;
  if (v === '待岗' || v === '停职' || v === 'SUSPENDED') return EmploymentStatus.SUSPENDED;
  return EmploymentStatus.ACTIVE;
};

// Helper: Parse date from various formats
const parseDate = (value: string | undefined): string | null => {
  if (!value) return null;
  const v = value.trim();

  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // Try YYYY/MM/DD format
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(v)) return v.replace(/\//g, '-');

  // Try Excel serial date number
  if (/^\d+$/.test(v)) {
    const num = parseInt(v);
    if (num > 25000 && num < 60000) {
      // Excel date serial number
      const date = new Date((num - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
  }

  // Try to parse with Date
  const date = new Date(v);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
};

// Helper: Parse certificate level
const parseCertLevel = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const v = value.trim();
  if (v === '' || v === '无' || v === '-') return undefined;
  const num = parseInt(v);
  if (num >= 1 && num <= 5) return num;
  return undefined;
};

export default function GuardBulkImport({ sites, onImportComplete }: GuardBulkImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [, setRawData] = useState<RawGuardData[]>([]);
  const [validData, setValidData] = useState<ValidatedGuardData[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate template file
  const downloadTemplate = (format: 'xlsx' | 'csv') => {
    const headers = [
      '姓名', '手机号', '身份证号', '性别', '出生日期', '所属单位',
      '角色', '身高(cm)', '在职状态', '入职日期',
      '消防证等级', '保安证等级', '安检证等级'
    ];

    const exampleData = [
      ['张三', '13812345678', '110101199001011234', '男', '1990-01-01', sites[0]?.name || '示例单位',
       '队员', '175', '在职', '2024-01-15', '', '', ''],
      ['李四', '13987654321', '110101198512152345', '女', '1985-12-15', sites[0]?.name || '示例单位',
       '队长', '168', '在职', '2023-06-01', '5', '4', ''],
    ];

    const notes = [
      ['说明:'],
      ['1. 姓名、手机号、身份证号、性别、出生日期、所属单位为必填项'],
      ['2. 性别填写: 男 或 女'],
      ['3. 角色填写: 队长 或 队员（默认队员）'],
      ['4. 在职状态填写: 在职、试用、离职、待岗（默认在职）'],
      ['5. 证书等级填写: 1-5（1最高，5最低），不填表示无证书'],
      ['6. 日期格式: YYYY-MM-DD，如 2024-01-15'],
      [''],
      ['可用单位列表:'],
      ...sites.map(s => [s.name])
    ];

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();

      // Data sheet
      const dataSheet = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
      // Set column widths
      dataSheet['!cols'] = [
        { wch: 10 }, { wch: 15 }, { wch: 22 }, { wch: 6 }, { wch: 12 }, { wch: 15 },
        { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, dataSheet, '导入数据');

      // Notes sheet
      const notesSheet = XLSX.utils.aoa_to_sheet(notes);
      XLSX.utils.book_append_sheet(wb, notesSheet, '填写说明');

      XLSX.writeFile(wb, '保安导入模板.xlsx');
    } else {
      const csvContent = Papa.unparse({
        fields: headers,
        data: exampleData
      });
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '保安导入模板.csv';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  // Parse uploaded file
  const parseFile = useCallback(async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      let data: RawGuardData[] = [];

      if (extension === 'csv') {
        // Parse CSV
        const text = await file.text();
        const result = Papa.parse<RawGuardData>(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });
        data = result.data;
      } else if (extension === 'xlsx' || extension === 'xls') {
        // Parse Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json<RawGuardData>(firstSheet, {
          raw: false,
          defval: '',
        });
      } else {
        throw new Error('不支持的文件格式，请上传 .xlsx, .xls 或 .csv 文件');
      }

      if (data.length === 0) {
        throw new Error('文件中没有数据');
      }

      setRawData(data);
      validateData(data);
      setStep('preview');
    } catch (error) {
      console.error('[IMPORT] Parse error:', error);
      setErrors([{
        row: 0,
        field: '文件',
        value: file.name,
        message: error instanceof Error ? error.message : '文件解析失败'
      }]);
    }
  }, [sites]);

  // Validate parsed data
  const validateData = (data: RawGuardData[]) => {
    const validated: ValidatedGuardData[] = [];
    const validationErrors: ImportError[] = [];

    // Create site name to ID map
    const siteMap = new Map<string, { id: string; name: string }>();
    sites.forEach(site => {
      siteMap.set(site.name.toLowerCase().trim(), site);
    });

    data.forEach((row, index) => {
      const rowNum = index + 2; // Excel row number (1-indexed + header)
      const rowErrors: ImportError[] = [];

      // Validate required fields
      const name = row['姓名']?.trim();
      if (!name) {
        rowErrors.push({ row: rowNum, field: '姓名', value: '', message: '姓名不能为空' });
      }

      const phoneNumber = row['手机号']?.trim();
      if (!phoneNumber) {
        rowErrors.push({ row: rowNum, field: '手机号', value: '', message: '手机号不能为空' });
      } else if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
        rowErrors.push({ row: rowNum, field: '手机号', value: phoneNumber, message: '手机号格式错误，应为11位' });
      }

      const idCardNumber = row['身份证号']?.trim();
      if (!idCardNumber) {
        rowErrors.push({ row: rowNum, field: '身份证号', value: '', message: '身份证号不能为空' });
      } else if (!/^\d{17}[\dXx]$/.test(idCardNumber)) {
        rowErrors.push({ row: rowNum, field: '身份证号', value: idCardNumber, message: '身份证号格式错误，应为18位' });
      }

      const gender = parseGender(row['性别']);
      if (!gender) {
        rowErrors.push({ row: rowNum, field: '性别', value: row['性别'] || '', message: '性别格式错误，应为"男"或"女"' });
      }

      const birthDate = parseDate(row['出生日期']);
      if (!birthDate) {
        rowErrors.push({ row: rowNum, field: '出生日期', value: row['出生日期'] || '', message: '出生日期格式错误，应为YYYY-MM-DD' });
      }

      const siteName = row['所属单位']?.trim();
      const matchedSite = siteName ? siteMap.get(siteName.toLowerCase()) : null;
      if (!siteName) {
        rowErrors.push({ row: rowNum, field: '所属单位', value: '', message: '所属单位不能为空' });
      } else if (!matchedSite) {
        rowErrors.push({
          row: rowNum,
          field: '所属单位',
          value: siteName,
          message: `单位"${siteName}"不存在，可用单位: ${sites.map(s => s.name).join(', ')}`
        });
      }

      // Parse optional fields
      const height = row['身高(cm)']?.trim();
      let heightNum: number | undefined;
      if (height) {
        heightNum = parseInt(height);
        if (isNaN(heightNum) || heightNum < 150 || heightNum > 210) {
          rowErrors.push({ row: rowNum, field: '身高', value: height, message: '身高应在150-210cm之间' });
          heightNum = undefined;
        }
      }

      // If no errors, add to valid data
      if (rowErrors.length === 0 && name && phoneNumber && idCardNumber && gender && birthDate && matchedSite) {
        // Extract numeric ID from site.id (remove 'site_' prefix if present)
        const siteIdStr = matchedSite.id.toString();
        const siteIdNum = siteIdStr.startsWith('site_')
          ? parseInt(siteIdStr.replace('site_', ''))
          : parseInt(siteIdStr);

        validated.push({
          name,
          phoneNumber,
          idCardNumber,
          gender,
          birthDate,
          siteId: siteIdNum,
          siteName: matchedSite.name,
          role: parseRole(row['角色']),
          height: heightNum,
          employmentStatus: parseEmploymentStatus(row['在职状态']),
          originalHireDate: parseDate(row['入职日期']) || undefined,
          latestHireDate: parseDate(row['入职日期']) || undefined,
          firefightingCertLevel: parseCertLevel(row['消防证等级']),
          securityGuardCertLevel: parseCertLevel(row['保安证等级']),
          securityCheckCertLevel: parseCertLevel(row['安检证等级']),
        });
      } else {
        validationErrors.push(...rowErrors);
      }
    });

    setValidData(validated);
    setErrors(validationErrors);
  };

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      parseFile(file);
    }
  }, [parseFile]);

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  // Execute import
  const executeImport = async () => {
    // Check if token exists
    const token = getToken();
    console.log('[BULK IMPORT] Token exists:', !!token, 'Token preview:', token?.substring(0, 20) + '...');

    if (!token) {
      setErrors([{
        row: 0,
        field: '认证',
        value: '',
        message: '登录已过期，请重新登录后再试'
      }]);
      return;
    }

    setStep('importing');
    setImportProgress(0);

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < validData.length; i++) {
      const guard = validData[i];

      try {
        const payload = {
          name: guard.name,
          phoneNumber: guard.phoneNumber,
          site: { id: guard.siteId },
          role: guard.role,
          idCardNumber: guard.idCardNumber,
          gender: guard.gender,
          birthDate: guard.birthDate,
          height: guard.height,
          employmentStatus: guard.employmentStatus,
          originalHireDate: guard.originalHireDate,
          latestHireDate: guard.latestHireDate,
          firefightingCertLevel: guard.firefightingCertLevel,
          securityGuardCertLevel: guard.securityGuardCertLevel,
          securityCheckCertLevel: guard.securityCheckCertLevel,
        };

        console.log('[BULK IMPORT] Sending payload:', JSON.stringify(payload, null, 2));
        console.log('[BULK IMPORT] Request URL:', `${BASE_URL}/api/guards`);

        const res = await request(`${BASE_URL}/api/guards`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          result.success++;
          console.log('[BULK IMPORT] Success:', guard.name);
        } else {
          const errorText = await res.text();
          console.error('[BULK IMPORT] Failed:', guard.name, 'Status:', res.status, 'Error:', errorText);

          // Try to parse error as JSON
          let errorMessage = '创建失败';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorText;
          } catch {
            errorMessage = errorText || '创建失败';
          }

          result.failed++;
          result.errors.push({
            row: i + 2,
            message: `${guard.name}: ${errorMessage}`
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: i + 2,
          message: `${guard.name}: ${error instanceof Error ? error.message : '网络错误'}`
        });
      }

      setImportProgress(Math.round(((i + 1) / validData.length) * 100));
    }

    setImportResult(result);
    setStep('complete');
  };

  // Reset state
  const resetState = () => {
    setStep('upload');
    setRawData([]);
    setValidData([]);
    setErrors([]);
    setImportResult(null);
    setImportProgress(0);
    setShowErrorDetails(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Close dialog
  const handleClose = (open: boolean) => {
    if (!open) {
      if (step === 'complete' && importResult && importResult.success > 0) {
        onImportComplete();
      }
      resetState();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <Upload className="h-4 w-4" />
          <span>批量导入</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <span>批量导入保安</span>
          </DialogTitle>
          <DialogDescription>
            通过 Excel 或 CSV 文件批量添加保安信息
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Download template */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">步骤 1: 下载模板</h4>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTemplate('xlsx')}
                  className="flex items-center space-x-2"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>下载 Excel 模板</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTemplate('csv')}
                  className="flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>下载 CSV 模板</span>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Upload area */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">步骤 2: 上传文件</h4>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  点击或拖拽文件到此处上传
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  支持 .xlsx, .xls, .csv 格式
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* File errors */}
            {errors.length > 0 && errors[0].field === '文件' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors[0].message}</AlertDescription>
              </Alert>
            )}

            {/* Help info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="text-sm">
                  <p className="font-medium mb-1">必填字段:</p>
                  <p>姓名、手机号、身份证号、性别、出生日期、所属单位</p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm">有效数据: <Badge variant="secondary">{validData.length}</Badge> 条</span>
              </div>
              {errors.length > 0 && (
                <div className="flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm">错误数据: <Badge variant="destructive">{errors.length}</Badge> 条</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                  >
                    {showErrorDetails ? '收起' : '查看详情'}
                  </Button>
                </div>
              )}
            </div>

            {/* Error details */}
            {showErrorDetails && errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="max-h-40 overflow-y-auto text-sm space-y-1">
                    {errors.map((err, idx) => (
                      <div key={idx}>
                        第{err.row}行 [{err.field}]: {err.message}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview table */}
            {validData.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">数据预览 (前5条)</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">姓名</TableHead>
                        <TableHead className="w-32">手机号</TableHead>
                        <TableHead className="w-24">所属单位</TableHead>
                        <TableHead className="w-16">性别</TableHead>
                        <TableHead className="w-16">角色</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validData.slice(0, 5).map((guard, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{guard.name}</TableCell>
                          <TableCell>{guard.phoneNumber}</TableCell>
                          <TableCell>{guard.siteName}</TableCell>
                          <TableCell>{guard.gender === Gender.MALE ? '男' : '女'}</TableCell>
                          <TableCell>{guard.role === GuardRole.TEAM_LEADER ? '队长' : '队员'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {validData.length > 5 && (
                  <p className="text-xs text-gray-500">... 还有 {validData.length - 5} 条数据</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={resetState}>
                重新选择文件
              </Button>
              <Button
                onClick={executeImport}
                disabled={validData.length === 0}
              >
                导入 {validData.length} 条有效数据
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg">正在导入...</span>
            </div>
            <Progress value={importProgress} className="w-full" />
            <p className="text-center text-sm text-gray-500">
              已完成 {importProgress}%
            </p>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && importResult && (
          <div className="space-y-4">
            <div className="text-center py-4">
              {importResult.failed === 0 ? (
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
              ) : (
                <AlertCircle className="mx-auto h-16 w-16 text-yellow-600" />
              )}
              <h3 className="mt-4 text-lg font-semibold">
                导入完成
              </h3>
              <div className="mt-2 space-y-1">
                <p className="text-green-600">成功: {importResult.success} 条</p>
                {importResult.failed > 0 && (
                  <p className="text-red-600">失败: {importResult.failed} 条</p>
                )}
              </div>
            </div>

            {/* Import errors */}
            {importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="max-h-40 overflow-y-auto text-sm space-y-1">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx}>第{err.row}行: {err.message}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={() => handleClose(false)}>
                完成
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
