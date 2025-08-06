import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { logout } from "../util/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
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
          <h2 className="text-xl font-semibold text-foreground">安全巡检管理系统</h2>
          <p className="text-sm text-muted-foreground mt-1">管理后台</p>
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