import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Toast } from 'primereact/toast'
import { Calendar } from 'primereact/calendar'
import ExcelJS from 'exceljs'
import { FgInventoryTable } from '../components/fgWarehouse/FgInventoryTable'
import {
  fetchFgWarehouseData,
  type FgInventorySummary,
  type FgInventoryItem,
} from '../lib/fgWarehouseApi'
import './WarehousePage.css'
import '../components/warehouse/InventorySummaryCards.css'
import './FgWarehousePage.css'

export function FgWarehousePage() {
  const navigate = useNavigate()
  const toastRef = useRef<Toast>(null)

  const [summary, setSummary] = useState<FgInventorySummary | null>(null)
  const [items, setItems] = useState<FgInventoryItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<[Date | null, Date | null] | null>(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return [firstDay, lastDay]
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const dateFrom = dateRange?.[0] ?? null
        const dateTo = dateRange?.[1] ?? null
        const data = await fetchFgWarehouseData(searchQuery, currentPage, pageSize, dateFrom, dateTo)
        setSummary(data.summary)
        setItems(data.items)
        setTotalItems(data.total)
      } catch (error) {
        setSummary({ totalProducts: 0, nearExpirationCount: 0, totalInventoryValue: 0 })
        const message = error instanceof Error ? error.message : 'Failed to load FG inventory'
        toastRef.current?.show({ severity: 'error', summary: 'Lỗi', detail: message, life: 3000 })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [searchQuery, currentPage, pageSize, dateRange])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const handleDateRangeChange = (value: [Date | null, Date | null] | null) => {
    setDateRange(value)
    setCurrentPage(1)
  }

  const handleExport = async () => {
    try {
      const dateFrom = dateRange?.[0] ?? null
      const dateTo   = dateRange?.[1] ?? null
      const data = await fetchFgWarehouseData(searchQuery, 1, 9999, dateFrom, dateTo)
      const allItems = data.items

      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Tồn kho TP')

      sheet.columns = [
        { header: 'Mã TP',          key: 'code',            width: 16 },
        { header: 'Tên thành phẩm', key: 'name',            width: 36 },
        { header: 'Loại',           key: 'outputType',      width: 16 },
        { header: 'ĐVT',            key: 'unit',            width: 8  },
        { header: 'Đầu kỳ',         key: 'openingQuantity', width: 14 },
        { header: 'Nhập kỳ',        key: 'importQuantity',  width: 14 },
        { header: 'Xuất kỳ',        key: 'exportQuantity',  width: 14 },
        { header: 'Tồn kho',        key: 'stockQuantity',   width: 14 },
      ]

      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true }
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

      for (const item of allItems) {
        sheet.addRow({
          code:            item.code,
          name:            item.name,
          outputType:      item.outputType === 'finished' ? 'Thành phẩm' : 'Bán thành phẩm',
          unit:            item.unit,
          openingQuantity: item.openingQuantity,
          importQuantity:  item.importQuantity,
          exportQuantity:  item.exportQuantity,
          stockQuantity:   item.stockQuantity,
        })
      }

      for (const colKey of ['openingQuantity', 'importQuantity', 'exportQuantity', 'stockQuantity']) {
        sheet.getColumn(colKey).alignment = { horizontal: 'right' }
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const dateStr = new Date().toISOString().split('T')[0]
      link.download = `ton-kho-tp-${dateStr}.xlsx`
      document.body.appendChild(link)
      link.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(link)

      toastRef.current?.show({
        severity: 'success',
        summary: 'Thành công',
        detail: `Đã xuất ${allItems.length} dòng`,
        life: 3000,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi xuất Excel'
      toastRef.current?.show({ severity: 'error', summary: 'Lỗi', detail: message, life: 3000 })
    }
  }

  function pad2(n: number) { return String(n).padStart(2, '0') }

  return (
    <div className="warehouse-page fg-warehouse-page">
      <Toast ref={toastRef} position="bottom-right" />

      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Tồn kho Thành phẩm (FEFO)</h1>
          <p>Quản lý thành phẩm / bán thành phẩm theo nguyên tắc Hết hạn trước - Xuất trước.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            <i className="pi pi-download"></i>
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards-grid">
          <div className="summary-card">
            <div className="card-info">
              <div className="card-label">TỔNG THÀNH PHẨM</div>
              <div className="card-value card-value--blue">{summary.totalProducts}</div>
            </div>
            <div className="card-icon-box card-icon-box--blue">
              <i className="pi pi-box"></i>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-info">
              <div className="card-label">CẬN HẠN (&lt;60D)</div>
              <div className="card-value card-value--red">{pad2(summary.nearExpirationCount)}</div>
            </div>
            <div className="card-icon-box card-icon-box--orange">
              <i className="pi pi-exclamation-triangle"></i>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-info">
              <div className="card-label">TỔNG SẢN PHẨM</div>
              <div className="card-value card-value--teal">{totalItems}</div>
            </div>
            <div className="card-icon-box card-icon-box--teal">
              <i className="pi pi-chart-bar"></i>
            </div>
          </div>
        </div>
      )}
      {loading && !summary && (
        <div className="summary-cards-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="summary-card summary-card--skeleton">
              <div className="card-info">
                <div className="skeleton-label"></div>
                <div className="skeleton-value"></div>
              </div>
              <div className="card-icon-box card-icon-box--neutral skeleton-icon"></div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Section */}
      <div className="filter-section">
        <div className="search-bar">
          <i className="pi pi-search search-icon-left"></i>
          <input
            type="text"
            placeholder="Lọc nhanh theo Mã TP hoặc Tên thành phẩm..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        <div className="filter-divider"></div>

        <div className="date-range-picker">
          <i className="pi pi-calendar date-range-icon"></i>
          <Calendar
            value={dateRange ?? null}
            onChange={(e) => handleDateRangeChange(e.value as [Date | null, Date | null] | null)}
            selectionMode="range"
            readOnlyInput
            placeholder="Từ ngày - Đến ngày"
            dateFormat="dd/mm/yy"
            showButtonBar
            className="date-range-calendar"
            panelClassName="date-range-panel"
          />
          {dateRange?.[0] && (
            <button
              className="date-range-clear"
              onClick={() => handleDateRangeChange(null)}
              title="Xóa bộ lọc ngày"
            >
              <i className="pi pi-times"></i>
            </button>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <FgInventoryTable
        items={items}
        total={totalItems}
        loading={loading}
        page={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setCurrentPage(1)
        }}
        onItemClick={(id) => {
          const toLocalDateStr = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const params = new URLSearchParams()
          if (dateRange?.[0]) params.set('from', toLocalDateStr(dateRange[0]))
          if (dateRange?.[1]) params.set('to', toLocalDateStr(dateRange[1]))
          const qs = params.toString()
          navigate(`/fg-warehouse/${id}${qs ? `?${qs}` : ''}`)
        }}
      />
    </div>
  )
}
