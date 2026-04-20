import type { ComponentType } from 'react'
import { CatalogPage } from '../pages/CatalogPage'
import { DashboardPage } from '../pages/DashboardPage'
import { InboundPage } from '../pages/InboundPage'
import { InboundStep1Page } from '../pages/InboundStep1Page'
import { InboundStep2Page } from '../pages/InboundStep2Page'
import { InboundStep3Page } from '../pages/InboundStep3Page'
import { InboundStep4Page } from '../pages/InboundStep4Page'
import { OpeningStockPage } from '../pages/OpeningStockPage'
import { OutboundListPage } from '../pages/OutboundListPage'
import { OutboundPage } from '../pages/OutboundPage'
import { ProductCreatePage } from '../pages/ProductCreatePage'
import { PurchaseOrderPage } from '../pages/PurchaseOrderPage'
import { WarehousePage } from '../pages/WarehousePage'
import { WarehouseItemDetailPage } from '../pages/WarehouseItemDetailPage'

export type RouteConfig = {
  path: string
  label: string
  icon: string
  component: ComponentType
  showInNav?: boolean
}

export const appRoutes: RouteConfig[] = [
  { path: '/overview', label: 'Tổng quan', icon: 'pi pi-home', component: DashboardPage },
  { path: '/warehouse', label: 'Quản lý kho', icon: 'pi pi-building', component: WarehousePage },
  { path: '/warehouse/:id', label: 'Chi tiết Vật tư', icon: 'pi pi-box', component: WarehouseItemDetailPage, showInNav: false },
  { path: '/inbound', label: 'Nhập kho', icon: 'pi pi-download', component: InboundPage },
  { path: '/inbound/new', label: 'Tạo phiếu nhập mới', icon: 'pi pi-plus', component: InboundStep1Page, showInNav: false },
  { path: '/inbound/new/step2', label: 'Chi tiết Lô hàng', icon: 'pi pi-list', component: InboundStep2Page, showInNav: false },
  { path: '/inbound/new/step3', label: 'Số lượng & Chứng từ', icon: 'pi pi-paperclip', component: InboundStep3Page, showInNav: false },
  { path: '/inbound/new/step4', label: 'Xác nhận & Hoàn tất', icon: 'pi pi-check-circle', component: InboundStep4Page, showInNav: false },
  { path: '/outbound', label: 'Xuất kho', icon: 'pi pi-upload', component: OutboundListPage },
  { path: '/outbound/new', label: 'Tạo lệnh xuất mới', icon: 'pi pi-plus', component: OutboundPage, showInNav: false },
  { path: '/outbound/:orderId/edit', label: 'Chỉnh sửa lệnh xuất', icon: 'pi pi-pencil', component: OutboundPage, showInNav: false },
  { path: '/purchase', label: 'Yêu cầu mua hàng', icon: 'pi pi-shopping-cart', component: PurchaseOrderPage },
  { path: '/catalog', label: 'Danh mục (Catalogs)', icon: 'pi pi-database', component: CatalogPage },
  { path: '/catalog/products/new', label: 'Tạo Product Mới', icon: 'pi pi-plus-circle', component: ProductCreatePage, showInNav: false },
  { path: '/opening-stock', label: 'Khai báo tồn kho đầu kỳ', icon: 'pi pi-box', component: OpeningStockPage },
]
