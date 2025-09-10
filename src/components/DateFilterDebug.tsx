import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Copy, Info, Calendar, Clock } from 'lucide-react';

type DateRange = 'today' | 'week' | 'month' | 'all';

export default function DateFilterDebug() {
  const [dateFilter, setDateFilter] = useState<DateRange>('today');
  const [debugInfo, setDebugInfo] = useState<any>({});

  // 复制前端的时间格式化逻辑
  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const generateDebugInfo = (selectedRange: DateRange) => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    if (selectedRange !== 'all') {
      switch (selectedRange) {
        case 'today':
          const today = new Date(now);
          today.setHours(0, 0, 0, 0);
          startDate = formatLocalDateTime(today);
          
          const todayEnd = new Date(now);
          todayEnd.setHours(23, 59, 59, 999);
          endDate = formatLocalDateTime(todayEnd);
          break;
          
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          weekAgo.setHours(0, 0, 0, 0);
          startDate = formatLocalDateTime(weekAgo);
          endDate = formatLocalDateTime(now);
          break;
          
        case 'month':
          const monthAgo = new Date(now);
          monthAgo.setDate(monthAgo.getDate() - 30);
          monthAgo.setHours(0, 0, 0, 0);
          startDate = formatLocalDateTime(monthAgo);
          endDate = formatLocalDateTime(now);
          break;
      }
    }

    // 生成API参数
    const params = new URLSearchParams({
      page: '1',
      pageSize: '20',
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });

    if (startDate && endDate) {
      params.append('startDate', startDate);
      params.append('endDate', endDate);
    }

    const apiUrl = `/api/checkin?${params}`;

    // 测试样本记录
    const testRecords = [
      { timestamp: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T10:30:00`, description: '今天上午' },
      { timestamp: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate() - 1).padStart(2, '0')}T10:30:00`, description: '昨天' },
      { timestamp: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate() + 1).padStart(2, '0')}T10:30:00`, description: '明天' },
    ];

    const startTime = startDate ? new Date(startDate) : null;
    const endTime = endDate ? new Date(endDate) : null;

    const recordTests = testRecords.map(record => {
      const recordTime = new Date(record.timestamp);
      let shouldInclude = true;
      
      if (startTime && endTime) {
        shouldInclude = recordTime >= startTime && recordTime <= endTime;
      }

      return {
        ...record,
        shouldInclude,
        recordTime: recordTime.toLocaleString('zh-CN')
      };
    });

    return {
      currentTime: now.toLocaleString('zh-CN'),
      dateRange: selectedRange,
      startDate,
      endDate,
      apiUrl,
      apiParams: Object.fromEntries(params),
      recordTests
    };
  };

  useEffect(() => {
    setDebugInfo(generateDebugInfo(dateFilter));
  }, [dateFilter]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>日期筛选调试工具</span>
          </CardTitle>
          <CardDescription>
            用于调试签到记录页面的日期筛选功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">选择时间范围：</label>
            <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateRange)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="today">今天</SelectItem>
                <SelectItem value="week">最近7天</SelectItem>
                <SelectItem value="month">最近30天</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              当前时间: {debugInfo.currentTime}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {debugInfo.startDate && debugInfo.endDate && (
        <Card>
          <CardHeader>
            <CardTitle>时间范围参数</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">开始时间</label>
                <div className="mt-1 p-3 bg-muted rounded-lg font-mono text-sm">
                  {debugInfo.startDate}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">结束时间</label>
                <div className="mt-1 p-3 bg-muted rounded-lg font-mono text-sm">
                  {debugInfo.endDate}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>API请求信息</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(debugInfo.apiUrl)}
            >
              <Copy className="h-4 w-4 mr-2" />
              复制URL
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">完整API URL</label>
            <div className="mt-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
              {debugInfo.apiUrl}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">查询参数</label>
            <div className="mt-1 p-3 bg-muted rounded-lg">
              {Object.entries(debugInfo.apiParams || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-1">
                  <span className="font-mono text-sm">{key}:</span>
                  <Badge variant="secondary" className="font-mono text-xs">{value as string}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>筛选测试样例</CardTitle>
          <CardDescription>
            这些样例记录应该如何被筛选
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {debugInfo.recordTests?.map((record: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{record.description}</div>
                  <div className="text-sm text-muted-foreground font-mono">{record.timestamp}</div>
                  <div className="text-xs text-muted-foreground">显示时间: {record.recordTime}</div>
                </div>
                <Badge variant={record.shouldInclude ? "default" : "secondary"}>
                  {record.shouldInclude ? '✅ 应包含' : '❌ 应排除'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>调试提示：</strong> 如果在实际应用中选择"今天"仍显示其他日期的记录，请检查：
          <ul className="mt-2 ml-4 list-disc">
            <li>后端是否正确处理startDate和endDate参数</li>
            <li>后端时区配置是否与前端一致</li>
            <li>数据库中存储的时间格式是否正确</li>
            <li>后端筛选SQL语句是否正确</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}