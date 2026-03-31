const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

type CatalogGridFooterProps = {
  currentRangeStart: number
  currentRangeEnd: number
  totalRows: number
  safePage: number
  totalPages: number
  pageButtons: number[]
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function CatalogGridFooter({
  currentRangeStart,
  currentRangeEnd,
  totalRows,
  safePage,
  totalPages,
  pageButtons,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: CatalogGridFooterProps) {
  // Insert ellipsis markers between non-consecutive page numbers
  const items: (number | 'ellipsis')[] = []
  for (let i = 0; i < pageButtons.length; i++) {
    if (i > 0 && pageButtons[i] - pageButtons[i - 1] > 1) {
      items.push('ellipsis')
    }
    items.push(pageButtons[i])
  }

  return (
    <section className="grid-footer">
      <p>
        Hiển thị <strong>{currentRangeStart}–{currentRangeEnd}</strong> trong tổng số <strong>{totalRows}</strong> bản ghi
      </p>

      <div className="pagination">
        <button
          type="button"
          className="page-btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          title="Trang trước"
        >
          <i className="pi pi-chevron-left" />
        </button>

        {items.map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`e-${idx}`} className="ellipsis">…</span>
          ) : (
            <button
              key={item}
              type="button"
              className={`page-btn${safePage === item ? ' active' : ''}`}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          className="page-btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          title="Trang sau"
        >
          <i className="pi pi-chevron-right" />
        </button>
      </div>

      <label className="page-size-label">
        Hiển thị
        <select
          className="page-size-select"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        dòng/trang
      </label>
    </section>
  )
}
