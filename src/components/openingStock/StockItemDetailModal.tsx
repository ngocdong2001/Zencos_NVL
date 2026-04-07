import { useEffect, useState } from 'react'
import { AutoComplete } from 'primereact/autocomplete'
import type { AutoCompleteCompleteEvent } from 'primereact/autocomplete'
import { updateOpeningStockRow } from '../../lib/openingStockApi'
import type { OpeningStockRow } from '../../lib/openingStockApi'
import { fetchItemDocuments, getDocumentFileUrl } from '../../lib/openingStockDocApi'
import { fetchMaterials } from '../../lib/catalogApi'
import type { StockItemDoc } from '../../lib/openingStockDocApi'

type SupplierOption = { id: string; code: string; name: string }

type Props = {
  row: OpeningStockRow
  supplierOptions: SupplierOption[]
  onClose: () => void
  onSaved: (updated: OpeningStockRow) => void
  onOpenDocs: () => void
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
}

function parseDecimalInput(value: string): number {
  const compact = value.trim().replace(/\s+/g, '')
  if (!compact) return Number.NaN

  const hasComma = compact.includes(',')
  const hasDot = compact.includes('.')
  let normalized = compact

  if (hasComma && hasDot) {
    const decimalSeparator = compact.lastIndexOf(',') > compact.lastIndexOf('.') ? ',' : '.'
    normalized = decimalSeparator === ','
      ? compact.replace(/\./g, '').replace(',', '.')
      : compact.replace(/,/g, '')
  } else if (hasComma) {
    normalized = /^-?\d{1,3}(,\d{3})+$/.test(compact)
      ? compact.replace(/,/g, '')
      : compact.replace(',', '.')
  } else if (hasDot) {
    normalized = /^-?\d{1,3}(\.\d{3})+$/.test(compact)
      ? compact.replace(/\./g, '')
      : compact
  }

  normalized = normalized.replace(/[^0-9.-]/g, '')
  return Number.parseFloat(normalized)
}

function toEditableNumberString(value: number): string {
  if (!Number.isFinite(value)) return ''
  return `${value}`
}

export function StockItemDetailModal({ row, supplierOptions, onClose, onSaved, onOpenDocs }: Props) {
  const [lot, setLot] = useState(row.lot)
  const [invoiceNo, setInvoiceNo] = useState(row.invoiceNo)
  const [invoiceDate, setInvoiceDate] = useState(row.invoiceDate ?? '')
  const [openingDate, setOpeningDate] = useState(row.openingDate ?? '')
  const [expiryDate, setExpiryDate] = useState(row.expiryDate ?? '')
  const [manufactureDate, setManufactureDate] = useState(row.manufactureDate ?? '')
  const [supplierId, setSupplierId] = useState(row.supplierId ?? '')
  const initialSupplier = supplierOptions.find((s) => s.id === row.supplierId)
  const [supplierValue, setSupplierValue] = useState<SupplierOption | string>(
    initialSupplier ?? row.supplierName ?? '',
  )
  const [quantityGram, setQuantityGram] = useState(formatNumber(row.quantityGram))
  const [unitPriceValue, setUnitPriceValue] = useState(formatNumber(row.unitPriceValue))
  const [supplierSuggestions, setSupplierSuggestions] = useState<SupplierOption[]>([])
  const [baseUnitLabel, setBaseUnitLabel] = useState('g')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [docs, setDocs] = useState<StockItemDoc[]>([])
  const [docsLoading, setDocsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setDocsLoading(true)
    fetchItemDocuments(row.id)
      .then((data) => { if (!cancelled) setDocs(data) })
      .catch(() => { if (!cancelled) setDocs([]) })
      .finally(() => { if (!cancelled) setDocsLoading(false) })
    return () => { cancelled = true }
  }, [row.id])

  useEffect(() => {
    let cancelled = false
    setBaseUnitLabel('g')

    fetchMaterials(row.code)
      .then((materials) => {
        if (cancelled) return
        const exact = materials.find((material) => material.code.toUpperCase() === row.code.toUpperCase())
        setBaseUnitLabel(exact?.unit || 'g')
      })
      .catch(() => {
        if (!cancelled) setBaseUnitLabel('g')
      })

    return () => { cancelled = true }
  }, [row.code])

  const qtyNum = parseDecimalInput(quantityGram || '0')
  const priceNum = parseDecimalInput(unitPriceValue || '0')
  const lineAmount =
    Number.isFinite(qtyNum) && Number.isFinite(priceNum) && row.unitPriceConversionToBase > 0
      ? (qtyNum / row.unitPriceConversionToBase) * priceNum
      : row.lineAmount

  const handleSupplierSearch = (e: AutoCompleteCompleteEvent) => {
    const q = e.query.toLowerCase()
    setSupplierSuggestions(
      supplierOptions
        .filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
        .slice(0, 10),
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const qBase = parseDecimalInput(quantityGram || '0')
      const uPrice = parseDecimalInput(unitPriceValue || '0')
      const updated = await updateOpeningStockRow(row.id, {
        lot: lot.trim(),
        invoiceNo: invoiceNo.trim() || undefined,
        invoiceDate: invoiceDate || null,
        openingDate: openingDate || null,
        expiryDate: expiryDate || null,
        manufactureDate: manufactureDate || null,
        supplierId: supplierId || null,
        quantityBase: Number.isFinite(qBase) && qBase >= 0 ? qBase : undefined,
        unitPriceValue: Number.isFinite(uPrice) && uPrice >= 0 ? uPrice : undefined,
      })
      onSaved(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu thay đổi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="stock-detail-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="stock-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết tồn kho đầu kỳ"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sdm-header">
          <div className="sdm-header-left">
            <span className="sdm-header-icon">
              <i className="pi pi-check-circle" />
            </span>
            <div>
              <h3 className="sdm-title">Chi tiết thông tin tồn kho ban đầu</h3>
              <p className="sdm-subtitle">
                Vui lòng kiểm tra kỹ tất cả dữ liệu trước khi lưu vào hệ thống kho.
              </p>
            </div>
          </div>
          <button type="button" className="sdm-close-btn" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="sdm-body">
          <div className="sdm-grid">
            <div className="sdm-column">
              {/* THÔNG TIN CHUNG */}
              <div className="sdm-section">
                <div className="sdm-section-title">
                  <i className="pi pi-box" />
                  <span>Thông tin chung</span>
                </div>
                <div className="sdm-card">
                  <div className="sdm-field-row">
                    <span className="sdm-label">Nhà cung cấp:</span>
                    <div
                      className="sdm-autocomplete-wrap"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <AutoComplete
                        value={supplierValue}
                        suggestions={supplierSuggestions}
                        completeMethod={handleSupplierSearch}
                        field="name"
                        itemTemplate={(s: SupplierOption) => `${s.code} - ${s.name}`}
                        onChange={(e) => {
                          setSupplierValue(e.value)
                          if (typeof e.value === 'string') setSupplierId('')
                        }}
                        onSelect={(e) => {
                          const s = e.value as SupplierOption
                          setSupplierValue(s)
                          setSupplierId(s.id)
                        }}
                        onClear={() => {
                          setSupplierValue('')
                          setSupplierId('')
                        }}
                        appendTo={document.body}
                        placeholder="Chọn nhà cung cấp..."
                        className="sdm-autocomplete"
                        inputClassName="sdm-autocomplete-input"
                      />
                    </div>
                  </div>
                  <div className="sdm-divider" />
                  <div className="sdm-field-row">
                    <span className="sdm-label">Nguyên vật liệu:</span>
                    <span className="sdm-value bold">{row.tradeName || '---'}</span>
                  </div>
                  <div className="sdm-divider" />
                  <div className="sdm-field-row">
                    <span className="sdm-label">INCI Name:</span>
                    <span className="sdm-value muted italic">{row.inciName || '---'}</span>
                  </div>
                </div>
              </div>

              {/* KHỐI LƯỢNG & TÀI CHÍNH */}
              <div className="sdm-section">
                <div className="sdm-section-title">
                  <i className="pi pi-shield" />
                  <span>{`Khối lượng & Tài chính`}</span>
                </div>
                <div className="sdm-card sdm-card-accent">
                  <div className="sdm-field-row sdm-qty-row">
                    <span className="sdm-label sdm-qty-label">Số lượng nhập:</span>
                    <div className="sdm-qty-input-wrap">
                      <input
                        className="sdm-input sdm-qty-input"
                        value={quantityGram}
                        onChange={(e) => setQuantityGram(e.target.value)}
                        onFocus={() => {
                          const parsed = parseDecimalInput(quantityGram)
                          if (Number.isFinite(parsed)) setQuantityGram(toEditableNumberString(parsed))
                        }}
                        onBlur={() => {
                          const parsed = parseDecimalInput(quantityGram)
                          if (Number.isFinite(parsed)) setQuantityGram(formatNumber(parsed))
                        }}
                        inputMode="decimal"
                        placeholder="0"
                        aria-label="Số lượng gram"
                      />
                      <span className="sdm-qty-unit">{baseUnitLabel}</span>
                    </div>
                  </div>
                  <div className="sdm-divider" />
                  <div className="sdm-field-row">
                    <span className="sdm-label">Đơn giá:</span>
                    <div className="sdm-price-input-wrap">
                      <input
                        className="sdm-input"
                        value={unitPriceValue}
                        onChange={(e) => setUnitPriceValue(e.target.value)}
                        onFocus={() => {
                          const parsed = parseDecimalInput(unitPriceValue)
                          if (Number.isFinite(parsed)) setUnitPriceValue(toEditableNumberString(parsed))
                        }}
                        onBlur={() => {
                          const parsed = parseDecimalInput(unitPriceValue)
                          if (Number.isFinite(parsed)) setUnitPriceValue(formatNumber(parsed))
                        }}
                        inputMode="decimal"
                        placeholder="0"
                        aria-label="Đơn giá"
                      />
                      <span className="sdm-price-unit">đ/{row.unitPriceUnitCode || 'kg'}</span>
                    </div>
                  </div>
                  <div className="sdm-divider" />
                  <div className="sdm-field-row">
                    <span className="sdm-label bold">Tổng giá trị:</span>
                    <span className="sdm-value accent underline">{formatNumber(lineAmount)} đ</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sdm-column">
              {/* CHI TIẾT LÔ HÀNG */}
              <div className="sdm-section">
                <div className="sdm-section-title">
                  <i className="pi pi-calendar" />
                  <span>Chi tiết Lô hàng</span>
                </div>
                <div className="sdm-card">
                  <div className="sdm-field-row">
                    <span className="sdm-label">LOT NO:</span>
                    <input
                      className="sdm-input bold"
                      value={lot}
                      onChange={(e) => setLot(e.target.value)}
                      placeholder="Số lô"
                      aria-label="Số lô"
                    />
                  </div>
                  <div className="sdm-divider" />
                  <div className="sdm-field-row">
                    <span className="sdm-label">Ngày tồn đầu:</span>
                    <input
                      className="sdm-input"
                      type="date"
                      value={openingDate}
                      onChange={(e) => setOpeningDate(e.target.value)}
                      aria-label="Ngày tồn đầu"
                    />
                  </div>
                  <div className="sdm-divider" />
                  <div className="sdm-field-row">
                    <span className="sdm-label">Ngày sản xuất:</span>
                    <input
                      className="sdm-input"
                      type="date"
                      value={manufactureDate}
                      onChange={(e) => setManufactureDate(e.target.value)}
                      aria-label="Ngày sản xuất"
                    />
                  </div>
                  <div className="sdm-divider" />
                  <div className="sdm-field-row">
                    <span className="sdm-label">Hạn sử dụng:</span>
                    <input
                      className="sdm-input sdm-expiry-input"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      aria-label="Hạn sử dụng"
                    />
                  </div>
                  <div className="sdm-divider" />
                  <div className="sdm-field-row">
                    <span className="sdm-label">Số hóa đơn:</span>
                    <input
                      className="sdm-input"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="---"
                      aria-label="Số hóa đơn"
                    />
                  </div>
                  <div className="sdm-divider" />
                  <div className="sdm-field-row">
                    <span className="sdm-label">Ngày hóa đơn:</span>
                    <input
                      className="sdm-input"
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      aria-label="Ngày hóa đơn"
                    />
                  </div>
                </div>
              </div>

              {/* DANH SÁCH CHỨNG TỪ */}
              <div className="sdm-section">
                <div className="sdm-section-title">
                  <i className="pi pi-file" />
                  <span>Danh sách Chứng từ</span>
                </div>
                <div className="sdm-docs-list">
                  {docsLoading && <p className="sdm-docs-empty">Đang tải...</p>}
                  {!docsLoading && docs.length === 0 && (
                    <p className="sdm-docs-empty">Chưa có chứng từ đính kèm.</p>
                  )}
                  {docs.map((doc) => (
                    <div key={doc.id} className="sdm-doc-item">
                      <i className="pi pi-file sdm-doc-icon" />
                      <a
                        className="sdm-doc-name"
                        href={getDocumentFileUrl(row.id, doc.id, false)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {doc.originalName}
                      </a>
                      <span className="sdm-doc-badge">{doc.docType}</span>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-ghost compact sdm-add-doc-btn"
                    onClick={onOpenDocs}
                  >
                    <i className="pi pi-paperclip" /> Quản lý chứng từ
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="sdm-note">
            <i className="pi pi-info-circle" />
            <div>
              <strong>Ghi chú quan trọng: </strong>
              {`Bằng việc nhấn "Xác nhận Nhập dữ liệu", nguyên liệu này sẽ được chính thức cập nhật vào kho vật lý và có thể sử dụng cho Sản xuất hoặc Xuất kho ngay lập tức theo nguyên tắc FEFO. Vui lòng đảm bảo các thông tin Ngày hết hạn là chính xác 100%.`}
            </div>
          </div>

          {error && <div className="sdm-error">{error}</div>}
        </div>

        {/* Footer */}
        <div className="sdm-footer">
          <button type="button" className="btn btn-inline sdm-cancel-btn" onClick={onClose}>
            Thoát
          </button>
          <div className="sdm-footer-right">
            <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
              In phiếu nhập
            </button>
            <button
              type="button"
              className="btn btn-primary sdm-save-btn"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              <i className="pi pi-check-circle" />
              {saving ? 'Đang lưu...' : 'Xác nhận Nhập dữ liệu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
