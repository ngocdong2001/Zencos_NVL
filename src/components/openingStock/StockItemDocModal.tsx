import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  deleteItemDocument,
  fetchItemDocuments,
  formatFileSize,
  getDocumentFileUrl,
  uploadItemDocument,
} from '../../lib/openingStockDocApi'
import type { OpeningStockDocType, StockItemDoc } from '../../lib/openingStockDocApi'

const DOC_TYPE_LABELS: Record<OpeningStockDocType, string> = {
  Invoice: 'Hóa đơn',
  COA: 'COA',
  MSDS: 'MSDS',
  Other: 'Khác',
}

const DOC_TYPES = Object.keys(DOC_TYPE_LABELS) as OpeningStockDocType[]

type PendingEntry = { file: File; docType: OpeningStockDocType }

type Props = {
  itemId: string
  itemLabel: string
  onClose: () => void
  onHasDocChanged: (itemId: string, hasDoc: boolean) => void
}

export function StockItemDocModal({ itemId, itemLabel, onClose, onHasDocChanged }: Props) {
  const [docs, setDocs] = useState<StockItemDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingEntry[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchItemDocuments(itemId)
      .then((data) => { if (!cancelled) setDocs(data) })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được danh sách chứng từ.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [itemId])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setPending((prev) => {
      const existingNames = new Set(prev.map((p) => p.file.name))
      const newEntries = files
        .filter((f) => !existingNames.has(f.name))
        .map((f): PendingEntry => ({ file: f, docType: 'Invoice' }))
      return [...prev, ...newEntries]
    })
    e.target.value = ''
  }

  const handleChangeDocType = (index: number, docType: OpeningStockDocType) => {
    setPending((prev) => prev.map((entry, i) => i === index ? { ...entry, docType } : entry))
  }

  const handleRemovePending = (index: number) => {
    setPending((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (pending.length === 0) return
    setUploading(true)
    setError(null)
    setUploadProgress({ done: 0, total: pending.length })
    const uploaded: StockItemDoc[] = []
    const failed: string[] = []
    for (let i = 0; i < pending.length; i++) {
      const { file, docType } = pending[i]
      try {
        const newDoc = await uploadItemDocument(itemId, file, docType)
        uploaded.push(newDoc)
      } catch (err) {
        failed.push(`${file.name}: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`)
      }
      setUploadProgress({ done: i + 1, total: pending.length })
    }
    setDocs((prev) => [...prev, ...uploaded])
    setPending([])
    setUploadProgress(null)
    setUploading(false)
    if (uploaded.length > 0) onHasDocChanged(itemId, true)
    if (failed.length > 0) setError(`Upload thất bại:\n${failed.join('\n')}`)
  }

  const handleDelete = async (docId: string) => {
    setError(null)
    try {
      await deleteItemDocument(itemId, docId)
      const next = docs.filter((d) => d.id !== docId)
      setDocs(next)
      onHasDocChanged(itemId, next.length > 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại.')
    }
  }

  return (
    <div className="stock-doc-overlay" role="presentation" onClick={onClose}>
      <div
        className="stock-doc-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Chứng từ đính kèm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="stock-doc-modal-header">
          <div>
            <h3>Chứng từ đính kèm</h3>
            <p className="stock-doc-modal-sub">{itemLabel}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
            <i className="pi pi-times" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="stock-doc-error">
            <i className="pi pi-exclamation-triangle" /> {error}
          </div>
        )}

        {/* Uploaded document list */}
        <div className="stock-doc-list">
          {loading ? (
            <p className="stock-doc-empty">Đang tải...</p>
          ) : docs.length === 0 ? (
            <p className="stock-doc-empty">Chưa có chứng từ nào được đính kèm.</p>
          ) : (
            <table className="stock-doc-table">
              <thead>
                <tr>
                  <th>Loại</th>
                  <th>Tên file</th>
                  <th>Dung lượng</th>
                  <th>Ngày upload</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <span className={`doc-type-badge doc-type-${doc.docType.toLowerCase()}`}>
                        {DOC_TYPE_LABELS[doc.docType]}
                      </span>
                    </td>
                    <td className="stock-doc-name-cell">
                      <a
                        href={getDocumentFileUrl(itemId, doc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="stock-doc-link"
                        title="Mở file"
                      >
                        <i className="pi pi-file" /> {doc.originalName}
                      </a>
                    </td>
                    <td className="stock-doc-size">{formatFileSize(doc.fileSize)}</td>
                    <td className="stock-doc-date">
                      {new Date(doc.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </td>
                    <td className="stock-doc-actions">
                      <a href={getDocumentFileUrl(itemId, doc.id, true)} className="icon-btn" title="Tải xuống" download>
                        <i className="pi pi-download" />
                      </a>
                      <button type="button" className="icon-btn danger" title="Xóa" onClick={() => void handleDelete(doc.id)}>
                        <i className="pi pi-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pending files — each with inline doc type selector */}
        {pending.length > 0 && (
          <div className="stock-doc-pending-list">
            <p className="stock-doc-pending-header">Chờ upload ({pending.length} file)</p>
            {pending.map((entry, i) => (
              <div key={`${entry.file.name}-${i}`} className="stock-doc-pending-item">
                <i className="pi pi-file stock-doc-pending-icon" />
                <span className="stock-doc-pending-filename" title={entry.file.name}>
                  {entry.file.name}
                </span>
                <span className="stock-doc-size">{formatFileSize(entry.file.size)}</span>
                <div className="stock-doc-type-pills">
                  {DOC_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`doc-type-pill${entry.docType === type ? ' active' : ''} doc-type-${type.toLowerCase()}`}
                      onClick={() => handleChangeDocType(i, type)}
                      disabled={uploading}
                    >
                      {DOC_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label="Bỏ file này"
                  disabled={uploading}
                  onClick={() => handleRemovePending(i)}
                >
                  <i className="pi pi-times" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload toolbar */}
        <div className="stock-doc-upload">
          <button
            type="button"
            className="btn btn-ghost compact"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <i className="pi pi-folder-open" /> Chọn file...
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden-input"
            accept="application/pdf,image/jpeg,image/png,image/webp,.xlsx,.xls"
            onChange={handleFileChange}
          />

          <button
            type="button"
            className="btn btn-primary compact"
            onClick={() => void handleUpload()}
            disabled={pending.length === 0 || uploading}
          >
            {uploading && uploadProgress ? (
              <><i className="pi pi-spin pi-spinner" /> {uploadProgress.done}/{uploadProgress.total} file...</>
            ) : (
              <><i className="pi pi-upload" /> Upload{pending.length > 0 ? ` (${pending.length})` : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


