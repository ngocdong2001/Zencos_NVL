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
import { Tag } from 'primereact/tag'
import { fetchMaterials } from '../lib/catalogApi'
import { fetchProductOutputsCatalog } from '../lib/catalogApi'
import type { MaterialRow, ProductOutputRow } from '../components/catalog/types'
import {
  fetchProductionBom,
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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft:     'Bản nháp',
  submitted: 'Chờ duyệt',
  approved:  'Đã duyệt',
  inactive:  'Ngưng hiệu lực',
  archived:  'Lưu trữ',
}

const STATUS_SEVERITY: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
  draft:     'secondary',
  submitted: 'warning',
  approved:  'success',
  inactive:  'danger',
  archived:  'secondary',
}

const LINE_TYPE_OPTIONS = [
  { label: 'NVL', value: 'nvl' },
  { label: 'BTP', value: 'btp' },
]

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductionBomPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit    = !!id && id !== 'new'
  const isNew     = !isEdit

  // Header state
  const [bom,          setBom]          = useState<ProductionBom | null>(null)
  const [bomName,      setBomName]      = useState('')
  const [outputProduct,setOutputProduct]= useState<ProductOutputRow | null>(null)
  const [baseQty,      setBaseQty]      = useState<number | null>(1)
  const [effectiveFrom,setEffectiveFrom]= useState<Date | null>(null)
  const [effectiveTo,  setEffectiveTo]  = useState<Date | null>(null)
  const [notes,        setNotes]        = useState('')
  const [lines,        setLines]        = useState<LineRow[]>([])

  // Loading / saving
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Autocomplete suggestions
  const [outputSuggestions, setOutputSuggestions] = useState<ProductOutputRow[]>([])
  const [outputQuery,       setOutputQuery]        = useState('')
  const [nvlSuggestions,  setNvlSuggestions]  = useState<MaterialRow[]>([])

  // ─── Load existing BOM ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    fetchProductionBom(id!)
      .then((data) => {
        setBom(data)
        setBomName(data.bomName)
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
          setOutputQuery(`${data.outputProduct.code} – ${data.outputProduct.name}`)
        }
        setLines(data.lines.map((l) => ({
          _key: nextKey(),
          sortOrder: l.sortOrder,
          lineType: l.lineType,
          productId: l.productId,
          productCode: l.productCode,
          productName: l.productName,
          qtyPerBase: Number(l.qtyPerBase),
          wasteQty: Number(l.wasteQty),
          unit: l.unit,
          notes: l.notes ?? '',
        })))
      })
      .catch(() => setError('Không thể tải phiếu định mức.'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  // ─── Autocomplete: Product Output ───────────────────────────────────────────

  const searchOutputs = useCallback(async (evt: AutoCompleteCompleteEvent) => {
    const results = await fetchProductOutputsCatalog(evt.query)
    setOutputSuggestions(results)
  }, [])

  // ─── Autocomplete: NVL/BTP product ──────────────────────────────────────────

  const searchNvl = useCallback(async (evt: AutoCompleteCompleteEvent) => {
    const results = await fetchMaterials(evt.query)
    setNvlSuggestions(results)
  }, [])

  // ─── Line helpers ────────────────────────────────────────────────────────────

  const updateLine = (key: string, patch: Partial<LineRow>) => {
    setLines((prev) => prev.map((l) => l._key === key ? { ...l, ...patch } : l))
  }

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l._key !== key))
  }

  const addLine = (lineType: ProductionBomLineType) => {
    setLines((prev) => [...prev, { ...blankLine(lineType), sortOrder: prev.length }])
  }

  // ─── Validation ──────────────────────────────────────────────────────────────

  const validateBeforeSave = (): string | null => {
    if (!bomName.trim()) return 'Vui lòng nhập tên định mức.'
    if ((baseQty ?? 0) <= 0) return 'Quy mô mẻ phải lớn hơn 0.'
    for (const l of lines) {
      if (!l.productCode.trim()) return 'Tất cả dòng NVL/BTP phải chọn sản phẩm.'
      if ((l.qtyPerBase ?? 0) <= 0) return 'Định mức tiêu hao phải lớn hơn 0.'
      if (!l.unit.trim()) return 'Dòng NVL/BTP phải có đơn vị tính.'
    }
    return null
  }

  // ─── Save ────────────────────────────────────────────────────────────────────

  const buildPayload = () => ({
    bomName: bomName.trim(),
    outputProductId: outputProduct ? Number(outputProduct.id) : null,
    baseQty: baseQty ?? 1,
    effectiveFrom: effectiveFrom ? effectiveFrom.toISOString().slice(0, 10) : null,
    effectiveTo:   effectiveTo   ? effectiveTo.toISOString().slice(0, 10)   : null,
    notes: notes.trim() || null,
    lines: lines.map((l, i): BomLinePayload => ({
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
    const err = validateBeforeSave()
    if (err) { setError(err); return }
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

  // ─── Status transitions ───────────────────────────────────────────────────────

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

  // ─── Readonly mode ────────────────────────────────────────────────────────────

  const isReadonly = bom ? !['draft'].includes(bom.status) : false

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="p-4">Đang tải...</div>
  }

  return (
    <div className="p-4" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="flex align-items-center gap-2 mb-3">
        <Button
          icon="pi pi-arrow-left"
          text
          onClick={() => navigate('/production-bom')}
        />
        <h2 className="m-0">
          {isNew ? 'Tạo phiếu định mức' : `Phiếu định mức ${bom?.bomCode ?? ''}`}
        </h2>
        {bom && (
          <Tag
            value={STATUS_LABELS[bom.status] ?? bom.status}
            severity={STATUS_SEVERITY[bom.status]}
            className="ml-2"
          />
        )}
      </div>

      {error && (
        <div className="p-message p-message-error mb-3">
          <span className="p-message-text">{error}</span>
        </div>
      )}

      {/* Header card */}
      <div className="p-card p-3 mb-3">
        <div className="grid">
          <div className="col-12 md:col-6">
            <label className="block mb-1 font-medium">Tên định mức <span className="text-red-500">*</span></label>
            <InputText
              value={bomName}
              onChange={(e) => setBomName(e.target.value)}
              disabled={isReadonly}
              className="w-full"
              placeholder="Tên phiếu định mức"
            />
          </div>

          <div className="col-12 md:col-6">
            <label className="block mb-1 font-medium">Sản phẩm đầu ra</label>
            <AutoComplete
              value={outputQuery}
              suggestions={outputSuggestions}
              completeMethod={searchOutputs}
              field="name"
              itemTemplate={(item: ProductOutputRow) => (
                <span>{item.code} – {item.name} <span className="text-color-secondary">({item.unit})</span></span>
              )}
              onChange={(e) => setOutputQuery(typeof e.value === 'string' ? e.value : `${(e.value as ProductOutputRow).code} – ${(e.value as ProductOutputRow).name}`)}
              onSelect={(e) => {
                const p = e.value as ProductOutputRow
                setOutputProduct(p)
                setOutputQuery(`${p.code} – ${p.name}`)
              }}
              onClear={() => { setOutputProduct(null); setOutputQuery('') }}
              disabled={isReadonly}
              className="w-full"
              placeholder="Tìm sản phẩm đầu ra..."
            />
          </div>

          <div className="col-12 md:col-3">
            <label className="block mb-1 font-medium">Quy mô mẻ (base qty) <span className="text-red-500">*</span></label>
            <InputNumber
              value={baseQty}
              onValueChange={(e) => setBaseQty(e.value ?? null)}
              disabled={isReadonly}
              mode="decimal"
              locale="vi-VN"
              minFractionDigits={0}
              maxFractionDigits={3}
              min={0.001}
              className="w-full"
              suffix={outputProduct ? ` ${outputProduct.unit}` : undefined}
            />
          </div>

          <div className="col-12 md:col-3">
            <label className="block mb-1 font-medium">Hiệu lực từ</label>
            <Calendar
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.value as Date | null)}
              disabled={isReadonly}
              dateFormat="dd/mm/yy"
              showButtonBar
              className="w-full"
            />
          </div>

          <div className="col-12 md:col-3">
            <label className="block mb-1 font-medium">Hiệu lực đến</label>
            <Calendar
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.value as Date | null)}
              disabled={isReadonly}
              dateFormat="dd/mm/yy"
              showButtonBar
              minDate={effectiveFrom ?? undefined}
              className="w-full"
            />
          </div>

          {bom && (
            <div className="col-12 md:col-3">
              <label className="block mb-1 font-medium">Người tạo</label>
              <InputText
                value={bom.creator?.fullName ?? ''}
                readOnly
                className="w-full"
              />
            </div>
          )}

          <div className="col-12">
            <label className="block mb-1 font-medium">Ghi chú</label>
            <InputTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isReadonly}
              autoResize
              rows={2}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Lines table */}
      <div className="p-card p-3 mb-3">
        <div className="flex align-items-center gap-2 mb-2">
          <span className="font-semibold">Danh sách NVL / BTP</span>
          {!isReadonly && (
            <>
              <Button
                label="+ Thêm NVL"
                size="small"
                outlined
                onClick={() => addLine('nvl')}
              />
              <Button
                label="+ Thêm BTP"
                size="small"
                outlined
                severity="secondary"
                onClick={() => addLine('btp')}
              />
            </>
          )}
        </div>

        <DataTable
          value={lines}
          dataKey="_key"
          emptyMessage="Chưa có dòng NVL/BTP nào. Nhấn '+ Thêm NVL' hoặc '+ Thêm BTP'."
          className="p-datatable-sm"
          scrollable
          scrollHeight="400px"
        >
          <Column
            header="Loại"
            style={{ width: '100px' }}
            body={(row: LineRow) =>
              isReadonly ? (
                <Tag
                  value={row.lineType.toUpperCase()}
                  severity={row.lineType === 'nvl' ? 'info' : 'warning'}
                />
              ) : (
                <Dropdown
                  value={row.lineType}
                  options={LINE_TYPE_OPTIONS}
                  onChange={(e) => updateLine(row._key, { lineType: e.value })}
                  style={{ width: '80px' }}
                />
              )
            }
          />

          <Column
            header="Mã / Tên nguyên liệu"
            style={{ minWidth: '240px' }}
            body={(row: LineRow) =>
              isReadonly ? (
                <span>{row.productCode} – {row.productName}</span>
              ) : (
                <AutoComplete
                  value={row.productCode || ''}
                  suggestions={nvlSuggestions}
                  completeMethod={searchNvl}
                  field="code"
                  itemTemplate={(item: MaterialRow) => (
                    <span>{item.code} – {item.materialName} <span className="text-color-secondary">({item.unit})</span></span>
                  )}
                  onChange={(e) => {
                    const v = e.value
                    if (typeof v === 'string') updateLine(row._key, { productCode: v })
                  }}
                  onSelect={(e) => {
                    const m = e.value as MaterialRow
                    updateLine(row._key, {
                      productId:   m.id,
                      productCode: m.code,
                      productName: m.materialName,
                      unit:        m.unit,
                    })
                  }}
                  placeholder="Tìm NVL/BTP..."
                  style={{ width: '100%' }}
                />
              )
            }
          />

          <Column
            header="Tên nguyên liệu"
            style={{ minWidth: '180px' }}
            body={(row: LineRow) =>
              isReadonly ? (
                <span>{row.productName}</span>
              ) : (
                <InputText
                  value={row.productName}
                  onChange={(e) => updateLine(row._key, { productName: e.target.value })}
                  style={{ width: '100%' }}
                  placeholder="Tên"
                />
              )
            }
          />

          <Column
            header={`Định mức / ${outputProduct?.unit ?? 'mẻ'}`}
            style={{ width: '150px', textAlign: 'right' }}
            body={(row: LineRow) =>
              isReadonly ? (
                <span style={{ display: 'block', textAlign: 'right' }}>
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
            style={{ width: '130px', textAlign: 'right' }}
            body={(row: LineRow) =>
              isReadonly ? (
                <span style={{ display: 'block', textAlign: 'right' }}>
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
            style={{ minWidth: '150px' }}
            body={(row: LineRow) =>
              isReadonly ? (
                <span>{row.notes}</span>
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
              style={{ width: '48px', textAlign: 'center' }}
              body={(row: LineRow) => (
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  severity="danger"
                  size="small"
                  onClick={() => removeLine(row._key)}
                />
              )}
            />
          )}
        </DataTable>
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 flex-wrap">
        {/* Save draft — only if draft/new */}
        {(isNew || bom?.status === 'draft') && (
          <Button
            label="Lưu bản nháp"
            icon="pi pi-save"
            loading={saving}
            onClick={handleSave}
          />
        )}

        {/* Submit — draft only */}
        {!isNew && bom?.status === 'draft' && (
          <Button
            label="Gửi duyệt"
            icon="pi pi-send"
            severity="warning"
            loading={saving}
            onClick={() => handleTransition(() => submitProductionBom(id!))}
          />
        )}

        {/* Recall — submitted only */}
        {!isNew && bom?.status === 'submitted' && (
          <Button
            label="Thu hồi"
            icon="pi pi-undo"
            severity="secondary"
            loading={saving}
            onClick={() => handleTransition(() => recallProductionBom(id!))}
          />
        )}

        {/* Approve — submitted only */}
        {!isNew && bom?.status === 'submitted' && (
          <Button
            label="Phê duyệt"
            icon="pi pi-check"
            severity="success"
            loading={saving}
            onClick={() => handleTransition(() => approveProductionBom(id!))}
          />
        )}

        {/* Deactivate — approved only */}
        {!isNew && bom?.status === 'approved' && (
          <Button
            label="Ngưng hiệu lực"
            icon="pi pi-ban"
            severity="danger"
            outlined
            loading={saving}
            onClick={() => handleTransition(() => deactivateProductionBom(id!))}
          />
        )}

        <Button
          label="Quay lại"
          icon="pi pi-times"
          text
          onClick={() => navigate('/production-bom')}
        />
      </div>
    </div>
  )
}
