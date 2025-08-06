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

interface Guard {
  id: number
  name: string
  phoneNumber: string
  employeeId: string
  site: { id: number; name: string }
}

interface Site {
  id: number
  name: string
}

export default function GuardManagement() {
  const [guards, setGuards] = useState<Guard[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [error, setError] = useState('')

  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingGuard, setEditingGuard] = useState({
    name: '',
    phoneNumber: '',
    employeeId: '',
    siteId: ''
  })

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [guardsRes, sitesRes] = await Promise.all([
          request(`${BASE_URL}/api/guards`),
          request(`${BASE_URL}/api/sites`)
        ]);
        
        const guardsData = await guardsRes.json();
        const sitesData = await sitesRes.json();
        
        setGuards(guardsData);
        setSites(sitesData);
      } catch (error) {
        console.error(error);
        setError('获取数据失败，请刷新页面重试');
      }
    };

    fetchData();
  }, [])

  const addGuard = async () => {
    if (!selectedSiteId || !newName || !newPhone) {
      setError('请填写完整信息');
      return;
    }

    try {
      const payload = {
        name: newName,
        phoneNumber: newPhone,
        site: { id: Number(selectedSiteId) }
      };

      const res = await request(`${BASE_URL}/api/guards`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const newGuard = await res.json();
      setGuards([...guards, newGuard]);
      setNewName('');
      setNewPhone('');
      setSelectedSiteId('');
      setIsAddDialogOpen(false);
      setError('');
    } catch (error) {
      console.error(error);
      setError('添加保安失败');
    }
  };

  const startEditing = (guard: Guard) => {
    setEditingId(guard.id);
    setEditingGuard({
      name: guard.name,
      phoneNumber: guard.phoneNumber,
      employeeId: guard.employeeId,
      siteId: guard.site?.id?.toString() ?? ''
    });
    setIsEditDialogOpen(true);
  };

  const saveEditing = async () => {
    if (!editingGuard.name || !editingGuard.phoneNumber || !editingGuard.siteId) {
      setError('请填写完整信息');
      return;
    }

    try {
      const payload = {
        id: editingId,
        name: editingGuard.name,
        employeeId: editingGuard.employeeId,
        phoneNumber: editingGuard.phoneNumber,
        site: { id: Number(editingGuard.siteId) }
      };

      const res = await request(`${BASE_URL}/api/guards/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      const updated = await res.json();
      setGuards(guards.map(g => g.id === updated.id ? updated : g));
      setEditingId(null);
      setEditingGuard({ name: '', phoneNumber: '', employeeId: '', siteId: '' });
      setIsEditDialogOpen(false);
      setError('');
    } catch (error) {
      console.error(error);
      setError('保存失败');
    }
  };

  const deleteGuard = async (id: number) => {
    if (!confirm('确认删除该保安吗？')) return;

    try {
      await request(`${BASE_URL}/api/guards/${id}`, {
        method: 'DELETE'
      });
      setGuards(guards.filter(g => g.id !== id));
    } catch (error) {
      console.error(error);
      setError('删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">保安管理</h1>
          <p className="text-muted-foreground mt-1">管理保安信息和分配</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>添加保安</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加保安信息</DialogTitle>
              <DialogDescription>
                请填写新保安的基本信息
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="姓名"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <Input
                  placeholder="手机号"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div>
                <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择所属单位" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id.toString()}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <Alert>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setNewName('');
                    setNewPhone('');
                    setSelectedSiteId('');
                    setError('');
                  }}
                >
                  取消
                </Button>
                <Button onClick={addGuard}>提交</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>保安列表</CardTitle>
          <CardDescription>
            当前系统中所有保安的信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>工号</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>单位</TableHead>
                <TableHead className="w-32">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guards.map((guard) => (
                <TableRow key={guard.id}>
                  <TableCell className="font-medium">{guard.id}</TableCell>
                  <TableCell>{guard.name}</TableCell>
                  <TableCell>{guard.employeeId}</TableCell>
                  <TableCell>{guard.phoneNumber}</TableCell>
                  <TableCell>{guard.site?.name ?? '未分配'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(guard)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteGuard(guard.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑保安信息</DialogTitle>
            <DialogDescription>
              修改保安的基本信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="姓名"
                value={editingGuard.name}
                onChange={(e) => setEditingGuard({ ...editingGuard, name: e.target.value })}
              />
            </div>
            <div>
              <Input
                placeholder="手机号"
                value={editingGuard.phoneNumber}
                onChange={(e) => setEditingGuard({ ...editingGuard, phoneNumber: e.target.value })}
              />
            </div>
            <div>
              <Select value={editingGuard.siteId} onValueChange={(value) => setEditingGuard({ ...editingGuard, siteId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择所属单位" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && (
              <Alert>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingId(null);
                  setEditingGuard({ name: '', phoneNumber: '', employeeId: '', siteId: '' });
                  setError('');
                }}
              >
                取消
              </Button>
              <Button onClick={saveEditing}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
