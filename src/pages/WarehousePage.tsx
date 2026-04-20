import { useEffect, useState, useRef } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Toast } from 'primereact/toast'
import { Calendar } from 'primereact/calendar'
import ExcelJS from 'exceljs'
import { InventorySummaryCards } from '../components/warehouse/InventorySummaryCards'
import { InventoryTable } from '../components/warehouse/InventoryTable'
import {
  fetchWarehouseData,
  type FilterOptions,
  type InventorySummary,
  type InventoryItem,
} from '../lib/warehouseApi'
import './WarehousePage.css'

type OutletContext = { search: string }

export function WarehousePage() {
  useOutletContext<OutletContext>()
  const navigate = useNavigate()
  const toastRef = useRef<Toast>(null)

  // State management
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(false)

  // Filter and pagination state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOption, setFilterOption] = useState<FilterOptions>('all')
  const [dateRange, setDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Load summary + items in a single combined request
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const dateFrom = dateRange?.[0] ?? null
        const dateTo = dateRange?.[1] ?? null
        const data = await fetchWarehouseData(filterOption, searchQuery, currentPage, pageSize, dateFrom, dateTo)
        setSummary(data.summary)
        setItems(data.items)
        setTotalItems(data.total)
      } catch (error) {
        setSummary({ totalMaterials: 0, nearExpirationCount: 0, lowStockCount: 0, totalInventoryValue: 0 })
        const message = error instanceof Error ? error.message : 'Failed to load inventory'
        toastRef.current?.show({ severity: 'error', summary: 'Lỗi', detail: message, life: 3000 })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [filterOption, searchQuery, currentPage, pageSize, dateRange])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1) // Reset to first page on search
  }

  const handleFilterChange = (filter: FilterOptions) => {
    setFilterOption(filter)
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
      // Fetch all pages for export (limit 9999)
      const data = await fetchWarehouseData(filterOption, searchQuery, 1, 9999, dateFrom, dateTo)
      const allItems: InventoryItem[] = data.items

      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Tồn kho')

      sheet.columns = [
        { header: 'Mã NVL',         key: 'code',            width: 16 },
        { header: 'INCI Name',      key: 'inciName',        width: 30 },
        { header: 'Tên nguyên liệu',key: 'tradeName',       width: 36 },
        { header: 'ĐVT',            key: 'unit',            width: 8  },
        { header: 'Đầu kỳ',         key: 'openingQuantity', width: 14 },
        { header: 'Nhập kỳ',        key: 'importQuantity',  width: 14 },
        { header: 'Xuất kỳ',        key: 'exportQuantity',  width: 14 },
        { header: 'Tồn kho',        key: 'stockQuantity',   width: 14 },
        { header: 'Giá trị (đ)',    key: 'value',           width: 18 },
      ]

      // Header style
      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true }
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

      for (const item of allItems) {
        sheet.addRow({
          code:            item.code,
          inciName:        item.inciName,
          tradeName:       item.tradeName,
          unit:            item.unit,
          openingQuantity: item.openingQuantity,
          importQuantity:  item.importQuantity,
          exportQuantity:  item.exportQuantity,
          stockQuantity:   item.stockQuantity,
          value:           item.value,
        })
      }

      // Right-align numeric columns
      for (const colKey of ['openingQuantity','importQuantity','exportQuantity','stockQuantity','value']) {
        sheet.getColumn(colKey).alignment = { horizontal: 'right' }
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const dateStr = new Date().toISOString().split('T')[0]
      link.download = `ton-kho-${dateStr}.xlsx`
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
      toastRef.current?.show({
        severity: 'error',
        summary: 'Lỗi',
        detail: message,
        life: 3000,
      })
    }
  }

  const handleNewEntry = () => {
    // TODO: Implement new entry modal/form
    toastRef.current?.show({
      severity: 'info',
      summary: 'Thông báo',
      detail: 'Chức năng sẽ được triển khai sớm',
      life: 3000,
    })
  }

  return (
    <div className="warehouse-page">
      <Toast ref={toastRef} position="bottom-right" />

      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Danh sách Tồn kho (FEFO)</h1>
          <p>Quản lý nguyên liệu theo nguyên tắc Hết hạn trước - Xuất trước.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            <i className="pi pi-download"></i>
            Xuất Excel
          </button>
          <button className="btn btn-primary" onClick={handleNewEntry}>
            <i className="pi pi-plus"></i>
            Nhập kho mới
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <InventorySummaryCards summary={summary} loading={loading} />

      {/* Filter and Search Section */}
      <div className="filter-section">
        <div className="search-bar">
          <i className="pi pi-search search-icon-left"></i>
          <input
            type="text"
            placeholder="Lọc nhanh theo MÃ NVL hoặc INCI Name..."
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

        <div className="filter-divider"></div>

        <div className="filter-segment">
          <button
            className={`filter-seg-btn${filterOption === 'all' ? ' active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            Tất cả
          </button>
          <button
            className={`filter-seg-btn${filterOption === 'expiring_soon' ? ' active' : ''}`}
            onClick={() => handleFilterChange('expiring_soon')}
          >
            Sắp hết hạn
          </button>
          <button
            className={`filter-seg-btn${filterOption === 'low_stock' ? ' active' : ''}`}
            onClick={() => handleFilterChange('low_stock')}
          >
            Tồn thấp
          </button>
        </div>

        <button className="filter-settings-btn" title="Lọc nâng cao">
          <i className="pi pi-sliders-h"></i>
        </button>
      </div>

      {/* Inventory Table */}
      <InventoryTable
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
        onItemClick={(id) => navigate(`/warehouse/${id}`)}
      />

    </div>
  )
}
