type MasterHeaderProps = {
  searchValue: string
  searchPlaceholder: string
  userName: string
  userRole: string
  onSearchChange: (value: string) => void
}

export function MasterHeader({
  searchValue,
  searchPlaceholder,
  userName,
  userRole,
  onSearchChange,
}: MasterHeaderProps) {
  return (
    <header className="catalog-header">
      <div className="search-box">
        <i className="pi pi-search" aria-hidden />
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
      </div>

      <div className="header-user">
        <button type="button" className="notif-btn" aria-label="Notifications">
          <i className="pi pi-bell" />
        </button>
        <div className="user-copy">
          <strong>{userName}</strong>
          <span>{userRole}</span>
        </div>
        <div className="avatar">A</div>
      </div>
    </header>
  )
}
