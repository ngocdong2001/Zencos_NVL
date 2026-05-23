import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Toast } from 'primereact/toast'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { Dropdown } from 'primereact/dropdown'
import { Calendar } from 'primereact/calendar'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Dialog } from 'primereact/dialog'
import { InputNumber } from 'primereact/inputnumber'
import {
  getStockTransfer,
  createStockTransfer,
  updateStockTransfer,
  confirmStockTransfer,
  cancelStockTransfer,
  type StockTransferItem,
  type CreateStockTransferPayload,
} from '../lib/stockTransferApi'
import { fetchWarehouseLocations, fetchWarehouseData, type WarehouseLocation, type InventoryItem } from '../lib/warehouseApi'
import './StockTransferPage.css'

// ─── Mock Data (fallback for testing without backend) ────────────────────────
const MOCK_LOCATIONS: WarehouseLocation[] = [
  { id: 'wh-001', code: 'KHO-NL-A', name: 'Kho Nguyên Liệu A' },
  { id: 'wh-002', code: 'KHO-BTP',  name: 'Kho Bán Thành Phẩm' },
  { id: 'wh-003', code: 'KHO-TP',   name: 'Kho Thành Phẩm' },
  { id: 'wh-004', code: 'KHO-DG',   name: 'Kho Đóng Gói' },
  { id: 'wh-005', code: 'KHO-NL-B', name: 'Kho Nguyên Liệu B' },
]

const MOCK_INVENTORY_ITEMS: InventoryItem[] = [
  { id: 'item-001', code: 'NVL-001', inciName: 'Butylene Glycol',    tradeName: 'Butylene Glycol USP Grade',     unit: 'kg', openingQuantity: 100, importQuantity: 50,  exportQuantity: 30,  stockQuantity: 120, totalStockQuantity: 120, value: 12000000 },
  { id: 'item-002', code: 'NVL-002', inciName: 'Niacinamide',        tradeName: 'Niacinamide B3 Pure 99%',       unit: 'kg', openingQuantity: 200, importQuantity: 100, exportQuantity: 50,  stockQuantity: 250, totalStockQuantity: 250, value: 25000000 },
  { id: 'item-003', code: 'NVL-003', inciName: 'Hyaluronic Acid',    tradeName: 'Hyaluronic Acid HA-Low MW',     unit: 'g',  openingQuantity: 500, importQuantity: 200, exportQuantity: 100, stockQuantity: 600, totalStockQuantity: 600, value: 30000000 },
  { id: 'item-004', code: 'NVL-004', inciName: 'Glycerin',           tradeName: 'Glycerin Pure USP',             unit: 'kg', openingQuantity: 150, importQuantity: 75,  exportQuantity: 25,  stockQuantity: 200, totalStockQuantity: 200, value: 8000000  },
  { id: 'item-005', code: 'NVL-005', inciName: 'Cetyl Alcohol',      tradeName: 'Cetyl Alcohol COSMOS Cert.',    unit: 'kg', openingQuantity: 80,  importQuantity: 40,  exportQuantity: 20,  stockQuantity: 100, totalStockQuantity: 100, value: 5000000  },
  { id: 'item-006', code: 'NVL-006', inciName: 'Sodium Hyaluronate', tradeName: 'Sodium Hyaluronate High-MW',    unit: 'g',  openingQuantity: 300, importQuantity: 150, exportQuantity: 60,  stockQuantity: 390, totalStockQuantity: 390, value: 19500000 },
]

const MOCK_TRANSFER_ITEMS: TransferItemRow[] = [
  { id: 'ti-001', transferId: '', productId: 'item-001', code: 'NVL-001', inciName: 'Butylene Glycol',  tradeName: 'Butylene Glycol USP Grade',  unit: 'kg', quantity: 25,  status: 'pending', lotNumber: 'LOT-2025-A1', note: '', stockStatus: 'available' },
  { id: 'ti-002', transferId: '', productId: 'item-003', code: 'NVL-003', inciName: 'Hyaluronic Acid', tradeName: 'Hyaluronic Acid HA-Low MW', unit: 'g',  quantity: 150, status: 'pending', lotNumber: 'LOT-2025-B5', note: 'Thiếu tồn, cần kiểm tra lại', stockStatus: 'shortage' },
  { id: 'ti-003', transferId: '', productId: 'item-002', code: 'NVL-002', inciName: 'Niacinamide',      tradeName: 'Niacinamide B3 Pure 99%',    unit: 'kg', quantity: 10,  status: 'pending', lotNumber: 'LOT-2025-C2', note: '', stockStatus: 'available' },
]

interface TransferLogEntry {
  id: string
  user: string
  isSystem?: boolean
  action: string
  time: string
}
const MOCK_LOGS: TransferLogEntry[] = [
  { id: 'log-1', user: 'Nguyễn Văn A', action: 'Tạo mới phiếu chuyển kho', time: '14:20 21/05/2026' },
  { id: 'log-2', user: 'Nguyễn Văn A', action: 'Cập nhật danh sách hàng hóa (Import Excel)', time: '14:25 21/05/2026' },
  { id: 'log-3', user: 'Hệ thống', isSystem: true, action: 'Kiểm tra tồn kho tự động: phát hiện thiếu 15 đơn vị NVL-003', time: '14:30 21/05/2026' },
]
// ─────────────────────────────────────────────────────────────────────────────

type TransferStatus = 'draft' | 'confirmed' | 'in_transit' | 'received' | 'cancelled'

// Extended type for UI display — adds lot/note/stockStatus on top of API type
type TransferItemRow = StockTransferItem & {
  lotNumber?: string
  note?: string
  stockStatus?: 'available' | 'shortage'
}

const STATUS_CONFIG: Record<TransferStatus, { label: string; cls: string }> = {
  draft:      { label: 'Nháp',            cls: 'stp-status-draft' },
  confirmed:  { label: 'Đã xác nhận',     cls: 'stp-status-confirmed' },
  in_transit: { label: 'Đang vận chuyển', cls: 'stp-status-in-transit' },
  received:   { label: 'Đã nhận',         cls: 'stp-status-received' },
  cancelled:  { label: 'Đã hủy',          cls: 'stp-status-cancelled' },
}

const TRANSPORT_OPTIONS = [
  { label: 'Vận chuyển nội bộ', value: 'manual' },
  { label: 'Xe riêng',          value: 'truck' },
  { label: 'Đơn vị vận chuyển', value: 'logistics' },
]

function generateTransferNumber(): string {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `TRF-${ymd}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
}

export function StockTransferPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toastRef = useRef<Toast>(null)

  // Form state – initialised with mock data so the page works without backend
  const [transferNumber] = useState(() => generateTransferNumber())
  const [transferDate, setTransferDate] = useState<Date | null>(new Date())
  const [createdBy] = useState('Nguyễn Văn A')
  const [fromWarehouseId, setFromWarehouseId] = useState<string>('wh-001')
  const [toWarehouseId, setToWarehouseId] = useState<string>('wh-002')
  const [expectedRecipient, setExpectedRecipient] = useState('')
  const [reason, setReason] = useState('')
  const [transportMethod, setTransportMethod] = useState('manual')
  const [items, setItems] = useState<TransferItemRow[]>(MOCK_TRANSFER_ITEMS)
  const [transferStatus, setTransferStatus] = useState<TransferStatus>('draft')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [vehicleNumber, setVehicleNumber] = useState('29C-442.21')
  const [driverName, setDriverName] = useState('Trần Hùng')
  const [logs] = useState<TransferLogEntry[]>(MOCK_LOGS)

  // Dialog state
  const [showAddItem, setShowAddItem] = useState(false)
  const [locations, setLocations] = useState<WarehouseLocation[]>(MOCK_LOCATIONS)
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>(MOCK_INVENTORY_ITEMS)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1)

  // ── Load locations from API (keep mock if unavailable) ────────────────────
  useEffect(() => {
    fetchWarehouseLocations()
      .then((locs) => { if (locs.length > 0) setLocations(locs) })
      .catch(() => { /* keep mock */ })
  }, [])

  // ── Load transfer for editing ──────────────────────────────────────────────
  useEffect(() => {
    if (!id) return

    async function loadTransfer() {
      setIsLoading(true)
      try {
        const transfer = await getStockTransfer(id!)
        setTransferDate(new Date(transfer.createdAt))
        setFromWarehouseId(transfer.fromWarehouseId)
        setToWarehouseId(transfer.toWarehouseId)
        setExpectedRecipient(transfer.expectedRecipient)
        setReason(transfer.reason)
        setTransportMethod(transfer.transportMethod)
        setItems(transfer.items)
        setTransferStatus((transfer.status as TransferStatus) || 'draft')
      } catch {
        /* keep mock data */
      } finally {
        setIsLoading(false)
      }
    }

    loadTransfer()
  }, [id])

  // ── Load items for source warehouse (keep mock if unavailable) ─────────────
  useEffect(() => {
    if (!fromWarehouseId) return
    fetchWarehouseData('all', '', 1, 9999, null, null, fromWarehouseId)
      .then((data) => { if (data.items.length > 0) setAvailableItems(data.items) })
      .catch(() => { /* keep mock */ })
  }, [fromWarehouseId])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddItem = () => {
    if (!selectedProduct || !selectedQuantity) {
      toastRef.current?.show({ severity: 'warn', summary: 'Cảnh báo', detail: 'Vui lòng chọn sản phẩm và nhập số lượng', life: 3000 })
      return
    }
    const product = availableItems.find(item => item.id === selectedProduct)
    if (!product) return

    const existingItem = items.find(item => item.productId === selectedProduct)
    if (existingItem) {
      setItems(items.map(item =>
        item.productId === selectedProduct ? { ...item, quantity: item.quantity + selectedQuantity } : item
      ))
    } else {
      setItems([...items, {
        id: `temp-${Date.now()}`, transferId: id || '',
        productId: selectedProduct, code: product.code,
        inciName: product.inciName, tradeName: product.tradeName,
        unit: product.unit, quantity: selectedQuantity, status: 'pending',
      }])
    }
    setSelectedProduct(''); setSelectedQuantity(1); setShowAddItem(false)
    toastRef.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã thêm sản phẩm', life: 2000 })
  }

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter(item => item.productId !== productId))
  }

  const handleSave = async () => {
    if (!fromWarehouseId || !toWarehouseId) {
      toastRef.current?.show({ severity: 'warn', summary: 'Cảnh báo', detail: 'Vui lòng chọn kho nguồn và kho đích', life: 3000 })
      return
    }
    if (items.length === 0) {
      toastRef.current?.show({ severity: 'warn', summary: 'Cảnh báo', detail: 'Vui lòng thêm ít nhất một sản phẩm', life: 3000 })
      return
    }
    setSaving(true)
    try {
      const payload: CreateStockTransferPayload = {
        fromWarehouseId, toWarehouseId, expectedRecipient, reason, transportMethod,
        items: items.map(item => ({ productId: item.productId, quantity: item.quantity })),
      }
      if (id) {
        await updateStockTransfer(id, payload)
        toastRef.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật phiếu chuyển', life: 2000 })
      } else {
        const result = await createStockTransfer(payload)
        toastRef.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo phiếu chuyển', life: 2000 })
        navigate(`/stock-transfer/${result.id}`)
      }
    } catch (error) {
      toastRef.current?.show({ severity: 'error', summary: 'Lỗi', detail: error instanceof Error ? error.message : 'Lỗi lưu phiếu', life: 3000 })
    } finally { setSaving(false) }
  }

  const handleConfirm = async () => {
    if (!id) return
    setSaving(true)
    try {
      await confirmStockTransfer(id)
      setTransferStatus('confirmed')
      toastRef.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã xác nhận phiếu chuyển', life: 2000 })
    } catch (error) {
      toastRef.current?.show({ severity: 'error', summary: 'Lỗi', detail: error instanceof Error ? error.message : 'Lỗi xác nhận', life: 3000 })
    } finally { setSaving(false) }
  }

  const handleCancelTransfer = async () => {
    if (!id) { navigate('/stock-transfer'); return }
    setSaving(true)
    try {
      await cancelStockTransfer(id)
      setTransferStatus('cancelled')
      toastRef.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã hủy phiếu chuyển', life: 2000 })
      setTimeout(() => navigate('/stock-transfer'), 1500)
    } catch (error) {
      toastRef.current?.show({ severity: 'error', summary: 'Lỗi', detail: error instanceof Error ? error.message : 'Lỗi hủy phiếu', life: 3000 })
    } finally { setSaving(false) }
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const isEditable = transferStatus === 'draft'
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const shortageCount = items.filter(item => item.stockStatus === 'shortage').length
  const statusCfg = STATUS_CONFIG[transferStatus]
  const locationOptions = locations.map(l => ({ label: `${l.code} – ${l.name}`, value: l.id }))

  if (isLoading) {
    return (
      <div className="stp-loading">
        <div className="stp-spinner" />
      </div>
    )
  }

  return (
    <div className="stp-page">
      <Toast ref={toastRef} position="bottom-right" />

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="stp-page-header">
        <div className="stp-header-left">
          <button className="stp-back-btn" onClick={() => navigate('/stock-transfer')} title="Quay lại">
            <i className="pi pi-arrow-left" />
          </button>
          <div>
            <div className="stp-title-row">
              <h1>Phiếu chuyển kho nội bộ</h1>
              <span className="stp-transfer-badge">#{transferNumber}</span>
            </div>
            <p>Tạo và quản lý luân chuyển hàng hóa giữa các kho chi nhánh</p>
          </div>
        </div>
        <div className="stp-header-right">
          <span className={`stp-status-badge ${statusCfg.cls}`}>{statusCfg.label}</span>
          <button className="stp-icon-btn" title="In phiếu"><i className="pi pi-print" /></button>
          <button className="stp-icon-btn" title="Xuất Excel"><i className="pi pi-file-excel" /></button>
        </div>
      </div>

      {/* ── Main 2-column layout ────────────────────────────────────────────── */}
      <div className="stp-content">
        <div className="stp-main-col">

      {/* ── Form Card ───────────────────────────────────────────────────────── */}
      <div className="stp-card">
        <div className="stp-card-header">
          <div className="stp-card-icon">
            <i className="pi pi-file-edit" />
          </div>
          <h3>Thông tin phiếu chuyển</h3>
        </div>

        {/* Row 1: Số phiếu | Ngày lập | Người lập | Người nhận */}
        <div className="stp-form-grid stp-grid-4">
          <div className="stp-field">
            <label className="stp-label">SỐ PHIẾU</label>
            <InputText value={transferNumber} disabled className="stp-input" />
          </div>
          <div className="stp-field">
            <label className="stp-label">NGÀY LẬP</label>
            <Calendar
              value={transferDate}
              onChange={(e) => setTransferDate(e.value as Date)}
              dateFormat="dd/mm/yy"
              disabled={!!id}
              showIcon
              className="stp-calendar"
            />
          </div>
          <div className="stp-field">
            <label className="stp-label">NGƯỜI LẬP</label>
            <InputText value={createdBy} disabled className="stp-input" />
          </div>
          <div className="stp-field">
            <label className="stp-label">NGƯỜI NHẬN DỰ KIẾN</label>
            <InputText
              value={expectedRecipient}
              onChange={(e) => setExpectedRecipient(e.target.value)}
              placeholder="Nhập tên người nhận..."
              disabled={!isEditable}
              className="stp-input"
            />
          </div>
        </div>

        {/* Row 2: Kho nguồn → Kho đích | Phương thức vận chuyển */}
        <div className="stp-form-grid stp-grid-warehouse">
          <div className="stp-field">
            <label className="stp-label">KHO NGUỒN</label>
            <div className="stp-wh-wrap stp-wh-source">
              <i className="pi pi-home stp-wh-icon" />
              <Dropdown
                value={fromWarehouseId}
                options={locationOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setFromWarehouseId(e.value)}
                placeholder="Chọn kho nguồn"
                disabled={!!id}
                className="stp-wh-dropdown"
              />
            </div>
          </div>

          <div className="stp-wh-arrow">
            <i className="pi pi-arrow-right" />
          </div>

          <div className="stp-field">
            <label className="stp-label">KHO ĐÍCH</label>
            <div className="stp-wh-wrap stp-wh-dest">
              <i className="pi pi-home stp-wh-icon" />
              <Dropdown
                value={toWarehouseId}
                options={locationOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setToWarehouseId(e.value)}
                placeholder="Chọn kho đích"
                disabled={!!id}
                className="stp-wh-dropdown"
              />
            </div>
          </div>

          <div className="stp-field">
            <label className="stp-label">PHƯƠNG THỨC VẬN CHUYỂN</label>
            <Dropdown
              value={transportMethod}
              options={TRANSPORT_OPTIONS}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setTransportMethod(e.value)}
              disabled={!isEditable}
              className="stp-dropdown"
            />
          </div>
        </div>

        {/* Row 3: Lý do / ghi chú */}
        <div className="stp-form-grid stp-grid-1">
          <div className="stp-field">
            <label className="stp-label">LÝ DO CHUYỂN / GHI CHÚ</label>
            <InputTextarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Điều chuyển tồn kho cho chi nhánh mới mở, bổ sung nguyên liệu đóng gói..."
              rows={2}
              disabled={!isEditable}
              className="stp-textarea"
            />
          </div>
        </div>
      </div>

      {/* ── Items Card ──────────────────────────────────────────────────────── */}
      <div className="stp-card">
        <div className="stp-items-header">
          <div className="stp-card-header">
            <div className="stp-card-icon stp-card-icon-green">
              <i className="pi pi-list" />
            </div>
            <h3>Chi tiết hàng hóa</h3>
            <span className="stp-items-count">{items.length} mặt hàng</span>
          </div>
          <div className="stp-items-actions">
            <button className="stp-btn-outline-gray" onClick={() => {}}>
              <i className="pi pi-upload" />
              Import Excel
            </button>
            {isEditable && (
              <button className="stp-btn-add" onClick={() => setShowAddItem(true)}>
                <i className="pi pi-plus" />
                Thêm hàng
              </button>
            )}
          </div>
        </div>

        <DataTable
          value={items}
          emptyMessage={
            <div className="stp-empty">
              <i className="pi pi-inbox" />
              <p>Chưa có sản phẩm nào</p>
              {isEditable && <span className="stp-empty-hint">Nhấn "Thêm hàng" để chọn nguyên liệu cần chuyển</span>}
            </div>
          }
          className="stp-datatable"
        >
          <Column
            header="STT"
            body={(_row, { rowIndex }) => <span className="stp-cell-center">{rowIndex + 1}</span>}
            style={{ width: '52px' }}
          />
          <Column field="code" header="Mã hàng" style={{ width: '100px' }} />
          <Column field="tradeName" header="Tên hàng hóa" style={{ minWidth: '180px' }} />
          <Column
            field="lotNumber"
            header="Lô nguồn"
            style={{ width: '120px' }}
            body={(row: TransferItemRow) => (
              <span className="stp-lot">{row.lotNumber || '—'}</span>
            )}
          />
          <Column
            field="quantity"
            header="Số lượng"
            style={{ width: '100px' }}
            bodyClassName="stp-cell-right"
            body={(row: TransferItemRow) => (
              <strong className="stp-qty">{row.quantity.toLocaleString('vi-VN')}</strong>
            )}
          />
          <Column field="unit" header="DVT" style={{ width: '60px' }} bodyClassName="stp-cell-center" />
          <Column
            field="status"
            header="Trạng thái"
            style={{ width: '120px' }}
            bodyClassName="stp-cell-center"
            body={(row: TransferItemRow) => (
              row.stockStatus === 'shortage'
                ? <span className="stp-row-badge stp-row-shortage">Thiếu tồn</span>
                : <span className="stp-row-badge stp-row-available">Sẵn sàng</span>
            )}
          />
          <Column
            field="note"
            header="Ghi chú"
            style={{ minWidth: '160px' }}
            body={(row: TransferItemRow) => (
              <span className="stp-note-cell">{row.note || '—'}</span>
            )}
          />
          {isEditable && (
            <Column
              header=""
              style={{ width: '52px' }}
              bodyClassName="stp-cell-center"
              body={(row: TransferItemRow) => (
                <button className="stp-del-btn" onClick={() => handleRemoveItem(row.productId)} title="Xóa dòng">
                  <i className="pi pi-trash" />
                </button>
              )}
            />
          )}
        </DataTable>

        {/* Table footer */}
        {items.length > 0 && (
          <div className="stp-table-footer">
            <span className="stp-table-footer-left">
              Đã chọn: <strong>{items.length}/{items.length} dòng</strong>
            </span>
            <span className="stp-table-footer-hint">Nhấn đúp vào ô để chỉnh sửa nhanh giá trị.</span>
          </div>
        )}
      </div>{/* end stp-card items */}

      {/* ── Nhật ký giao dịch ───────────────────────────────────────────────── */}
      <div className="stp-card">
        <div className="stp-card-header">
          <div className="stp-card-icon">
            <i className="pi pi-history" />
          </div>
          <h3>Nhật ký giao dịch</h3>
        </div>
        <div className="stp-log-list">
          {logs.map((log) => (
            <div className="stp-log-item" key={log.id}>
              <div className={`stp-log-avatar ${log.isSystem ? 'stp-log-avatar-sys' : ''}`}>
                {log.isSystem ? <i className="pi pi-cog" /> : log.user.charAt(0)}
              </div>
              <div className="stp-log-body">
                <span className="stp-log-user">{log.user}</span>
                <span className="stp-log-action">{log.action}</span>
              </div>
              <span className="stp-log-time">{log.time}</span>
            </div>
          ))}
        </div>
      </div>

        </div>{/* end stp-main-col */}

        {/* ── Right Sidebar Panel ─────────────────────────────────────────────── */}
        <div className="stp-sidebar">
          <div className="stp-sidebar-panel">
            <div className="stp-sidebar-header">
              <span className="stp-sidebar-label">TỔNG HỢP ĐỢT XUẤT</span>
              <span className="stp-sidebar-transfer-no">{transferNumber.replace(/^TRF-\d{8}-/, 'TRF-')}</span>
            </div>

            <div className="stp-stat-list">
              <div className="stp-stat-row">
                <span className="stp-stat-label">Tổng số mặt hàng</span>
                <span className="stp-stat-value">{items.length} mã</span>
              </div>
              <div className="stp-stat-row">
                <span className="stp-stat-label">Tổng số lượng chuyển</span>
                <span className="stp-stat-value">{totalQuantity.toLocaleString('vi-VN')}</span>
              </div>
              <div className="stp-stat-row">
                <span className="stp-stat-label">Số dòng thiếu tồn kho</span>
                <span className={`stp-stat-value ${shortageCount > 0 ? 'stp-stat-danger' : ''}`}>
                  {shortageCount} dòng
                </span>
              </div>
            </div>

            {shortageCount > 0 && (
              <div className="stp-warning-box">
                <div className="stp-warning-title">
                  <i className="pi pi-exclamation-triangle" />
                  Cảnh báo tồn kho
                </div>
                <p>
                  {items.filter(i => i.stockStatus === 'shortage').map(i => i.code).join(', ')} không đủ tồn kho tại kho nguồn để thực hiện chuyển kho. Vui lòng kiểm tra lại.
                </p>
              </div>
            )}

            <div className="stp-sidebar-actions">
              <button className="stp-btn-sidebar">
                <i className="pi pi-search" />
                Kiểm tra tồn kho
              </button>
              <button className="stp-btn-sidebar">
                <i className="pi pi-sync" />
                Đối soát dữ liệu
              </button>
            </div>

            <div className="stp-sidebar-sep" />

            <div className="stp-last-save">
              <span>Lần lưu cuối: <strong>Vừa xong (14:35)</strong></span>
            </div>

            <div className="stp-vehicle-info">
              <div className="stp-vehicle-row">
                <div className="stp-vehicle-field">
                  <span className="stp-vehicle-label">XE VẬN TẢI</span>
                  <InputText
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    disabled={!isEditable}
                    className="stp-vehicle-input"
                    placeholder="Số xe..."
                  />
                </div>
                <div className="stp-vehicle-field">
                  <span className="stp-vehicle-label">LÁI XE</span>
                  <InputText
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    disabled={!isEditable}
                    className="stp-vehicle-input"
                    placeholder="Tên lái xe..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>{/* end stp-content */}

      {/* ── Footer Action Bar ────────────────────────────────────────────────── */}
      <div className="stp-footer">
        {id && isEditable && (
          <button className="stp-btn-danger" onClick={handleCancelTransfer} disabled={isSaving}>
            <i className="pi pi-ban" />
            Hủy phiếu
          </button>
        )}
        <div className="stp-footer-spacer" />
        {isEditable && (
          <button className="stp-btn-secondary" onClick={handleSave} disabled={isSaving}>
            <i className="pi pi-save" />
            Lưu nháp
          </button>
        )}
        <button className="stp-btn-secondary" onClick={() => {}}>
          <i className="pi pi-print" />
          In phiếu (F7)
        </button>
        <button className="stp-btn-secondary" onClick={() => {}}>
          <i className="pi pi-file-excel" />
          Xuất Excel
        </button>
        {isEditable && (
          <button className="stp-btn-primary" onClick={id ? handleConfirm : handleSave} disabled={isSaving}>
            <i className="pi pi-check-circle" />
            Xác nhận chuyển hàng
          </button>
        )}
      </div>

      {/* ── Add Item Dialog ──────────────────────────────────────────────────── */}
      <Dialog
        header="Thêm sản phẩm vào phiếu"
        visible={showAddItem}
        onHide={() => { setShowAddItem(false); setSelectedProduct(''); setSelectedQuantity(1) }}
        modal
        style={{ width: '480px' }}
      >
        <div className="stp-dialog-body">
          <div className="stp-dialog-field">
            <label className="stp-label">CHỌN NGUYÊN LIỆU</label>
            <Dropdown
              value={selectedProduct}
              options={availableItems.map(item => ({ label: `${item.code} – ${item.tradeName}`, value: item.id }))}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setSelectedProduct(e.value)}
              placeholder="Tìm theo mã hoặc tên nguyên liệu..."
              filter
              filterPlaceholder="Tìm kiếm..."
              style={{ width: '100%' }}
            />
            {selectedProduct && (() => {
              const found = availableItems.find(i => i.id === selectedProduct)
              return found ? (
                <div className="stp-product-hint">
                  <span><strong>INCI:</strong> {found.inciName}</span>
                  <span><strong>ĐVT:</strong> {found.unit}</span>
                  <span><strong>Tồn kho:</strong> {found.stockQuantity.toLocaleString('vi-VN')} {found.unit}</span>
                </div>
              ) : null
            })()}
          </div>

          <div className="stp-dialog-field">
            <label className="stp-label">SỐ LƯỢNG</label>
            <InputNumber
              value={selectedQuantity}
              onValueChange={(e) => setSelectedQuantity(Math.max(1, e.value || 1))}
              min={1}
              locale="vi-VN"
              style={{ width: '100%' }}
            />
          </div>

          <div className="stp-dialog-actions">
            <button className="stp-btn-ghost" onClick={() => { setShowAddItem(false); setSelectedProduct(''); setSelectedQuantity(1) }}>
              Hủy
            </button>
            <button className="stp-btn-primary" onClick={handleAddItem}>
              <i className="pi pi-plus" />
              Thêm vào phiếu
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
