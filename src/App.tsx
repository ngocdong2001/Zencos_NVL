import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from 'primereact/confirmdialog'
import { MasterHeader } from './components/layout/MasterHeader'
import { MasterPage } from './components/layout/MasterPage'
import { MasterSidebar } from './components/layout/MasterSidebar'
import { ProtectedRoute, PermissionGuard } from './components/auth/ProtectedRoute'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { appRoutes } from './routes/config'
import { fetchDashboard } from './lib/dashboardApi'
import './App.css'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  warehouse_manager: 'Quản lý kho',
  warehouse_staff: 'Nhân viên kho',
  purchasing: 'Mua hàng',
  viewer: 'Xem báo cáo',
}

function AppLayout() {
  const { user, logout, hasPermission } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [navBadges, setNavBadges] = useState<{ inbound: number; outbound: number; purchase: number }>({ inbound: 0, outbound: 0, purchase: 0 })

  useEffect(() => {
    fetchDashboard().then((d) => {
      setNavBadges({
        inbound: d.kpi.pendingInboundCount,
        outbound: d.kpi.pendingOutboundCount,
        purchase: d.kpi.pendingPurchaseCount,
      })
    }).catch(() => {/* silent */})
  }, [])

  const navItems = appRoutes
    .filter((route) => route.showInNav !== false)
    .filter((route) => !route.permission || hasPermission(route.permission))
    .map(({ path, label, icon }) => ({
      path, label, icon,
      badge:
        path === '/inbound' ? (navBadges.inbound || undefined) :
        path === '/outbound' ? (navBadges.outbound || undefined) :
        path === '/purchase' ? (navBadges.purchase || undefined) :
        undefined,
    }))

  const sidebarFooterItems = [
    ...(hasPermission('users:view') ? [{ label: 'Quản lý người dùng', icon: 'pi pi-users', tone: 'default' as const, onClick: () => navigate('/admin/users') }] : []),
    { label: 'Đăng xuất', icon: 'pi pi-power-off', tone: 'danger' as const, onClick: () => { logout() } },
  ]

  return (
    <MasterPage
      sidebar={
        <MasterSidebar
          brandName=""
          navItems={navItems}
          footerItems={sidebarFooterItems}
        />
      }
      header={
        <MasterHeader
          searchValue={search}
          searchPlaceholder="Tìm MÃ NVL / Tên / LOT..."
          userName={user?.fullName ?? ''}
          userRole={ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? ''}
          onSearchChange={setSearch}
        />
      }
      footerText="© 2024 ZencosMS v1.2 - Hệ thống Quản lý Nguyên liệu chuyên sâu FEFO"
    >
      <Outlet context={{ search }} />
    </MasterPage>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfirmDialog />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/overview" replace />} />
            {appRoutes.map(({ path, component: Component, permission }) => (
              <Route
                key={path}
                path={path}
                element={
                  <PermissionGuard permission={permission}>
                    <Component />
                  </PermissionGuard>
                }
              />
            ))}
          </Route>
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}