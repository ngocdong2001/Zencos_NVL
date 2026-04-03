import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { BasicRow } from './types'
import { createMaterial, fetchBasics, fetchNextMaterialCode } from '../../lib/catalogApi'

type ProductCreateFormProps = {
  returnToPath?: string
  onCreated?: (product: { code: string; name: string }) => void
  onCancel?: () => void
}

type ParsedApiError = {
  message: string
  suggestedCode?: string
}

type NoticeState = {
  tone: 'success' | 'error'
  message: string
}

type ProductCreateDraft = {
  code: string
  name: string
  inciName: string
  classificationId: string
  baseUnitId: string
  orderUnitId: string
  minStockLevel: string
  hasExpiry: boolean
  useFefo: boolean
  notes: string
}

function normalizeCatalogCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

function parseApiError(error: unknown, fallbackMessage = 'Tạo product thất bại'): ParsedApiError {
  if (!(error instanceof Error)) {
    return { message: fallbackMessage }
  }

  const raw = error.message?.trim() ?? ''
  if (!raw.startsWith('{')) {
    return { message: raw || fallbackMessage }
  }

  try {
    const parsed = JSON.parse(raw) as { message?: string; error?: string; suggestedCode?: string }
    return {
      message: parsed.message || parsed.error || fallbackMessage,
      suggestedCode: parsed.suggestedCode,
    }
  } catch {
    return { message: raw || fallbackMessage }
  }
}

export function ProductCreateForm({ returnToPath, onCreated, onCancel }: ProductCreateFormProps) {
  const [classifications, setClassifications] = useState<BasicRow[]>([])
  const [units, setUnits] = useState<BasicRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const [draft, setDraft] = useState<ProductCreateDraft>({
    code: '',
    name: '',
    inciName: '',
    classificationId: '',
    baseUnitId: '',
    orderUnitId: '',
    minStockLevel: '0',
    hasExpiry: true,
    useFefo: true,
    notes: '',
  })

  const canSubmit = useMemo(() => {
    return Boolean(
      normalizeCatalogCode(draft.code)
      && draft.name.trim()
      && draft.classificationId
      && draft.baseUnitId
      && draft.orderUnitId,
    )
  }, [draft.baseUnitId, draft.classificationId, draft.code, draft.name, draft.orderUnitId])

  const orderUnitOptions = useMemo(() => {
    if (!draft.baseUnitId) return [] as BasicRow[]

    const baseUnit = units.find((item) => item.id === draft.baseUnitId)
    if (!baseUnit) return [] as BasicRow[]

    const childUnits = units.filter((item) => item.parentUnitId === draft.baseUnitId)
    return [baseUnit, ...childUnits]
  }, [draft.baseUnitId, units])

  useEffect(() => {
    let cancelled = false

    const loadFormData = async () => {
      try {
        setLoading(true)
        const [nextCode, classificationRows, unitRows] = await Promise.all([
          fetchNextMaterialCode(),
          fetchBasics('classifications'),
          fetchBasics('units'),
        ])

        if (cancelled) return

        setClassifications(classificationRows)
        setUnits(unitRows)

        const firstClassification = classificationRows[0]?.id ?? ''
        const firstUnit = unitRows[0]?.id ?? ''

        setDraft((prev) => ({
          ...prev,
          code: nextCode,
          classificationId: prev.classificationId || firstClassification,
          baseUnitId: prev.baseUnitId || firstUnit,
          orderUnitId: prev.orderUnitId || firstUnit,
        }))
      } catch (error) {
        if (!cancelled) {
          const parsed = parseApiError(error, 'Không tải được dữ liệu form product.')
          setNotice({ tone: 'error', message: parsed.message })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadFormData()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!draft.baseUnitId) return
    if (orderUnitOptions.length === 0) return

    const isCurrentOrderUnitValid = orderUnitOptions.some((item) => item.id === draft.orderUnitId)
    if (isCurrentOrderUnitValid) return

    setDraft((prev) => ({
      ...prev,
      orderUnitId: prev.baseUnitId,
    }))
  }, [draft.baseUnitId, draft.orderUnitId, orderUnitOptions])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice(null)

    const normalizedCode = normalizeCatalogCode(draft.code)
    const normalizedName = draft.name.trim()
    if (!normalizedCode || !normalizedName || !draft.classificationId || !draft.baseUnitId || !draft.orderUnitId) {
      setNotice({ tone: 'error', message: 'Vui lòng nhập đủ thông tin bắt buộc trước khi lưu.' })
      return
    }

    const minStockLevel = Number.parseFloat(draft.minStockLevel)
    const safeMinStock = Number.isFinite(minStockLevel) && minStockLevel >= 0 ? minStockLevel : 0

    try {
      setSubmitting(true)
      await createMaterial({
        code: normalizedCode,
        name: normalizedName,
        inciName: draft.inciName.trim(),
        productType: Number(draft.classificationId),
        baseUnit: draft.baseUnitId,
        orderUnit: draft.orderUnitId,
        minStockLevel: safeMinStock,
        hasExpiry: draft.hasExpiry,
        useFefo: draft.useFefo,
        notes: draft.notes.trim(),
      })

      const suggestedCode = await fetchNextMaterialCode()
      setDraft((prev) => ({
        ...prev,
        code: suggestedCode,
        name: '',
        inciName: '',
        minStockLevel: '0',
        notes: '',
      }))
      setNotice({ tone: 'success', message: `Đã tạo product ${normalizedCode} thành công.` })
      onCreated?.({ code: normalizedCode, name: normalizedName })
    } catch (error) {
      const parsed = parseApiError(error, 'Tạo product thất bại')
      if (parsed.suggestedCode) {
        setDraft((prev) => ({ ...prev, code: parsed.suggestedCode ?? prev.code }))
      }
      const hint = parsed.suggestedCode ? ` Mã gợi ý: ${parsed.suggestedCode}` : ''
      setNotice({ tone: 'error', message: `${parsed.message}${hint}` })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="product-create-form" onSubmit={handleSubmit}>
      <section className="product-form-card">
        <header className="product-form-header">
          <div>
            <p className="product-form-kicker">Module tạo nhanh product</p>
            <h3>Form nhập liệu mã product mới</h3>
            <p>
              Có thể mở form này từ các màn hình khác khi cần tạo mã product ngay, không cần quay về bảng catalog.
            </p>
            {returnToPath ? <p className="product-form-return-hint">Màn hình gọi: {returnToPath}</p> : null}
          </div>
        </header>

        {notice ? (
          <div className={`catalog-inline-notice ${notice.tone}`} role="alert">
            <span>{notice.message}</span>
            <button type="button" className="catalog-inline-notice-close" onClick={() => setNotice(null)} aria-label="Đóng thông báo">
              x
            </button>
          </div>
        ) : null}

        <div className="product-form-grid">
          <label className="product-form-field">
            <span>Mã product *</span>
            <input
              value={draft.code}
              onChange={(event) => setDraft((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="NVL-001"
              disabled={loading || submitting}
              required
            />
          </label>

          <label className="product-form-field">
            <span>Tên thương mại *</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ví dụ: Dầu hạt nho tinh khiết"
              disabled={loading || submitting}
              required
            />
          </label>

          <label className="product-form-field">
            <span>INCI Name</span>
            <input
              value={draft.inciName}
              onChange={(event) => setDraft((prev) => ({ ...prev, inciName: event.target.value }))}
              placeholder="Vitis Vinifera Seed Oil"
              disabled={loading || submitting}
            />
          </label>

          <label className="product-form-field">
            <span>Phân loại *</span>
            <select
              value={draft.classificationId}
              onChange={(event) => setDraft((prev) => ({ ...prev, classificationId: event.target.value }))}
              disabled={loading || submitting}
              required
            >
              <option value="">Chọn phân loại</option>
              {classifications.map((item) => (
                <option key={item.id} value={item.id}>{item.code} - {item.name}</option>
              ))}
            </select>
          </label>

          <label className="product-form-field">
            <span>Đơn vị cơ sở *</span>
            <select
              value={draft.baseUnitId}
              onChange={(event) => {
                const nextBaseUnitId = event.target.value
                setDraft((prev) => ({
                  ...prev,
                  baseUnitId: nextBaseUnitId,
                  orderUnitId: nextBaseUnitId,
                }))
              }}
              disabled={loading || submitting}
              required
            >
              <option value="">Chọn đơn vị cơ sở</option>
              {units.map((item) => (
                <option key={item.id} value={item.id}>{item.code} - {item.name}</option>
              ))}
            </select>
          </label>

          <label className="product-form-field">
            <span>Đơn vị đặt hàng *</span>
            <select
              value={draft.orderUnitId}
              onChange={(event) => setDraft((prev) => ({ ...prev, orderUnitId: event.target.value }))}
              disabled={loading || submitting || !draft.baseUnitId}
              required
            >
              <option value="">Chọn đơn vị đặt hàng</option>
              {orderUnitOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.code} - {item.name}</option>
              ))}
            </select>
          </label>

          <label className="product-form-field">
            <span>Tồn tối thiểu</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={draft.minStockLevel}
              onChange={(event) => setDraft((prev) => ({ ...prev, minStockLevel: event.target.value }))}
              disabled={loading || submitting}
            />
          </label>

          <label className="product-form-field product-form-field-wide">
            <span>Ghi chú</span>
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
              placeholder="Thông tin bổ sung cho product..."
              disabled={loading || submitting}
            />
          </label>
        </div>

        <div className="product-form-options">
          <label>
            <input
              type="checkbox"
              checked={draft.hasExpiry}
              onChange={(event) => setDraft((prev) => ({ ...prev, hasExpiry: event.target.checked }))}
              disabled={loading || submitting}
            />
            Theo dõi hạn sử dụng
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.useFefo}
              onChange={(event) => setDraft((prev) => ({ ...prev, useFefo: event.target.checked }))}
              disabled={loading || submitting}
            />
            Áp dụng FEFO
          </label>
        </div>

        <footer className="product-form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit || loading || submitting}>
            <i className="pi pi-save" /> {submitting ? 'Đang lưu...' : 'Lưu product mới'}
          </button>
        </footer>
      </section>
    </form>
  )
}
