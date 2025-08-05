import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import AdminDashboard from './admin/dashboard'
import GuardManagement from './admin/guards'
import SiteManagement from './admin/sites'
import CheckinRecords from './admin/checkins'
import LoginPage from './admin/login'
import AdminLayout from './admin/layout'
import ManagerPage from './admin/manager'
import { isLoggedIn } from './util/auth'

function ProtectedRoute({ redirectTo = '/login' }: { redirectTo?: string }) {
  const isSuperAdmin = localStorage.getItem('superAdmin') === 'true';

  if (!isLoggedIn()) {
    return <Navigate to={redirectTo} replace />;
  }

  const pathname = window.location.pathname;
  if (pathname === '/manager' && !isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 登录页 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 后台页，需登录才能访问 */}
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="guards" element={<GuardManagement />} />
            <Route path="sites" element={<SiteManagement />} />
            <Route path="checkins" element={<CheckinRecords />} />
          </Route>
        </Route>

        <Route path="/manager" element={<ProtectedRoute />}>
          <Route path="" element={<ManagerPage />} />
        </Route>

        {/* 默认跳转 */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App