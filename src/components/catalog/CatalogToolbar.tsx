import type { TabId } from './types'

const mappingGuides: Record<TabId, { title: string; columns: string[]; note: string }> = {
  materials: {
    title: 'Mapping Excel cho Nguyên liệu Master',
    columns: ['MÃ NVL', 'INCI NAME', 'TÊN NGUYÊN LIỆU', 'PHÂN LOẠI', 'ĐƠN VỊ TÍNH'],
    note: 'Dùng để tạo/cập nhật danh mục nguyên liệu chuẩn trong hệ thống.',
  },
  classifications: {
    title: 'Mapping Excel cho Phân loại NVL',
    columns: ['MÃ PHÂN LOẠI', 'TÊN PHÂN LOẠI', 'GHI CHÚ', 'TRẠNG THÁI'],
    note: 'Phục vụ chuẩn hóa nhóm nguyên liệu cho tìm kiếm và báo cáo.',
  },
  suppliers: {
    title: 'Mapping Excel cho Nhà cung cấp',
    columns: ['MÃ NCC', 'TÊN NHÀ CUNG CẤP', 'THÔNG TIN LIÊN HỆ', 'SỐ ĐIỆN THOẠI', 'EMAIL'],
    note: 'Nên đảm bảo email và số điện thoại đúng định dạng trước khi import.',
  },
  customers: {
    title: 'Mapping Excel cho Khách hàng',
    columns: ['MÃ KH', 'TÊN KHÁCH HÀNG', 'THÔNG TIN LIÊN HỆ', 'SỐ ĐIỆN THOẠI', 'ĐỊA CHỈ'],
    note: 'Dùng cho dữ liệu đối tác bán hàng và phân phối.',
  },
  locations: {
    title: 'Mapping Excel cho Vị trí kho',
    columns: ['MÃ VỊ TRÍ', 'TÊN VỊ TRÍ', 'MÔ TẢ', 'TRẠNG THÁI'],
    note: 'Hỗ trợ chuẩn hóa sơ đồ vị trí chứa hàng trong kho.',
  },
  units: {
    title: 'Mapping Excel cho Đơn vị đo',
    columns: ['MÃ ĐƠN VỊ', 'TÊN ĐƠN VỊ', 'ĐƠN VỊ CHA', 'HỆ SỐ QUY ĐỔI', 'MẶC ĐỊNH HIỂN THỊ'],
    note: 'Dùng để chuẩn hóa đơn vị tính và quy đổi nội bộ.',
  },
}

type CatalogToolbarProps = {
  activeTab: TabId
  tabItems: Array<{ id: TabId; label: string }>
  selectedCount: number
  onExport: () => void
  onFocusQuickAdd: () => void
  onDownloadTemplate: () => void
  onTabChange: (tab: TabId) => void
  onToggleOnlyActive: () => void
  onOpenImport: () => void
}

export function CatalogToolbar({
  activeTab,
  tabItems,
  selectedCount,
  onExport,
  onFocusQuickAdd,
  onDownloadTemplate,
  onTabChange,
  onToggleOnlyActive,
  onOpenImport,
}: CatalogToolbarProps) {
  const currentMappingGuide = mappingGuides[activeTab]

  return (
    <>
      <section className="title-bar">
        <div>
          <h2>Quản lý Danh mục (Catalogs)</h2>
          <p>Quản trị dữ liệu gốc cho toàn bộ hệ thống ZencosMS.</p>
        </div>
        <div className="title-actions">
          <button type="button" className="btn btn-ghost" onClick={onExport}>
            <i className="pi pi-download" /> Xuất Tất Cả (Excel)
          </button>
          <button type="button" className="btn btn-ghost" onClick={onOpenImport}>
            <i className="pi pi-upload" /> Import Excel
          </button>
          <button type="button" className="btn btn-primary" onClick={onFocusQuickAdd}>
            <i className="pi pi-plus" /> Thêm Danh mục Mới
          </button>
        </div>
      </section>

      <section className="mapping-card">
        <div className="mapping-icon"><i className="pi pi-file-excel" /></div>
        <div className="mapping-content">
          <strong>{currentMappingGuide.title}</strong>
          <p>
            Hệ thống tự động nhận diện dữ liệu dựa trên tiêu đề cột. Với bảng hiện tại, file Excel cần có các cột:
            {' '}
            {currentMappingGuide.columns.map((column, index) => (
              <span key={column}>
                {index > 0 ? ', ' : ''}
                {column}
              </span>
            ))}
            . {currentMappingGuide.note}
          </p>
        </div>
        <button type="button" className="btn btn-ghost compact" onClick={onDownloadTemplate}>
          <i className="pi pi-download" /> Tải Template
        </button>
      </section>

      <section className="tabs-row" aria-label="Catalog tabs">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {false && (
        <section className="filter-bar">
          <button type="button" className="btn btn-ghost compact" onClick={onToggleOnlyActive}>
            <i className="pi pi-filter" /> Bộ lọc
          </button>
          <p>
            Đã chọn <strong>{selectedCount}</strong> {activeTab === 'materials' ? 'nguyên liệu' : 'bản ghi'}
          </p>
          <div className="filter-actions">
            <button type="button" className="btn btn-inline" onClick={onFocusQuickAdd}>
              <i className="pi pi-plus" /> Thêm mới
            </button>
          </div>
        </section>
      )}
    </>
  )
}
