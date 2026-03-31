export type TabId = 'classifications' | 'materials' | 'suppliers' | 'customers' | 'locations' | 'units'

export type BasicTabId = Exclude<TabId, 'materials'>

export type MaterialRow = {
  id: string
  code: string
  inciName: string
  materialName: string
  category: string
  unit: string
  status: string
}

export type BasicRow = {
  id: string
  code: string
  name: string
  note: string
  contactInfo?: string
  phone?: string
  email?: string
  address?: string
  parentUnitId?: string
  conversionToBase?: number
  isPurchaseUnit?: boolean
  isDefaultDisplay?: boolean
  status: string
}

export type QuickMaterialForm = {
  code: string
  inciName: string
  materialName: string
  category: string
  unit: string
  status: string
}

export type QuickBasicForm = {
  code: string
  name: string
  note: string
  status: string
}

export type CatalogState = Record<BasicTabId, BasicRow[]>
