import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import AdminDashboard from './admin/dashboard'
import GuardManagement from './admin/guards'
import SiteManagement from './admin/sites'
import CheckinRecords from './admin/checkins'
import LoginPage from './admin/login'
import AdminLayout from './admin/layout'
import ManagerPage from './admin/manager'
import { useAuth, AuthProvider } from './contexts/AuthContext'
import { APIErrorBoundary } from './components/APIErrorBoundary'
import { ErrorBoundaryTest } from './components/ErrorBoundaryTest'
import { queryClient } from './lib/react-query'
import DateFilterDebug from './components/DateFilterDebug'

function ProtectedRoute({ redirectTo = '/login' }: { redirectTo?: string }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">检查登录状态...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check super admin access for manager route
  const pathname = window.location.pathname;
  if (pathname === '/manager' && user?.role !== 'superAdmin') {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <APIErrorBoundary>
          <BrowserRouter>
            <Routes>
              {/* 登录页 */}
              <Route path="/login" element={<LoginPage />} />

              {/* 后台页，需登录才能访问 */}
              <Route path="/admin" element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route index element={
                    <APIErrorBoundary>
                      <AdminDashboard />
                      {process.env.NODE_ENV === 'development' && (
                        <div className="fixed bottom-4 right-4 z-50">
                          <ErrorBoundaryTest />
                        </div>
                      )}
                    </APIErrorBoundary>
                  } />
                  <Route path="guards" element={
                    <APIErrorBoundary>
                      <GuardManagement />
                    </APIErrorBoundary>
                  } />
                  <Route path="sites" element={
                    <APIErrorBoundary>
                      <SiteManagement />
                    </APIErrorBoundary>
                  } />
                  <Route path="checkins" element={
                    <APIErrorBoundary>
                      <CheckinRecords />
                    </APIErrorBoundary>
                  } />
                  {process.env.NODE_ENV === 'development' && (
                    <Route path="debug-date-filter" element={
                      <APIErrorBoundary>
                        <DateFilterDebug />
                      </APIErrorBoundary>
                    } />
                  )}
                </Route>
              </Route>

              <Route path="/manager" element={<ProtectedRoute />}>
                <Route path="" element={
                  <APIErrorBoundary>
                    <ManagerPage />
                  </APIErrorBoundary>
                } />
              </Route>

              {/* 默认跳转 */}
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </BrowserRouter>
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </APIErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App