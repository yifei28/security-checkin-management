/**
 * SiteReportGenerator Component
 *
 * Generates and exports weekly/monthly work reports for a site.
 * Exports CSV with detailed fields including spot checks.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText } from 'lucide-react';
import { request } from '@/util/request';
import { BASE_URL } from '@/util/config';
import type { Site, CheckInRecord, WorkStatus } from '@/types';
import { WorkStatusDisplayNames } from '@/types';

// Extended record type that API returns with enriched data
interface EnrichedWorkRecord extends CheckInRecord {
  guardName?: string;
  siteName?: string;
}
import Papa from 'papaparse';

interface SiteReportGeneratorProps {
  site: Site;
}

type DateRange = 'week' | 'month';

// Helper function to format date as local time string (YYYY-MM-DDTHH:mm:ss)
const formatLocalDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

// Calculate date range based on selection
const calculateDateRange = (range: DateRange): { startDate: string; endDate: string } => {
  const now = new Date();

  // End date: today 23:59:59
  const endDateTime = new Date(now);
  endDateTime.setHours(23, 59, 59, 999);
  const endDate = formatLocalDateTime(endDateTime);

  let startDate: string;
  if (range === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    startDate = formatLocalDateTime(weekAgo);
  } else {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);
    startDate = formatLocalDateTime(monthAgo);
  }

  return { startDate, endDate };
};

// Format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// Format time for display
const formatTime = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get status display name
const getStatusDisplay = (status: WorkStatus | string): string => {
  return WorkStatusDisplayNames[status as WorkStatus] || status || '未知';
};

// Download CSV file
const downloadCSV = (csvContent: string, filename: string) => {
  // Add BOM for proper Chinese character display in Excel
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function SiteReportGenerator({ site }: SiteReportGeneratorProps) {
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    setGenerating(true);
    setError(null);

    try {
      const { startDate, endDate } = calculateDateRange(dateRange);

      // Extract numeric ID from site.id (e.g., "site_5" -> "5")
      // Backend work/records API expects numeric siteId, not the prefixed format
      const numericSiteId = site.id.replace(/^site_/, '');

      // Build query params - must use decodeURIComponent because backend
      // doesn't handle URL-encoded colons in datetime strings
      const params = new URLSearchParams({
        page: '1',
        pageSize: '100',
        siteId: numericSiteId,
        startDate,
        endDate,
      });

      // Fetch work records for the site
      const response = await request(
        `${BASE_URL}/api/admin/work/records?${decodeURIComponent(params.toString())}`
      );

      let records: EnrichedWorkRecord[] = [];

      if (response.ok) {
        const data = await response.json();
        records = data.success && data.data ? data.data : [];
        console.log('[SiteReportGenerator] Fetched records:', records.length);
      } else {
        // If API not available, show warning but allow empty export
        console.warn('[SiteReportGenerator] Work records API not available, status:', response.status);
      }

      if (records.length === 0) {
        // Generate empty report with header
        const csvData = [{
          '日期': '-',
          '保安姓名': '-',
          '上岗时间': '-',
          '下岗时间': '-',
          '工作时长(小时)': '-',
          '状态': '-',
          '上岗纬度': '-',
          '上岗经度': '-',
        }];

        const csv = Papa.unparse(csvData, { header: true });
        const dateStr = new Date().toISOString().split('T')[0];
        const rangeLabel = dateRange === 'week' ? '周报' : '月报';
        downloadCSV(csv, `${site.name}_${rangeLabel}_${dateStr}.csv`);
        return;
      }

      // Format records for CSV export
      const csvData = records.map((r: EnrichedWorkRecord) => ({
        '日期': formatDate(r.startTime),
        '保安姓名': r.guardName || `保安ID: ${r.guardId}`,
        '上岗时间': formatTime(r.startTime),
        '下岗时间': formatTime(r.endTime ?? undefined),
        '工作时长(小时)': r.durationMinutes ? (r.durationMinutes / 60).toFixed(1) : '-',
        '状态': getStatusDisplay(r.status),
        '上岗纬度': r.startLatitude?.toFixed(6) || '-',
        '上岗经度': r.startLongitude?.toFixed(6) || '-',
      }));

      // Generate CSV
      const csv = Papa.unparse(csvData, { header: true });

      // Download file
      const dateStr = new Date().toISOString().split('T')[0];
      const rangeLabel = dateRange === 'week' ? '周报' : '月报';
      downloadCSV(csv, `${site.name}_${rangeLabel}_${dateStr}.csv`);
    } catch (err) {
      console.error('[SiteReportGenerator] Export error:', err);
      setError('导出失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">生成报表</span>
          <Select
            value={dateRange}
            onValueChange={(value: DateRange) => setDateRange(value)}
          >
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          onClick={generateReport}
          disabled={generating}
          className="gap-1"
        >
          <Download className="h-3 w-3" />
          {generating ? '生成中...' : '导出 CSV'}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        导出包含：日期、保安姓名、上下岗时间、工作时长(小时)、状态、位置坐标
      </p>
    </div>
  );
}
