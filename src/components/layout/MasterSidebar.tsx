import { NavLink } from 'react-router-dom'

type NavItem = { path: string; label: string }

type MasterSidebarProps = {
  brandName: string
  navItems: NavItem[]
  footerItems?: Array<{ label: string; tone?: 'default' | 'danger' }>
}

export function MasterSidebar({ brandName, navItems, footerItems }: MasterSidebarProps) {
  return (
    <aside className="catalog-sidebar">
      <div className="sidebar-header">
        <span className="brand-mark">◇</span>
        <h1>{brandName}</h1>
      </div>

      <nav className="sidebar-nav" aria-label="Main">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
          >
            <span className="item-dot" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {(footerItems ?? []).map((item) => (
          <button
            key={item.label}
            type="button"
            className={`sidebar-item ${item.tone === 'danger' ? 'danger' : ''}`}
          >
            <span className="item-dot" />
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  )
}
