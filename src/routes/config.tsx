import type { ComponentType } from 'react'
import { CatalogPage } from '../pages/CatalogPage'
import { OpeningStockPage } from '../pages/OpeningStockPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { ProductCreatePage } from '../pages/ProductCreatePage'
import { PurchaseOrderPage } from '../pages/PurchaseOrderPage'

export type RouteConfig = {
  path: string
  label: string
  icon: string
  component: ComponentType
  showInNav?: boolean
}

export const appRoutes: RouteConfig[] = [
  { path: '/overview', label: 'Tổng quan', icon: 'pi pi-home', component: () => <PlaceholderPage title="Tổng quan" /> },
  { path: '/warehouse', label: 'Quản lý kho', icon: 'pi pi-building', component: () => <PlaceholderPage title="Quản lý kho" /> },
  { path: '/inbound', label: 'Nhập kho', icon: 'pi pi-download', component: () => <PlaceholderPage title="Nhập kho" /> },
  { path: '/outbound', label: 'Xuất kho', icon: 'pi pi-upload', component: () => <PlaceholderPage title="Xuất kho" /> },
  { path: '/purchase', label: 'Yêu cầu mua hàng', icon: 'pi pi-shopping-cart', component: PurchaseOrderPage },
  { path: '/catalog', label: 'Danh mục (Catalogs)', icon: 'pi pi-database', component: CatalogPage },
  { path: '/catalog/products/new', label: 'Tạo Product Mới', icon: 'pi pi-plus-circle', component: ProductCreatePage, showInNav: false },
  { path: '/opening-stock', label: 'Khai báo tồn kho đầu kỳ', icon: 'pi pi-box', component: OpeningStockPage },
]
