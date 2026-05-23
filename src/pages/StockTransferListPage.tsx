import { useEffect, useState, useRef } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Toast } from 'primereact/toast'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Dropdown } from 'primereact/dropdown'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Tag } from 'primereact/tag'
import {
  fetchStockTransfers,
  type StockTransfer,
} from '../lib/stockTransferApi'
import { fetchWarehouseLocations, type WarehouseLocation } from '../lib/warehouseApi'
import './StockTransferListPage.css'

type OutletContext = { search: string }

export function StockTransferListPage() {
  const { search } = useOutletContext<OutletContext>()
  const navigate = useNavigate()
  const toastRef = useRef<Toast>(null)

  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [totalTransfers, setTotalTransfers] = useState(0)
  const [loading, setLoading] = useState(false)

  const [locations, setLocations] = useState<WarehouseLocation[]>([])
  const [fromWarehouseId, setFromWarehouseId] = useState<string>('')
  const [toWarehouseId, setToWarehouseId] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [dateRange, setDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  const statusOptions = [
    { label: 'Tất cả trạng thái', value: '' },
    { label: 'Nháp', value: 'draft' },
    { label: 'Đã xác nhận', value: 'confirmed' },
    { label: 'Đang vận chuyển', value: 'in_transit' },
    { label: 'Đã nhận', value: 'received' },
    { label: 'Đã hủy', value: 'cancelled' },
  ]

  // Load locations
  useEffect(() => {
    fetchWarehouseLocations()
      .then(setLocations)
      .catch(() => setLocations([]))
  }, [])

  // Load transfers
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const data = await fetchStockTransfers(currentPage, pageSize, {
          search,
          fromWarehouseId: fromWarehouseId || undefined,
          toWarehouseId: toWarehouseId || undefined,
          status: status || undefined,
          dateFrom: dateRange?.[0] ?? null,
          dateTo: dateRange?.[1] ?? null,
        })
        setTransfers(data.items)
        setTotalTransfers(data.total)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load transfers'
        toastRef.current?.show({
          severity: 'error',
          summary: 'Lỗi',
          detail: message,
          life: 3000,
        })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [search, fromWarehouseId, toWarehouseId, status, dateRange, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; severity: string } } = {
      draft: { label: 'Nháp', severity: 'warning' },
      confirmed: { label: 'Đã xác nhận', severity: 'info' },
      in_transit: { label: 'Đang vận chuyển', severity: 'info' },
      received: { label: 'Đã nhận', severity: 'success' },
      cancelled: { label: 'Đã hủy', severity: 'danger' },
    }
    const config = statusMap[status] || { label: status, severity: 'secondary' }
    return <Tag value={config.label} severity={config.severity as any} />
  }

  const handleNewTransfer = () => {
    navigate('/stock-transfer/new')
  }

  const handleRowSelect = (transferId: string) => {
    navigate(`/stock-transfer/${transferId}`)
  }

  return (
    <div className="stock-transfer-list-page">
      <Toast ref={toastRef} position="bottom-right" />

      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Chuyển kho nội bộ</h1>
          <p>Quản lý các phiếu chuyển kho giữa các kho nội bộ.</p>
        </div>
        <div className="header-actions">
          <Button
            icon="pi pi-plus"
            label="Tạo phiếu chuyển"
            className="p-button-primary"
            onClick={handleNewTransfer}
          />
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-item">
          <label>Kho nguồn</label>
          <Dropdown
            value={fromWarehouseId}
            options={[{ label: 'Tất cả kho', value: '' }, ...locations.map(l => ({ label: `${l.code} – ${l.name}`, value: l.id }))]}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => {
              setFromWarehouseId(e.value)
              setCurrentPage(1)
            }}
            placeholder="Chọn kho nguồn"
          />
        </div>

        <div className="filter-item">
          <label>Kho đích</label>
          <Dropdown
            value={toWarehouseId}
            options={[{ label: 'Tất cả kho', value: '' }, ...locations.map(l => ({ label: `${l.code} – ${l.name}`, value: l.id }))]}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => {
              setToWarehouseId(e.value)
              setCurrentPage(1)
            }}
            placeholder="Chọn kho đích"
          />
        </div>

        <div className="filter-item">
          <label>Trạng thái</label>
          <Dropdown
            value={status}
            options={statusOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => {
              setStatus(e.value)
              setCurrentPage(1)
            }}
            placeholder="Chọn trạng thái"
          />
        </div>

        <div className="filter-item">
          <label>Ngày lập</label>
          <Calendar
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.value as [Date | null, Date | null] | null)
              setCurrentPage(1)
            }}
            selectionMode="range"
            readOnlyInput
            placeholder="Từ ngày - Đến ngày"
            dateFormat="dd/mm/yy"
            showButtonBar
          />
        </div>

        <div className="filter-item">
          <Button
            icon="pi pi-times"
            className="p-button-text p-button-danger"
            tooltip="Xóa bộ lọc"
            onClick={() => {
              setFromWarehouseId('')
              setToWarehouseId('')
              setStatus('')
              setDateRange(null)
              setCurrentPage(1)
            }}
          />
        </div>
      </div>

      {/* Transfers Table */}
      <div className="transfers-table">
        <DataTable
          value={transfers}
          loading={loading}
          paginator
          rows={pageSize}
          totalRecords={totalTransfers}
          first={(currentPage - 1) * pageSize}
          onPage={(e) => setCurrentPage(Math.floor((e.first ?? 0) / pageSize) + 1)}
          rowsPerPageOptions={[10, 20, 50]}
          onRowClick={(e) => handleRowSelect(e.data.id)}
          selectionMode="single"
          dataKey="id"
          responsiveLayout="scroll"
          emptyMessage="Không có dữ liệu"
          className="p-datatable-striped"
        >
          <Column field="transferNumber" header="Số phiếu" style={{ width: '120px' }} />
          <Column
            field="fromWarehouseName"
            header="Kho nguồn"
            body={(row: StockTransfer) => `${row.fromWarehouseCode} – ${row.fromWarehouseName}`}
            style={{ width: '150px' }}
          />
          <Column
            field="toWarehouseName"
            header="Kho đích"
            body={(row: StockTransfer) => `${row.toWarehouseCode} – ${row.toWarehouseName}`}
            style={{ width: '150px' }}
          />
          <Column field="createdBy" header="Người lập" style={{ width: '120px' }} />
          <Column
            field="createdAt"
            header="Ngày lập"
            body={(row: StockTransfer) => new Date(row.createdAt).toLocaleDateString('vi-VN')}
            style={{ width: '100px' }}
          />
          <Column field="expectedRecipient" header="Người nhận dự kiến" style={{ width: '150px' }} />
          <Column
            field="status"
            header="Trạng thái"
            body={(row: StockTransfer) => getStatusBadge(row.status)}
            style={{ width: '120px' }}
          />
        </DataTable>
      </div>
    </div>
  )
}
