import { useMemo, useState } from 'react'
import type { TabId } from './types'
import type { ParsedImportResult } from './excelImport'

type CatalogImportModalProps = {
  visible: boolean
  activeTab: TabId
  parsing: boolean
  importing: boolean
  parseError: string | null
  parsedResult: ParsedImportResult | null
  selectedFileName: string
  importSummary: string | null
  onClose: () => void
  onPickFile: (file: File) => void
  onImport: (rows: ParsedImportResult['rows']) => void
}

const TAB_LABELS: Record<TabId, string> = {
  materials: 'Nguyên liệu',
  classifications: 'Phân loại',
  suppliers: 'Nhà cung cấp',
  customers: 'Khách hàng',
  locations: 'Vị trí kho',
  units: 'Đơn vị',
}

const HEADER_LABELS: Record<string, string> = {
  'ma nvl': 'Mã NVL',
  'inci name': 'INCI Name',
  'ten nguyen lieu': 'Tên nguyên liệu',
  'phan loai': 'Phân loại',
  'don vi': 'Đơn vị',
  'trang thai': 'Trạng thái',
  ma: 'Mã',
  ten: 'Tên',
  'ghi chu': 'Ghi chú',
  sdt: 'SĐT',
  'lien he': 'Liên hệ',
  email: 'Email',
  'dia chi': 'Địa chỉ',
  'parent unit id': 'Parent Unit ID',
  'ty le quy doi': 'Tỷ lệ quy đổi',
  'dv mua hang': 'ĐV mua hàng',
  'hien thi mac dinh': 'Hiển thị mặc định',
}

export function CatalogImportModal({
  visible,
  activeTab,
  parsing,
  importing,
  parseError,
  parsedResult,
  selectedFileName,
  importSummary,
  onClose,
  onPickFile,
  onImport,
}: CatalogImportModalProps) {
  const [issueFilter, setIssueFilter] = useState<'all' | 'valid' | 'error'>('all')

  const rows = parsedResult?.rows ?? []
  const validRows = useMemo(() => rows.filter((row) => row.issues.length === 0), [rows])
  const errorRows = useMemo(() => rows.filter((row) => row.issues.some((issue) => issue.severity === 'error')), [rows])

  const visibleRows = useMemo(() => {
    if (issueFilter === 'valid') return validRows
    if (issueFilter === 'error') return errorRows
    return rows
  }, [issueFilter, rows, validRows, errorRows])

  const canImport = validRows.length > 0 && !importing && !parsing

  if (!visible) return null

  return (
    <div className="import-overlay" role="dialog" aria-modal="true" aria-label="Import Excel">
      <div className="import-card">
        <header className="import-header">
          <div>
            <p className="import-kicker">Excel Import Wizard</p>
            <h3>Import danh mục {TAB_LABELS[activeTab]}</h3>
            <p>Upload file, xem trước dữ liệu, sau đó xác nhận import thật vào hệ thống.</p>
          </div>
          <button type="button" className="btn btn-ghost compact" onClick={onClose} disabled={importing}>
            <i className="pi pi-times" /> Đóng
          </button>
        </header>

        <section className="import-uploader">
          <label className="import-dropzone" htmlFor="catalog-import-file-input">
            <input
              id="catalog-import-file-input"
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                onPickFile(file)
                event.currentTarget.value = ''
              }}
            />
            <div>
              <strong>Chọn file Excel hoặc CSV</strong>
              <p>Hỗ trợ định dạng .xlsx, .xls, .csv</p>
              {selectedFileName ? <span>Tệp hiện tại: {selectedFileName}</span> : null}
            </div>
          </label>

          <div className="import-stats">
            <article>
              <span>Tổng dòng</span>
              <strong>{rows.length}</strong>
            </article>
            <article>
              <span>Hợp lệ</span>
              <strong className="ok">{validRows.length}</strong>
            </article>
            <article>
              <span>Lỗi</span>
              <strong className="danger">{errorRows.length}</strong>
            </article>
          </div>
        </section>

        <section className="import-status">
          <div className="import-filter-tabs" role="tablist" aria-label="Lọc dòng import">
            <button type="button" className={issueFilter === 'all' ? 'active' : ''} onClick={() => setIssueFilter('all')}>
              Tất cả
            </button>
            <button type="button" className={issueFilter === 'valid' ? 'active' : ''} onClick={() => setIssueFilter('valid')}>
              Hợp lệ
            </button>
            <button type="button" className={issueFilter === 'error' ? 'active' : ''} onClick={() => setIssueFilter('error')}>
              Có lỗi
            </button>
          </div>
          {parseError ? <p className="import-error">{parseError}</p> : null}
          {importSummary ? <p className="import-success">{importSummary}</p> : null}
        </section>

        <section className="import-preview">
          {rows.length === 0 ? (
            <div className="import-empty">
              <i className="pi pi-file-excel" />
              <p>Chưa có dữ liệu preview. Hãy chọn file để bắt đầu.</p>
            </div>
          ) : (
            <div className="import-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    {parsedResult?.headers.map((header) => (
                      <th key={header}>{HEADER_LABELS[header] ?? header}</th>
                    ))}
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const hasError = row.issues.some((issue) => issue.severity === 'error')
                    return (
                      <tr key={`row-${row.rowNumber}`} className={hasError ? 'error' : 'valid'}>
                        <td>{row.rowNumber}</td>
                        {parsedResult?.headers.map((header) => (
                          <td key={`${row.rowNumber}-${header}`}>{row.values[header] || '-'}</td>
                        ))}
                        <td>
                          {hasError ? (
                            <ul>
                              {row.issues.map((issue, index) => (
                                <li key={`${row.rowNumber}-${issue.field}-${index}`}>{issue.message}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="valid-pill">Hợp lệ</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="import-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={importing}>
            Hủy
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canImport}
            onClick={() => onImport(validRows)}
          >
            {importing ? 'Đang import...' : `Xác nhận import ${validRows.length} dòng hợp lệ`}
          </button>
        </footer>
      </div>
    </div>
  )
}
