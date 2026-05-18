import { useNavigate } from 'react-router-dom'
import { Button } from 'primereact/button'

// ─── Static permission matrix (mirrors server/src/middleware/auth.ts) ──────────

const MATRIX_ROLES = [
  { value: 'admin',               label: 'Admin' },
  { value: 'ceo',                 label: 'CEO' },
  { value: 'warehouse_manager',   label: 'QL Kho' },
  { value: 'kho',                 label: 'Kho' },
  { value: 'warehouse_staff',     label: 'NV Kho' },
  { value: 'production_planning', label: 'KH SX' },
  { value: 'production_staff',    label: 'Sản xuất' },
  { value: 'rd_manager',          label: 'TP R&D' },
  { value: 'rd_staff',            label: 'NV R&D' },
  { value: 'mua_hang',            label: 'Mua hàng' },
  { value: 'qa',                  label: 'QA' },
  { value: 'qc',                  label: 'QC' },
  { value: 'sale',                label: 'Sale' },
  { value: 'accounting',          label: 'Kế toán' },
  { value: 'viewer',              label: 'Xem' },
]

const ROLE_PERMS_MAP: Record<string, string[]> = {
  admin: ['*'],
  ceo: [
    'catalog:view', 'catalog:write', 'catalog:delete',
    'inbound:view', 'inbound:detail', 'inbound:write', 'inbound:delete',
    'outbound:view', 'outbound:detail', 'outbound:write', 'outbound:delete',
    'production:view', 'production:detail', 'production:write', 'production:delete',
    'purchase:view', 'purchase:detail', 'purchase:write', 'purchase:delete',
    'opening-stock:view', 'opening-stock:write', 'opening-stock:delete',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
    'users:view',
  ],
  warehouse_manager: [
    'catalog:view', 'catalog:write', 'catalog:delete',
    'inbound:view', 'inbound:detail', 'inbound:write', 'inbound:delete',
    'outbound:view', 'outbound:detail', 'outbound:write', 'outbound:delete',
    'production:view', 'production:detail', 'production:write', 'production:delete',
    'purchase:view', 'purchase:detail', 'purchase:write', 'purchase:delete',
    'opening-stock:view', 'opening-stock:write', 'opening-stock:delete',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
    'users:view',
  ],
  kho: [
    'catalog:view',
    'inbound:view', 'inbound:detail', 'inbound:write',
    'outbound:view', 'outbound:detail', 'outbound:write',
    'opening-stock:view',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
  ],
  warehouse_staff: [
    'catalog:view',
    'inbound:view', 'inbound:detail', 'inbound:write',
    'outbound:view', 'outbound:detail', 'outbound:write',
    'production:view', 'production:detail', 'production:write',
    'purchase:view',
    'opening-stock:view',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
  ],
  production_planning: [
    'catalog:view',
    'production:view', 'production:detail', 'production:write', 'production:delete',
    'inbound:view', 'inbound:detail',
    'outbound:view', 'outbound:detail',
    'purchase:view', 'purchase:detail', 'purchase:write',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
  ],
  production_staff: [
    'catalog:view',
    'production:view', 'production:detail', 'production:write',
    'inbound:view', 'inbound:detail',
    'outbound:view', 'outbound:detail',
    'warehouse:view', 'warehouse:detail',
  ],
  rd_manager: [
    'catalog:view', 'catalog:write', 'catalog:delete',
    'production:view', 'production:detail', 'production:write', 'production:delete',
    'reports:view',
  ],
  rd_staff: [
    'catalog:view', 'catalog:write',
    'production:view', 'production:detail',
  ],
  mua_hang: [
    'catalog:view',
    'purchase:view', 'purchase:detail', 'purchase:write',
    'inbound:view', 'inbound:detail',
    'warehouse:view',
    'reports:view',
  ],
  purchasing: [
    'catalog:view',
    'purchase:view', 'purchase:detail', 'purchase:write',
    'warehouse:view',
    'reports:view',
  ],
  qa: [
    'catalog:view',
    'inbound:view', 'inbound:detail',
    'outbound:view', 'outbound:detail',
    'production:view', 'production:detail',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
  ],
  qc: [
    'catalog:view',
    'inbound:view', 'inbound:detail',
    'outbound:view', 'outbound:detail',
    'production:view', 'production:detail', 'production:write',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
  ],
  sale: [
    'catalog:view',
    'outbound:view', 'outbound:detail',
    'purchase:view', 'purchase:detail',
    'reports:view',
  ],
  accounting: [
    'catalog:view',
    'purchase:view', 'purchase:detail',
    'inbound:view', 'inbound:detail',
    'outbound:view', 'outbound:detail',
    'opening-stock:view',
    'reports:view',
  ],
  viewer: [
    'catalog:view',
    'inbound:view',
    'outbound:view',
    'production:view',
    'purchase:view',
    'opening-stock:view',
    'warehouse:view', 'warehouse:detail',
    'reports:view',
  ],
}

const PERMISSION_MATRIX = [
  { module: 'Tổng quan (Dashboard)',    actions: [{ label: 'Xem',            perm: 'reports:view' }] },
  { module: 'Danh mục (Catalog)',       actions: [
    { label: 'Xem danh sách', perm: 'catalog:view' },
    { label: 'Sửa / Tạo mới', perm: 'catalog:write' },
    { label: 'Xóa',           perm: 'catalog:delete' },
  ]},
  { module: 'Nhập kho (Inbound)',       actions: [
    { label: 'Xem danh sách', perm: 'inbound:view' },
    { label: 'Xem chi tiết',  perm: 'inbound:detail' },
    { label: 'Sửa / Tạo mới', perm: 'inbound:write' },
    { label: 'Xóa',           perm: 'inbound:delete' },
  ]},
  { module: 'Xuất kho NVL',              actions: [
    { label: 'Xem danh sách', perm: 'outbound:view' },
    { label: 'Xem chi tiết',  perm: 'outbound:detail' },
    { label: 'Sửa / Tạo mới', perm: 'outbound:write' },
    { label: 'Xóa',           perm: 'outbound:delete' },
  ]},
  { module: 'Sản xuất (Production)',    actions: [
    { label: 'Xem danh sách', perm: 'production:view' },
    { label: 'Xem chi tiết',  perm: 'production:detail' },
    { label: 'Sửa / Tạo mới', perm: 'production:write' },
    { label: 'Xóa',           perm: 'production:delete' },
  ]},
  { module: 'Mua hàng (Purchase)',      actions: [
    { label: 'Xem danh sách', perm: 'purchase:view' },
    { label: 'Xem chi tiết',  perm: 'purchase:detail' },
    { label: 'Sửa / Tạo mới', perm: 'purchase:write' },
    { label: 'Xóa',           perm: 'purchase:delete' },
  ]},
  { module: 'Quản lý kho (Warehouse)',  actions: [
    { label: 'Xem danh sách', perm: 'warehouse:view' },
    { label: 'Xem chi tiết',  perm: 'warehouse:detail' },
  ]},
  { module: 'Tồn kho đầu kỳ',          actions: [
    { label: 'Xem',           perm: 'opening-stock:view' },
    { label: 'Sửa / Tạo mới', perm: 'opening-stock:write' },
    { label: 'Xóa',           perm: 'opening-stock:delete' },
  ]},
  { module: 'Quản lý người dùng',       actions: [
    { label: 'Xem',           perm: 'users:view' },
    { label: 'Sửa / Tạo mới', perm: 'users:write' },
    { label: 'Xóa',           perm: 'users:delete' },
  ]},
]

function roleHasPerm(role: string, perm: string): boolean {
  const perms = ROLE_PERMS_MAP[role] ?? []
  return perms.includes('*') || perms.includes(perm)
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const thBase: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  border: '1px solid #e5e7eb',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  background: '#f1f5f9',
}

const tdModuleStyle: React.CSSProperties = {
  padding: '0.4rem 0.75rem',
  border: '1px solid #e5e7eb',
  background: '#dbeafe',
  fontWeight: 600,
  color: '#1e3a5f',
  fontSize: '0.8rem',
  whiteSpace: 'nowrap',
}

const tdLabelStyle: React.CSSProperties = {
  padding: '0.3rem 0.75rem 0.3rem 1.5rem',
  border: '1px solid #e5e7eb',
  color: '#374151',
  fontSize: '0.8rem',
  whiteSpace: 'nowrap',
  background: 'white',
}

const tdCheckStyle: React.CSSProperties = {
  padding: '0.3rem',
  border: '1px solid #e5e7eb',
  textAlign: 'center',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RolePermissionsPage() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: '1.5rem', minWidth: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <Button
          icon="pi pi-arrow-left"
          text
          rounded
          onClick={() => navigate('/admin/users')}
          tooltip="Quay lại quản lý người dùng"
        />
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Phân quyền theo vai trò</h2>
      </div>

      <p style={{ margin: '0 0 1rem', color: '#6b7280', fontSize: '0.85rem' }}>
        Bảng phân quyền tổng hợp cho từng vai trò.&nbsp;
        Mỗi ô hiển thị quyền được cấp (
        <i className="pi pi-check" style={{ color: '#22c55e' }} />)
        hoặc không có quyền (
        <i className="pi pi-minus" style={{ color: '#d1d5db' }} />).
      </p>

      {/* Plain div with explicit height — guaranteed bidirectional scroll */}
      <div
        style={{
          width: '100%',
          height: 'calc(100vh - 185px)',
          overflow: 'scroll',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
        }}
      >
        <table
          style={{
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
          }}
        >
          <thead>
            <tr>
              {/* Sticky corner: sticks both top and left */}
              <th
                style={{
                  ...thBase,
                  position: 'sticky',
                  top: 0,
                  left: 0,
                  zIndex: 3,
                  minWidth: 210,
                  textAlign: 'left',
                  borderRight: '2px solid #cbd5e1',
                }}
              >
                Chức năng / Hành động
              </th>
              {MATRIX_ROLES.map((r) => (
                <th
                  key={r.value}
                  style={{
                    ...thBase,
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    minWidth: 90,
                    textAlign: 'center',
                  }}
                >
                  <div>{r.label}</div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 400 }}>{r.value}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MATRIX.map(({ module, actions }) => (
              <>
                {/* Module group header row — spans all columns */}
                <tr key={`${module}_hdr`}>
                  <td
                    colSpan={MATRIX_ROLES.length + 1}
                    style={tdModuleStyle}
                  >
                    {module}
                  </td>
                </tr>

                {/* Action rows */}
                {actions.map(({ label, perm }) => (
                  <tr key={perm}>
                    {/* Sticky first column */}
                    <td
                      style={{
                        ...tdLabelStyle,
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        borderRight: '2px solid #cbd5e1',
                      }}
                    >
                      {label}
                    </td>
                    {MATRIX_ROLES.map((r) => (
                      <td key={r.value} style={tdCheckStyle}>
                        {roleHasPerm(r.value, perm)
                          ? <i className="pi pi-check" style={{ color: '#22c55e', fontSize: '0.85rem' }} />
                          : <i className="pi pi-minus" style={{ color: '#d1d5db', fontSize: '0.85rem' }} />
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
