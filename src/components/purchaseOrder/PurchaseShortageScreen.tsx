import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { PagedTableFooter } from '../layout/PagedTableFooter'
import { formatQuantity } from './format'
import type { PurchaseShortageRow, ShortageStatus, SupplierOption } from './types'
import { SHORTAGE_PAGE_SIZE_OPTIONS, SHORTAGE_STATUS_OPTIONS } from './types'

type Props = {
  shortageStatusFilter: 'all' | ShortageStatus
  onShortageStatusFilterChange: (value: 'all' | ShortageStatus) => void
  shortageSummary: { critical: number; warning: number; stable: number }
  shortageLastUpdatedAt: string | null
  shortageError: string | null
  shortageLoading: boolean
  shortageRows: PurchaseShortageRow[]
  selectedShortageRows: PurchaseShortageRow[]
  allShortageVisibleSelected: boolean
  onShortageSelectionChange: (rows: PurchaseShortageRow[]) => void
  onToggleShortageVisibleRows: (checked: boolean) => void
  onReloadShortage: () => void
  shortageRangeStart: number
  shortageRangeEnd: number
  shortageTotal: number
  shortageSafePage: number
  shortageTotalPages: number
  shortagePageSize: number
  onShortagePageChange: (page: number) => void
  onShortagePageSizeChange: (pageSize: number) => void
  quickSupplierId: string
  quickSupplierOptions: SupplierOption[]
  quickSupplierLoading: boolean
  quickSupplierError: string | null
  onQuickSupplierIdChange: (value: string) => void
  quickNeedDate: Date | null
  onQuickNeedDateChange: (value: Date | null) => void
  quickRequestType: 'normal' | 'urgent' | null
  onQuickRequestTypeChange: (value: 'normal' | 'urgent' | null) => void
  selectedQuickItems: PurchaseShortageRow[]
  quickItemQuantities: Record<string, string>
  quickQuantityErrors: Record<string, string>
  onQuickQuantityChange: (itemId: string, value: string) => void
  onQuickQuantityFocus: (itemId: string) => void
  onQuickQuantityBlur: (itemId: string) => void
  quickSubmitError: string | null
  quickSubmitSuccess: string | null
  quickNote: string
  onQuickNoteChange: (value: string) => void
  onEnterDetailFromQuick: () => void
  quickSaving: boolean
  onQuickSaveDraft: () => void
}

export function PurchaseShortageScreen({
  shortageStatusFilter,
  onShortageStatusFilterChange,
  shortageSummary,
  shortageLastUpdatedAt,
  shortageError,
  shortageLoading,
  shortageRows,
  selectedShortageRows,
  allShortageVisibleSelected,
  onShortageSelectionChange,
  onToggleShortageVisibleRows,
  onReloadShortage,
  shortageRangeStart,
  shortageRangeEnd,
  shortageTotal,
  shortageSafePage,
  shortageTotalPages,
  shortagePageSize,
  onShortagePageChange,
  onShortagePageSizeChange,
  quickSupplierId,
  quickSupplierOptions,
  quickSupplierLoading,
  quickSupplierError,
  onQuickSupplierIdChange,
  quickNeedDate,
  onQuickNeedDateChange,
  quickRequestType,
  onQuickRequestTypeChange,
  selectedQuickItems,
  quickItemQuantities,
  quickQuantityErrors,
  onQuickQuantityChange,
  onQuickQuantityFocus,
  onQuickQuantityBlur,
  quickSubmitError,
  quickSubmitSuccess,
  quickNote,
  onQuickNoteChange,
  onEnterDetailFromQuick,
  quickSaving,
  onQuickSaveDraft,
}: Props) {
  return (
    <section className="purchase-shortage-shell">
      <div className="purchase-shortage-left">
        <div className="purchase-shortage-title-row">
          <div>
            <h2>Yêu cầu mua hàng và Thiếu hụt</h2>
            <p>Giám sát vật tư dưới ngưỡng tồn kho an toàn và tạo đơn mua hàng.</p>
          </div>
          <div className="purchase-shortage-actions">
            <label className="po-filter-control">
              <i className="pi pi-filter" aria-hidden />
              <Dropdown
                value={shortageStatusFilter}
                options={SHORTAGE_STATUS_OPTIONS}
                onChange={(event) => onShortageStatusFilterChange(event.value as 'all' | ShortageStatus)}
                optionLabel="label"
                optionValue="value"
              />
            </label>
            <Button type="button" className="btn btn-ghost" icon="pi pi-download" label="Xuất báo cáo tồn" />
          </div>
        </div>

        <div className="purchase-shortage-stats-grid">
          <article className="shortage-stat-card tone-critical">
            <div className="shortage-stat-card-head">
              <div>
                <p>Thiếu hụt khẩn cấp</p>
                <strong>{String(shortageSummary.critical).padStart(2, '0')} mặt hàng</strong>
              </div>
              <span className="shortage-stat-icon" aria-hidden>
                <i className="pi pi-exclamation-triangle" />
              </span>
            </div>
            <span>Nguyên liệu dưới ngưỡng an toàn nghiêm trọng</span>
          </article>
          <article className="shortage-stat-card tone-draft">
            <div className="shortage-stat-card-head">
              <div>
                <p>Thiếu hụt cảnh báo</p>
                <strong>{String(shortageSummary.warning).padStart(2, '0')} mặt hàng</strong>
              </div>
              <span className="shortage-stat-icon" aria-hidden>
                <i className="pi pi-clock" />
              </span>
            </div>
            <span>Cần theo dõi và chuẩn bị kế hoạch mua</span>
          </article>
          <article className="shortage-stat-card tone-ok">
            <div className="shortage-stat-card-head">
              <div>
                <p>Ổn định tồn kho</p>
                <strong>{String(shortageSummary.stable).padStart(2, '0')} mặt hàng</strong>
              </div>
              <span className="shortage-stat-icon" aria-hidden>
                <i className="pi pi-check-circle" />
              </span>
            </div>
            <span>Đang đạt hoặc vượt định mức min</span>
          </article>
        </div>

        <section className="shortage-table-card">
          <div className="shortage-table-head">
            <h3>Danh sách nguyên vật liệu</h3>
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
                onClick={onReloadShortage}
                label="Tải lại"
              />
            </div>
          </div>

          {shortageError ? <p className="po-empty-row">{shortageError}</p> : null}

          <div className="shortage-table-wrap">
            <DataTable
              value={shortageRows}
              dataKey="id"
              selectionMode="checkbox"
              selection={selectedShortageRows}
              onSelectionChange={(event) => onShortageSelectionChange((event.value ?? []) as PurchaseShortageRow[])}
              selectAll={allShortageVisibleSelected}
              onSelectAllChange={(event) => onToggleShortageVisibleRows(Boolean(event.checked))}
              stripedRows
              loading={shortageLoading}
              emptyMessage="Không có dữ liệu phù hợp bộ lọc hiện tại."
              className="shortage-table prime-catalog-table"
            >
              <Column selectionMode="multiple" style={{ width: '42px' }} />
              <Column
                field="code"
                header="Mã NVL"
                body={(row: PurchaseShortageRow) => <span className="shortage-code">{row.code}</span>}
              />
              <Column field="materialName" header="Tên nguyên liệu" />
              <Column
                header="Tồn hiện tại"
                align="right"
                bodyClassName="shortage-number-col"
                body={(row: PurchaseShortageRow) => (
                  <span className="shortage-number-value">{`${formatQuantity(row.stockCurrent)} ${row.unit}`}</span>
                )}
              />
              <Column
                header="Định mức min"
                align="right"
                bodyClassName="shortage-number-col"
                body={(row: PurchaseShortageRow) => (
                  <span className="shortage-number-value">{`${formatQuantity(row.stockMin)} ${row.unit}`}</span>
                )}
              />
              <Column
                header="Số lượng thiếu"
                align="right"
                bodyClassName="shortage-number-col"
                body={(row: PurchaseShortageRow) => (
                  <span className={`shortage-number-value${row.status === 'stable' ? '' : ' shortage-negative'}`}>
                    {row.stockShort > 0 ? `-${formatQuantity(row.stockShort)} ${row.unit}` : '-'}
                  </span>
                )}
              />
              <Column
                header="Trạng thái"
                body={(row: PurchaseShortageRow) => (
                  <span className={`shortage-status-badge ${row.status}`}>
                    {row.status === 'critical' ? 'Nguy cấp' : row.status === 'warning' ? 'Cảnh báo' : 'Ổn định'}
                  </span>
                )}
              />
            </DataTable>
          </div>

          <PagedTableFooter
            rootClassName="shortage-table-footer"
            prefix="shortage"
            currentRangeStart={shortageRangeStart}
            currentRangeEnd={shortageRangeEnd}
            totalRows={shortageTotal}
            safePage={shortageSafePage}
            totalPages={shortageTotalPages}
            pageSize={shortagePageSize}
            pageSizeOptions={SHORTAGE_PAGE_SIZE_OPTIONS}
            onPageChange={onShortagePageChange}
            onPageSizeChange={onShortagePageSizeChange}
            disabled={shortageLoading}
          />
        </section>
      </div>

      <aside className="purchase-shortage-right">
        <h3>Soạn nhanh yêu cầu mua hàng (PO)</h3>

        <label>
          Nhà cung cấp dự kiến
          <Dropdown
            className="quick-supplier-dropdown"
            panelClassName="quick-supplier-dropdown-panel"
            appendTo="self"
            value={quickSupplierId}
            options={quickSupplierOptions}
            onChange={(event) => onQuickSupplierIdChange((event.value as string) ?? '')}
            optionLabel="label"
            optionValue="value"
            placeholder={quickSupplierLoading ? 'Đang tải nhà cung cấp...' : 'Chọn nhà cung cấp'}
            filter
            disabled={quickSupplierLoading}
          />
        </label>
        {quickSupplierError ? <p className="po-field-error">{quickSupplierError}</p> : null}

        <div className="quick-po-inline-fields">
          <label>
            Ngày cần hàng
            <Calendar
              value={quickNeedDate}
              onChange={(event) => onQuickNeedDateChange(event.value ?? null)}
              dateFormat="dd/mm/yy"
              showIcon
            />
          </label>
          <label>
            Loại yêu cầu
            <Dropdown
              value={quickRequestType}
              onChange={(event) => onQuickRequestTypeChange((event.value as 'normal' | 'urgent' | null) ?? null)}
              options={[
                { label: 'Thông thường', value: 'normal' },
                { label: 'Khẩn cấp', value: 'urgent' },
              ]}
              placeholder="Chọn loại"
            />
          </label>
        </div>

        <div className="quick-po-selected-list">
          <p>Nguyên liệu đã chọn ({String(selectedQuickItems.length).padStart(2, '0')})</p>
          {selectedQuickItems.length === 0
            ? <small>Chọn nguyên liệu từ bảng bên trái để soạn nhanh yêu cầu mua hàng.</small>
            : selectedQuickItems.map((item) => (
                <article key={item.id}>
                  <strong>{item.code}</strong>
                  <span>{item.materialName}</span>
                  <small>
                    Thiếu hụt hiện tại:{' '}
                    {item.stockShort > 0 ? `${formatQuantity(item.stockShort)} ${item.unit}` : '-'}
                  </small>
                  <label className="quick-po-item-qty">
                    Số lượng yêu cầu
                    <InputText
                      value={quickItemQuantities[item.id] ?? ''}
                      onChange={(event) => onQuickQuantityChange(item.id, event.target.value)}
                      onFocus={() => onQuickQuantityFocus(item.id)}
                      onBlur={() => onQuickQuantityBlur(item.id)}
                      inputMode="decimal"
                      placeholder="Nhập số lượng"
                    />
                    <span>{item.unit}</span>
                  </label>
                  {quickQuantityErrors[item.id] ? <small className="po-field-error">{quickQuantityErrors[item.id]}</small> : null}
                </article>
              ))}
        </div>

        {quickSubmitError ? <p className="po-field-error">{quickSubmitError}</p> : null}
        {quickSubmitSuccess ? <p className="po-field-success">{quickSubmitSuccess}</p> : null}

        <label>
          Ghi chú nội bộ
          <InputTextarea
            rows={4}
            value={quickNote}
            onChange={(event) => onQuickNoteChange(event.target.value)}
            placeholder="Lưu ý cho bộ phận thu mua..."
          />
        </label>

        <Button
          type="button"
          className="btn btn-primary"
          label="Vào chi tiết phiếu PO"
          onClick={onEnterDetailFromQuick}
        />
        <Button
          type="button"
          className="btn btn-ghost quick-save-btn"
          label={quickSaving ? 'Đang lưu...' : 'Lưu dự thảo mua hàng'}
          disabled={quickSaving}
          onClick={onQuickSaveDraft}
        />
      </aside>
    </section>
  )
}
