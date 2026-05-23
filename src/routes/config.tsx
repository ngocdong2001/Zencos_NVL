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
import { TpOutboundListPage } from '../pages/TpOutboundListPage'
import { TpOutboundPage } from '../pages/TpOutboundPage'
import { ProductCreatePage } from '../pages/ProductCreatePage'
import { PurchaseOrderPage } from '../pages/PurchaseOrderPage'
import { WarehousePage } from '../pages/WarehousePage'
import { WarehouseItemDetailPage } from '../pages/WarehouseItemDetailPage'
import { FgWarehousePage } from '../pages/FgWarehousePage'
import { FgWarehouseItemDetailPage } from '../pages/FgWarehouseItemDetailPage'
import { ProductionListPage } from '../pages/ProductionListPage'
import { ProductionStep1Page } from '../pages/ProductionStep1Page'
import { ProductionStep2Page } from '../pages/ProductionStep2Page'
import { ProductionStep3Page } from '../pages/ProductionStep3Page'
import { ProductionStep4Page } from '../pages/ProductionStep4Page'
import { ProductionFlowDiagramPage } from '../pages/ProductionFlowDiagramPage'
import { StockTransferListPage } from '../pages/StockTransferListPage'
import { StockTransferPage } from '../pages/StockTransferPage'
import { UserManagementPage } from '../pages/UserManagementPage'
import { RolePermissionsPage } from '../pages/RolePermissionsPage'

export type RouteConfig = {
  path: string
  label: string
  icon: string
  component: ComponentType
  showInNav?: boolean
  /** Permission required to access this route. Omit for always-accessible routes. */
  permission?: string
  /** Show a divider line before this route in navigation */
  divider?: boolean
}

export const appRoutes: RouteConfig[] = [
  // Group 1: Overview & Warehouses
  { path: '/overview',                  label: 'Tổng quan',                    icon: 'pi pi-home',         component: DashboardPage,           permission: 'reports:view' },
  { path: '/warehouse',                 label: 'Quản lý kho NVL',             icon: 'pi pi-building',     component: WarehousePage,            permission: 'warehouse:view' },
  { path: '/warehouse/:id',             label: 'Chi tiết Vật tư',              icon: 'pi pi-box',          component: WarehouseItemDetailPage,  permission: 'warehouse:detail',  showInNav: false },
  { path: '/fg-warehouse',              label: 'Quản lý kho Thành phẩm',      icon: 'pi pi-box',          component: FgWarehousePage,          permission: 'warehouse:view' },
  { path: '/fg-warehouse/:id',          label: 'Chi tiết Thành phẩm',         icon: 'pi pi-box',          component: FgWarehouseItemDetailPage, permission: 'warehouse:detail', showInNav: false },
  { path: '/stock-transfer',            label: 'Chuyển kho nội bộ',            icon: 'pi pi-arrow-right-left', component: StockTransferListPage,   permission: 'warehouse:view' },
  { path: '/stock-transfer/new',        label: 'Tạo phiếu chuyển mới',         icon: 'pi pi-plus',         component: StockTransferPage,         permission: 'warehouse:write',   showInNav: false },
  { path: '/stock-transfer/:id',        label: 'Chi tiết phiếu chuyển',        icon: 'pi pi-pencil',       component: StockTransferPage,         permission: 'warehouse:write',   showInNav: false },

  // Group 2: Logistics & Production (divider before this group)
  { path: '/purchase',                  label: 'Yêu cầu mua hàng',             icon: 'pi pi-shopping-cart',component: PurchaseOrderPage,        permission: 'purchase:view',     divider: true },
  { path: '/inbound',                   label: 'Nhập kho NVL',                icon: 'pi pi-download',     component: InboundPage,              permission: 'inbound:view' },
  { path: '/inbound/new',               label: 'Tạo phiếu nhập mới',           icon: 'pi pi-plus',         component: InboundStep1Page,         permission: 'inbound:write',     showInNav: false },
  { path: '/inbound/new/step2',         label: 'Chi tiết Lô hàng',             icon: 'pi pi-list',         component: InboundStep2Page,         permission: 'inbound:write',     showInNav: false },
  { path: '/inbound/new/step3',         label: 'Số lượng & Chứng từ',          icon: 'pi pi-paperclip',    component: InboundStep3Page,         permission: 'inbound:write',     showInNav: false },
  { path: '/inbound/new/step4',         label: 'Xác nhận & Hoàn tất',          icon: 'pi pi-check-circle', component: InboundStep4Page,         permission: 'inbound:write',     showInNav: false },
  { path: '/outbound',                  label: 'Xuất kho NVL',                 icon: 'pi pi-upload',       component: OutboundListPage,         permission: 'outbound:view' },
  { path: '/outbound/new',              label: 'Tạo lệnh xuất mới',            icon: 'pi pi-plus',         component: OutboundPage,             permission: 'outbound:write',    showInNav: false },
  { path: '/outbound/:orderId/edit',    label: 'Chỉnh sửa lệnh xuất',          icon: 'pi pi-pencil',       component: OutboundPage,             permission: 'outbound:write',    showInNav: false },
  { path: '/production',                label: 'Phiếu sản xuất',              icon: 'pi pi-cog',          component: ProductionListPage,       permission: 'production:view' },
  { path: '/production/new',            label: 'Tạo lệnh sản xuất mới',        icon: 'pi pi-plus',         component: ProductionStep1Page,      permission: 'production:write', showInNav: false },
  { path: '/production/:orderId/buoc-1', label: 'Bước 1: Xuất NVL',           icon: 'pi pi-cog',          component: ProductionStep1Page,      permission: 'production:write', showInNav: false },
  { path: '/production/:orderId/buoc-2', label: 'Bước 2: Nhập BTP',           icon: 'pi pi-cog',          component: ProductionStep2Page,      permission: 'production:write', showInNav: false },
  { path: '/production/:orderId/buoc-3', label: 'Bước 3: Xuất BTP',           icon: 'pi pi-cog',          component: ProductionStep3Page,      permission: 'production:write', showInNav: false },
  { path: '/production/:orderId/buoc-4', label: 'Bước 4: Nhập TP',            icon: 'pi pi-cog',          component: ProductionStep4Page,      permission: 'production:write', showInNav: false },
  { path: '/production/:orderId/luu-do', label: 'Lưu đồ NVL',                 icon: 'pi pi-sitemap',      component: ProductionFlowDiagramPage, permission: 'production:view', showInNav: false },
  { path: '/tp-outbound',               label: 'Xuất kho TP',                  icon: 'pi pi-truck',        component: TpOutboundListPage,       permission: 'outbound:view' },
  { path: '/tp-outbound/new',           label: 'Tạo lệnh xuất TP mới',         icon: 'pi pi-plus',         component: TpOutboundPage,           permission: 'outbound:write',    showInNav: false },
  { path: '/tp-outbound/:orderId/edit', label: 'Chi tiết lệnh xuất TP',        icon: 'pi pi-pencil',       component: TpOutboundPage,           permission: 'outbound:write',    showInNav: false },

  // Group 3: Reference Data (divider before this group)
  { path: '/catalog',                   label: 'Danh mục (Catalogs)',          icon: 'pi pi-database',     component: CatalogPage,              divider: true },
  { path: '/catalog/products/new',      label: 'Tạo Product Mới',              icon: 'pi pi-plus-circle',  component: ProductCreatePage,        permission: 'catalog:write',     showInNav: false },
  { path: '/opening-stock',             label: 'Khai báo tồn kho đầu kỳ',      icon: 'pi pi-box',          component: OpeningStockPage,         permission: 'opening-stock:view' },

  // Admin (hidden from nav)
  { path: '/admin/users',               label: 'Quản lý người dùng',           icon: 'pi pi-users',        component: UserManagementPage,       permission: 'users:view',        showInNav: false },
  { path: '/admin/role-permissions',    label: 'Phân quyền theo vai trò',      icon: 'pi pi-shield',       component: RolePermissionsPage,      permission: 'users:view',        showInNav: false },
]
