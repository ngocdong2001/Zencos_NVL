import { MasterSidebar } from '../layout/MasterSidebar'
import { appRoutes } from '../../routes/config'

const footerItems = [
  { label: 'Cài đặt', tone: 'default' as const },
  { label: 'Đăng xuất', tone: 'danger' as const },
]

export function CatalogSidebar() {
  return (
    <MasterSidebar
      brandName="ZencosMS"
      navItems={appRoutes.map(({ path, label }) => ({ path, label }))}
      footerItems={footerItems}
    />
  )
}
