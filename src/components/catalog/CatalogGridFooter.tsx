type CatalogGridFooterProps = {
  currentRangeStart: number
  currentRangeEnd: number
  totalRows: number
  safePage: number
  totalPages: number
  pageButtons: number[]
  onPageChange: (page: number) => void
}

export function CatalogGridFooter({
  currentRangeStart,
  currentRangeEnd,
  totalRows,
  safePage,
  totalPages,
  pageButtons,
  onPageChange,
}: CatalogGridFooterProps) {
  return (
    <section className="grid-footer">
      <p>
        Hiển thị <strong>{currentRangeStart}-{currentRangeEnd}</strong> trong tổng số <strong>{totalRows}</strong> bản ghi
      </p>
      <div className="pagination">
        <button
          type="button"
          className="page-btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
        >
          <i className="pi pi-chevron-left" />
        </button>
        {pageButtons.map((pageNumber) => (
          <button
            key={pageNumber}
            className={`page-btn ${safePage === pageNumber ? 'active' : ''}`}
            type="button"
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
        {totalPages > 4 ? <span className="ellipsis">...</span> : null}
        <button
          type="button"
          className="page-btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
        >
          <i className="pi pi-chevron-right" />
        </button>
      </div>
    </section>
  )
}
