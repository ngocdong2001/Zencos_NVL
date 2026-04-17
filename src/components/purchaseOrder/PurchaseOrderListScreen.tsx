import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { PagedTableFooter } from '../layout/PagedTableFooter'
import { formatCurrency, formatDateValue, parseDateValue } from './format'
import { PO_PAGE_SIZE_OPTIONS, PO_STATUS_OPTIONS, STATUS_LABELS } from './types'
import type { PoStatus, PurchaseOrderRow } from './types'

type Props = {
  stats: { total: number; draft: number; submitted: number }
  onCreateNewPo: () => void
  statusFilter: 'all' | PoStatus
  onStatusFilterChange: (value: 'all' | PoStatus) => void
  supplierFilter: string
  onSupplierFilterChange: (value: string) => void
  poSupplierOptions: Array<{ label: string; value: string }>
  fromDate: string
  onFromDateChange: (value: string) => void
  toDate: string
  onToDateChange: (value: string) => void
  poError: string | null
  visibleRows: PurchaseOrderRow[]
  selectedPoRows: PurchaseOrderRow[]
  allVisibleSelected: boolean
  onPoSelectionChange: (rows: PurchaseOrderRow[]) => void
  onToggleVisibleRows: (checked: boolean) => void
  poLoading: boolean
  onEditPo: (row: PurchaseOrderRow) => void
  onOpenInboundDrilldown: (row: PurchaseOrderRow) => void
  onQuickViewPo: (row: PurchaseOrderRow) => void
  onDeletePo: (row: PurchaseOrderRow) => void
  rangeStart: number
  rangeEnd: number
  totalFilteredRows: number
  safePage: number
  totalPages: number
  poPageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function PurchaseOrderListScreen({
  stats,
  onCreateNewPo,
  statusFilter,
  onStatusFilterChange,
  supplierFilter,
  onSupplierFilterChange,
  poSupplierOptions,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  poError,
  visibleRows,
  selectedPoRows,
  allVisibleSelected,
  onPoSelectionChange,
  onToggleVisibleRows,
  poLoading,
  onEditPo,
  onOpenInboundDrilldown,
  onQuickViewPo,
  onDeletePo,
  rangeStart,
  rangeEnd,
  totalFilteredRows,
  safePage,
  totalPages,
  poPageSize,
  onPageChange,
  onPageSizeChange,
}: Props) {
  return (
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
          onClick={onCreateNewPo}
        />
      </div>
      
      <div className="po-stats-grid" style={{ display: 'none' }}>
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
            <strong>{String(stats.submitted).padStart(2, '0')}</strong>
          </div>
        </article>
      </div>
      
      <section className="po-table-card">
        <div className="app-table-toolbar po-toolbar">
          <label className="app-filter-control po-filter-control">
            <i className="pi pi-filter" aria-hidden />
            <Dropdown
              value={statusFilter}
              options={PO_STATUS_OPTIONS}
              optionLabel="label"
              optionValue="value"
              onChange={(event) => onStatusFilterChange(event.value as 'all' | PoStatus)}
            />
            <i className="pi pi-angle-down" aria-hidden />
          </label>

          <label className="app-filter-control po-filter-control">
            <Dropdown
              value={supplierFilter}
              options={poSupplierOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(event) => onSupplierFilterChange(event.value as string)}
            />
            <i className="pi pi-angle-down" aria-hidden />
          </label>

          <div className="app-filter-control app-date-control po-filter-control po-date-control">
            <i className="pi pi-calendar" aria-hidden />
            <span>Từ ngày</span>
            <Calendar
              value={parseDateValue(fromDate)}
              onChange={(event) => onFromDateChange(formatDateValue(event.value ?? null))}
              dateFormat="dd/mm/yy"
              showIcon
              aria-label="Từ ngày"
            />
          </div>

          <div className="app-filter-control app-date-control po-filter-control po-date-control">
            <i className="pi pi-calendar" aria-hidden />
            <span>Đến ngày</span>
            <Calendar
              value={parseDateValue(toDate)}
              onChange={(event) => onToDateChange(formatDateValue(event.value ?? null))}
              dateFormat="dd/mm/yy"
              showIcon
              aria-label="Đến ngày"
            />
          </div>

          <Button type="button" className="po-download-btn" icon="pi pi-download" aria-label="Xuất danh sách PO" />
        </div>

        {poError ? <p className="po-empty-row">{poError}</p> : null}

        <div className="po-table-wrap">
          <DataTable
            value={visibleRows}
            dataKey="id"
            selectionMode="checkbox"
            selection={selectedPoRows}
            onSelectionChange={(event) => onPoSelectionChange((event.value ?? []) as PurchaseOrderRow[])}
            selectAll={allVisibleSelected}
            onSelectAllChange={(event) => onToggleVisibleRows(Boolean(event.checked))}
            stripedRows
            loading={poLoading}
            emptyMessage="Không có dữ liệu phù hợp bộ lọc hiện tại."
            className="po-table prime-catalog-table"
          >
            <Column selectionMode="multiple" style={{ width: '42px' }} />
            <Column
              field="code"
              header="Mã PO"
              sortable
              body={(row: PurchaseOrderRow) => (
                <span className="po-code-cell">
                  <Button
                    type="button"
                    text
                    label={row.code}
                    onClick={() => onEditPo(row)}
                  />
                </span>
              )}
            />
            <Column field="createdAt" header="Ngày tạo" sortable />
            <Column field="supplier" header="Nhà cung cấp" sortable />
            <Column field="lineCount" header="Số dòng" sortable />
            <Column
              field="totalValue"
              header="Giá trị (đ)"
              sortable
              body={(row: PurchaseOrderRow) => (
                <span className="po-value-cell">{formatCurrency(row.totalValue)}</span>
              )}
            />
            <Column
              field="status"
              header="Trạng thái"
              sortable
              body={(row: PurchaseOrderRow) => (
                <span className={`app-status-badge ${row.status}`}>{STATUS_LABELS[row.status]}</span>
              )}
            />
            <Column field="creator" header="Người tạo" sortable />
            <Column
              header="Thao tác"
              body={(row: PurchaseOrderRow) => (
                <span className="po-actions-cell">
                  <Button
                    type="button"
                    className="po-icon-btn"
                    icon="pi pi-sitemap"
                    text
                    aria-label={`Drill down phiếu nhập của ${row.code}`}
                    onClick={() => onOpenInboundDrilldown(row)}
                  />
                  <Button
                    type="button"
                    className="po-icon-btn"
                    icon="pi pi-eye"
                    text
                    aria-label={`Xem nhanh ${row.code}`}
                    onClick={() => onQuickViewPo(row)}
                  />
                  {row.status === 'draft' ? (
                    <Button
                      type="button"
                      className="po-icon-btn"
                      icon="pi pi-pencil"
                      text
                      aria-label={`Sửa ${row.code}`}
                      onClick={() => onEditPo(row)}
                    />
                  ) : null}
                  {row.status === 'draft' ? (
                    <Button
                      type="button"
                      className="po-icon-btn danger"
                      icon="pi pi-trash"
                      text
                      aria-label={`Xóa ${row.code}`}
                      onClick={() => onDeletePo(row)}
                    />
                  ) : null}
                </span>
              )}
            />
          </DataTable>
        </div>

        <PagedTableFooter
          rootClassName="po-footer-row"
          prefix="po"
          currentRangeStart={rangeStart}
          currentRangeEnd={rangeEnd}
          totalRows={totalFilteredRows}
          safePage={safePage}
          totalPages={totalPages}
          pageSize={poPageSize}
          pageSizeOptions={PO_PAGE_SIZE_OPTIONS}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </section>
    </section>
  )
}
