import { useState, useRef, useMemo } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import type { FgInventoryItem, FgLotDetail } from '../../lib/fgWarehouseApi'
import { fetchFgProductLots } from '../../lib/fgWarehouseApi'
import { formatQuantity } from '../purchaseOrder/format'
import { PagedTableFooter } from '../layout/PagedTableFooter'
import '../../components/warehouse/InventoryTable.css'

type Props = {
  items: FgInventoryItem[]
  total: number
  loading: boolean
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onItemClick?: (id: string) => void
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function LotStatusBadge({ lot }: { lot: FgLotDetail }) {
  const daysUntilExpiry = lot.expiryDate
    ? Math.ceil((new Date(lot.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  if (lot.status === 'near_expiration') {
    return (
      <span className="lot-badge lot-badge--near">
        <i className="pi pi-exclamation-triangle"></i>
        {`Cận hạn (${daysUntilExpiry} ngày)`}
      </span>
    )
  }
  if (lot.status === 'monitoring') {
    return (
      <span className="lot-badge lot-badge--monitor">
        <i className="pi pi-info-circle"></i>
        {`Theo dõi (${daysUntilExpiry} ngày)`}
      </span>
    )
  }
  return (
    <span className="lot-badge lot-badge--normal">
      <i className="pi pi-check-circle"></i>
      Bình thường
    </span>
  )
}

type DisplayItem = FgInventoryItem & { _isExpanded: boolean; _lotsLoaded: boolean }

export function FgInventoryTable({
  items,
  total,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onItemClick,
}: Props) {
  const [expandedRows, setExpandedRows] = useState<FgInventoryItem[]>([])
  const [lotsCache, setLotsCache] = useState<Record<string, FgLotDetail[]>>({})
  const abortRefs = useRef<Record<string, AbortController>>({})

  const displayItems = useMemo<DisplayItem[]>(
    () => items.map((item) => ({
      ...item,
      _isExpanded: expandedRows.some((r) => r.id === item.id),
      _lotsLoaded: item.id in lotsCache,
    })),
    [items, expandedRows, lotsCache],
  )

  async function handleToggle(item: FgInventoryItem) {
    const isExpanded = expandedRows.some((r) => r.id === item.id)
    if (isExpanded) {
      abortRefs.current[item.id]?.abort()
      delete abortRefs.current[item.id]
      setExpandedRows((prev) => prev.filter((r) => r.id !== item.id))
      return
    }
    setExpandedRows((prev) => [...prev, item])
    if (!(item.id in lotsCache)) {
      const controller = new AbortController()
      abortRefs.current[item.id] = controller
      try {
        const lots = await fetchFgProductLots(item.id, controller.signal)
        setLotsCache((prev) => ({ ...prev, [item.id]: lots }))
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setLotsCache((prev) => ({ ...prev, [item.id]: [] }))
        }
      } finally {
        delete abortRefs.current[item.id]
      }
    }
  }

  function actionsBodyTemplate(rowData: DisplayItem) {
    const { _isExpanded: expanded, _lotsLoaded: lotsLoaded } = rowData
    const isLoadingLots = expanded && !lotsLoaded
    return (
      <div className="actions-col-body">
        <button
          className={`expand-toggle-btn${expanded ? ' expanded' : ''}`}
          onClick={() => handleToggle(rowData)}
          title={expanded ? 'Thu gọn' : 'Xem chi tiết lô hàng'}
        >
          <i className={`pi ${isLoadingLots ? 'pi-spin pi-spinner' : expanded ? 'pi-chevron-down' : 'pi-chevron-right'}`}></i>
        </button>
      </div>
    )
  }

  function rowExpansionTemplate(data: FgInventoryItem) {
    const lots = lotsCache[data.id]
    const isLoadingLots = !(data.id in lotsCache)
    return (
      <div className="lot-details-panel">
        <div className="lot-details-title">
          <i className="pi pi-th-large"></i>
          <span>CHI TIẾT LÔ HÀNG (FEFO)</span>
        </div>
        <table className="lot-inner-table">
          <thead>
            <tr>
              <th>LOT NO</th>
              <th>LỆNH SẢN XUẤT</th>
              <th>HẠN SỬ DỤNG</th>
              <th>NGÀY NHẬP KHO</th>
              <th className="lot-col-right">TỒN KHO</th>
              <th>TRẠNG THÁI</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingLots && (
              <tr>
                <td colSpan={6} className="lot-empty">
                  <i className="pi pi-spin pi-spinner" style={{ marginRight: 6 }}></i>
                  Đang tải...
                </td>
              </tr>
            )}
            {!isLoadingLots && lots && lots.map((lot) => (
              <tr key={lot.id}>
                <td className="lot-no">{lot.lotNo}</td>
                <td>{lot.orderRef ?? <span className="lot-empty-cell">—</span>}</td>
                <td>{formatDate(lot.expiryDate)}</td>
                <td>{formatDate(lot.receivedAt)}</td>
                <td className="lot-col-right">
                  <strong>{formatQuantity(lot.quantityBase)}</strong>
                </td>
                <td>
                  <LotStatusBadge lot={lot} />
                </td>
              </tr>
            ))}
            {!isLoadingLots && lots && lots.length === 0 && (
              <tr>
                <td colSpan={6} className="lot-empty">Chưa có lô hàng nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  function outputTypeLabel(type: string) {
    return type === 'finished' ? 'Thành phẩm' : 'Bán thành phẩm'
  }

  return (
    <div className="warehouse-table-card">
      <div className="warehouse-table-wrap">
        <DataTable
          value={displayItems}
          loading={loading}
          expandedRows={expandedRows}
          onRowToggle={() => { /* controlled via expand button */ }}
          rowExpansionTemplate={rowExpansionTemplate}
          dataKey="id"
          className="prime-catalog-table inventory-datatable"
          emptyMessage="Không có dữ liệu thành phẩm"
        >
          <Column
            header={<div className="actions-col-header">THAO TÁC</div>}
            body={actionsBodyTemplate}
            style={{ width: '84px' }}
            className="col-actions"
          />
          <Column
            field="code"
            header="MÃ TP"
            style={{ width: '140px' }}
            body={(row: FgInventoryItem) => (
              onItemClick ? (
                <button
                  className="material-code-link"
                  onClick={() => onItemClick(row.id)}
                  title={`Xem chi tiết: ${row.code}`}
                >
                  {row.code}
                </button>
              ) : (
                <span className="material-code">{row.code}</span>
              )
            )}
          />
          <Column
            field="name"
            header="TÊN THÀNH PHẨM"
            body={(row: FgInventoryItem) => (
              onItemClick ? (
                <button
                  className="trade-name-link"
                  onClick={() => onItemClick(row.id)}
                  title={`Xem chi tiết: ${row.name}`}
                >
                  {row.name}
                </button>
              ) : (
                <span className="trade-name">{row.name}</span>
              )
            )}
          />
          <Column
            field="outputType"
            header="LOẠI"
            style={{ width: '130px' }}
            body={(row: FgInventoryItem) => (
              <span className="unit-value">{outputTypeLabel(row.outputType)}</span>
            )}
          />
          <Column
            field="unit"
            header="ĐVT"
            body={(row: FgInventoryItem) => <span className="unit-value">{row.unit}</span>}
            style={{ width: '70px' }}
          />
          <Column
            field="openingQuantity"
            header={
              <div className="qty-col-header">
                <span>ĐẦU KỲ</span>
                <i className="pi pi-info-circle qty-info-icon" title="Tồn đầu kỳ"></i>
              </div>
            }
            body={(row: FgInventoryItem) => (
              <span className="qty-value">{formatQuantity(row.openingQuantity)}</span>
            )}
            style={{ width: '120px' }}
            className="cell-number"
          />
          <Column
            field="importQuantity"
            header={
              <div className="qty-col-header">
                <span>SL NHẬP</span>
                <i className="pi pi-info-circle qty-info-icon" title="Nhập từ sản xuất"></i>
              </div>
            }
            body={(row: FgInventoryItem) => (
              <span className="qty-value">{formatQuantity(row.importQuantity)}</span>
            )}
            style={{ width: '120px' }}
            className="cell-number"
          />
          <Column
            field="exportQuantity"
            header={
              <div className="qty-col-header">
                <span>SL XUẤT</span>
                <i className="pi pi-info-circle qty-info-icon" title="Xuất bán thành phẩm"></i>
              </div>
            }
            body={(row: FgInventoryItem) => (
              <span className="qty-value">{formatQuantity(row.exportQuantity)}</span>
            )}
            style={{ width: '120px' }}
            className="cell-number"
          />
          <Column
            field="stockQuantity"
            header="TỒN CUỐI KỲ"
            body={(row: FgInventoryItem) => (
              <span className="qty-value">{formatQuantity(row.stockQuantity)}</span>
            )}
            style={{ width: '120px' }}
            className="cell-number"
          />
        </DataTable>
      </div>

      <PagedTableFooter
        rootClassName="warehouse-footer-row"
        prefix="warehouse"
        currentRangeStart={total === 0 ? 0 : (page - 1) * pageSize + 1}
        currentRangeEnd={Math.min(page * pageSize, total)}
        totalRows={total}
        safePage={page}
        totalPages={Math.max(1, Math.ceil(total / pageSize))}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={onPageChange}
        onPageSizeChange={(size) => { onPageSizeChange(size) }}
        disabled={loading}
      />
    </div>
  )
}
