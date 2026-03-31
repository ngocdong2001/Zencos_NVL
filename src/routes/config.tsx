import type { ComponentType } from 'react'
import { CatalogPage } from '../pages/CatalogPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'

export type RouteConfig = {
  path: string
  label: string
  icon: string
  component: ComponentType
}

export const appRoutes: RouteConfig[] = [
  { path: '/overview', label: 'Tổng quan', icon: 'pi pi-home', component: () => <PlaceholderPage title="Tổng quan" /> },
  { path: '/warehouse', label: 'Quản lý kho', icon: 'pi pi-building', component: () => <PlaceholderPage title="Quản lý kho" /> },
  { path: '/inbound', label: 'Nhập kho', icon: 'pi pi-download', component: () => <PlaceholderPage title="Nhập kho" /> },
  { path: '/outbound', label: 'Xuất kho', icon: 'pi pi-upload', component: () => <PlaceholderPage title="Xuất kho" /> },
  { path: '/purchase', label: 'Yêu cầu mua hàng', icon: 'pi pi-shopping-cart', component: () => <PlaceholderPage title="Yêu cầu mua hàng" /> },
  { path: '/catalog', label: 'Danh mục (Catalogs)', icon: 'pi pi-database', component: CatalogPage },
]
