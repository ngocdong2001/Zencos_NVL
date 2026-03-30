import type { ComponentType } from 'react'
import { CatalogPage } from '../pages/CatalogPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'

export type RouteConfig = {
  path: string
  label: string
  component: ComponentType
}

export const appRoutes: RouteConfig[] = [
  { path: '/overview', label: 'Tổng quan', component: () => <PlaceholderPage title="Tổng quan" /> },
  { path: '/warehouse', label: 'Quản lý kho', component: () => <PlaceholderPage title="Quản lý kho" /> },
  { path: '/inbound', label: 'Nhập kho', component: () => <PlaceholderPage title="Nhập kho" /> },
  { path: '/outbound', label: 'Xuất kho', component: () => <PlaceholderPage title="Xuất kho" /> },
  { path: '/purchase', label: 'Yêu cầu mua hàng', component: () => <PlaceholderPage title="Yêu cầu mua hàng" /> },
  { path: '/catalog', label: 'Danh mục (Catalogs)', component: CatalogPage },
]
