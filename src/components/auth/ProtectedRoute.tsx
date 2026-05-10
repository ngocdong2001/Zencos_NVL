import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: '#1e3a5f' }} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}

/** Wraps a page route — redirects to /403 if user lacks the required permission. */
export function PermissionGuard({ permission, children }: { permission?: string; children: React.ReactNode }) {
  const { hasPermission } = useAuth()

  if (permission && !hasPermission(permission)) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', gap: '1rem', color: '#6b7280',
      }}>
        <i className="pi pi-lock" style={{ fontSize: '3rem', color: '#d1d5db' }} />
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#374151' }}>Không có quyền truy cập</h2>
        <p style={{ margin: 0 }}>Bạn không có quyền xem trang này. Liên hệ quản trị viên để được cấp quyền.</p>
      </div>
    )
  }

  return <>{children}</>
}

