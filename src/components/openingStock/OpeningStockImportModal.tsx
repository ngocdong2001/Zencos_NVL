import { useMemo, useState } from 'react'
import type { OpeningStockImportParseResult } from './openingStockExcelImport'

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '-'
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
}

function formatDate(value: string): string {
  if (!value) return '-'
  const [y, m, d] = value.split('-')
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}

function normalizeImportFileName(value: string): string {
  return value
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, '')
    .replace(/\u00A0/g, ' ')
    .normalize('NFKC')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .toLocaleLowerCase()
}

function hasPathSegment(value: string): boolean {
  return /[\\/]/.test(value)
}

type Props = {
  visible: boolean
  parsing: boolean
  importing: boolean
  parseError: string | null
  parsedResult: OpeningStockImportParseResult | null
  selectedFileName: string
  attachmentCount: number
  attachmentFileNames: string[]
  importSummary: string | null
  onClose: () => void
  onPickExcelFile: (file: File) => void
  onPickAttachments: (files: File[]) => void
  onImport: () => void
}

export function OpeningStockImportModal({
  visible,
  parsing,
  importing,
  parseError,
  parsedResult,
  selectedFileName,
  attachmentCount,
  attachmentFileNames,
  importSummary,
  onClose,
  onPickExcelFile,
  onPickAttachments,
  onImport,
}: Props) {
  const [issueFilter, setIssueFilter] = useState<'all' | 'valid' | 'error'>('all')

  const attachmentLookup = useMemo(() => {
    const byExactName = new Set<string>()

    for (const fileName of attachmentFileNames) {
      const exactKey = normalizeImportFileName(fileName)
      if (!exactKey) continue
      byExactName.add(exactKey)
    }

    return { byExactName }
  }, [attachmentFileNames])

  const getAttachmentError = (requestedName: string): string | null => {
    const normalizedRequested = normalizeImportFileName(requestedName)
    if (!normalizedRequested) return null
    if (hasPathSegment(normalizedRequested)) {
      return `Tên file không hợp lệ (không nhập đường dẫn): ${requestedName}`
    }
    if (!attachmentLookup.byExactName.has(normalizedRequested)) {
      return `Thiếu file đính kèm (khớp tuyệt đối tên file): ${requestedName}`
    }
    return null
  }

  const getRowWarnings = (row: OpeningStockImportParseResult['rows'][number]): string[] => {
    const warnings = [...row.warnings]

    const docTypeEntries = Object.entries(row.docsByType) as Array<[string, string[]]>
    for (const [docType, names] of docTypeEntries) {
      for (const requestedName of names) {
        const attachmentError = getAttachmentError(requestedName)
        if (attachmentError) {
          warnings.push(`${attachmentError} [${docType}]`)
        }
      }
    }

    return warnings
  }

  const rows = parsedResult?.rows ?? []
  const validRows = useMemo(
    () => rows.filter((row) => getRowWarnings(row).length === 0),
    [rows, attachmentLookup],
  )
  const errorRows = useMemo(
    () => rows.filter((row) => getRowWarnings(row).length > 0),
    [rows, attachmentLookup],
  )

  const visibleRows = useMemo(() => {
    if (issueFilter === 'valid') return validRows
    if (issueFilter === 'error') return errorRows
    return rows
  }, [errorRows, issueFilter, rows, validRows])

  const canImport = validRows.length > 0 && !importing && !parsing

  if (!visible) return null

  return (
    <div className="import-overlay" role="dialog" aria-modal="true" aria-label="Import Excel tồn kho đầu kỳ">
      <div className="import-card">
        <header className="import-header">
          <div>
            <p className="import-kicker">Excel Import Wizard</p>
            <h3>Import tồn kho đầu kỳ</h3>
            <p>Chọn file Excel, xem trước dữ liệu, sau đó xác nhận import và tự upload chứng từ.</p>
          </div>
          <button type="button" className="btn btn-ghost compact" onClick={onClose} disabled={importing}>
            <i className="pi pi-times" /> Đóng
          </button>
        </header>

        <section className="import-uploader">
          <label className="import-dropzone" htmlFor="opening-stock-import-file-input">
            <input
              id="opening-stock-import-file-input"
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                onPickExcelFile(file)
                event.currentTarget.value = ''
              }}
            />
            <div>
              <strong>Chọn file Excel hoặc CSV</strong>
              <p>Hỗ trợ định dạng .xlsx, .xls, .csv</p>
              {selectedFileName ? <span>Tệp hiện tại: {selectedFileName}</span> : null}
            </div>
          </label>

          <label className="import-dropzone" htmlFor="opening-stock-attachment-file-input">
            <input
              id="opening-stock-attachment-file-input"
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp,.xlsx,.xls"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                onPickAttachments(files)
                event.currentTarget.value = ''
              }}
            />
            <div>
              <strong>Chọn file chứng từ đính kèm</strong>
              <p>Tự đối chiếu theo tên file khai trong cột CHỨNG TỪ</p>
              <span>Đã chọn: {attachmentCount} file</span>
              {attachmentFileNames.length > 0 ? (
                <span title={attachmentFileNames.join(', ')}>
                  {`Tên đã nhận: ${attachmentFileNames.slice(0, 4).join(', ')}${attachmentFileNames.length > 4 ? ' ...' : ''}`}
                </span>
              ) : (
                <span>Chưa có file chứng từ nào được chọn.</span>
              )}
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
                    <th>Mã NVL</th>
                    <th>Tên thương mại</th>
                    <th>Tên INCI</th>
                    <th>Số lô</th>
                    <th>Số hóa đơn</th>
                    <th>Ngày hóa đơn</th>
                    <th>Nhà cung cấp</th>
                    <th>SL (gr/ml)</th>
                    <th>Đơn giá</th>
                    <th>ĐV đơn giá</th>
                    <th>Thành tiền</th>
                    <th>Ngày TD</th>
                    <th>Ngày SX</th>
                    <th>Hạn SD</th>
                    <th>MSDS</th>
                    <th>COA</th>
                    <th>Hóa đơn</th>
                    <th>Khác</th>
                    <th>Chứng từ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const rowWarnings = getRowWarnings(row)
                    const hasError = rowWarnings.length > 0
                    return (
                      <tr key={`row-${row.rowNumber}`} className={hasError ? 'error' : 'valid'}>
                        <td>{row.rowNumber}</td>
                        <td>{row.code || '-'}</td>
                        <td>{row.lookupTradeName || '-'}</td>
                        <td>{row.lookupInciName || '-'}</td>
                        <td>{row.lot || '-'}</td>
                        <td>{row.invoiceNo || '-'}</td>
                        <td>{formatDate(row.invoiceDate)}</td>
                        <td>{row.resolvedSupplierName || row.resolvedSupplierCode ? `${row.resolvedSupplierCode || ''}${row.resolvedSupplierCode && row.resolvedSupplierName ? ' - ' : ''}${row.resolvedSupplierName || ''}` : row.supplierText || '-'}</td>
                        <td>{formatNumber(row.quantityBase)}</td>
                        <td>{formatNumber(row.unitPriceValue)}</td>
                        <td>{row.lookupUnitPriceUnitCode || '-'}</td>
                        <td>{formatNumber(row.calculatedLineAmount ?? 0)}</td>
                        <td>{formatDate(row.openingDate)}</td>
                        <td>{formatDate(row.manufactureDate)}</td>
                        <td>{formatDate(row.expiryDate)}</td>
                        <td>{row.docsByType.MSDS.join(', ') || '-'}</td>
                        <td>{row.docsByType.COA.join(', ') || '-'}</td>
                        <td>{row.docsByType.Invoice.join(', ') || '-'}</td>
                        <td>{row.docsByType.Other.join(', ') || '-'}</td>
                        <td>{row.hasAnyDocument ? 'Có' : 'Không'}</td>
                        <td>
                          {hasError ? (
                            <ul>
                              {rowWarnings.map((warning, index) => (
                                <li key={`${row.rowNumber}-${index}`}>{warning}</li>
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
          <button type="button" className="btn btn-primary" disabled={!canImport} onClick={onImport}>
            {importing ? 'Đang import...' : `Xác nhận import ${validRows.length} dòng hợp lệ`}
          </button>
        </footer>
      </div>
    </div>
  )
}
