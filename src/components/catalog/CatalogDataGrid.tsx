import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react'
import type { BasicRow, MaterialRow, TabId } from './types'

const NEW_ID = '__new__'

type MatDraft = Omit<MaterialRow, 'id'>
type BasicDraft = Omit<BasicRow, 'id'>

const emptyMat: MatDraft = { code: '', inciName: '', materialName: '', category: '', unit: '', status: 'Active' }
const emptyBasic: BasicDraft = { code: '', name: '', note: '', status: 'Active' }

export interface CatalogDataGridHandle {
  focusNewRow: () => void
}

type Props = {
  activeTab: TabId
  selectedIds: string[]
  allVisibleSelected: boolean
  pagedMaterials: MaterialRow[]
  pagedBasics: BasicRow[]
  onToggleSelectAll: (checked: boolean) => void
  onToggleSelectRow: (id: string, checked: boolean) => void
  onSaveMaterial: (row: MaterialRow) => void
  onSaveBasic: (row: BasicRow) => void
  onDelete: (id: string) => void
  nextMatCode: string
  nextBasicCode: string
}

export const CatalogDataGrid = forwardRef<CatalogDataGridHandle, Props>(
  function CatalogDataGrid(
    { activeTab, selectedIds, allVisibleSelected, pagedMaterials, pagedBasics,
      onToggleSelectAll, onToggleSelectRow, onSaveMaterial, onSaveBasic, onDelete,
      nextMatCode, nextBasicCode },
    ref,
  ) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [matDraft, setMatDraft] = useState<MatDraft>({ ...emptyMat })
    const [basicDraft, setBasicDraft] = useState<BasicDraft>({ ...emptyBasic })
    const firstEditRef = useRef<HTMLInputElement>(null)

    // Cancel any edit when tab changes
    useEffect(() => {
      setEditingId(null)
      setMatDraft({ ...emptyMat })
      setBasicDraft({ ...emptyBasic })
    }, [activeTab])

    // Auto-focus first input when edit starts
    useEffect(() => {
      if (editingId) setTimeout(() => firstEditRef.current?.focus(), 0)
    }, [editingId])

    useImperativeHandle(ref, () => ({
      focusNewRow() {
        setEditingId(NEW_ID)
        setMatDraft({ ...emptyMat, code: nextMatCode })
        setBasicDraft({ ...emptyBasic, code: nextBasicCode })
      },
    }))

    function activateNewRow() {
      if (editingId === NEW_ID) return
      setEditingId(NEW_ID)
      setMatDraft({ ...emptyMat, code: nextMatCode })
      setBasicDraft({ ...emptyBasic, code: nextBasicCode })
    }

    // ── Commit helpers ────────────────────────────────────────────────

    function commitMat(original: MaterialRow | null) {
      if (
        matDraft.inciName.trim() &&
        matDraft.materialName.trim() &&
        matDraft.category.trim() &&
        matDraft.unit.trim()
      ) {
        onSaveMaterial({
          id: original?.id ?? `nvl-${Date.now()}`,
          code: matDraft.code.trim() || nextMatCode,
          inciName: matDraft.inciName.trim(),
          materialName: matDraft.materialName.trim(),
          category: matDraft.category.trim(),
          unit: matDraft.unit.trim(),
          status: matDraft.status.trim() || 'Active',
        })
      }
      setEditingId(null)
      setMatDraft({ ...emptyMat })
    }

    function commitBasic(original: BasicRow | null) {
      if (basicDraft.name.trim()) {
        onSaveBasic({
          id: original?.id ?? `${activeTab}-${Date.now()}`,
          code: basicDraft.code.trim() || nextBasicCode,
          name: basicDraft.name.trim(),
          note: basicDraft.note.trim(),
          status: basicDraft.status.trim() || 'Active',
        })
      }
      setEditingId(null)
      setBasicDraft({ ...emptyBasic })
    }

    // ── Row blur (auto-save on focus-out) ─────────────────────────────

    function handleMatBlur(e: FocusEvent<HTMLTableRowElement>, rowId: string) {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
      commitMat(rowId === NEW_ID ? null : (pagedMaterials.find((r) => r.id === rowId) ?? null))
    }

    function handleBasicBlur(e: FocusEvent<HTMLTableRowElement>, rowId: string) {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
      commitBasic(rowId === NEW_ID ? null : (pagedBasics.find((r) => r.id === rowId) ?? null))
    }

    // ── Keyboard (Enter = commit, Escape = cancel) ────────────────────

    function handleMatKbd(e: KeyboardEvent<HTMLTableRowElement>, rowId: string) {
      if (e.key === 'Escape') { e.stopPropagation(); setEditingId(null); setMatDraft({ ...emptyMat }) }
      if (e.key === 'Enter' && !(e.target as HTMLElement).closest('button')) {
        e.preventDefault()
        commitMat(rowId === NEW_ID ? null : (pagedMaterials.find((r) => r.id === rowId) ?? null))
      }
    }

    function handleBasicKbd(e: KeyboardEvent<HTMLTableRowElement>, rowId: string) {
      if (e.key === 'Escape') { e.stopPropagation(); setEditingId(null); setBasicDraft({ ...emptyBasic }) }
      if (e.key === 'Enter' && !(e.target as HTMLElement).closest('button')) {
        e.preventDefault()
        commitBasic(rowId === NEW_ID ? null : (pagedBasics.find((r) => r.id === rowId) ?? null))
      }
    }

    // ── Start editing existing row on click ───────────────────────────

    function startEditMat(row: MaterialRow, e: MouseEvent) {
      if ((e.target as HTMLElement).closest('.actions, input[type="checkbox"]')) return
      setEditingId(row.id)
      setMatDraft({ code: row.code, inciName: row.inciName, materialName: row.materialName,
        category: row.category, unit: row.unit, status: row.status })
    }

    function startEditBasic(row: BasicRow, e: MouseEvent) {
      if ((e.target as HTMLElement).closest('.actions, input[type="checkbox"]')) return
      setEditingId(row.id)
      setBasicDraft({ code: row.code, name: row.name, note: row.note, status: row.status })
    }

    const isMat = activeTab === 'materials'

    // ── Render ────────────────────────────────────────────────────────
    return (
      <section className="data-grid-wrap">
        {isMat ? (
          <table className="catalog-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allVisibleSelected} onChange={(e) => onToggleSelectAll(e.target.checked)} /></th>
                <th>MÃ NVL</th>
                <th>INCI NAME</th>
                <th>Tên Nguyên liệu</th>
                <th>Phân loại</th>
                <th>Đơn vị</th>
                <th>Trạng thái</th>
                <th className="actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedMaterials.map((row, index) =>
                editingId === row.id ? (
                  // ── Editing existing material row
                  <tr key={row.id} className="editing-row"
                    onBlur={(e) => handleMatBlur(e, row.id)}
                    onKeyDown={(e) => handleMatKbd(e, row.id)}
                  >
                    <td><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={(e) => onToggleSelectRow(row.id, e.target.checked)} /></td>
                    <td><input ref={firstEditRef} value={matDraft.code} onChange={(e) => setMatDraft((d) => ({ ...d, code: e.target.value }))} /></td>
                    <td><input value={matDraft.inciName} onChange={(e) => setMatDraft((d) => ({ ...d, inciName: e.target.value }))} placeholder="INCI name *" /></td>
                    <td><input value={matDraft.materialName} onChange={(e) => setMatDraft((d) => ({ ...d, materialName: e.target.value }))} placeholder="Tên NVL *" /></td>
                    <td><input value={matDraft.category} onChange={(e) => setMatDraft((d) => ({ ...d, category: e.target.value }))} placeholder="Phân loại *" /></td>
                    <td><input value={matDraft.unit} onChange={(e) => setMatDraft((d) => ({ ...d, unit: e.target.value }))} placeholder="Đơn vị *" /></td>
                    <td><input value={matDraft.status} onChange={(e) => setMatDraft((d) => ({ ...d, status: e.target.value }))} /></td>
                    <td className="actions">
                      <button type="button" className="icon-btn" title="Hủy (Esc)" onClick={() => { setEditingId(null); setMatDraft({ ...emptyMat }) }}>✕</button>
                      <button type="button" className="icon-btn save-btn" title="Lưu (Enter)" onClick={() => commitMat(row)}>✔</button>
                    </td>
                  </tr>
                ) : (
                  // ── Display material row (click to edit)
                  <tr key={row.id} className={`data-row${index % 2 === 1 ? ' is-alt' : ''}`} onClick={(e) => startEditMat(row, e)}>
                    <td><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={(e) => onToggleSelectRow(row.id, e.target.checked)} /></td>
                    <td>{row.code}</td>
                    <td>{row.inciName}</td>
                    <td>{row.materialName}</td>
                    <td>{row.category}</td>
                    <td>{row.unit}</td>
                    <td><span className="status-pill">{row.status}</span></td>
                    <td className="actions">
                      <button type="button" className="icon-btn" onClick={() => onDelete(row.id)}>🗑</button>
                    </td>
                  </tr>
                ),
              )}

              {/* ── Access-style new row ── */}
              {editingId === NEW_ID ? (
                <tr className="editing-row new-row"
                  onBlur={(e) => handleMatBlur(e, NEW_ID)}
                  onKeyDown={(e) => handleMatKbd(e, NEW_ID)}
                >
                  <td className="new-row-marker">✎</td>
                  <td><input ref={firstEditRef} value={matDraft.code} onChange={(e) => setMatDraft((d) => ({ ...d, code: e.target.value }))} placeholder="Mã NVL..." /></td>
                  <td><input value={matDraft.inciName} onChange={(e) => setMatDraft((d) => ({ ...d, inciName: e.target.value }))} placeholder="INCI name *" /></td>
                  <td><input value={matDraft.materialName} onChange={(e) => setMatDraft((d) => ({ ...d, materialName: e.target.value }))} placeholder="Tên nguyên liệu *" /></td>
                  <td><input value={matDraft.category} onChange={(e) => setMatDraft((d) => ({ ...d, category: e.target.value }))} placeholder="Phân loại *" /></td>
                  <td><input value={matDraft.unit} onChange={(e) => setMatDraft((d) => ({ ...d, unit: e.target.value }))} placeholder="Đơn vị *" /></td>
                  <td><input value={matDraft.status} onChange={(e) => setMatDraft((d) => ({ ...d, status: e.target.value }))} placeholder="Active" /></td>
                  <td className="actions">
                    <button type="button" className="icon-btn" title="Hủy (Esc)" onClick={() => { setEditingId(null); setMatDraft({ ...emptyMat }) }}>✕</button>
                    <button type="button" className="icon-btn save-btn" title="Lưu (Enter)" onClick={() => commitMat(null)}>✔</button>
                  </td>
                </tr>
              ) : (
                <tr className="new-row" tabIndex={0} onClick={activateNewRow} onFocus={activateNewRow}>
                  <td className="new-row-marker">*</td>
                  <td colSpan={6} className="new-row-hint">Nhấp để thêm dòng mới...</td>
                  <td className="actions" />
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="catalog-table basic-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allVisibleSelected} onChange={(e) => onToggleSelectAll(e.target.checked)} /></th>
                <th>Mã</th>
                <th>Tên</th>
                <th>Ghi chú</th>
                <th>Trạng thái</th>
                <th className="actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedBasics.map((row, index) =>
                editingId === row.id ? (
                  // ── Editing existing basic row
                  <tr key={row.id} className="editing-row"
                    onBlur={(e) => handleBasicBlur(e, row.id)}
                    onKeyDown={(e) => handleBasicKbd(e, row.id)}
                  >
                    <td><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={(e) => onToggleSelectRow(row.id, e.target.checked)} /></td>
                    <td><input ref={firstEditRef} value={basicDraft.code} onChange={(e) => setBasicDraft((d) => ({ ...d, code: e.target.value }))} /></td>
                    <td><input value={basicDraft.name} onChange={(e) => setBasicDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Tên *" /></td>
                    <td><input value={basicDraft.note} onChange={(e) => setBasicDraft((d) => ({ ...d, note: e.target.value }))} /></td>
                    <td><input value={basicDraft.status} onChange={(e) => setBasicDraft((d) => ({ ...d, status: e.target.value }))} /></td>
                    <td className="actions">
                      <button type="button" className="icon-btn" title="Hủy (Esc)" onClick={() => { setEditingId(null); setBasicDraft({ ...emptyBasic }) }}>✕</button>
                      <button type="button" className="icon-btn save-btn" title="Lưu (Enter)" onClick={() => commitBasic(row)}>✔</button>
                    </td>
                  </tr>
                ) : (
                  // ── Display basic row (click to edit)
                  <tr key={row.id} className={`data-row${index % 2 === 1 ? ' is-alt' : ''}`} onClick={(e) => startEditBasic(row, e)}>
                    <td><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={(e) => onToggleSelectRow(row.id, e.target.checked)} /></td>
                    <td>{row.code}</td>
                    <td>{row.name}</td>
                    <td>{row.note}</td>
                    <td><span className="status-pill">{row.status}</span></td>
                    <td className="actions">
                      <button type="button" className="icon-btn" onClick={() => onDelete(row.id)}>🗑</button>
                    </td>
                  </tr>
                ),
              )}

              {/* ── Access-style new row ── */}
              {editingId === NEW_ID ? (
                <tr className="editing-row new-row"
                  onBlur={(e) => handleBasicBlur(e, NEW_ID)}
                  onKeyDown={(e) => handleBasicKbd(e, NEW_ID)}
                >
                  <td className="new-row-marker">✎</td>
                  <td><input ref={firstEditRef} value={basicDraft.code} onChange={(e) => setBasicDraft((d) => ({ ...d, code: e.target.value }))} placeholder="Mã..." /></td>
                  <td><input value={basicDraft.name} onChange={(e) => setBasicDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Tên *" /></td>
                  <td><input value={basicDraft.note} onChange={(e) => setBasicDraft((d) => ({ ...d, note: e.target.value }))} /></td>
                  <td><input value={basicDraft.status} onChange={(e) => setBasicDraft((d) => ({ ...d, status: e.target.value }))} placeholder="Active" /></td>
                  <td className="actions">
                    <button type="button" className="icon-btn" title="Hủy (Esc)" onClick={() => { setEditingId(null); setBasicDraft({ ...emptyBasic }) }}>✕</button>
                    <button type="button" className="icon-btn save-btn" title="Lưu (Enter)" onClick={() => commitBasic(null)}>✔</button>
                  </td>
                </tr>
              ) : (
                <tr className="new-row" tabIndex={0} onClick={activateNewRow} onFocus={activateNewRow}>
                  <td className="new-row-marker">*</td>
                  <td colSpan={4} className="new-row-hint">Nhấp để thêm dòng mới...</td>
                  <td className="actions" />
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    )
  },
)
