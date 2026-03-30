import type { CatalogState, MaterialRow, QuickBasicForm, QuickMaterialForm, TabId } from './types'

export const tabItems: Array<{ id: TabId; label: string }> = [
  { id: 'classifications', label: 'Phân loại NVL' },
  { id: 'materials', label: 'Nguyên liệu Master' },
  { id: 'suppliers', label: 'Nhà cung cấp' },
  { id: 'customers', label: 'Khách hàng' },
  { id: 'locations', label: 'Vị trí kho' },
  { id: 'units', label: 'Đơn vị đo' },
]

export const navItems = [
  'Tổng quan',
  'Quản lý kho',
  'Nhập kho',
  'Xuất kho',
  'Yêu cầu mua hàng',
  'Danh mục (Catalogs)',
]

export const initialMaterialRows: MaterialRow[] = [
  {
    id: 'nvl-001',
    code: 'NVL-001',
    inciName: 'Glycerin',
    materialName: 'Glycerin 99.5%',
    category: 'Chất giữ ẩm',
    unit: 'kg',
    status: 'Active',
  },
  {
    id: 'nvl-002',
    code: 'NVL-002',
    inciName: 'Phenoxyethanol',
    materialName: 'Phenoxyethanol',
    category: 'Chất bảo quản',
    unit: 'kg',
    status: 'Active',
  },
  {
    id: 'nvl-003',
    code: 'NVL-003',
    inciName: 'Sodium Laureth Sulfate',
    materialName: 'SLES 70%',
    category: 'Chất hoạt động bề mặt',
    unit: 'kg',
    status: 'Active',
  },
  {
    id: 'nvl-004',
    code: 'NVL-004',
    inciName: 'Fragrance',
    materialName: 'Hương Lavender',
    category: 'Hương liệu',
    unit: 'Lít',
    status: 'Active',
  },
  {
    id: 'nvl-005',
    code: 'NVL-005',
    inciName: 'Purified Water',
    materialName: 'Nước cất hai lần',
    category: 'Dung môi',
    unit: 'Lít',
    status: 'Active',
  },
]

export const initialBasicRows: CatalogState = {
  classifications: [
    { id: 'cls-1', code: 'CLS-01', name: 'Chất bảo quản', note: 'Nhóm chống vi sinh', status: 'Active' },
    { id: 'cls-2', code: 'CLS-02', name: 'Dung môi', note: 'Nhóm hòa tan', status: 'Active' },
  ],
  suppliers: [
    { id: 'sup-1', code: 'SUP-01', name: 'ChemSource', note: 'Nhà cung cấp chính', status: 'Active' },
    { id: 'sup-2', code: 'SUP-02', name: 'BioEssence', note: 'Nguồn nguyên liệu hữu cơ', status: 'Active' },
  ],
  customers: [
    { id: 'cus-1', code: 'CUS-01', name: 'Cửa hàng A', note: 'Đối tác chiến lược', status: 'Active' },
    { id: 'cus-2', code: 'CUS-02', name: 'Đại lý B', note: 'Kênh miền Trung', status: 'Inactive' },
  ],
  locations: [
    { id: 'loc-1', code: 'KHO-A1', name: 'Kệ A1', note: 'Kho nguyên liệu chính', status: 'Active' },
    { id: 'loc-2', code: 'KHO-B2', name: 'Kệ B2', note: 'Kho phụ gia', status: 'Active' },
  ],
  units: [
    { id: 'u-1', code: 'KG', name: 'Kilogram', note: 'Đơn vị khối lượng', status: 'Active' },
    { id: 'u-2', code: 'L', name: 'Lít', note: 'Đơn vị thể tích', status: 'Active' },
  ],
}

export const emptyMaterialForm: QuickMaterialForm = {
  code: '',
  inciName: '',
  materialName: '',
  category: '',
  unit: '',
  status: 'Active',
}

export const emptyBasicForm: QuickBasicForm = {
  code: '',
  name: '',
  note: '',
  status: 'Active',
}
