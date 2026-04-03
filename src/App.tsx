import { useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { MasterHeader } from './components/layout/MasterHeader'
import { MasterPage } from './components/layout/MasterPage'
import { MasterSidebar } from './components/layout/MasterSidebar'
import { appRoutes } from './routes/config'
import './App.css'

const sidebarFooterItems = [
  { label: 'Cài đặt', icon: 'pi pi-cog', tone: 'default' as const },
  { label: 'Đăng xuất', icon: 'pi pi-power-off', tone: 'danger' as const },
]

function AppLayout() {
  const [search, setSearch] = useState('')

  return (
    <MasterPage
      sidebar={
        <MasterSidebar
          brandName="ZencosMS"
          navItems={appRoutes.filter((route) => route.showInNav !== false).map(({ path, label, icon }) => ({ path, label, icon }))}
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
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/catalog" replace />} />
          {appRoutes.map(({ path, component: Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}