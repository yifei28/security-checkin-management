import { useState, useEffect } from 'react'
import { request } from '../util/request';
import { BASE_URL } from '../util/config';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Site {
  id: number
  name: string
  latitude: number
  longitude: number
  allowedRadiusMeters: number
}

export default function SiteManagement() {
  const [sites, setSites] = useState<Site[]>([])
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingSite, setEditingSite] = useState({
    name: '',
    latitude: '',
    longitude: '',
    allowedRadiusMeters: ''
  })

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newSite, setNewSite] = useState({
    name: '',
    latitude: '',
    longitude: '',
    allowedRadiusMeters: ''
  })

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await request(`${BASE_URL}/api/sites`);
        const data = await res.json();
        setSites(data);
      } catch (error) {
        console.error(error);
        setError('获取单位列表失败，请刷新页面重试');
      }
    };

    fetchSites();
  }, [])

  const addSite = async () => {
    if (!newSite.name || !newSite.latitude || !newSite.longitude || !newSite.allowedRadiusMeters) {
      setError('请填写完整信息');
      return;
    }

    try {
      const payload = {
        name: newSite.name,
        latitude: parseFloat(newSite.latitude),
        longitude: parseFloat(newSite.longitude), 
        allowedRadiusMeters: parseFloat(newSite.allowedRadiusMeters)
      };

      const res = await request(`${BASE_URL}/api/sites`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const newEntry = await res.json();
      setSites([...sites, newEntry]);
      setNewSite({ name: '', latitude: '', longitude: '', allowedRadiusMeters: '' });
      setIsAddDialogOpen(false);
      setError('');
    } catch (error) {
      console.error(error);
      setError('添加单位失败');
    }
  };

  const startEditing = (site: Site) => {
    setEditingId(site.id);
    setEditingSite({
      name: site.name,
      latitude: site.latitude.toString(),
      longitude: site.longitude.toString(),
      allowedRadiusMeters: site.allowedRadiusMeters.toString()
    });
    setIsEditDialogOpen(true);
  };

  const cancelEditing = () => {
    setEditingId(null)
    setEditingSite({ name: '', latitude: '', longitude: '', allowedRadiusMeters: '' })
  }

  const saveEditing = async () => {
    if (!editingSite.name || !editingSite.latitude || !editingSite.longitude || !editingSite.allowedRadiusMeters) {
      setError('请填写完整信息');
      return;
    }

    try {
      const payload = {
        id: editingId,
        name: editingSite.name,
        latitude: parseFloat(editingSite.latitude),
        longitude: parseFloat(editingSite.longitude),
        allowedRadiusMeters: parseFloat(editingSite.allowedRadiusMeters)
      };

      const res = await request(`${BASE_URL}/api/sites/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      const updated = await res.json();
      setSites(sites.map(s => (s.id === updated.id ? updated : s)));
      setEditingId(null);
      setEditingSite({ name: '', latitude: '', longitude: '', allowedRadiusMeters: '' });
      setIsEditDialogOpen(false);
      setError('');
    } catch (error) {
      console.error(error);
      setError('保存失败');
    }
  };

  const deleteSite = async (id: number) => {
    if (!confirm('确认删除该单位吗？')) return;

    try {
      await request(`${BASE_URL}/api/sites/${id}`, {
        method: 'DELETE'
      });
      setSites(sites.filter(s => s.id !== id));
    } catch (error) {
      console.error(error);
      setError('删除失败');
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">单位管理</h1>
          <p className="text-muted-foreground mt-1">管理单位位置和签到范围设置</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>添加单位</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加单位信息</DialogTitle>
              <DialogDescription>
                请填写新单位的位置信息和签到范围
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="单位名称"
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                />
              </div>
              <div>
                <Input
                  placeholder="纬度"
                  type="number"
                  step="any"
                  value={newSite.latitude}
                  onChange={(e) => setNewSite({ ...newSite, latitude: e.target.value })}
                />
              </div>
              <div>
                <Input
                  placeholder="经度"
                  type="number"
                  step="any"
                  value={newSite.longitude}
                  onChange={(e) => setNewSite({ ...newSite, longitude: e.target.value })}
                />
              </div>
              <div>
                <Input
                  placeholder="允许签到半径（米）"
                  type="number"
                  value={newSite.allowedRadiusMeters}
                  onChange={(e) => setNewSite({ ...newSite, allowedRadiusMeters: e.target.value })}
                />
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
                    setNewSite({ name: '', latitude: '', longitude: '', allowedRadiusMeters: '' });
                    setError('');
                  }}
                >
                  取消
                </Button>
                <Button onClick={addSite}>提交</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>单位列表</CardTitle>
          <CardDescription>
            当前系统中所有单位的位置信息和签到范围
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>纬度</TableHead>
                <TableHead>经度</TableHead>
                <TableHead>允许半径(米)</TableHead>
                <TableHead className="w-32">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-medium">{site.id}</TableCell>
                  <TableCell>{site.name}</TableCell>
                  <TableCell>{site.latitude}</TableCell>
                  <TableCell>{site.longitude}</TableCell>
                  <TableCell>{site.allowedRadiusMeters}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(site)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteSite(site.id)}
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
            <DialogTitle>编辑单位信息</DialogTitle>
            <DialogDescription>
              修改单位的位置信息和签到范围
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="单位名称"
                value={editingSite.name}
                onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
              />
            </div>
            <div>
              <Input
                placeholder="纬度"
                type="number"
                step="any"
                value={editingSite.latitude}
                onChange={(e) => setEditingSite({ ...editingSite, latitude: e.target.value })}
              />
            </div>
            <div>
              <Input
                placeholder="经度"
                type="number"
                step="any"
                value={editingSite.longitude}
                onChange={(e) => setEditingSite({ ...editingSite, longitude: e.target.value })}
              />
            </div>
            <div>
              <Input
                placeholder="允许签到半径（米）"
                type="number"
                value={editingSite.allowedRadiusMeters}
                onChange={(e) => setEditingSite({ ...editingSite, allowedRadiusMeters: e.target.value })}
              />
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
                  setEditingSite({ name: '', latitude: '', longitude: '', allowedRadiusMeters: '' });
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
