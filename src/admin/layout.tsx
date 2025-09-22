import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isRefreshing, refreshError, refreshToken, clearError, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleRetryRefresh = async () => {
    clearError();
    await refreshToken();
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: "/admin", label: "首页" },
    { path: "/admin/guards", label: "保安管理" },
    { path: "/admin/sites", label: "单位管理" },
    { path: "/admin/checkins", label: "签到记录" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r bg-card p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">都豪鼎盛内部系统</h2>
          <p className="text-sm text-muted-foreground mt-1">管理后台</p>
          {user && (
            <p className="text-xs text-muted-foreground mt-1">
              欢迎，{user.fullName || user.username}
              {user.role === 'superAdmin' && <span className="text-blue-600 ml-1">(超级管理员)</span>}
            </p>
          )}
        </div>
        
        <Separator className="mb-6" />
        
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={isActivePath(item.path) ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActivePath(item.path) && "bg-primary text-primary-foreground"
                )}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
        
        <Separator className="my-6" />
        
        {/* Session Status and Recovery */}
        {isRefreshing && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
              <p className="text-xs text-blue-700">正在刷新会话...</p>
            </div>
          </div>
        )}
        
        {refreshError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              会话刷新失败：{refreshError}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetryRefresh}
                className="ml-2 h-auto p-1 text-xs underline"
              >
                重试
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={handleLogout} 
          variant="outline" 
          size="sm"
          className="w-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          退出登录
        </Button>
      </aside>

      <main className="flex-1 bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}