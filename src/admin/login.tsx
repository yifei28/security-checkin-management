import { useState } from "react";
import { request } from '../util/request';
import { BASE_URL } from '../util/config';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!username || !password) {
        setError("请输入用户名和密码");
        return;
    }

    setLoading(true);
    setError("");

    try {
        const res = await request(`${BASE_URL}/api/login`, {
            method: "POST",
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem("token", data.token);
            localStorage.setItem("superAdmin", data.superAdmin);
            window.location.href = "/admin";
        } else {
            const msg = await res.text();
            setError(msg || "登录失败");
        }
    } catch (err) {
        console.error(err);
        setError("网络错误，请稍后再试");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">
            安全巡检管理系统
          </h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center">管理员登录</CardTitle>
          </CardHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            login();
          }}>
            <CardContent className="space-y-4">
              {error && (
                <div className="text-sm text-destructive">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </CardContent>
            
            <CardFooter className="pt-6">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "登录中..." : "登录"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            管理门户 - 需要安全访问
          </p>
        </div>
      </div>
    </div>
  );
}