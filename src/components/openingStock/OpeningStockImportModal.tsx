import { useMemo, useState } from 'react'
import type { OpeningStockImportParseResult } from './openingStockExcelImport'
import type { CatalogSyncProduct, CatalogSyncSupplier } from '../../pages/OpeningStockPage'

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
  catalogSyncProducts: CatalogSyncProduct[]
  catalogSyncSuppliers: CatalogSyncSupplier[]
  syncingCatalog: boolean
  importStep: 1 | 2 | 3
  onGoToStep: (step: 1 | 2 | 3) => void
  onUpdateSyncProducts: (items: CatalogSyncProduct[]) => void
  onUpdateSyncSuppliers: (items: CatalogSyncSupplier[]) => void
  onCreateSuppliers: () => void
  onCreateProducts: () => void
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
  catalogSyncProducts,
  catalogSyncSuppliers,
  syncingCatalog,
  importStep,
  onGoToStep,
  onUpdateSyncProducts,
  onUpdateSyncSuppliers,
  onCreateSuppliers,
  onCreateProducts,
  onClose,
  onPickExcelFile,
  onPickAttachments,
  onImport,
}: Props) {
  const [issueFilter, setIssueFilter] = useState<'all' | 'valid' | 'error'>('all')

  const attachmentLookup = useMemo(() => {
    const byExactName = new Set<string>()
    const byBaseName = new Set<string>()

    for (const fileName of attachmentFileNames) {
      const exactKey = normalizeImportFileName(fileName)
      if (!exactKey) continue
      byExactName.add(exactKey)

      const dotIndex = exactKey.lastIndexOf('.')
      const baseKey = dotIndex > 0 ? exactKey.slice(0, dotIndex) : exactKey
      byBaseName.add(baseKey)
    }

    return { byExactName, byBaseName }
  }, [attachmentFileNames])

  const getAttachmentError = (requestedName: string): string | null => {
    const normalizedRequested = normalizeImportFileName(requestedName)
    if (!normalizedRequested) return null
    if (hasPathSegment(normalizedRequested)) {
      return `Tên file không hợp lệ (không nhập đường dẫn): ${requestedName}`
    }
    if (!attachmentLookup.byExactName.has(normalizedRequested) && !attachmentLookup.byBaseName.has(normalizedRequested)) {
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
  const hasFile = parsedResult !== null || parseError !== null
  const canProceedFromStep1 = hasFile && !parsing

  if (!visible) return null

  const stepLabels = ['Nhà cung cấp', 'Danh mục NVL', 'Xem trước & Import']

  return (
    <div className="import-overlay" role="dialog" aria-modal="true">
      <div className="import-card">
        <header className="import-header">
          <div>
            <p className="import-kicker">Excel Import Wizard</p>
            <h3>Import tồn kho đầu kỳ</h3>
          </div>
          <button type="button" className="btn btn-ghost compact" onClick={onClose} disabled={importing || syncingCatalog}>
            <i className="pi pi-times" /> Đóng
          </button>
        </header>

        <div className="import-stepper">
          {stepLabels.map((label, i) => {
            const stepNum = (i + 1) as 1 | 2 | 3
            const isDone = importStep > stepNum
            const isActive = importStep === stepNum
            return (
              <div key={stepNum} className={`import-stepper-item${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>
                <span className="import-stepper-circle">{isDone ? <i className="pi pi-check" /> : stepNum}</span>
                <span className="import-stepper-label">{label}</span>
                {i < stepLabels.length - 1 && <span className="import-stepper-line" />}
              </div>
            )
          })}
        </div>

        {importStep === 1 && (
          <>
            <section className="import-step-body">
              <div className="import-upload-row">
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
                    <strong><i className="pi pi-file-excel" /> Chọn file Excel / CSV</strong>
                    {selectedFileName
                      ? <span className="import-filename">{selectedFileName}</span>
                      : <p>Hỗ trợ .xlsx, .xls, .csv</p>
                    }
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
                    <strong><i className="pi pi-paperclip" /> Chứng từ đính kèm</strong>
                    <span>Đã chọn: {attachmentCount} file</span>
                    {attachmentFileNames.length > 0
                      ? <span title={attachmentFileNames.join(', ')}>{attachmentFileNames.slice(0, 3).join(', ')}{attachmentFileNames.length > 3 ? ' ...' : ''}</span>
                      : <p>Tự đối chiếu theo tên file trong cột CHỨNG TỪ</p>
                    }
                  </div>
                </label>
              </div>

              {parseError && <p className="import-error">{parseError}</p>}

              {hasFile && !parseError && (
                <div className="import-sync-section">
                  <div className="import-sync-section-header">
                    <h4><i className="pi pi-users" /> Nhà cung cấp chưa có trong danh mục</h4>
                    {parsing && <span className="import-scanning"><i className="pi pi-spin pi-spinner" /> Đang quét...</span>}
                  </div>
                  {!parsing && catalogSyncSuppliers.length === 0 && (
                    <div className="import-sync-empty">
                      <i className="pi pi-check-circle" />
                      <span>Tất cả nhà cung cấp đã có trong danh mục.</span>
                    </div>
                  )}
                  {catalogSyncSuppliers.length > 0 && (
                    <>
                      <p className="import-sync-hint">
                        Kiểm tra và chỉnh sửa thông tin, bỏ chọn các mục không muốn tạo, rồi nhấn <em>Tạo NCC</em>.
                      </p>
                      <div className="import-catalog-sync-table-wrap">
                        <table className="import-catalog-sync-table">
                          <thead>
                            <tr>
                              <th>Tạo</th>
                              <th>Mã NCC</th>
                              <th>Tên NCC</th>
                              <th>Lỗi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catalogSyncSuppliers.map((item, idx) => (
                              <tr key={`${item.rawText}-${idx}`} className={item.include ? '' : 'sync-row-skipped'}>
                                <td>
                                  <input type="checkbox" checked={item.include}
                                    onChange={(e) => onUpdateSyncSuppliers(
                                      catalogSyncSuppliers.map((s, i) => i === idx ? { ...s, include: e.target.checked } : s)
                                    )} />
                                </td>
                                <td>
                                  <input type="text" value={item.code} style={{ width: '80px' }}
                                    onChange={(e) => onUpdateSyncSuppliers(
                                      catalogSyncSuppliers.map((s, i) => i === idx ? { ...s, code: e.target.value.toUpperCase() } : s)
                                    )} />
                                </td>
                                <td>
                                  <input type="text" value={item.name}
                                    onChange={(e) => onUpdateSyncSuppliers(
                                      catalogSyncSuppliers.map((s, i) => i === idx ? { ...s, name: e.target.value } : s)
                                    )} />
                                </td>
                                <td className={item.error ? 'sync-cell-error' : ''}>
                                  {item.error ? <span className="sync-error-msg" title={item.error}>{item.error}</span> : null}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>

            <footer className="import-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={syncingCatalog}>
                Hủy
              </button>
              {catalogSyncSuppliers.length > 0 && (
                <button type="button" className="btn btn-warning" disabled={syncingCatalog} onClick={onCreateSuppliers}>
                  {syncingCatalog ? <><i className="pi pi-spin pi-spinner" /> Đang tạo...</> : `Tạo ${catalogSyncSuppliers.filter(s => s.include).length} NCC`}
                </button>
              )}
              <button type="button" className="btn btn-primary" disabled={!canProceedFromStep1 || syncingCatalog} onClick={() => onGoToStep(2)}>
                Tiếp tục <i className="pi pi-arrow-right" />
              </button>
            </footer>
          </>
        )}

        {importStep === 2 && (
          <>
            <section className="import-step-body">
              <div className="import-sync-section">
                <div className="import-sync-section-header">
                  <h4><i className="pi pi-box" /> Danh mục NVL chưa có trong hệ thống</h4>
                </div>
                {catalogSyncProducts.length === 0 && (
                  <div className="import-sync-empty">
                    <i className="pi pi-check-circle" />
                      <span>Tất cả mã NVL đã có trong danh mục. Có thể tiếp tục sang bước 3.</span>
                  </div>
                )}
                {catalogSyncProducts.length > 0 && (
                  <>
                    <p className="import-sync-hint">
                      Kiểm tra và chỉnh sửa thông tin, bỏ chọn các mục không muốn tạo, rồi nhấn <em>Tạo NVL</em>.
                    </p>
                    <div className="import-catalog-sync-table-wrap">
                      <table className="import-catalog-sync-table">
                        <thead>
                          <tr>
                            <th>Tạo</th>
                            <th>Mã NVL</th>
                            <th>Tên thương mại</th>
                            <th>Tên INCI</th>
                            <th title="Đơn vị cơ bản">ĐV cơ sở</th>
                            <th title="Đơn vị tính đơn giá">ĐV đơn giá</th>
                            <th>Lỗi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catalogSyncProducts.map((item, idx) => (
                            <tr key={item.code} className={item.include ? '' : 'sync-row-skipped'}>
                              <td>
                                <input type="checkbox" checked={item.include}
                                  onChange={(e) => onUpdateSyncProducts(
                                    catalogSyncProducts.map((p, i) => i === idx ? { ...p, include: e.target.checked } : p)
                                  )} />
                              </td>
                              <td className="sync-code">{item.code}</td>
                              <td>
                                <input type="text" value={item.tradeName}
                                  onChange={(e) => onUpdateSyncProducts(
                                    catalogSyncProducts.map((p, i) => i === idx ? { ...p, tradeName: e.target.value } : p)
                                  )} />
                              </td>
                              <td>
                                <input type="text" value={item.inciName}
                                  onChange={(e) => onUpdateSyncProducts(
                                    catalogSyncProducts.map((p, i) => i === idx ? { ...p, inciName: e.target.value } : p)
                                  )} />
                              </td>
                              <td>
                                <input type="text" value={item.unit} style={{ width: '56px' }}
                                  onChange={(e) => onUpdateSyncProducts(
                                    catalogSyncProducts.map((p, i) => i === idx ? { ...p, unit: e.target.value } : p)
                                  )} />
                              </td>
                              <td>
                                <input type="text" value={item.priceUnit} style={{ width: '56px' }}
                                  placeholder="(= ĐV cơ sở)"
                                  onChange={(e) => onUpdateSyncProducts(
                                    catalogSyncProducts.map((p, i) => i === idx ? { ...p, priceUnit: e.target.value } : p)
                                  )} />
                              </td>
                              <td className={item.error ? 'sync-cell-error' : ''}>
                                {item.error ? <span className="sync-error-msg" title={item.error}>{item.error}</span> : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </section>

            <footer className="import-footer">
              <button type="button" className="btn btn-ghost" onClick={() => onGoToStep(1)} disabled={syncingCatalog}>
                <i className="pi pi-arrow-left" /> Quay lại
              </button>
              {catalogSyncProducts.length > 0 && (
                <button type="button" className="btn btn-warning" disabled={syncingCatalog} onClick={onCreateProducts}>
                  {syncingCatalog ? <><i className="pi pi-spin pi-spinner" /> Đang tạo...</> : `Tạo ${catalogSyncProducts.filter(p => p.include).length} NVL`}
                </button>
              )}
              <button type="button" className="btn btn-primary" disabled={syncingCatalog} onClick={() => onGoToStep(3)}>
                Tiếp tục <i className="pi pi-arrow-right" />
              </button>
            </footer>
          </>
        )}

        {importStep === 3 && (
          <>
            <div className="import-step-body" style={{ padding: '12px 24px 0' }}>
              <section className="import-status">
              <div className="import-filter-tabs" role="tablist">
                <button type="button" className={issueFilter === 'all' ? 'active' : ''} onClick={() => setIssueFilter('all')}>
                  Tất cả ({rows.length})
                </button>
                <button type="button" className={issueFilter === 'valid' ? 'active' : ''} onClick={() => setIssueFilter('valid')}>
                  Hợp lệ ({validRows.length})
                </button>
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
                  <p>Không có dữ liệu để hiển thị.</p>
                </div>
              ) : (
                <div className="import-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th><th>Mã NVL</th><th>Tên TM</th><th>Tên INCI</th>
                        <th>Số lô</th><th>Số HĐ</th><th>Ngày HĐ</th><th>NCC</th>
                        <th>SL</th><th>Đơn giá</th><th>ĐV đơn giá</th><th>Thành tiền</th>
                        <th>Ngày TD</th><th>Ngày SX</th><th>Hạn SD</th>
                        <th>MSDS</th><th>COA</th><th>Hóa đơn</th><th>Khác</th><th>Chứng từ</th>
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
                            <td>{row.resolvedSupplierName || row.resolvedSupplierCode
                              ? `${row.resolvedSupplierCode || ''}${row.resolvedSupplierCode && row.resolvedSupplierName ? ' - ' : ''}${row.resolvedSupplierName || ''}`
                              : row.supplierText || '-'}</td>
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
                                <ul>{rowWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
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
            </div>

            <footer className="import-footer">
              <button type="button" className="btn btn-ghost" onClick={() => onGoToStep(2)} disabled={importing}>
                <i className="pi pi-arrow-left" /> Quay lại
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={importing}>
                Hủy
              </button>
              <button type="button" className="btn btn-primary" disabled={!canImport} onClick={onImport}>
                {importing ? 'Đang import...' : `Xác nhận import ${validRows.length} dòng hợp lệ`}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
