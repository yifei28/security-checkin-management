import { useEffect, useState } from "react";
import { request } from '../util/request';
import { BASE_URL } from '../util/config';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Admin {
  id: number;
  username: string;
  superAdmin: boolean;
}

export default function ManagerPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSuper, setIsSuper] = useState(false);
  const [error, setError] = useState("");

  const fetchAdmins = async () => {
    try {
      const res = await request(`${BASE_URL}/api/admin`);
      const data = await res.json();
      setAdmins(data);
    } catch (err) {
      setError("无法获取管理员列表");
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAdd = async () => {
    if (!username || !password) {
      setError("请填写用户名和密码");
      return;
    }

    try {
      const res = await request(`${BASE_URL}/api/admin`, {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          superAdmin: isSuper,
        }),
      });

      if (res.ok) {
        setUsername("");
        setPassword("");
        setIsSuper(false);
        setError("");
        fetchAdmins(); // refresh
      } else {
        const msg = await res.text();
        setError(msg || "添加失败");
      }
    } catch (err) {
      setError("网络错误，添加失败");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("确定要删除该管理员吗？")) return;

    try {
      await request(`${BASE_URL}/api/admin/${id}`, {
        method: "DELETE",
      });
      fetchAdmins();
    } catch (err) {
      setError("删除失败");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">管理员管理</h1>
        <p className="text-muted-foreground mt-1">管理系统管理员账户和权限</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>添加新管理员</CardTitle>
          <CardDescription>
            创建新的管理员账户，可以设置为普通管理员或超级管理员
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Input
                type="text"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="super-admin"
                checked={isSuper}
                onCheckedChange={(checked) => setIsSuper(checked as boolean)}
              />
              <label htmlFor="super-admin" className="text-sm font-medium">
                超级管理员
              </label>
            </div>
            <div>
              <Button onClick={handleAdd} className="w-full">
                添加管理员
              </Button>
            </div>
          </div>
          {error && (
            <Alert className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>管理员列表</CardTitle>
          <CardDescription>
            当前系统中所有管理员账户
          </CardDescription>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">暂无管理员账户</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.id}</TableCell>
                    <TableCell>{admin.username}</TableCell>
                    <TableCell>
                      <Badge variant={admin.superAdmin ? "default" : "secondary"}>
                        {admin.superAdmin ? "超级管理员" : "普通管理员"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(admin.id)}
                      >
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}