import type { ChangeEvent, RefObject } from 'react'
import type { TabId } from './types'

type CatalogToolbarProps = {
  activeTab: TabId
  tabItems: Array<{ id: TabId; label: string }>
  selectedCount: number
  importInputRef: RefObject<HTMLInputElement | null>
  onExport: () => void
  onFocusQuickAdd: () => void
  onDownloadTemplate: () => void
  onTabChange: (tab: TabId) => void
  onToggleOnlyActive: () => void
  onImportCsv: (event: ChangeEvent<HTMLInputElement>) => void
}

export function CatalogToolbar({
  activeTab,
  tabItems,
  selectedCount,
  importInputRef,
  onExport,
  onFocusQuickAdd,
  onDownloadTemplate,
  onTabChange,
  onToggleOnlyActive,
  onImportCsv,
}: CatalogToolbarProps) {
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
          <button type="button" className="btn btn-primary" onClick={onFocusQuickAdd}>
            <i className="pi pi-plus" /> Thêm Danh mục Mới
          </button>
        </div>
      </section>

      <section className="mapping-card">
        <div className="mapping-icon"><i className="pi pi-file-excel" /></div>
        <div className="mapping-content">
          <strong>Quy tắc Mapping Excel (Bắt buộc)</strong>
          <p>
            Hệ thống tự động nhận diện dữ liệu dựa trên tiêu đề cột. Đảm bảo file Excel của bạn chứa các cột chính xác
            sau: <span>MÃ NVL</span>, <span>INCI NAME</span>, <span>LOT NO</span>, <span>ĐƠN GIÁ/1 KG</span>.
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

      <section className="filter-bar">
        <button type="button" className="btn btn-ghost compact" onClick={onToggleOnlyActive}>
          <i className="pi pi-filter" /> Bộ lọc
        </button>
        <p>
          Đã chọn <strong>{selectedCount}</strong> {activeTab === 'materials' ? 'nguyên liệu' : 'bản ghi'}
        </p>
        <div className="filter-actions">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onImportCsv}
            className="hidden-input"
          />
          <button type="button" className="btn btn-ghost compact" onClick={() => importInputRef.current?.click()}>
            <i className="pi pi-upload" /> Import Excel
          </button>
          <button type="button" className="btn btn-inline" onClick={onFocusQuickAdd}>
            <i className="pi pi-plus" /> Thêm mới
          </button>
        </div>
      </section>
    </>
  )
}
