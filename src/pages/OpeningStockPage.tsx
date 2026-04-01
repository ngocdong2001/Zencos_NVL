import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { containsInsensitive, downloadTextFile, toCsvRow } from '../components/catalog/utils'

type OutletContext = { search: string }

type OpeningStockRow = {
  id: string
  code: string
  tradeName: string
  inciName: string
  lot: string
  quantityGram: number
  unitPricePerKg: number
  expiryDate: string
  hasCertificate: boolean
}

type DraftRow = {
  code: string
  tradeName: string
  inciName: string
  lot: string
  quantityGram: string
  unitPricePerKg: string
  expiryDate: string
}

const initialRows: OpeningStockRow[] = [
  {
    id: 'raw-gly-01',
    code: 'RAW-GLY-01',
    tradeName: 'Glycerin 99.5% USP',
    inciName: 'Glycerin',
    lot: 'GLY240101',
    quantityGram: 2500,
    unitPricePerKg: 48000,
    expiryDate: '2028-12-30',
    hasCertificate: true,
  },
  {
    id: 'raw-alc-05',
    code: 'RAW-ALC-05',
    tradeName: 'Ethanol Thực Phẩm 96%',
    inciName: 'Alcohol Denat.',
    lot: 'ALC-00923',
    quantityGram: 15000,
    unitPricePerKg: 31500,
    expiryDate: '2025-06-15',
    hasCertificate: false,
  },
  {
    id: 'oil-es-lav',
    code: 'OIL-ES-LAV',
    tradeName: 'Tinh dầu Oải hương Pháp',
    inciName: 'Lavandula Angustifolia Oil',
    lot: 'LAV-2024-X',
    quantityGram: 120,
    unitPricePerKg: 1250000,
    expiryDate: '2027-02-10',
    hasCertificate: true,
  },
  {
    id: 'col-pig-red',
    code: 'COL-PIG-RED',
    tradeName: 'Bột màu đỏ Cosmetic',
    inciName: 'CI 15850',
    lot: 'RED-B-441',
    quantityGram: 50,
    unitPricePerKg: 850000,
    expiryDate: '2028-08-20',
    hasCertificate: false,
  },
  {
    id: 'pac-boi-250',
    code: 'PAC-BOI-250',
    tradeName: 'Chai Nhựa PET 250ml',
    inciName: 'PET Resin',
    lot: 'B-250-2024',
    quantityGram: 5000,
    unitPricePerKg: 4200,
    expiryDate: '2030-01-01',
    hasCertificate: false,
  },
]

const emptyDraft: DraftRow = {
  code: '',
  tradeName: '',
  inciName: '',
  lot: '',
  quantityGram: '',
  unitPricePerKg: '',
  expiryDate: '',
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value)
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

export function OpeningStockPage() {
  const { search } = useOutletContext<OutletContext>()
  const [rows, setRows] = useState<OpeningStockRow[]>(initialRows)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState<DraftRow>(emptyDraft)
  const [notice, setNotice] = useState<string | null>(null)
  const [noticeTone, setNoticeTone] = useState<'success' | 'error'>('success')
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const pageSize = 5

  const filteredRows = useMemo(() => {
    const q = search.trim()
    return rows.filter((row) => {
      if (!q) return true
      const searchable = [
        row.code,
        row.tradeName,
        row.inciName,
        row.lot,
        row.expiryDate,
        String(row.quantityGram),
        String(row.unitPricePerKg),
      ].join(' ')
      return containsInsensitive(searchable, q)
    })
  }, [rows, search])

  const totalRows = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.min(page, totalPages)

  const pageButtons = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages = new Set([1, totalPages])
    for (let i = Math.max(1, safePage - 1); i <= Math.min(totalPages, safePage + 1); i += 1) {
      pages.add(i)
    }
    return [...pages].sort((a, b) => a - b)
  }, [safePage, totalPages])

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, safePage])

  const visibleIds = useMemo(() => pagedRows.map((row) => row.id), [pagedRows])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

  const currentRangeStart = totalRows === 0 ? 0 : (safePage - 1) * pageSize + 1
  const currentRangeEnd = Math.min(totalRows, safePage * pageSize)

  const clearNotice = () => setNotice(null)

  const showNotice = (message: string, tone: 'success' | 'error') => {
    setNotice(message)
    setNoticeTone(tone)
  }

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])])
      return
    }

    setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
  }

  const handleToggleRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev
        return [...prev, id]
      }
      return prev.filter((item) => item !== id)
    })
  }

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id))
    setSelectedIds((prev) => prev.filter((item) => item !== id))
  }

  const handleExportAll = () => {
    const header = [
      'MA NVL',
      'TEN THUONG MAI',
      'TEN INCI',
      'SO LO',
      'SL (GRAM)',
      'DON GIA/KG',
      'HAN SD',
      'CHUNG TU',
    ]

    const body = rows.map((row) => [
      row.code,
      row.tradeName,
      row.inciName,
      row.lot,
      String(row.quantityGram),
      String(row.unitPricePerKg),
      row.expiryDate,
      row.hasCertificate ? 'CO' : 'KHONG',
    ])

    const csv = [toCsvRow(header), ...body.map((line) => toCsvRow(line))].join('\n')
    downloadTextFile(csv, 'khai-bao-ton-kho-dau-ky.csv', 'text/csv;charset=utf-8;')
  }

  const handleDownloadTemplate = () => {
    const template = [
      'MA NVL,TEN THUONG MAI,TEN INCI,SO LO,SL (GRAM),DON GIA/KG,HAN SD,CHUNG TU',
      'RAW-NEW-001,Ten thuong mai,INCI Name,LOT-001,1000,25000,2028-12-31,CO',
    ].join('\n')

    downloadTextFile(template, 'mau-khai-bao-ton-kho-dau-ky.csv', 'text/csv;charset=utf-8;')
  }

  const handleOpenUpload = () => {
    uploadInputRef.current?.click()
  }

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    showNotice(`Đã nhận file ${file.name}. Chức năng import chi tiết sẽ được kết nối API ở bước tiếp theo.`, 'success')
    event.target.value = ''
  }

  const handleDraftChange = (key: keyof DraftRow, value: string) => {
    clearNotice()
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleAddRow = () => {
    const code = normalizeCode(draft.code)
    const tradeName = draft.tradeName.trim()
    const inciName = draft.inciName.trim()

    if (!code || !tradeName || !inciName) {
      showNotice('Cần nhập đầy đủ Mã NVL, Tên thương mại và Tên INCI.', 'error')
      return
    }

    const duplicated = rows.some((row) => row.code === code)
    if (duplicated) {
      showNotice('Mã NVL đã tồn tại trong danh sách.', 'error')
      return
    }

    const quantityGram = Number.parseFloat(draft.quantityGram || '0')
    const unitPricePerKg = Number.parseFloat(draft.unitPricePerKg || '0')

    if (!Number.isFinite(quantityGram) || quantityGram < 0 || !Number.isFinite(unitPricePerKg) || unitPricePerKg < 0) {
      showNotice('SL (GRAM) và Đơn giá/Kg phải là số hợp lệ >= 0.', 'error')
      return
    }

    const newRow: OpeningStockRow = {
      id: `${code}-${Date.now()}`,
      code,
      tradeName,
      inciName,
      lot: draft.lot.trim(),
      quantityGram,
      unitPricePerKg,
      expiryDate: draft.expiryDate || '',
      hasCertificate: false,
    }

    setRows((prev) => [...prev, newRow])
    setDraft(emptyDraft)
    showNotice('Đã thêm dòng tồn kho đầu kỳ mới.', 'success')

    const nextTotalRows = totalRows + 1
    setPage(Math.max(1, Math.ceil(nextTotalRows / pageSize)))
  }

  return (
    <div className="catalog-page-shell opening-stock-shell">
      <section className="title-bar">
        <div>
          <h2>Khai báo tồn kho đầu kỳ</h2>
          <p>Quản trị dữ liệu gốc cho toàn bộ hệ thống ZencosMS.</p>
        </div>
        <div className="title-actions">
          <button type="button" className="btn btn-ghost" onClick={handleExportAll}>
            <i className="pi pi-download" /> Xuất Tất Cả (Excel)
          </button>
          <button type="button" className="btn btn-primary" onClick={handleOpenUpload}>
            <i className="pi pi-upload" /> Tải lên dữ liệu (Excel)
          </button>
          <input
            ref={uploadInputRef}
            className="hidden-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleUploadChange}
          />
        </div>
      </section>

      <section className="mapping-card opening-stock-mapping-card">
        <div className="mapping-icon"><i className="pi pi-file-excel" /></div>
        <div className="mapping-content">
          <strong>Quy tắc Mapping Excel (Bắt buộc)</strong>
          <p>
            Hệ thống tự động nhận diện dữ liệu dựa trên tiêu đề cột. Đảm bảo file Excel của bạn chứa các cột chính xác sau:
            <span> MÃ NVL</span>
            <span> TÊN THƯƠNG MẠI</span>
            <span> TÊN INCI</span>
            <span> SỐ LÔ</span>
            <span> SL (GRAM)</span>
            <span> ĐƠN GIÁ/KG</span>
            <span> HẠN SD</span>
          </p>
        </div>
        <button type="button" className="btn btn-ghost compact" onClick={handleDownloadTemplate}>
          <i className="pi pi-download" /> Tải mẫu Excel
        </button>
      </section>

      {notice && (
        <section className={`catalog-inline-notice ${noticeTone}`}>
          <span>{notice}</span>
          <button type="button" className="catalog-inline-notice-close" onClick={clearNotice} aria-label="Đóng thông báo">
            x
          </button>
        </section>
      )}

      <section className="catalog-page-table">
        <div className="data-grid-wrap opening-stock-grid-wrap">
          <table className="catalog-table opening-stock-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(event) => handleToggleSelectAll(event.target.checked)}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <th>MA NVL</th>
                <th>TEN THUONG MAI</th>
                <th>TEN INCI *</th>
                <th>SO LO (LOT)</th>
                <th className="opening-stock-number-col">SL (GRAM)</th>
                <th className="opening-stock-number-col">DON GIA/KG</th>
                <th>HAN SD</th>
                <th className="opening-stock-center-col">CHUNG TU</th>
                <th className="actions">THAO TAC</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={(event) => handleToggleRow(row.id, event.target.checked)}
                      aria-label={`Chọn dòng ${row.code}`}
                    />
                  </td>
                  <td className="opening-stock-code">{row.code}</td>
                  <td>{row.tradeName}</td>
                  <td className="opening-stock-inci">{row.inciName}</td>
                  <td>{row.lot}</td>
                  <td className="opening-stock-number-col">{formatNumber(row.quantityGram)}</td>
                  <td className="opening-stock-number-col">{formatNumber(row.unitPricePerKg)}</td>
                  <td>
                    {row.expiryDate ? <span className="status-pill">{row.expiryDate}</span> : '---'}
                  </td>
                  <td className="opening-stock-center-col">
                    <button
                      type="button"
                      className={`icon-btn${row.hasCertificate ? ' is-linked' : ''}`}
                      aria-label="Đính kèm chứng từ"
                    >
                      <i className="pi pi-paperclip" />
                    </button>
                  </td>
                  <td className="actions">
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Xóa dòng ${row.code}`}
                      onClick={() => handleDeleteRow(row.id)}
                    >
                      <i className="pi pi-trash" />
                    </button>
                  </td>
                </tr>
              ))}

              <tr className="opening-stock-add-row">
                <td className="new-row-marker">+</td>
                <td>
                  <input
                    value={draft.code}
                    onChange={(event) => handleDraftChange('code', event.target.value)}
                    placeholder="Mã NVL"
                    aria-label="Mã NVL"
                  />
                </td>
                <td>
                  <input
                    value={draft.tradeName}
                    onChange={(event) => handleDraftChange('tradeName', event.target.value)}
                    placeholder="Tên hàng"
                    aria-label="Tên thương mại"
                  />
                </td>
                <td>
                  <input
                    value={draft.inciName}
                    onChange={(event) => handleDraftChange('inciName', event.target.value)}
                    placeholder="Tên INCI"
                    aria-label="Tên INCI"
                  />
                </td>
                <td>
                  <input
                    value={draft.lot}
                    onChange={(event) => handleDraftChange('lot', event.target.value)}
                    placeholder="Số lô"
                    aria-label="Số lô"
                  />
                </td>
                <td>
                  <input
                    value={draft.quantityGram}
                    onChange={(event) => handleDraftChange('quantityGram', event.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                    aria-label="Số lượng gram"
                  />
                </td>
                <td>
                  <input
                    value={draft.unitPricePerKg}
                    onChange={(event) => handleDraftChange('unitPricePerKg', event.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                    aria-label="Đơn giá"
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={draft.expiryDate}
                    onChange={(event) => handleDraftChange('expiryDate', event.target.value)}
                    aria-label="Hạn sử dụng"
                  />
                </td>
                <td className="opening-stock-center-col">
                  <button type="button" className="icon-btn" aria-label="Đính kèm cho dòng mới">
                    <i className="pi pi-paperclip" />
                  </button>
                </td>
                <td className="actions">
                  <button type="button" className="btn btn-primary opening-stock-add-btn" onClick={handleAddRow}>
                    THÊM MỚI
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="opening-stock-footer">
        <p>
          Hiển thị {currentRangeStart}-{currentRangeEnd} trong tổng số {totalRows} bản ghi
        </p>

        <div className="pagination">
          <button
            type="button"
            className="page-btn"
            disabled={safePage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            aria-label="Trang trước"
          >
            <i className="pi pi-chevron-left" />
          </button>

          {pageButtons.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={`page-btn${safePage === pageNumber ? ' active' : ''}`}
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            className="page-btn"
            disabled={safePage >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            aria-label="Trang sau"
          >
            <i className="pi pi-chevron-right" />
          </button>
        </div>
      </section>
    </div>
  )
}
