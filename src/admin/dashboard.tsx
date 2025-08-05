import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-600 mb-6">管理后台首页</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow hover:bg-blue-50">
          <Link to="/admin/guards" className="text-lg font-semibold text-blue-700">保安管理</Link>
          <p className="text-sm text-gray-600">添加、编辑、删除保安信息</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow hover:bg-blue-50">
          <Link to="/admin/sites" className="text-lg font-semibold text-blue-700">单位管理</Link>
          <p className="text-sm text-gray-600">设置单位位置与分配保安</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow hover:bg-blue-50">
          <Link to="/admin/checkins" className="text-lg font-semibold text-blue-700">签到记录查询</Link>
          <p className="text-sm text-gray-600">查询保安每日签到详情</p>
        </div>
      </div>
    </div>
  );
}
