import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Checkbox } from 'primereact/checkbox'
import { Dropdown } from 'primereact/dropdown'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import {
  fetchPurchaseShortages,
  type PurchaseShortageRow,
  type ShortageStatus,
} from '../lib/purchaseShortageApi'

type OutletContext = { search: string }

type PurchaseView = 'tabs' | 'detail'
type PurchaseTab = 'shortage' | 'po-list'
type PoStatus = 'draft' | 'sent' | 'confirmed' | 'completed'

type PurchaseOrderRow = {
  id: string
  code: string
  createdAt: string
  supplier: string
  lineCount: number
  totalValue: number
  status: PoStatus
  creator: string
}

type PurchaseDraftLine = {
  id: string
  materialCode: string
  materialName: string
  quantity: number
  unit: string
  unitPrice: number
}

const PO_ROWS: PurchaseOrderRow[] = [
  {
    id: 'PO-2024-001',
    code: 'PO-2024-001',
    createdAt: '2024-05-20',
    supplier: 'Công ty TNHH Hóa chất Việt',
    lineCount: 12,
    totalValue: 45000000,
    status: 'draft',
    creator: 'Admin Zencos',
  },
  {
    id: 'PO-2024-002',
    code: 'PO-2024-002',
    createdAt: '2024-05-19',
    supplier: 'Hương liệu ABC',
    lineCount: 5,
    totalValue: 12500000,
    status: 'sent',
    creator: 'Nguyen Van A',
  },
  {
    id: 'PO-2024-003',
    code: 'PO-2024-003',
    createdAt: '2024-05-18',
    supplier: 'Bao bì Toàn Cầu',
    lineCount: 8,
    totalValue: 8900000,
    status: 'confirmed',
    creator: 'Admin Zencos',
  },
  {
    id: 'PO-2024-004',
    code: 'PO-2024-004',
    createdAt: '2024-05-17',
    supplier: 'Nguyên liệu Mỹ Anh',
    lineCount: 3,
    totalValue: 156000000,
    status: 'completed',
    creator: 'Tran Thi B',
  },
  {
    id: 'PO-2024-005',
    code: 'PO-2024-005',
    createdAt: '2024-05-16',
    supplier: 'Công ty TNHH Hóa chất Việt',
    lineCount: 15,
    totalValue: 67200000,
    status: 'draft',
    creator: 'Admin Zencos',
  },
  {
    id: 'PO-2024-006',
    code: 'PO-2024-006',
    createdAt: '2024-05-15',
    supplier: 'Hương liệu ABC',
    lineCount: 7,
    totalValue: 23800000,
    status: 'sent',
    creator: 'Admin Zencos',
  },
]

const STATUS_LABELS: Record<PoStatus, string> = {
  draft: 'Bản nháp',
  sent: 'Đã gửi',
  confirmed: 'Đã xác nhận',
  completed: 'Hoàn thành',
}

const PAGE_SIZE = 5

const SHORTAGE_STATUS_OPTIONS: Array<{ label: string; value: 'all' | ShortageStatus }> = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Nguy cấp', value: 'critical' },
  { label: 'Cảnh báo', value: 'warning' },
  { label: 'Ổn định', value: 'stable' },
]

const PO_STATUS_OPTIONS: Array<{ label: string; value: 'all' | PoStatus }> = [
  { label: 'Trạng thái', value: 'all' },
  { label: 'Bản nháp', value: 'draft' },
  { label: 'Đã gửi', value: 'sent' },
  { label: 'Đã xác nhận', value: 'confirmed' },
  { label: 'Hoàn thành', value: 'completed' },
]

const DRAFT_LINES: PurchaseDraftLine[] = [
  {
    id: 'line-1',
    materialCode: 'RM-EXT-002',
    materialName: 'Chiết xuất Cam thảo (Licorice Extract)',
    quantity: 50,
    unit: 'kg',
    unitPrice: 450000,
  },
  {
    id: 'line-2',
    materialCode: 'RM-SOL-015',
    materialName: 'Glycerin tinh khiết 99.5%',
    quantity: 200,
    unit: 'kg',
    unitPrice: 35000,
  },
  {
    id: 'line-3',
    materialCode: 'RM-SOL-022',
    materialName: 'Propylene Glycol USP',
    quantity: 150,
    unit: 'kg',
    unitPrice: 42000,
  },
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value)
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value)
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
function parseDateValue(value: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatDateValue(value: Date | null | undefined): string {
  if (!value) return ''
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function PurchaseOrderPage() {
  const { search } = useOutletContext<OutletContext>()
  const [activeView, setActiveView] = useState<PurchaseView>('tabs')
  const [activeTab, setActiveTab] = useState<PurchaseTab>('shortage')

  const [statusFilter, setStatusFilter] = useState<'all' | PoStatus>('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [shortageStatusFilter, setShortageStatusFilter] = useState<'all' | ShortageStatus>('all')
  const [shortageRows, setShortageRows] = useState<PurchaseShortageRow[]>([])
  const [shortagePage, setShortagePage] = useState(1)
  const [shortageTotal, setShortageTotal] = useState(0)
  const [shortageSummary, setShortageSummary] = useState({ critical: 0, warning: 0, stable: 0 })
  const [shortageLoading, setShortageLoading] = useState(false)
  const [shortageError, setShortageError] = useState<string | null>(null)
  const [shortageLastUpdatedAt, setShortageLastUpdatedAt] = useState<string | null>(null)
  const [shortageRefreshKey, setShortageRefreshKey] = useState(0)
  const [quickSupplier, setQuickSupplier] = useState('')
  const [quickNeedDate, setQuickNeedDate] = useState<Date | null>(null)
  const [quickRequestType, setQuickRequestType] = useState<'normal' | 'urgent' | null>(null)
  const [quickNote, setQuickNote] = useState('')

  const suppliers = useMemo(
    () => [...new Set(PO_ROWS.map((row) => row.supplier))],
    [],
  )
  const supplierOptions = useMemo(
    () => [
      { label: 'Nhà cung cấp', value: 'all' },
      ...suppliers.map((supplier) => ({ label: supplier, value: supplier })),
    ],
    [suppliers],
  )

  const filteredRows = useMemo(() => {
    const normalizedQuery = normalizeText(search)

    return PO_ROWS.filter((row) => {
      const inStatus = statusFilter === 'all' || row.status === statusFilter
      const inSupplier = supplierFilter === 'all' || row.supplier === supplierFilter
      const inFromDate = !fromDate || row.createdAt >= fromDate
      const inToDate = !toDate || row.createdAt <= toDate
      const text = normalizeText([row.code, row.supplier, row.creator, STATUS_LABELS[row.status]].join(' '))
      const inSearch = !normalizedQuery || text.includes(normalizedQuery)
      return inStatus && inSupplier && inFromDate && inToDate && inSearch
    })
  }, [fromDate, search, statusFilter, supplierFilter, toDate])

  useEffect(() => {
    setPage(1)
    setSelectedIds([])
  }, [search, statusFilter, supplierFilter, fromDate, toDate])

  useEffect(() => {
    setShortagePage(1)
  }, [search, shortageStatusFilter])

  useEffect(() => {
    let cancelled = false

    const loadShortages = async () => {
      setShortageLoading(true)
      setShortageError(null)
      try {
        const response = await fetchPurchaseShortages({
          q: search,
          status: shortageStatusFilter,
          page: shortagePage,
          limit: PAGE_SIZE,
        })
        if (cancelled) return
        setShortageRows(response.data)
        setShortageTotal(response.total)
        setShortageSummary(response.summary)
        setShortageLastUpdatedAt(response.data[0]?.updatedAt ?? null)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Không thể tải dữ liệu thiếu hụt'
        setShortageError(message)
      } finally {
        if (!cancelled) setShortageLoading(false)
      }
    }

    void loadShortages()
    return () => {
      cancelled = true
    }
  }, [search, shortagePage, shortageRefreshKey, shortageStatusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const visibleRows = filteredRows.slice(start, start + PAGE_SIZE)
  const visibleIds = visibleRows.map((row) => row.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const rangeStart = filteredRows.length === 0 ? 0 : start + 1
  const rangeEnd = Math.min(start + PAGE_SIZE, filteredRows.length)

  const shortageTotalPages = Math.max(1, Math.ceil(shortageTotal / PAGE_SIZE))
  const shortageSafePage = Math.min(shortagePage, shortageTotalPages)
  const shortageRangeStart = shortageTotal === 0 ? 0 : (shortageSafePage - 1) * PAGE_SIZE + 1
  const shortageRangeEnd = Math.min(shortageSafePage * PAGE_SIZE, shortageTotal)

  const stats = useMemo(
    () => ({
      total: PO_ROWS.length,
      draft: PO_ROWS.filter((row) => row.status === 'draft').length,
      sent: PO_ROWS.filter((row) => row.status === 'sent').length,
    }),
    [],
  )

  const detailSubtotal = useMemo(
    () => DRAFT_LINES.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    [],
  )
  const detailVat = Math.round(detailSubtotal * 0.0925)
  const detailTotal = detailSubtotal + detailVat

  const handleToggleVisibleRows = (checked: boolean) => {
    if (!checked) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
      return
    }
    setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])])
  }

  const handleToggleRow = (rowId: string, checked: boolean) => {
    if (!checked) {
      setSelectedIds((prev) => prev.filter((id) => id !== rowId))
      return
    }
    setSelectedIds((prev) => [...prev, rowId])
  }

  if (activeView === 'detail') {
    return (
      <section className="purchase-detail-shell">
        <header className="purchase-detail-header">
          <div className="purchase-detail-title-wrap">
            <Button
              type="button"
              className="purchase-detail-back-btn"
              icon="pi pi-angle-left"
              text
              onClick={() => setActiveView('tabs')}
              aria-label="Quay lại danh sách"
            />
            <div>
              <div className="purchase-detail-title-row">
                <h2>Soạn thảo Đơn mua hàng</h2>
                <span className="purchase-detail-draft-tag">DỰ THẢO (DRAFT)</span>
              </div>
              <p>Mã tham chiếu: PO-DRAFT-2024-00892</p>
            </div>
          </div>

          <div className="purchase-detail-header-actions">
            <Button
              type="button"
              className="btn btn-ghost"
              icon="pi pi-times"
              label="Hủy bỏ"
              onClick={() => setActiveView('tabs')}
            />
            <Button type="button" className="btn btn-primary" icon="pi pi-send" label="Gửi cho thu mua" />
          </div>
        </header>

        <div className="purchase-detail-content-grid">
          <div className="purchase-detail-main">
            <section className="purchase-detail-card">
              <h3><i className="pi pi-file" aria-hidden /> Thông tin chung</h3>
              <div className="purchase-general-grid">
                <article>
                  <span>Nhà cung cấp</span>
                  <strong>Công ty TNHH Hóa Chất Toàn Cầu</strong>
                </article>
                <article>
                  <span>Kho nhận hàng</span>
                  <strong>Kho Thành phẩm & Nguyên liệu Zencos - Long An</strong>
                </article>
                <article>
                  <span>Ngày dự kiến nhận</span>
                  <strong>15/12/2024</strong>
                </article>
              </div>

              <label className="purchase-terms-field">
                Ghi chú điều khoản (Terms & Conditions)
                <InputTextarea
                  rows={3}
                  defaultValue="Thanh toán 50% sau khi nhận hàng và kiểm định đạt yêu cầu. Yêu cầu kèm theo phiếu COA và MSDS cho từng lô hàng."
                />
              </label>
            </section>

            <section className="purchase-detail-card">
              <div className="purchase-material-head">
                <h3><i className="pi pi-box" aria-hidden /> Danh mục nguyên liệu</h3>
                <Button
                  type="button"
                  className="btn btn-ghost btn-compact-material"
                  icon="pi pi-plus"
                  label="Thêm dòng hàng"
                />
              </div>

              <div className="purchase-material-table-wrap">
                <table className="purchase-material-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Mã / Tên nguyên liệu</th>
                      <th>Số lượng</th>
                      <th>ĐVT</th>
                      <th>Đơn giá (VND)</th>
                      <th>Thành tiền</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {DRAFT_LINES.map((line, index) => (
                      <tr key={line.id}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{line.materialName}</strong>
                          <span>{line.materialCode}</span>
                        </td>
                        <td>
                          <InputNumber value={line.quantity} readOnly useGrouping={false} />
                        </td>
                        <td><span className="purchase-unit-pill">{line.unit}</span></td>
                        <td>{formatCurrency(line.unitPrice)}</td>
                        <td className="purchase-line-total">{formatCurrency(line.quantity * line.unitPrice)}</td>
                        <td>
                          <Button
                            type="button"
                            className="po-icon-btn"
                            icon="pi pi-trash"
                            text
                            aria-label={`Xóa ${line.materialCode}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="purchase-detail-side">
            <section className="purchase-side-card">
              <h4>Tổng kết đơn hàng</h4>
              <div className="purchase-side-row"><span>Tiền hàng:</span><strong>{formatCurrency(detailSubtotal)} đ</strong></div>
              <div className="purchase-side-row"><span>Thuế VAT (Tạm tính):</span><strong>{formatCurrency(detailVat)} đ</strong></div>
              <div className="purchase-side-total"><span>Tổng cộng:</span><strong>{formatCurrency(detailTotal)} đ</strong></div>
              <p className="purchase-side-note">Giá trên chưa bao gồm phí vận chuyển (nếu có).</p>
            </section>

            <section className="purchase-side-card">
              <h4><i className="pi pi-paperclip" aria-hidden /> Tệp đính kèm</h4>
              <div className="purchase-upload-box">
                <i className="pi pi-plus" aria-hidden />
                <p>Kéo thả tệp hoặc click để tải lên</p>
                <small>PDF, JPG, PNG (Max 5MB)</small>
              </div>
              <ul className="purchase-attachment-list">
                <li>Bao-gia-hoa-chat-T12.pdf</li>
                <li>COA-Licorice-Extract-Batch.pdf</li>
              </ul>
            </section>

            <section className="purchase-side-card">
              <h4>Lịch sử thao tác</h4>
              <ul className="purchase-timeline">
                <li><strong>Tạo bản nháp PO</strong><span>Hôm nay, 09:15 bởi Admin Zencos</span></li>
                <li><strong>Cập nhật danh mục hàng</strong><span>Hôm nay, 10:22 bởi Admin Zencos</span></li>
              </ul>
            </section>
          </aside>
        </div>
      </section>
    )
  }

  return (
    <section className="purchase-module-shell">
      <header className="purchase-tabs-header">
        <Button
          type="button"
          className={activeTab === 'shortage' ? 'active' : ''}
          onClick={() => setActiveTab('shortage')}
          label="Yêu cầu mua hàng & Thiếu hụt"
          text
        />
        <Button
          type="button"
          className={activeTab === 'po-list' ? 'active' : ''}
          onClick={() => setActiveTab('po-list')}
          label="Danh sách Phiếu PO"
          text
        />
      </header>

      {activeTab === 'shortage'
        ? (
            <section className="purchase-shortage-shell">
              <div className="purchase-shortage-left">
                <div className="purchase-shortage-title-row">
                  <div>
                    <h2>Yêu cầu mua hàng & Thiếu hụt</h2>
                    <p>Giám sát vật tư dưới ngưỡng tồn kho an toàn và tạo đơn mua hàng.</p>
                  </div>
                  <div className="purchase-shortage-actions">
                    <label className="po-filter-control">
                      <i className="pi pi-filter" aria-hidden />
                      <Dropdown
                        value={shortageStatusFilter}
                        options={SHORTAGE_STATUS_OPTIONS}
                        onChange={(event) => setShortageStatusFilter(event.value as 'all' | ShortageStatus)}
                        optionLabel="label"
                        optionValue="value"
                      />
                      <i className="pi pi-angle-down" aria-hidden />
                    </label>
                    <Button type="button" className="btn btn-ghost" icon="pi pi-download" label="Xuất báo cáo tồn" />
                  </div>
                </div>

                <div className="purchase-shortage-stats-grid">
                  <article className="shortage-stat-card tone-critical">
                    <p>Thiếu hụt khẩn cấp</p>
                    <strong>{String(shortageSummary.critical).padStart(2, '0')} mặt hàng</strong>
                    <span>Nguyên liệu dưới ngưỡng an toàn nghiêm trọng</span>
                  </article>
                  <article className="shortage-stat-card tone-draft">
                    <p>Thiếu hụt cảnh báo</p>
                    <strong>{String(shortageSummary.warning).padStart(2, '0')} mặt hàng</strong>
                    <span>Cần theo dõi và chuẩn bị kế hoạch mua</span>
                  </article>
                  <article className="shortage-stat-card tone-ok">
                    <p>Ổn định tồn kho</p>
                    <strong>{String(shortageSummary.stable).padStart(2, '0')} mặt hàng</strong>
                    <span>Đang đạt hoặc vượt định mức min</span>
                  </article>
                </div>

                <section className="shortage-table-card">
                  <div className="shortage-table-head">
                    <h3>Danh sách NVL thiếu hụt</h3>
                    <div>
                      <span>
                        Cập nhật:{' '}
                        {shortageLastUpdatedAt
                          ? new Date(shortageLastUpdatedAt).toLocaleString('vi-VN')
                          : '--'}
                      </span>
                      <Button
                        type="button"
                        text
                        disabled={shortageLoading}
                        onClick={() => setShortageRefreshKey((prev) => prev + 1)}
                        label="Tải lại"
                      />
                    </div>
                  </div>

                  {shortageError ? <p className="po-empty-row">{shortageError}</p> : null}

                  <div className="shortage-table-wrap">
                    <table className="shortage-table">
                      <thead>
                        <tr>
                          <th>
                            <Checkbox checked={false} onChange={() => undefined} aria-label="Chọn tất cả NVL thiếu hụt" />
                          </th>
                          <th>Mã NVL</th>
                          <th>Tên nguyên liệu</th>
                          <th>Tồn hiện tại</th>
                          <th>Định mức min</th>
                          <th>Số lượng thiếu</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shortageLoading
                          ? (
                              <tr>
                                <td colSpan={7} className="po-empty-row">Đang tải dữ liệu thiếu hụt...</td>
                              </tr>
                            )
                          : shortageRows.length === 0
                            ? (
                                <tr>
                                  <td colSpan={7} className="po-empty-row">Không có dữ liệu phù hợp bộ lọc hiện tại.</td>
                                </tr>
                              )
                            : shortageRows.map((row) => (
                          <tr key={row.id}>
                            <td><Checkbox checked={false} onChange={() => undefined} aria-label={`Chọn ${row.code}`} /></td>
                            <td className="shortage-code">{row.code}</td>
                            <td>{row.materialName}</td>
                            <td>{formatQuantity(row.stockCurrent)} {row.unit}</td>
                            <td>{formatQuantity(row.stockMin)} {row.unit}</td>
                            <td className={row.status === 'stable' ? '' : 'shortage-negative'}>
                              {row.stockShort > 0 ? `-${formatQuantity(row.stockShort)} ${row.unit}` : '-'}
                            </td>
                            <td>
                              <span className={`shortage-status-badge ${row.status}`}>
                                {row.status === 'critical' ? 'Nguy cấp' : row.status === 'warning' ? 'Cảnh báo' : 'Ổn định'}
                              </span>
                            </td>
                          </tr>
                              ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="shortage-table-footer">
                    <p>Hiển thị {shortageRangeStart}-{shortageRangeEnd} trên {shortageTotal} kết quả</p>
                    <div>
                      <Button
                        type="button"
                        disabled={shortageSafePage === 1 || shortageLoading}
                        onClick={() => setShortagePage((prev) => Math.max(1, prev - 1))}
                        label="Trước"
                        text
                      />
                      {Array.from({ length: shortageTotalPages }, (_, index) => index + 1).map((pageNumber) => (
                        <Button
                          type="button"
                          key={pageNumber}
                          className={pageNumber === shortageSafePage ? 'active' : ''}
                          onClick={() => setShortagePage(pageNumber)}
                          disabled={shortageLoading}
                          label={String(pageNumber)}
                          text
                        />
                      ))}
                      <Button
                        type="button"
                        disabled={shortageSafePage === shortageTotalPages || shortageLoading}
                        onClick={() => setShortagePage((prev) => Math.min(shortageTotalPages, prev + 1))}
                        label="Sau"
                        text
                      />
                    </div>
                  </div>
                </section>
              </div>

              <aside className="purchase-shortage-right">
                <h3>Soạn nhanh yêu cầu mua hàng (PO)</h3>

                <label>
                  Nhà cung cấp dự kiến
                  <InputText
                    value={quickSupplier}
                    onChange={(event) => setQuickSupplier(event.target.value)}
                    placeholder="Tìm nhà cung cấp..."
                  />
                </label>

                <div className="quick-po-inline-fields">
                  <label>
                    Ngày cần hàng
                    <Calendar
                      value={quickNeedDate}
                      onChange={(event) => setQuickNeedDate(event.value ?? null)}
                      dateFormat="dd/mm/yy"
                      showIcon
                    />
                  </label>
                  <label>
                    Loại yêu cầu
                    <Dropdown
                      value={quickRequestType}
                      onChange={(event) => setQuickRequestType((event.value as 'normal' | 'urgent' | null) ?? null)}
                      options={[
                        { label: 'Thông thường', value: 'normal' },
                        { label: 'Khẩn cấp', value: 'urgent' },
                      ]}
                      placeholder="Chọn loại"
                    />
                  </label>
                </div>

                <div className="quick-po-selected-list">
                  <p>Nguyên liệu đã chọn (03)</p>
                  <article>
                    <strong>MAT-GLY-01</strong>
                    <span>Glycerin 99.5% USP</span>
                    <small>SL cần: 350 kg</small>
                  </article>
                  <article>
                    <strong>MAT-VIT-E</strong>
                    <span>Vitamin E Acetate</span>
                    <small>SL cần: 15 lit</small>
                  </article>
                  <article>
                    <strong>MAT-XAN-02</strong>
                    <span>Xanthan Gum</span>
                    <small>SL cần: 5 kg</small>
                  </article>
                </div>

                <label>
                  Ghi chú nội bộ
                  <InputTextarea
                    rows={4}
                    value={quickNote}
                    onChange={(event) => setQuickNote(event.target.value)}
                    placeholder="Lưu ý cho bộ phận thu mua..."
                  />
                </label>

                <Button
                  type="button"
                  className="btn btn-primary"
                  label="Vào chi tiết phiếu PO"
                  onClick={() => setActiveView('detail')}
                />
                <Button type="button" className="btn btn-ghost quick-save-btn" label="Lưu dự thảo mua hàng" />
              </aside>
            </section>
          )
        : (
            <section className="po-page-shell">
      <div className="po-title-row">
        <div>
          <h2>Danh sách Phiếu PO</h2>
          <p>Quản lý và theo dõi các đơn đặt hàng với nhà cung cấp.</p>
        </div>
        <Button
          type="button"
          className="btn btn-primary po-create-btn"
          icon="pi pi-plus"
          label="Tạo phiếu PO mới"
          onClick={() => setActiveView('detail')}
        />
      </div>

      <div className="po-stats-grid">
        <article className="po-stat-card">
          <span className="po-stat-icon tone-primary">
            <i className="pi pi-file" />
          </span>
          <div>
            <p>Tổng số PO</p>
            <strong>{String(stats.total).padStart(2, '0')}</strong>
          </div>
        </article>
        <article className="po-stat-card">
          <span className="po-stat-icon tone-muted">
            <i className="pi pi-pencil" />
          </span>
          <div>
            <p>Bản nháp</p>
            <strong>{String(stats.draft).padStart(2, '0')}</strong>
          </div>
        </article>
        <article className="po-stat-card">
          <span className="po-stat-icon tone-info">
            <i className="pi pi-send" />
          </span>
          <div>
            <p>Đã gửi</p>
            <strong>{String(stats.sent).padStart(2, '0')}</strong>
          </div>
        </article>
      </div>

      <section className="po-table-card">
        <div className="po-toolbar">
          <label className="po-filter-control">
            <i className="pi pi-filter" aria-hidden />
            <Dropdown
              value={statusFilter}
              options={PO_STATUS_OPTIONS}
              optionLabel="label"
              optionValue="value"
              onChange={(event) => setStatusFilter(event.value as 'all' | PoStatus)}
            />
            <i className="pi pi-angle-down" aria-hidden />
          </label>

          <label className="po-filter-control">
            <Dropdown
              value={supplierFilter}
              options={supplierOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(event) => setSupplierFilter(event.value as string)}
            />
            <i className="pi pi-angle-down" aria-hidden />
          </label>

          <div className="po-filter-control po-date-filter">
            <i className="pi pi-calendar" aria-hidden />
            <Calendar
              value={parseDateValue(fromDate)}
              onChange={(event) => setFromDate(formatDateValue(event.value ?? null))}
              dateFormat="dd/mm/yy"
              showIcon
              aria-label="Từ ngày"
            />
            <span>-</span>
            <Calendar
              value={parseDateValue(toDate)}
              onChange={(event) => setToDate(formatDateValue(event.value ?? null))}
              dateFormat="dd/mm/yy"
              showIcon
              aria-label="Đến ngày"
            />
          </div>

          <Button type="button" className="po-download-btn" icon="pi pi-download" aria-label="Xuất danh sách PO" />
        </div>

        <div className="po-table-wrap">
          <table className="po-table">
            <thead>
              <tr>
                <th>
                  <Checkbox
                    checked={allVisibleSelected}
                    onChange={(event) => handleToggleVisibleRows(Boolean(event.checked))}
                    aria-label="Chọn tất cả PO hiển thị"
                  />
                </th>
                <th>Mã PO</th>
                <th>Ngày tạo</th>
                <th>Nhà cung cấp</th>
                <th>Số dòng</th>
                <th>Giá trị (đ)</th>
                <th>Trạng thái</th>
                <th>Người tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0
                ? (
                    <tr>
                      <td colSpan={9} className="po-empty-row">Không có dữ liệu phù hợp bộ lọc hiện tại.</td>
                    </tr>
                  )
                : visibleRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Checkbox
                          checked={selectedIds.includes(row.id)}
                          onChange={(event) => handleToggleRow(row.id, Boolean(event.checked))}
                          aria-label={`Chọn ${row.code}`}
                        />
                      </td>
                      <td className="po-code-cell">
                        <Button type="button" text label={row.code} />
                      </td>
                      <td>{row.createdAt}</td>
                      <td>{row.supplier}</td>
                      <td>{row.lineCount}</td>
                      <td className="po-value-cell">{formatCurrency(row.totalValue)}</td>
                      <td>
                        <span className={`po-status-badge ${row.status}`}>{STATUS_LABELS[row.status]}</span>
                      </td>
                      <td>{row.creator}</td>
                      <td className="po-actions-cell">
                        <Button type="button" className="po-icon-btn" icon="pi pi-eye" text aria-label={`Xem ${row.code}`} />
                        <Button type="button" className="po-icon-btn" icon="pi pi-pencil" text aria-label={`Sửa ${row.code}`} />
                        <Button type="button" className="po-icon-btn" icon="pi pi-ellipsis-v" text aria-label={`Thêm thao tác cho ${row.code}`} />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        <div className="po-footer-row">
          <p>Hiển thị {rangeStart}-{rangeEnd} trên {filteredRows.length} kết quả</p>
          <div className="po-pagination">
            <Button
              type="button"
              text
              label="Trước"
              disabled={safePage === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            />
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <Button
                type="button"
                key={pageNumber}
                className={pageNumber === safePage ? 'active' : ''}
                onClick={() => setPage(pageNumber)}
                text
                label={String(pageNumber)}
              />
            ))}
            <Button
              type="button"
              text
              label="Sau"
              disabled={safePage === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            />
          </div>
        </div>
      </section>
            </section>
          )}
    </section>
  )
}