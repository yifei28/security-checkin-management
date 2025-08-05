import { Link, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../util/auth";

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-blue-700 text-white p-6">
        <h2 className="text-xl font-bold mb-6">管理后台</h2>
        <nav className="space-y-4">
          <Link to="/admin" className="block hover:text-yellow-300">首页</Link>
          <Link to="/admin/guards" className="block hover:text-yellow-300">保安管理</Link>
          <Link to="/admin/sites" className="block hover:text-yellow-300">单位管理</Link>
          <Link to="/admin/checkins" className="block hover:text-yellow-300">签到记录</Link>
        </nav>
        <button onClick={handleLogout} className="mt-10 text-sm underline text-red-300">
          退出登录
        </button>
      </aside>

      <main className="flex-1 bg-gray-100 p-10">
        <Outlet />
      </main>
    </div>
  );
}