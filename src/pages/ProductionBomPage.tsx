import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AutoComplete, type AutoCompleteCompleteEvent } from 'primereact/autocomplete'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { fetchMaterials, fetchProductOutputsCatalog } from '../lib/catalogApi'
import type { MaterialRow, ProductOutputRow } from '../components/catalog/types'
import {
  fetchProductionBom,
  fetchNextBomCode,
  createProductionBom,
  updateProductionBom,
  submitProductionBom,
  approveProductionBom,
  recallProductionBom,
  deactivateProductionBom,
  type ProductionBom,
  type ProductionBomLineType,
  type BomLinePayload,
} from '../lib/productionBomApi'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type LineRow = {
  _key: string
  sortOrder: number
  lineType: ProductionBomLineType
  productId: string | null
  productCode: string
  productName: string
  qtyPerBase: number | null
  wasteQty: number | null
  unit: string
  notes: string
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_LABELS: Record<string, string> = {
  draft:     'Bản nháp',
  submitted: 'Chờ duyệt',
  approved:  'Đã duyệt',
  inactive:  'Ngưng hiệu lực',
  archived:  'Lưu trữ',
}

let keySeq = 0
function nextKey() { return `row-${++keySeq}` }

function blankLine(lineType: ProductionBomLineType = 'nvl'): LineRow {
  return {
    _key: nextKey(),
    sortOrder: 0,
    lineType,
    productId: null,
    productCode: '',
    productName: '',
    qtyPerBase: null,
    wasteQty: 0,
    unit: '',
    notes: '',
  }
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ProductionBomPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit    = !!id && id !== 'new'
  const isNew     = !isEdit

  // Header state
  const [bom,          setBom]          = useState<ProductionBom | null>(null)
  const [bomCode,      setBomCode]      = useState('')
  const [bomName,      setBomName]      = useState('')
  const [bomVersion,   setBomVersion]   = useState('')
  const [outputProduct,setOutputProduct]= useState<ProductOutputRow | null>(null)
  const [baseQty,      setBaseQty]      = useState<number | null>(1)
  const [effectiveFrom,setEffectiveFrom]= useState<Date | null>(null)
  const [effectiveTo,  setEffectiveTo]  = useState<Date | null>(null)
  const [notes,        setNotes]        = useState('')
  const [lines,        setLines]        = useState<LineRow[]>(() => [blankLine('nvl')])

  // Loading / saving
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Autocomplete suggestions
  const [allOutputProducts, setAllOutputProducts] = useState<ProductOutputRow[]>([])
  const [nvlSuggestions,  setNvlSuggestions]  = useState<MaterialRow[]>([])

  // â”€â”€â”€ Load existing BOM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    fetchProductionBom(id!)
      .then((data) => {
        setBom(data)
        setBomCode(data.bomCode ?? '')
        setBomName(data.bomName)
        setBomVersion(data.bomVersion ?? '')
        setBaseQty(Number(data.baseQty))
        setNotes(data.notes ?? '')
        setEffectiveFrom(data.effectiveFrom ? new Date(data.effectiveFrom) : null)
        setEffectiveTo(data.effectiveTo   ? new Date(data.effectiveTo)   : null)
        if (data.outputProduct) {
          setOutputProduct({
            id: data.outputProduct.id,
            code: data.outputProduct.code,
            name: data.outputProduct.name,
            outputType: data.outputProduct.outputType as 'finished' | 'semi_finished',
            unit: data.outputProduct.unit,
            notes: '',
          })

        }
        const loadedLines = data.lines.map((l) => ({
          _key: nextKey(),
          sortOrder: l.sortOrder,
          lineType: l.lineType as ProductionBomLineType,
          productId: l.productId,
          productCode: l.productCode,
          productName: l.productName,
          qtyPerBase: Number(l.qtyPerBase),
          wasteQty: Number(l.wasteQty),
          unit: l.unit,
          notes: l.notes ?? '',
        }))
        setLines(data.status === 'draft' ? [...loadedLines, blankLine('nvl')] : loadedLines)
      })
      .catch(() => setError('Không thể tải phiếu định mức.'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  // ─── Auto-fill next BOM code for new form ──────────────────────────────────
  useEffect(() => {
    if (!isNew) return
    fetchNextBomCode().then(setBomCode).catch(() => {})
  }, [isNew])

  // ─── Load all product outputs ─────────────────────────────────────────────
  useEffect(() => {
    fetchProductOutputsCatalog().then(setAllOutputProducts).catch(() => {})
  }, [])

  const searchNvl = useCallback(async (evt: AutoCompleteCompleteEvent) => {
    const results = await fetchMaterials(evt.query)
    setNvlSuggestions(results)
  }, [])

  // â”€â”€â”€ Line helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const updateLine = (key: string, patch: Partial<LineRow>) => {
    setLines((prev) => prev.map((l) => l._key === key ? { ...l, ...patch } : l))
  }

  const removeLine = (key: string) => {
    const lastLine = lines[lines.length - 1]
    if (lastLine?._key === key && !lastLine?.productCode) return
    setLines((prev) => prev.filter((l) => l._key !== key))
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  const validateBeforeSave = (): string[] => {
    const errs: string[] = []
    if (!bomCode.trim()) errs.push('Vui lòng nhập mã định mức.')
    if (!bomName.trim()) errs.push('Vui lòng nhập tên định mức.')
    if ((baseQty ?? 0) <= 0) errs.push('Quy mô mẻ phải lớn hơn 0.')
    const committedLines = lines.filter((l) => l.productCode.trim())
    if (committedLines.length === 0) {
      errs.push('Vui lòng thêm ít nhất một dòng NVL/BTP.')
    } else {
      committedLines.forEach((l, i) => {
        const stt = i + 1
        if ((l.qtyPerBase ?? 0) <= 0) errs.push(`Dòng ${stt} (${l.productCode}): Định mức tiêu hao phải lớn hơn 0.`)
        if (!l.unit.trim()) errs.push(`Dòng ${stt} (${l.productCode}): Chưa có đơn vị tính.`)
      })
    }
    return errs
  }

  // â”€â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const buildPayload = () => ({
    bomCode:  bomCode.trim()  || undefined,
    bomName:  bomName.trim(),
    bomVersion: bomVersion.trim() || undefined,
    outputProductId: outputProduct ? Number(outputProduct.id) : null,
    baseQty: baseQty ?? 1,
    effectiveFrom: effectiveFrom ? effectiveFrom.toISOString().slice(0, 10) : null,
    effectiveTo:   effectiveTo   ? effectiveTo.toISOString().slice(0, 10)   : null,
    notes: notes.trim() || null,
    lines: lines.filter((l) => l.productCode.trim()).map((l, i): BomLinePayload => ({
      sortOrder:   i,
      lineType:    l.lineType,
      productId:   l.productId ? Number(l.productId) : null,
      productCode: l.productCode,
      productName: l.productName,
      qtyPerBase:  l.qtyPerBase ?? 0,
      wasteQty:    l.wasteQty   ?? 0,
      unit:        l.unit,
      notes:       l.notes || null,
    })),
  })

  const handleSave = async () => {
    const errs = validateBeforeSave()
    if (errs.length > 0) { setValidationErrors(errs); return }
    setValidationErrors([])
    setError(null)
    setSaving(true)
    try {
      const payload = buildPayload()
      const result = isNew
        ? await createProductionBom(payload)
        : await updateProductionBom(id!, payload)
      navigate(`/production-bom/${result.id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lỗi khi lưu phiếu định mức.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  // â”€â”€â”€ Status transitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleTransition = async (action: () => Promise<ProductionBom>, successMsg?: string) => {
    setError(null)
    setSaving(true)
    try {
      const result = await action()
      setBom(result)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setSaving(false)
    }
    void successMsg
  }

  // â”€â”€â”€ Readonly mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const isReadonly = bom ? !['draft'].includes(bom.status) : false

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (loading) {
    return (
      <section className="outbound-page">
        <div className="catalog-inline-notice">Äang táº£i...</div>
      </section>
    )
  }

  return (
    <section className="outbound-page">
      {/* â”€â”€ Page header â”€â”€ */}
      <header className="outbound-page-header outbound-page-title-row">
        <div>
          <h1>{isNew ? 'Tạo phiếu định mức sản xuất' : (isReadonly ? 'Chi tiết phiếu định mức' : 'Chỉnh sửa phiếu định mức')}</h1>
          <p>
            {isNew
              ? 'Khai báo danh sách NVL/BTP và định mức tiêu hao theo quy mô mẻ.'
              : isReadonly
                ? 'Phiếu đang ở chế độ chỉ xem.'
                : 'Cập nhật thông tin và danh sách NVL/BTP của phiếu định mức.'}
          </p>
        </div>
        {bom?.bomCode && (
          <span className="inbound-create-code-tag">{bom.bomCode}</span>
        )}
        {bom && (
          <span className={`app-status-badge ${bom.status}`} style={{ alignSelf: 'center' }}>
            {STATUS_LABELS[bom.status] ?? bom.status}
          </span>
        )}
      </header>

      {/* â”€â”€ Inline notice â”€â”€ */}      {validationErrors.length > 0 && (
        <div className="catalog-inline-notice error">
          <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
            {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
          <button type="button" className="catalog-inline-notice-close" onClick={() => setValidationErrors([])} aria-label="Đóng">×</button>
        </div>
      )}      {error && (
        <div className="catalog-inline-notice error">
          <span>{error}</span>
          <button type="button" className="catalog-inline-notice-close" onClick={() => setError(null)} aria-label="Đóng">×</button>
        </div>
      )}

      {/* ── Section 1: Thông tin chung ── */}
      <article className="outbound-card">
        <div className="outbound-customer-section-header">
          <i className="pi pi-info-circle" aria-hidden />
          <span>1. THÔNG TIN CHUNG</span>
        </div>
        <div className="outbound-customer-section-divider" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 16px', alignItems: 'start' }}>

          {/* Row 1: Mã định mức | Tên định mức | Phiên bản */}
          <label className="outbound-field">
            <span>Mã định mức <span style={{ color: 'var(--red-500)' }}>*</span></span>
            <InputText
              value={bomCode}
              onChange={(e) => setBomCode(e.target.value)}
              disabled={isReadonly}
              className="outbound-customer-select w-full"
              placeholder="Nhập mã định mức..."
            />
          </label>

          <label className="outbound-field">
            <span>Tên định mức <span style={{ color: 'var(--red-500)' }}>*</span></span>
            <InputText
              value={bomName}
              onChange={(e) => setBomName(e.target.value)}
              disabled={isReadonly}
              className="outbound-customer-select w-full"
              placeholder="Nhập tên phiếu định mức..."
            />
          </label>

          <label className="outbound-field">
            <span>Phiên bản</span>
            <InputText
              value={bomVersion}
              onChange={(e) => setBomVersion(e.target.value)}
              disabled={isReadonly}
              className="outbound-customer-select w-full"
              placeholder="v1.0..."
            />
          </label>

          {/* Row 2: Sản phẩm đầu ra | Quy mô mẻ | (empty) */}

          <label className="outbound-field">
            <span>Sản phẩm đầu ra</span>
            <Dropdown
              value={outputProduct?.id ?? null}
              options={allOutputProducts.map(p => ({ label: `${p.code} – ${p.name} (${p.unit})`, value: p.id }))}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setOutputProduct(allOutputProducts.find(p => p.id === e.value) ?? null)}
              disabled={isReadonly}
              className="outbound-customer-select w-full"
              placeholder="Chọn sản phẩm đầu ra..."
              filter
              showClear
            />
          </label>

          <label className="outbound-field">
            <span>Quy mô mẻ (base qty) <span style={{ color: 'var(--red-500)' }}>*</span></span>
            <InputNumber
              value={baseQty}
              onValueChange={(e) => setBaseQty(e.value ?? null)}
              disabled={isReadonly}
              mode="decimal"
              locale="vi-VN"
              minFractionDigits={0}
              maxFractionDigits={3}
              min={0.001}
              className="outbound-customer-select w-full"
              suffix={outputProduct?.unit ? ` ${outputProduct.unit}` : undefined}
            />
          </label>

          {/* Row 3: Hiệu lực từ | Hiệu lực đến | Người tạo */}
          <label className="outbound-field">
            <span>Hiệu lực từ</span>
            <Calendar
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.value as Date | null)}
              disabled={isReadonly}
              dateFormat="dd/mm/yy"
              showButtonBar
              showIcon
              className="outbound-customer-select w-full"
            />
          </label>

          <label className="outbound-field">
            <span>Hiệu lực đến</span>
            <Calendar
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.value as Date | null)}
              disabled={isReadonly}
              dateFormat="dd/mm/yy"
              showButtonBar
              showIcon
              minDate={effectiveFrom ?? undefined}
              className="outbound-customer-select w-full"
            />
          </label>

          <label className="outbound-field">
            <span>Người tạo</span>
            <InputText value={bom?.creator?.fullName ?? ''} readOnly className="outbound-customer-select w-full" />
          </label>

          {/* Row 4: Ghi chú full width */}
          <label className="outbound-field" style={{ gridColumn: '1 / -1' }}>
            <span>Ghi chú</span>
            <InputTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isReadonly}
              autoResize
              rows={2}
              className="w-full"
            />
          </label>
        </div>
      </article>

      {/* â”€â”€ Section 2: Danh sách NVL/BTP â”€â”€ */}
      <article className="outbound-card">
        <div className="outbound-customer-section-header">
          <i className="pi pi-list" aria-hidden />
          <span>2. DANH SÁCH NVL / BTP</span>
        </div>
        <div className="outbound-customer-section-divider" />

        <div className="inbound-table-wrap data-grid-wrap">
          <DataTable
            value={lines}
            dataKey="_key"
            size="small"
            scrollable
            cellMemo={false}
            tableStyle={{ minWidth: '900px' }}
            emptyMessage="Ch\u01b0a c\u00f3 d\u00f2ng NVL/BTP."
            className="inbound-table prime-catalog-table outbound-bom-table"
            stripedRows
            rowClassName={(row: LineRow) => {
              const isNewRow = !isReadonly && lines[lines.length - 1]?._key === row._key && !row.productCode
              return isNewRow ? 'new-row' : ''
            }}
          >
            <Column
              header="STT"
              style={{ width: '52px', textAlign: 'center' }}
              body={(row: LineRow, opts) => {
                const isNewRow = !isReadonly && lines[lines.length - 1]?._key === row._key && !row.productCode
                if (isNewRow) return <span className="bom-new-row-marker">+</span>
                return <span style={{ display: 'block', textAlign: 'center' }}>{(opts.rowIndex ?? 0) + 1}</span>
              }}
            />
            <Column
              header="Mã nguyên liệu"
              style={{ minWidth: '180px' }}
              body={(row: LineRow) =>
                isReadonly ? (
                  <strong>{row.productCode}</strong>
                ) : (
                  <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                    <AutoComplete
                      value={row.productCode || ''}
                      suggestions={nvlSuggestions}
                      completeMethod={searchNvl}
                      field="code"
                      appendTo={document.body}
                      itemTemplate={(item: MaterialRow) => (
                        <span>{item.code} – {item.materialName} <span className="text-color-secondary">({item.unit})</span></span>
                      )}
                      onChange={(e) => {
                        const v = e.value
                        if (typeof v === 'string') updateLine(row._key, { productCode: v })
                      }}
                      onSelect={(e) => {
                        const m = e.value as MaterialRow
                        const wasNewRow = lines[lines.length - 1]?._key === row._key && !row.productCode
                        updateLine(row._key, {
                          productId:   m.id,
                          productCode: m.code,
                          productName: m.materialName,
                          unit:        m.unit,
                        })
                        if (wasNewRow) {
                          setLines((prev) => [...prev, blankLine(row.lineType)])
                        }
                      }}
                      placeholder="Tìm mã..."
                      className="opening-stock-autocomplete"
                      inputClassName="opening-stock-autocomplete-input"
                    />
                  </div>
                )
              }
            />
            <Column
              header="Tên nguyên liệu"
              style={{ minWidth: '220px' }}
              body={(row: LineRow) =>
                isReadonly ? (
                  <span>{row.productName}</span>
                ) : (
                  <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                    <AutoComplete
                      value={row.productName || ''}
                      suggestions={nvlSuggestions}
                      completeMethod={searchNvl}
                      field="materialName"
                      appendTo={document.body}
                      itemTemplate={(item: MaterialRow) => (
                        <span>{item.code} – {item.materialName} <span className="text-color-secondary">({item.unit})</span></span>
                      )}
                      onChange={(e) => {
                        const v = e.value
                        if (typeof v === 'string') updateLine(row._key, { productName: v })
                      }}
                      onSelect={(e) => {
                        const m = e.value as MaterialRow
                        const wasNewRow = lines[lines.length - 1]?._key === row._key && !row.productCode
                        updateLine(row._key, {
                          productId:   m.id,
                          productCode: m.code,
                          productName: m.materialName,
                          unit:        m.unit,
                        })
                        if (wasNewRow) {
                          setLines((prev) => [...prev, blankLine(row.lineType)])
                        }
                      }}
                      placeholder="Tìm tên..."
                      className="opening-stock-autocomplete"
                      inputClassName="opening-stock-autocomplete-input"
                    />
                  </div>
                )
              }
            />
            <Column
              header={`Định mức / ${outputProduct?.unit ?? 'mẻ'}`}
              style={{ width: '150px' }}
              body={(row: LineRow) =>
                isReadonly ? (
                  <span className="inbound-number">
                    {Number(row.qtyPerBase ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}
                  </span>
                ) : (
                  <InputNumber
                    value={row.qtyPerBase}
                    onValueChange={(e) => updateLine(row._key, { qtyPerBase: e.value ?? null })}
                    mode="decimal"
                    locale="vi-VN"
                    minFractionDigits={0}
                    maxFractionDigits={3}
                    min={0}
                    inputStyle={{ textAlign: 'right', width: '100%' }}
                  />
                )
              }
            />
            <Column
              header="Hao hụt"
              style={{ width: '130px' }}
              body={(row: LineRow) =>
                isReadonly ? (
                  <span className="inbound-number">
                    {Number(row.wasteQty ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}
                  </span>
                ) : (
                  <InputNumber
                    value={row.wasteQty}
                    onValueChange={(e) => updateLine(row._key, { wasteQty: e.value ?? null })}
                    mode="decimal"
                    locale="vi-VN"
                    minFractionDigits={0}
                    maxFractionDigits={3}
                    min={0}
                    inputStyle={{ textAlign: 'right', width: '100%' }}
                  />
                )
              }
            />
            <Column
              header="ĐVT"
              style={{ width: '90px' }}
              body={(row: LineRow) =>
                isReadonly ? (
                  <span>{row.unit}</span>
                ) : (
                  <InputText
                    value={row.unit}
                    onChange={(e) => updateLine(row._key, { unit: e.target.value })}
                    style={{ width: '100%' }}
                    placeholder="kg/L..."
                  />
                )
              }
            />
            <Column
              header="Ghi chú"
              style={{ minWidth: '140px' }}
              body={(row: LineRow) =>
                isReadonly ? (
                  <span>{row.notes || '---'}</span>
                ) : (
                  <InputText
                    value={row.notes}
                    onChange={(e) => updateLine(row._key, { notes: e.target.value })}
                    style={{ width: '100%' }}
                  />
                )
              }
            />
            {!isReadonly && (
              <Column
                header=""
                style={{ width: '48px' }}
                body={(row: LineRow) => {
                  const isNewRow = lines[lines.length - 1]?._key === row._key && !row.productCode
                  if (isNewRow) return null
                  return (
                    <Button
                      type="button"
                      icon="pi pi-trash"
                      text
                      severity="danger"
                      className="icon-btn"
                      aria-label="Xóa dòng"
                      tooltip="Xóa dòng"
                      tooltipOptions={{ position: 'top' }}
                      onClick={() => removeLine(row._key)}
                    />
                  )
                }}
              />
            )}
          </DataTable>
        </div>
      </article>

      {/* â”€â”€ Footer actions â”€â”€ */}
      <div className="outbound-page-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', padding: '1rem 0' }}>
        {(isNew || bom?.status === 'draft') && (
          <Button
            type="button"
            label="Lưu bản nháp"
            icon="pi pi-save"
            className="btn btn-primary"
            loading={saving}
            onClick={handleSave}
          />
        )}
        {!isNew && bom?.status === 'draft' && (
          <Button
            type="button"
            label="Gửi duyệt"
            icon="pi pi-send"
            className="btn"
            severity="warning"
            loading={saving}
            onClick={() => handleTransition(() => submitProductionBom(id!))}
          />
        )}
        {!isNew && bom?.status === 'submitted' && (
          <Button
            type="button"
            label="Thu hồi"
            icon="pi pi-undo"
            className="btn"
            severity="secondary"
            loading={saving}
            onClick={() => handleTransition(() => recallProductionBom(id!))}
          />
        )}
        {!isNew && bom?.status === 'submitted' && (
          <Button
            type="button"
            label="Phê duyệt"
            icon="pi pi-check"
            className="btn"
            severity="success"
            loading={saving}
            onClick={() => handleTransition(() => approveProductionBom(id!))}
          />
        )}
        {!isNew && bom?.status === 'approved' && (
          <Button
            type="button"
            label="Ngưng hiệu lực"
            icon="pi pi-ban"
            outlined
            severity="danger"
            loading={saving}
            onClick={() => handleTransition(() => deactivateProductionBom(id!))}
          />
        )}
        <Button
          type="button"
          label="Quay lại"
          icon="pi pi-arrow-left"
          className="btn btn-ghost"
          onClick={() => navigate('/production-bom')}
        />
      </div>
    </section>
  )
}
