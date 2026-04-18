import { NavLink } from 'react-router-dom'

type NavItem = { path: string; label: string; icon?: string; badge?: number }

type MasterSidebarProps = {
  brandName: string
  navItems: NavItem[]
  footerItems?: Array<{ label: string; icon?: string; tone?: 'default' | 'danger' }>
}

export function MasterSidebar({ brandName, navItems, footerItems }: MasterSidebarProps) {
  return (
    <aside className="catalog-sidebar">
      <div className="sidebar-header">
        <span className="brand-mark">
          <i className="pi pi-box" />
        </span>
        <h1>{brandName}</h1>
      </div>

      <nav className="sidebar-nav" aria-label="Main">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
          >
            {item.icon
              ? <i className={item.icon} />
              : <span className="item-dot" />}
            {item.label}
            {!!item.badge && item.badge > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginLeft: 6,
                background: '#2626d9',
                color: '#fff',
                borderRadius: 8,
                fontSize: 9,
                fontWeight: 700,
                padding: '1px 5px',
                lineHeight: '14px',
                minWidth: 14,
                verticalAlign: 'middle',
              }}>
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
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
            {item.icon
              ? <i className={item.icon} />
              : <span className="item-dot" />}
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  )
}
