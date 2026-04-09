import { Button } from 'primereact/button'

type PaginationPrefix = 'shortage' | 'po' | 'catalog'

type PagedTableFooterProps = {
  rootClassName: string
  prefix: PaginationPrefix
  currentRangeStart: number
  currentRangeEnd: number
  totalRows: number
  safePage: number
  totalPages: number
  pageSize: number
  pageSizeOptions: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  disabled?: boolean
}

function getPageButtons(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages]
}

export function PagedTableFooter({
  rootClassName,
  prefix,
  currentRangeStart,
  currentRangeEnd,
  totalRows,
  safePage,
  totalPages,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: PagedTableFooterProps) {
  const pageButtons = getPageButtons(safePage, totalPages)

  return (
    <div className={rootClassName}>
      <p>
        Hiển thị <strong>{currentRangeStart}-{currentRangeEnd}</strong> trong tổng số{' '}
        <strong>{totalRows}</strong> bản ghi
      </p>

      <div className={`${prefix}-footer-controls`}>
        <div className={`${prefix}-pagination`}>
          <Button
            type="button"
            disabled={safePage === 1 || disabled}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            icon="pi pi-chevron-left"
            aria-label="Trang trước"
            text
          />

          {pageButtons.map((pageNumber, index) => {
            const prev = pageButtons[index - 1]
            const showEllipsis = prev !== undefined && pageNumber - prev > 1
            return (
              <div key={pageNumber} className={`${prefix}-page-item`}>
                {showEllipsis ? <span className={`${prefix}-ellipsis`}>...</span> : null}
                <Button
                  type="button"
                  className={pageNumber === safePage ? 'active' : ''}
                  onClick={() => onPageChange(pageNumber)}
                  disabled={disabled}
                  label={String(pageNumber)}
                  text
                />
              </div>
            )
          })}

          <Button
            type="button"
            disabled={safePage === totalPages || disabled}
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            icon="pi pi-chevron-right"
            aria-label="Trang sau"
            text
          />
        </div>

        <label className={`${prefix}-page-size-label`}>
          Hiển thị
          <select
            className={`${prefix}-page-size-select`}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            disabled={disabled}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          dòng/trang
        </label>
      </div>
    </div>
  )
}
