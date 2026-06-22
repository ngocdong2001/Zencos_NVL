import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { Toast } from 'primereact/toast'
import { fetchBasics, fetchMaterials } from '../lib/catalogApi'
import type { BasicRow, MaterialRow } from '../components/catalog/types'
import { safeRandomId } from '../lib/uuid'
import { formatQuantity, parseDecimalInput, toEditableNumberString } from '../components/purchaseOrder/format'
import { createCustomerMaterialInboundReceipt, fetchCustomerMaterialInboundReceiptDetail, updateCustomerMaterialInboundReceipt, revertCustomerMaterialInboundToDraft } from '../lib/customerMaterialInboundApi'

type SelectOption = { label: string; value: string }

type ReceiptLine = {
  key: string
  materialId: string
  lotNo: string
  manufacturerLotNo: string
  invoiceNumber: string
  manufactureDate: Date | null
  expiryDate: Date | null
  quantityValue: number
  quantityInput: string
}

function createEmptyLine(): ReceiptLine {
  return {
    key: safeRandomId(),
    materialId: '',
    lotNo: '',
    manufacturerLotNo: '',
    invoiceNumber: '',
    manufactureDate: null,
    expiryDate: null,
    quantityValue: 0,
    quantityInput: '',
  }
}

function buildCustomerInboundRef(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `NK-KH-${yyyy}${mm}${dd}-${hh}${min}${ss}`
}

export function CustomerMaterialInboundPage() {
  const navigate = useNavigate()
  const { receiptId } = useParams<{ receiptId?: string }>()
  const isEditMode = Boolean(receiptId)
  const toast = useRef<Toast>(null)

  /* ── catalog data ── */
  const [customerRows, setCustomerRows] = useState<BasicRow[]>([])
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([])
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [materialOptions, setMaterialOptions] = useState<SelectOption[]>([])
  const [materialCodeOptions, setMaterialCodeOptions] = useState<SelectOption[]>([])

  /* ── form state ── */
  const [customerId, setCustomerId] = useState('')
  const [receivingLocationId, setReceivingLocationId] = useState('')
  const [receivedAt, setReceivedAt] = useState<Date>(new Date())
  const [dienGiai, setDienGiai] = useState('')
  const [lines, setLines] = useState<ReceiptLine[]>([createEmptyLine()])
  const [tableSearch, setTableSearch] = useState('')

  /* ── order metadata ── */
  const [receiptRef, setReceiptRef] = useState(() => buildCustomerInboundRef())
  const [receiptStatus, setReceiptStatus] = useState<'draft' | 'pending_qc' | 'posted' | 'cancelled' | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showRevertDialog, setShowRevertDialog] = useState(false)
  const [reverting, setReverting] = useState(false)

  const isReadOnly = receiptStatus === 'posted'
  const canEdit = !isReadOnly && !submitting

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      setLoading(true)
      try {
        const [customers, locationRows, catalogMaterials] = await Promise.all([
          fetchBasics('customers'),
          fetchBasics('locations'),
          fetchMaterials(),
        ])
        if (cancelled) return

        setCustomerRows(customers.filter((r: BasicRow) => r.id && r.name))
        setLocationOptions(
          locationRows
            .filter((r: BasicRow) => r.id && r.status !== 'inactive')
            .map((r: BasicRow) => ({ value: r.id, label: r.name + (r.code ? ` (${r.code})` : '') })),
        )
        setMaterials(catalogMaterials)
        setMaterialOptions(catalogMaterials.map((m) => ({ value: m.id, label: `${m.materialName} (${m.code})` })))
        setMaterialCodeOptions(catalogMaterials.map((m) => ({ value: m.id, label: m.code })))
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Không thể tải dữ liệu danh mục.'
        toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: message, life: 4000 })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadData()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isEditMode || !receiptId) return
    let cancelled = false
    const loadReceipt = async () => {
      setLoading(true)
      try {
        const detail = await fetchCustomerMaterialInboundReceiptDetail(receiptId)
        if (cancelled) return

        setReceiptRef(detail.receiptRef)
        setReceiptStatus(detail.status)
        setCustomerId(detail.customerId)
        setReceivingLocationId(detail.receivingLocationId)
        setReceivedAt(new Date(detail.receivedAt))
        setDienGiai(detail.dienGiai ?? '')

        const loadedLines: ReceiptLine[] = detail.items.map((item) => ({
          key: item.id,
          materialId: item.productId,
          lotNo: item.lotNo,
          manufacturerLotNo: item.manufacturerLotNo ?? '',
          invoiceNumber: '',
          manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          quantityValue: item.quantityBase,
          quantityInput: toEditableNumberString(item.quantityBase),
        }))

        setLines(loadedLines.length > 0 ? [...loadedLines, createEmptyLine()] : [createEmptyLine()])
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Không thể tải dữ liệu phiếu nhận.'
        toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: message, life: 4000 })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadReceipt()
    return () => { cancelled = true }
  }, [isEditMode, receiptId])

  /* ── derived ── */
  const selectedCustomer = useMemo(
    () => customerRows.find((r) => r.id === customerId) ?? null,
    [customerRows, customerId],
  )

  const customerNameOptions = useMemo(
    () => customerRows.filter((r) => r.id && r.name).map((r) => ({ value: r.id, label: r.name })),
    [customerRows],
  )

  const customerCodeOptions = useMemo(
    () => customerRows.filter((r) => r.id).map((r) => ({ value: r.id, label: r.code?.trim() ? r.code : '---' })),
    [customerRows],
  )

  const usedMaterialIds = useMemo(
    () => new Set(lines.map((l) => l.materialId).filter(Boolean)),
    [lines],
  )

  const visibleLines = useMemo(() => {
    const lastLine = lines[lines.length - 1]
    const hasNewLine = lastLine != null && !lastLine.materialId
    if (!tableSearch.trim()) return lines
    const q = tableSearch.toLowerCase()
    const filtered = lines.filter((l) => {
      const mat = materials.find((m) => m.id === l.materialId)
      return (
        mat?.code?.toLowerCase().includes(q) ||
        mat?.materialName?.toLowerCase().includes(q) ||
        l.lotNo.toLowerCase().includes(q)
      )
    })
    if (hasNewLine && lastLine && !filtered.includes(lastLine)) return [...filtered, lastLine]
    return filtered
  }, [lines, tableSearch, materials])

  const totalQty = useMemo(
    () => lines.reduce((s, l) => s + l.quantityValue, 0),
    [lines],
  )

  /* ── line management ── */
  const updateLine = (key: string, updater: (l: ReceiptLine) => ReceiptLine) => {
    setLines((prev) => prev.map((l) => (l.key === key ? updater(l) : l)))
  }

  const removeLine = (key: string) => {
    const lastLine = lines[lines.length - 1]
    if (lastLine?.key === key && !lastLine.materialId) return
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const handleMaterialChange = (key: string, newMaterialId: string) => {
    const wasNewLine = lines[lines.length - 1]?.key === key && !lines[lines.length - 1]?.materialId
    updateLine(key, (l) => ({ ...l, materialId: newMaterialId }))
    if (newMaterialId && wasNewLine) {
      setLines((prev) => [...prev, createEmptyLine()])
    }
  }

  const handleQtyFocus = (key: string) => {
    updateLine(key, (l) => ({ ...l, quantityInput: toEditableNumberString(l.quantityValue) }))
  }

  const handleQtyBlur = (key: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        const raw = l.quantityInput.trim()
        if (!raw) return { ...l, quantityValue: 0, quantityInput: '' }
        const parsed = parseDecimalInput(raw)
        if (!Number.isFinite(parsed) || parsed <= 0) {
          toast.current?.show({ severity: 'warn', summary: 'Cảnh báo', detail: 'Số lượng không hợp lệ.', life: 3000 })
          return l
        }
        return { ...l, quantityValue: parsed, quantityInput: formatQuantity(parsed) }
      }),
    )
  }

  /* ── validation ── */
  const validateBeforeSubmit = (): boolean => {
    if (!customerId) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng chọn khách hàng sở hữu NVL.', life: 3000 })
      return false
    }
    if (!receivingLocationId) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng chọn kho nhận hàng.', life: 3000 })
      return false
    }
    const validLines = lines.filter((l) => l.materialId || l.quantityValue > 0)
    if (validLines.length === 0) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng thêm ít nhất một dòng nguyên liệu.', life: 3000 })
      return false
    }
    const duplicateSet = new Set<string>()
    for (const line of lines) {
      if (!line.materialId && line.quantityValue === 0) continue
      const mat = materials.find((m) => m.id === line.materialId)
      if (!line.materialId) {
        toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Một dòng chưa chọn nguyên liệu.', life: 3000 })
        return false
      }
      if (!line.lotNo.trim()) {
        toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: `${mat?.materialName ?? 'Nguyên liệu'}: Vui lòng nhập số LOT.`, life: 3000 })
        return false
      }
      if (line.quantityValue <= 0) {
        toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: `${mat?.materialName ?? 'Nguyên liệu'}: Số lượng phải lớn hơn 0.`, life: 3000 })
        return false
      }
      const dk = `${line.materialId}::${line.lotNo.trim().toLowerCase()}`
      if (duplicateSet.has(dk)) {
        toast.current?.show({ severity: 'warn', summary: 'Dữ liệu trùng', detail: 'Trùng nguyên liệu và số LOT trong cùng phiếu.', life: 3000 })
        return false
      }
      duplicateSet.add(dk)
    }
    return true
  }

  /* ── submit ── */
  const submitReceipt = async (asDraft = false) => {
    if (!validateBeforeSubmit()) return
    setSubmitting(true)
    try {
      const payload = {
        receiptRef: receiptRef.trim() || undefined,
        customerId,
        receivingLocationId,
        receivedAt: receivedAt.toISOString(),
        dienGiai: dienGiai.trim() || undefined,
        status: asDraft ? ('draft' as const) : ('posted' as const),
        items: lines
          .filter((l) => l.materialId && l.quantityValue > 0)
          .map((l) => {
            const mat = materials.find((m) => m.id === l.materialId)!
            return {
              productId: l.materialId,
              lotNo: l.lotNo.trim(),
              manufacturerLotNo: l.manufacturerLotNo.trim() || undefined,
              invoiceNumber: l.invoiceNumber.trim() || undefined,
              manufactureDate: l.manufactureDate ? l.manufactureDate.toISOString().slice(0, 10) : undefined,
              expiryDate: l.expiryDate ? l.expiryDate.toISOString().slice(0, 10) : undefined,
              quantityBase: l.quantityValue,
              quantityDisplay: l.quantityValue,
              unitUsed: mat.unit,
            }
          }),
      }
      
      let result: { id: string; receiptRef: string }
      if (isEditMode && receiptId) {
        result = await updateCustomerMaterialInboundReceipt(receiptId, payload)
        if (asDraft) {
          toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật phiếu nhận thành công.', life: 3000 })
          setReceiptStatus('draft')
        } else {
          navigate('/customer-material-inbound', { state: { createdReceiptId: result.id } })
        }
      } else {
        result = await createCustomerMaterialInboundReceipt(payload)
        if (asDraft) {
          toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã lưu nháp phiếu nhận thành công.', life: 3000 })
        } else {
          navigate('/customer-material-inbound', { state: { createdReceiptId: result.id } })
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : `Không thể ${isEditMode ? 'cập nhật' : 'tạo'} phiếu nhận NVL của khách.`
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: message, life: 4000 })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevertToDraft = async () => {
    if (!receiptId) return
    setReverting(true)
    try {
      await revertCustomerMaterialInboundToDraft(receiptId)
      toast.current?.show({
        severity: 'success',
        summary: 'Thành công',
        detail: 'Đã thu hồi phiếu nhận về nháp thành công.',
        life: 3000,
      })
      setShowRevertDialog(false)
      // Reload receipt data
      const detail = await fetchCustomerMaterialInboundReceiptDetail(receiptId)
      setReceiptRef(detail.receiptRef)
      setReceiptStatus(detail.status)
      setCustomerId(detail.customerId)
      setReceivingLocationId(detail.receivingLocationId)
      setReceivedAt(new Date(detail.receivedAt))
      setDienGiai(detail.dienGiai ?? '')

      const loadedLines: ReceiptLine[] = detail.items.map((item) => ({
        key: item.id,
        materialId: item.productId,
        lotNo: item.lotNo,
        manufacturerLotNo: item.manufacturerLotNo ?? '',
        invoiceNumber: '',
        manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        quantityValue: item.quantityBase,
        quantityInput: toEditableNumberString(item.quantityBase),
      }))

      setLines(loadedLines.length > 0 ? [...loadedLines, createEmptyLine()] : [createEmptyLine()])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể thu hồi phiếu nhận về nháp.'
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: message, life: 4000 })
    } finally {
      setReverting(false)
    }
  }

  /* ── table cell renderers ── */
  const sttBody = (row: ReceiptLine, opts: { rowIndex: number }) => {
    const isNewLine = lines[lines.length - 1]?.key === row.key && !row.materialId
    if (isNewLine) return <span className="tp-inv-stt new-row-marker">+</span>
    return <span className="tp-inv-stt">{opts.rowIndex + 1}</span>
  }

  const materialCodeBody = (row: ReceiptLine) => {
    const availableOptions = materialCodeOptions.filter(
      (opt) => opt.value === row.materialId || !usedMaterialIds.has(opt.value),
    )
    return (
      <Dropdown
        value={row.materialId || null}
        options={availableOptions}
        onChange={(e) => handleMaterialChange(row.key, String(e.value ?? ''))}
        placeholder="Chọn mã..."
        filter
        showClear
        className="tp-inv-cell-dropdown"
        disabled={!canEdit}
        panelStyle={{ minWidth: 200 }}
      />
    )
  }

  const materialNameBody = (row: ReceiptLine) => {
    const availableOptions = materialOptions.filter(
      (opt) => opt.value === row.materialId || !usedMaterialIds.has(opt.value),
    )
    return (
      <Dropdown
        value={row.materialId || null}
        options={availableOptions}
        onChange={(e) => handleMaterialChange(row.key, String(e.value ?? ''))}
        placeholder="Chọn NVL..."
        filter
        showClear
        className="tp-inv-cell-dropdown"
        disabled={!canEdit}
        panelStyle={{ minWidth: 300 }}
      />
    )
  }

  const lotBody = (row: ReceiptLine) => (
    <InputText
      value={row.lotNo}
      onChange={(e) => updateLine(row.key, (l) => ({ ...l, lotNo: e.target.value }))}
      placeholder="Số LOT *"
      className="tp-inv-cell-input"
      disabled={!row.materialId || !canEdit}
    />
  )

  const mfgDateBody = (row: ReceiptLine) => (
    <Calendar
      value={row.manufactureDate}
      onChange={(e) => updateLine(row.key, (l) => ({ ...l, manufactureDate: e.value instanceof Date ? e.value : null }))}
      dateFormat="dd/mm/yy"
      showIcon
      placeholder="NSX"
      disabled={!row.materialId || !canEdit}
    />
  )

  const expDateBody = (row: ReceiptLine) => (
    <Calendar
      value={row.expiryDate}
      onChange={(e) => updateLine(row.key, (l) => ({ ...l, expiryDate: e.value instanceof Date ? e.value : null }))}
      dateFormat="dd/mm/yy"
      showIcon
      placeholder="HSD"
      disabled={!row.materialId || !canEdit}
    />
  )

  const unitBody = (row: ReceiptLine) => {
    const mat = materials.find((m) => m.id === row.materialId)
    return <span className="tp-inv-unit">{mat?.unit ?? ''}</span>
  }

  const qtyBody = (row: ReceiptLine) => (
    <InputText
      value={row.quantityInput}
      onChange={(e) => updateLine(row.key, (l) => ({ ...l, quantityInput: e.target.value }))}
      onFocus={() => handleQtyFocus(row.key)}
      onBlur={() => handleQtyBlur(row.key)}
      placeholder="0"
      className="tp-inv-cell-input tp-inv-cell-input--number"
      disabled={!row.materialId || !canEdit}
    />
  )

  const actionBody = (row: ReceiptLine) => {
    if (lines[lines.length - 1]?.key === row.key && !row.materialId) return null
    if (!canEdit) return null
    return (
      <Button
        icon="pi pi-trash"
        rounded
        text
        severity="danger"
        size="small"
        onClick={() => removeLine(row.key)}
        tooltip="Xóa dòng"
        tooltipOptions={{ position: 'left' }}
      />
    )
  }

  /* ── render ── */
  if (loading) {
    return (
      <section className="tp-inv-page">
        <div className="catalog-loading-wrap">
          <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: '#4b63d0' }} />
          <p>Đang tải dữ liệu...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="tp-inv-page">

      {/* ─── Page header ─── */}
      <header className="tp-inv-header">
        <div className="tp-inv-header-left">
          <Button
            icon="pi pi-arrow-left"
            text
            rounded
            size="small"
            onClick={() => navigate('/customer-material-inbound')}
            className="tp-inv-back-btn"
            tooltip="Quay lại danh sách phiếu nhận NVL"
            tooltipOptions={{ position: 'right' }}
          />
          <div className="tp-inv-title-block">
            <h1 className="tp-inv-title">{isEditMode ? 'Chi tiết phếu nhận NVL của khách' : 'Nhận NVL của khách'}</h1>
            <span className="tp-inv-ref-tag tp-inv-ref-editable">
              <InputText
                value={receiptRef}
                onChange={(e) => setReceiptRef(e.target.value)}
                placeholder="Mã phếu nhận"
                className="tp-inv-ref-input"
                disabled={isEditMode}
              />
            </span>
            {receiptStatus && (
              <span className={`app-status-badge ${receiptStatus === 'posted' ? 'success' : 'warning'}`}>
                {receiptStatus === 'posted' ? 'Đã hoàn thành' : 'Lưu nháp'}
              </span>
            )}
          </div>
        </div>
        <div className="tp-inv-header-right" />
      </header>

      <Toast ref={toast} position="top-right" />

      <div className="tp-inv-body">
        <div className="tp-inv-main-column">

          {/* ─── Single combined info card ─── */}
          <article className="tp-inv-card">
            <header className="tp-inv-card-header">
              <i className="pi pi-file-edit" aria-hidden />
              <span>THÔNG TIN PHIẾU NHẬN</span>
            </header>

            <div className="tp-inv-fields-col">
              {/* Row 1: Customer + Location + Date */}
              <div className="tp-inv-fields-row">
                <label className="tp-inv-field">
                  <span className="tp-inv-field-label">Mã khách hàng</span>
                  <Dropdown
                    value={customerId}
                    options={customerCodeOptions}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(e) => setCustomerId(String(e.value ?? ''))}
                    placeholder="Chọn mã..."
                    filter
                    showClear
                    disabled={!canEdit}
                    className="tp-inv-field-dropdown"
                  />
                </label>
                <label className="tp-inv-field" style={{ flex: 2 }}>
                  <span className="tp-inv-field-label">Tên khách hàng</span>
                  <Dropdown
                    value={customerId}
                    options={customerNameOptions}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(e) => setCustomerId(String(e.value ?? ''))}
                    placeholder="Chọn khách hàng..."
                    filter
                    showClear
                    disabled={!canEdit}
                    className="tp-inv-field-dropdown"
                  />
                </label>
                <label className="tp-inv-field" style={{ flex: 2 }}>
                  <span className="tp-inv-field-label">Kho nhận hàng</span>
                  <Dropdown
                    value={receivingLocationId}
                    options={locationOptions}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(e) => setReceivingLocationId(String(e.value ?? ''))}
                    placeholder="Chọn kho NVL..."
                    filter
                    showClear
                    disabled={!canEdit}
                    className="tp-inv-field-dropdown"
                  />
                </label>
                <label className="tp-inv-field">
                  <span className="tp-inv-field-label">Ngày nhận hàng</span>
                  <Calendar
                    value={receivedAt}
                    onChange={(e) => { if (e.value instanceof Date) setReceivedAt(e.value) }}
                    dateFormat="dd/mm/yy"
                    disabled={!canEdit}
                    className="tp-inv-field-calendar"
                    showIcon
                  />
                </label>
              </div>

              {/* Customer detail (address / phone / email) */}
              {selectedCustomer && (selectedCustomer.address || selectedCustomer.phone || selectedCustomer.email) && (
                <div className="tp-inv-customer-detail">
                  {selectedCustomer.address && (
                    <div className="tp-inv-customer-info-row">
                      <i className="pi pi-map-marker" aria-hidden />
                      <span>{selectedCustomer.address}</span>
                    </div>
                  )}
                  {selectedCustomer.phone && (
                    <div className="tp-inv-customer-info-row">
                      <i className="pi pi-phone" aria-hidden />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="tp-inv-customer-info-row">
                      <i className="pi pi-envelope" aria-hidden />
                      <span>{selectedCustomer.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Row 2: Diễn giải */}
              <div className="tp-inv-fields-row">
                <label className="tp-inv-field">
                  <span className="tp-inv-field-label">Diễn giải / Ghi chú phiếu nhận</span>
                  <InputTextarea
                    value={dienGiai}
                    onChange={(e) => setDienGiai(e.target.value)}
                    placeholder="Nhập ghi chú cho phiếu nhận..."
                    rows={2}
                    autoResize
                    disabled={!canEdit}
                    style={{ width: '100%' }}
                  />
                </label>
              </div>
            </div>
          </article>

          {/* ─── Items section ─── */}
          <section className="tp-inv-items-section">

            {/* Toolbar */}
            <div className="tp-inv-items-toolbar">
              <div className="tp-inv-items-toolbar-left">
                <i className="pi pi-list" aria-hidden />
                <span className="tp-inv-items-title">BẢNG CHI TIẾT LOT NHẬN VÀO KHO</span>
                <span className="tp-inv-items-count">{lines.filter((l) => l.materialId).length} dòng</span>
              </div>
              <div className="tp-inv-items-toolbar-right">
                <span className="p-input-icon-left tp-inv-search-wrap">
                  <i className="pi pi-search" />
                  <InputText
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Tìm mã NVL, tên, số lô..."
                    className="tp-inv-search-input"
                  />
                </span>
              </div>
            </div>

            {/* DataTable */}
            <DataTable
              value={visibleLines}
              dataKey="key"
              emptyMessage="Chưa có dòng nguyên liệu nào."
              className="tp-inv-table"
              scrollable
              scrollHeight="auto"
              size="small"
              rowClassName={(row: ReceiptLine) => {
                const isNewLine = lines[lines.length - 1]?.key === row.key && !row.materialId
                return isNewLine ? 'new-row' : ''
              }}
            >
              <Column header="STT" body={sttBody} style={{ width: 50, textAlign: 'center' }} className="tp-inv-col-stt" />
              <Column header="Mã NVL" body={materialCodeBody} style={{ width: 130 }} className="tp-inv-col-code" />
              <Column header="Tên nguyên liệu" body={materialNameBody} style={{ width: 200 }} className="tp-inv-col-name" />
              <Column header="Số LOT *" body={lotBody} style={{ width: 90 }} className="tp-inv-col-lot" />
              <Column header="NSX" body={mfgDateBody} style={{ width: 130 }} />
              <Column header="HSD" body={expDateBody} style={{ width: 130 }} />
              <Column header="ĐV" body={unitBody} style={{ width: 60, textAlign: 'center' }} className="tp-inv-col-unit" />
              <Column header="Số lượng" body={qtyBody} style={{ width: 100 }} className="tp-inv-col-qty" />
              <Column body={actionBody} style={{ width: 50, textAlign: 'center' }} className="tp-inv-col-action" />
            </DataTable>

            {/* Summary */}
            <div className="tp-inv-summary">
              <div className="tp-inv-summary-row">
                <span>Tổng số dòng NVL:</span>
                <strong>{lines.filter((l) => l.materialId).length} dòng</strong>
              </div>
              <div className="tp-inv-summary-row tp-inv-grand-total-row">
                <span>TỔNG SỐ LƯỢNG NHẬN:</span>
                <strong className="tp-inv-grand-total">{formatQuantity(totalQty)}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ─── Action bar ─── */}
      {canEdit && (
        <div className="tp-inv-action-bar">
          <div className="tp-inv-action-left" />
          <div className="tp-inv-action-right">
            <Button
              icon="pi pi-trash"
              label="Hủy phiếu"
              onClick={() => navigate('/customer-material-inbound')}
              disabled={!canEdit}
              className="btn btn-ghost btn-cancel"
            />
            <Button
              icon="pi pi-save"
              label="Lưu nháp"
              onClick={() => submitReceipt(true)}
              disabled={!canEdit}
              className="btn btn-ghost"
            />
            <Button
              icon="pi pi-check"
              label="Lưu phiếu nhận NVL của khách"
              onClick={() => submitReceipt(false)}
              loading={submitting}
              className="tp-inv-confirm-btn"
            />
          </div>
        </div>
      )}

      {/* ─── Action bar for posted receipts ─── */}
      {isReadOnly && (
        <div className="tp-inv-action-bar">
          <div className="tp-inv-action-left" />
          <div className="tp-inv-action-right">
            <Button
              icon="pi pi-arrow-left"
              label="Quay lại danh sách"
              onClick={() => navigate('/customer-material-inbound')}
              className="btn btn-ghost"
            />
            <Button
              icon="pi pi-replay"
              label="Thu hồi về nháp"
              onClick={() => setShowRevertDialog(true)}
              className="btn btn-ghost"
              style={{ color: '#f59e0b', borderColor: '#f59e0b' }}
              tooltip="Thu hồi phiếu về nháp để chỉnh sửa (chỉ khi lô hàng chưa sử dụng)"
              tooltipOptions={{ position: 'top' }}
            />
          </div>
        </div>
      )}

      {/* ─── Revert confirmation dialog ─── */}
      <Dialog
        header="Xác nhận thu hồi phiếu nhận"
        visible={showRevertDialog}
        style={{ width: '450px' }}
        onHide={() => setShowRevertDialog(false)}
        footer={
          <div>
            <Button
              label="Hủy"
              icon="pi pi-times"
              onClick={() => setShowRevertDialog(false)}
              className="p-button-text"
              disabled={reverting}
            />
            <Button
              label="Xác nhận thu hồi"
              icon="pi pi-check"
              onClick={handleRevertToDraft}
              loading={reverting}
              severity="warning"
            />
          </div>
        }
      >
        <div className="confirmation-content">
          <i className="pi pi-exclamation-triangle" style={{ fontSize: '2rem', color: '#f59e0b', marginRight: '1rem' }} />
          <span>
            Bạn có chắc muốn thu hồi phiếu nhận này về trạng thái nháp?
            <br />
            <br />
            <strong>Lưu ý:</strong> Chỉ có thể thu hồi khi các lô hàng trong phiếu chưa được sử dụng (số lượng hiện tại bằng số lượng nhận).
          </span>
        </div>
      </Dialog>
    </section>
  )
}

