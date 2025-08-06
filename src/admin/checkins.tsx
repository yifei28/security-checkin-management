import { useState, useEffect } from 'react'
import { request } from '../util/request';
import { BASE_URL } from '../util/config';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface CheckinRecord {
  id: number
  guardName: string
  phoneNumber: string
  timestamp: string
  latitude: number
  longitude: number
  period: string
}

export default function CheckinRecords() {
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [onlyToday, setOnlyToday] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await request(`${BASE_URL}/api/checkin`);
        if (!res.ok) throw new Error('获取签到记录失败');
        const data = await res.json();
        setRecords(data);
      } catch (err) {
        console.error(err);
        setError('获取签到记录失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  function isToday(timestamp: string) {
    const date = new Date(timestamp);
    return date.toDateString() === new Date().toDateString();
  }

  const filteredRecords = records
    .filter(r => r.guardName.includes(searchName))
    .filter(r => !onlyToday || isToday(r.timestamp))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">签到记录查询</h1>
        <p className="text-muted-foreground mt-1">查看保安人员的签到记录和位置信息</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>搜索和筛选</CardTitle>
          <CardDescription>
            使用以下选项来筛选签到记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="输入姓名搜索..."
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="today-only"
                checked={onlyToday}
                onCheckedChange={(checked) => setOnlyToday(checked as boolean)}
              />
              <label htmlFor="today-only" className="text-sm font-medium">
                只显示今天
              </label>
            </div>
            <Badge variant="secondary">
              共 {filteredRecords.length} 条记录
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>签到记录</CardTitle>
          <CardDescription>
            按时间倒序排列的签到记录列表
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">暂无符合条件的签到记录</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead>时段</TableHead>
                  <TableHead>签到时间</TableHead>
                  <TableHead>纬度</TableHead>
                  <TableHead>经度</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.id}</TableCell>
                    <TableCell>{record.guardName}</TableCell>
                    <TableCell>{record.phoneNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.period}</Badge>
                    </TableCell>
                    <TableCell>{new Date(record.timestamp).toLocaleString('zh-CN')}</TableCell>
                    <TableCell className="font-mono text-sm">{record.latitude.toFixed(6)}</TableCell>
                    <TableCell className="font-mono text-sm">{record.longitude.toFixed(6)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}