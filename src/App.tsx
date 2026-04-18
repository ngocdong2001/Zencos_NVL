import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ConfirmDialog } from 'primereact/confirmdialog'
import { MasterHeader } from './components/layout/MasterHeader'
import { MasterPage } from './components/layout/MasterPage'
import { MasterSidebar } from './components/layout/MasterSidebar'
import { appRoutes } from './routes/config'
import { fetchDashboard } from './lib/dashboardApi'
import './App.css'

const sidebarFooterItems = [
  { label: 'Cài đặt', icon: 'pi pi-cog', tone: 'default' as const },
  { label: 'Đăng xuất', icon: 'pi pi-power-off', tone: 'danger' as const },
]

function AppLayout() {
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
    .map(({ path, label, icon }) => ({
      path, label, icon,
      badge:
        path === '/inbound' ? (navBadges.inbound || undefined) :
        path === '/outbound' ? (navBadges.outbound || undefined) :
        path === '/purchase' ? (navBadges.purchase || undefined) :
        undefined,
    }))

  return (
    <MasterPage
      sidebar={
        <MasterSidebar
          brandName="ZencosMS"
          navItems={navItems}
          footerItems={sidebarFooterItems}
        />
      }
      header={
        <MasterHeader
          searchValue={search}
          searchPlaceholder="Tìm MÃ NVL / Tên / LOT..."
          userName="Admin Zencos"
          userRole="Quản lý kho"
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
      <ConfirmDialog />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          {appRoutes.map(({ path, component: Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}