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
