import { useEffect, useMemo, useState } from 'react'
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
  product_outputs: 'Thành phẩm / Bán thành phẩm',
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
  'don vi dat hang': 'ĐV đặt hàng',
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
  const [issueFilter, setIssueFilter] = useState<'all' | 'new' | 'update' | 'conflict' | 'error'>('all')

  const rows = parsedResult?.rows ?? []
  const hasMergeAnnotation = rows.length > 0 && rows.some((r) => r.mergeAction !== undefined)

  useEffect(() => { setIssueFilter('all') }, [parsedResult])

  const errorRows = useMemo(() => rows.filter((row) => row.issues.some((issue) => issue.severity === 'error')), [rows])
  const validRows = useMemo(() => rows.filter((row) => !row.issues.some((issue) => issue.severity === 'error')), [rows])
  const newRows = useMemo(() => validRows.filter((row) => !row.mergeAction || row.mergeAction === 'new'), [validRows])
  const updateRows = useMemo(() => validRows.filter((row) => row.mergeAction === 'update'), [validRows])
  const conflictRows = useMemo(() => validRows.filter((row) => row.mergeAction === 'conflict'), [validRows])

  const visibleRows = useMemo(() => {
    if (issueFilter === 'new') return newRows
    if (issueFilter === 'update') return updateRows
    if (issueFilter === 'conflict') return conflictRows
    if (issueFilter === 'error') return errorRows
    return rows
  }, [issueFilter, rows, newRows, updateRows, conflictRows, errorRows])

  const importButtonLabel = useMemo(() => {
    if (importing) return 'Đang import...'
    if (!hasMergeAnnotation) return `Xác nhận import ${validRows.length} dòng hợp lệ`
    const parts: string[] = []
    if (newRows.length > 0) parts.push(`${newRows.length} mới`)
    if (updateRows.length > 0) parts.push(`cập nhật ${updateRows.length}`)
    if (conflictRows.length > 0) parts.push(`${conflictRows.length} xung đột`)
    return parts.length > 0 ? `Import: ${parts.join(' + ')}` : 'Không có dữ liệu hợp lệ'
  }, [importing, hasMergeAnnotation, validRows.length, newRows.length, updateRows.length, conflictRows.length])

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
            {hasMergeAnnotation ? (
              <>
                <article>
                  <span>Mới</span>
                  <strong className="ok">{newRows.length}</strong>
                </article>
                <article>
                  <span>Cập nhật</span>
                  <strong style={{ color: '#0ea5e9' }}>{updateRows.length}</strong>
                </article>
                <article>
                  <span>Xung đột</span>
                  <strong style={{ color: '#f59e0b' }}>{conflictRows.length}</strong>
                </article>
              </>
            ) : (
              <article>
                <span>Hợp lệ</span>
                <strong className="ok">{validRows.length}</strong>
              </article>
            )}
            <article>
              <span>Lỗi</span>
              <strong className="danger">{errorRows.length}</strong>
            </article>
          </div>
        </section>

        <section className="import-status">
          <div className="import-filter-tabs" role="tablist" aria-label="Lọc dòng import">
            <button type="button" className={issueFilter === 'all' ? 'active' : ''} onClick={() => setIssueFilter('all')}>
              Tất cả ({rows.length})
            </button>
            {hasMergeAnnotation ? (
              <>
                <button type="button" className={issueFilter === 'new' ? 'active' : ''} onClick={() => setIssueFilter('new')}>
                  Mới ({newRows.length})
                </button>
                <button type="button" className={issueFilter === 'update' ? 'active' : ''} onClick={() => setIssueFilter('update')}>
                  Cập nhật ({updateRows.length})
                </button>
                <button type="button" className={issueFilter === 'conflict' ? 'active' : ''} onClick={() => setIssueFilter('conflict')}>
                  Xung đột ({conflictRows.length})
                </button>
              </>
            ) : (
              <button type="button" className={issueFilter === 'new' ? 'active' : ''} onClick={() => setIssueFilter('new')}>
                Hợp lệ ({validRows.length})
              </button>
            )}
            <button type="button" className={issueFilter === 'error' ? 'active' : ''} onClick={() => setIssueFilter('error')}>
              Có lỗi ({errorRows.length})
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
                    {hasMergeAnnotation && <th>Hành động</th>}
                    {parsedResult?.headers.map((header) => (
                      <th key={header}>{HEADER_LABELS[header] ?? header}</th>
                    ))}
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const hasError = row.issues.some((issue) => issue.severity === 'error')
                    const isUpdate = row.mergeAction === 'update'
                    const isConflict = row.mergeAction === 'conflict'
                    const rowClass = hasError ? 'error' : isConflict ? 'conflict' : isUpdate ? 'update' : 'valid'
                    return (
                      <tr key={`row-${row.rowNumber}`} className={rowClass}>
                        <td>{row.rowNumber}</td>
                        {hasMergeAnnotation && (
                          <td>
                            {isUpdate && (
                              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                ✏ Cập nhật
                              </span>
                            )}
                            {isConflict && (
                              <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                ⚠ Xung đột
                              </span>
                            )}
                            {!isUpdate && !isConflict && !hasError && (
                              <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                + Mới
                              </span>
                            )}
                          </td>
                        )}
                        {parsedResult?.headers.map((header) => {
                          const isDiff = isUpdate && (row.diffFields?.includes(header) ?? false)
                          return (
                            <td key={`${row.rowNumber}-${header}`} style={isDiff ? { background: '#fef9c3', fontWeight: 600 } : undefined}>
                              {row.values[header] || '-'}
                            </td>
                          )
                        })}
                        <td>
                          {hasError ? (
                            <ul>
                              {row.issues.map((issue, index) => (
                                <li key={`${row.rowNumber}-${issue.field}-${index}`}>{issue.message}</li>
                              ))}
                            </ul>
                          ) : isUpdate ? (
                            <span>
                              {row.diffFields && row.diffFields.length > 0
                                ? `${row.diffFields.length} cột thay đổi`
                                : 'Không có thay đổi'}
                            </span>
                          ) : isConflict ? (
                            <span style={{ color: '#92400e' }}>
                              Tên tương tự: <em>{row.conflictWith}</em>
                            </span>
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
            {importButtonLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
