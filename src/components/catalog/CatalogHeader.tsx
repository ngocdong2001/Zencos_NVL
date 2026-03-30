import { MasterHeader } from '../layout/MasterHeader'

type CatalogHeaderProps = {
  search: string
  onSearchChange: (value: string) => void
}

export function CatalogHeader({ search, onSearchChange }: CatalogHeaderProps) {
  return (
    <MasterHeader
      searchValue={search}
      searchPlaceholder="Tìm MÃ NVL / Tên / LOT..."
      userName="Admin Zencos"
      userRole="Quản lý kho"
      onSearchChange={onSearchChange}
    />
  )
}
