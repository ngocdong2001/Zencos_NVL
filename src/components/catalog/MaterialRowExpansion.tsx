import { useEffect, useRef, useState } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { AutoComplete } from 'primereact/autocomplete'
import type { AutoCompleteCompleteEvent } from 'primereact/autocomplete'
import type { BasicRow } from './types'

const API_BASE = 'http://localhost:4000'

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try { msg = (JSON.parse(text) as { error?: string }).error ?? text } catch { /* ignore */ }
    throw new Error(msg || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

type InciName = { id: string; inciName: string; isPrimary: boolean; notes: string | null }
type Manufacturer = { id: string; name: string; country: string | null; contactInfo: string | null; isPrimary: boolean; notes: string | null }
type ProductSupplierRow = { supplierId: string; supplierName: string; isPrimary: boolean; notes: string | null }

type SupplierOption = { id: string; name: string; code: string }

type Props = { productId: string; suppliers: BasicRow[] }

export function MaterialRowExpansion({ productId, suppliers }: Props) {
  const supplierOptions: SupplierOption[] = suppliers.map((s) => ({ id: s.id, name: s.name, code: s.code }))
  const [inciNames, setInciNames] = useState<InciName[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplierRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Add form state
  const [newInci, setNewInci] = useState('')
  const [newMfgName, setNewMfgName] = useState('')
  const [newMfgCountry, setNewMfgCountry] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null)
  const [supplierSuggestions, setSupplierSuggestions] = useState<SupplierOption[]>([])
  const supplierAcRef = useRef<AutoComplete>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    apiJson<{ inciNames: InciName[]; manufacturers: Manufacturer[]; productSuppliers: ProductSupplierRow[] }>(
      `/api/catalog/materials/${encodeURIComponent(productId)}`,
    )
      .then((data) => {
        setInciNames(data.inciNames)
        setManufacturers(data.manufacturers)
        setProductSuppliers(data.productSuppliers)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu.')
      })
      .finally(() => setLoading(false))
  }, [productId])

  async function addInciName() {
    if (!newInci.trim() || saving) return
    setSaving(true)
    try {
      const raw = await apiJson<Record<string, unknown>>(
        `/api/catalog/materials/${encodeURIComponent(productId)}/inci-names`,
        { method: 'POST', body: JSON.stringify({ inciName: newInci.trim(), isPrimary: false }) },
      )
      setInciNames((prev) => [...prev, {
        id: String(raw.id),
        inciName: String(raw.inci_name ?? ''),
        isPrimary: Boolean(raw.is_primary),
        notes: raw.notes != null ? String(raw.notes) : null,
      }])
      setNewInci('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Lỗi thêm INCI name.') }
    finally { setSaving(false) }
  }

  async function deleteInciName(id: string) {
    setSaving(true)
    try {
      await apiJson<void>(`/api/catalog/materials/${encodeURIComponent(productId)}/inci-names/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setInciNames((prev) => prev.filter((n) => n.id !== id))
    } catch (err) { setError(err instanceof Error ? err.message : 'Lỗi xóa INCI name.') }
    finally { setSaving(false) }
  }

  async function addManufacturer() {
    if (!newMfgName.trim() || saving) return
    setSaving(true)
    try {
      const raw = await apiJson<Record<string, unknown>>(
        `/api/catalog/materials/${encodeURIComponent(productId)}/manufacturers`,
        { method: 'POST', body: JSON.stringify({ name: newMfgName.trim(), country: newMfgCountry.trim() || undefined, isPrimary: false }) },
      )
      setManufacturers((prev) => [...prev, {
        id: String(raw.id),
        name: String(raw.name ?? ''),
        country: raw.country != null ? String(raw.country) : null,
        contactInfo: raw.contact_info != null ? String(raw.contact_info) : null,
        isPrimary: Boolean(raw.is_primary),
        notes: raw.notes != null ? String(raw.notes) : null,
      }])
      setNewMfgName('')
      setNewMfgCountry('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Lỗi thêm nhà sản xuất.') }
    finally { setSaving(false) }
  }

  async function deleteManufacturer(id: string) {
    setSaving(true)
    try {
      await apiJson<void>(`/api/catalog/materials/${encodeURIComponent(productId)}/manufacturers/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setManufacturers((prev) => prev.filter((m) => m.id !== id))
    } catch (err) { setError(err instanceof Error ? err.message : 'Lỗi xóa nhà sản xuất.') }
    finally { setSaving(false) }
  }

  function filterSuppliers(e: AutoCompleteCompleteEvent) {
    const q = e.query.trim().toLowerCase()
    setSupplierSuggestions(
      supplierOptions.filter(
        (s) =>
          !productSuppliers.some((ps) => ps.supplierId === s.id) &&
          (s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)),
      ),
    )
  }

  async function addSupplier(option?: SupplierOption) {
    const target = option ?? selectedSupplier
    if (!target || saving) return
    setSaving(true)
    try {
      const raw = await apiJson<Record<string, unknown>>(
        `/api/catalog/materials/${encodeURIComponent(productId)}/suppliers`,
        { method: 'POST', body: JSON.stringify({ supplierId: target.id }) },
      )
      setProductSuppliers((prev) => [...prev, {
        supplierId: String(raw.supplier_id),
        supplierName: String(raw.supplier_name ?? ''),
        isPrimary: Boolean(raw.is_primary),
        notes: raw.notes != null ? String(raw.notes) : null,
      }])
      setSelectedSupplier(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Lỗi thêm nhà cung cấp.') }
    finally { setSaving(false) }
  }

  async function removeSupplier(supplierId: string) {
    setSaving(true)
    try {
      await apiJson<void>(`/api/catalog/materials/${encodeURIComponent(productId)}/suppliers/${encodeURIComponent(supplierId)}`, { method: 'DELETE' })
      setProductSuppliers((prev) => prev.filter((s) => s.supplierId !== supplierId))
    } catch (err) { setError(err instanceof Error ? err.message : 'Lỗi xóa nhà cung cấp.') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <div className="mat-expansion-loading"><i className="pi pi-spin pi-spinner" /> Đang tải...</div>
  }

  return (
    <div className="mat-expansion-root">
      {error ? <div className="mat-expansion-error">{error}</div> : null}

      <div className="mat-expansion-grid">
        {/* INCI Names */}
        <div className="mat-expansion-panel">
          <div className="mat-expansion-panel-header">
            <i className="pi pi-tag" />
            <span>INCI Names</span>
            <span className="mat-expansion-count">{inciNames.length}</span>
          </div>
          <DataTable value={inciNames} size="small" emptyMessage="Chưa có INCI name." className="mat-expansion-table">
            <Column
              field="inciName"
              header="Tên INCI"
              body={(row: InciName) => (
                <span className="mat-exp-inci-name">{row.inciName}</span>
              )}
            />
            <Column
              style={{ width: '40px', textAlign: 'center' }}
              body={(row: InciName) => (
                <button type="button" className="mat-exp-del-btn" disabled={saving} onClick={() => void deleteInciName(row.id)} title="Xóa">
                  <i className="pi pi-times" />
                </button>
              )}
            />
          </DataTable>
          <div className="mat-expansion-add-row">
            <InputText
              value={newInci}
              onChange={(e) => setNewInci(e.target.value)}
              placeholder="Thêm INCI name..."
              className="mat-exp-input"
              onKeyDown={(e) => { if (e.key === 'Enter') void addInciName() }}
            />
            <Button icon="pi pi-plus" size="small" text disabled={saving || !newInci.trim()} onClick={() => void addInciName()} title="Thêm" />
          </div>
        </div>

        {/* Manufacturers */}
        <div className="mat-expansion-panel">
          <div className="mat-expansion-panel-header">
            <i className="pi pi-building" />
            <span>Nhà sản xuất</span>
            <span className="mat-expansion-count">{manufacturers.length}</span>
          </div>
          <DataTable value={manufacturers} size="small" emptyMessage="Chưa có nhà sản xuất." className="mat-expansion-table">
            <Column
              header="Tên"
              body={(row: Manufacturer) => (
                <span className="mat-exp-inci-name">{row.name}</span>
              )}
            />
            <Column field="country" header="Quốc gia" style={{ width: '70px' }} />
            <Column
              style={{ width: '40px', textAlign: 'center' }}
              body={(row: Manufacturer) => (
                <button type="button" className="mat-exp-del-btn" disabled={saving} onClick={() => void deleteManufacturer(row.id)} title="Xóa">
                  <i className="pi pi-times" />
                </button>
              )}
            />
          </DataTable>
          <div className="mat-expansion-add-row">
            <InputText
              value={newMfgName}
              onChange={(e) => setNewMfgName(e.target.value)}
              placeholder="Tên nhà sản xuất..."
              className="mat-exp-input"
              style={{ flex: 2 }}
              onKeyDown={(e) => { if (e.key === 'Enter') void addManufacturer() }}
            />
            <InputText
              value={newMfgCountry}
              onChange={(e) => setNewMfgCountry(e.target.value)}
              placeholder="Quốc gia"
              className="mat-exp-input"
              style={{ flex: 1, minWidth: 80 }}
            />
            <Button icon="pi pi-plus" size="small" text disabled={saving || !newMfgName.trim()} onClick={() => void addManufacturer()} title="Thêm" />
          </div>
        </div>

        {/* Suppliers */}
        <div className="mat-expansion-panel">
          <div className="mat-expansion-panel-header">
            <i className="pi pi-truck" />
            <span>Nhà cung cấp</span>
            <span className="mat-expansion-count">{productSuppliers.length}</span>
          </div>
          <DataTable value={productSuppliers} size="small" emptyMessage="Chưa có nhà cung cấp." className="mat-expansion-table">
            <Column field="supplierName" header="Tên" />
            <Column
              style={{ width: '40px', textAlign: 'center' }}
              body={(row: ProductSupplierRow) => (
                <button type="button" className="mat-exp-del-btn" disabled={saving} onClick={() => void removeSupplier(row.supplierId)} title="Xóa">
                  <i className="pi pi-times" />
                </button>
              )}
            />
          </DataTable>
          <div className="mat-expansion-add-row">
            <AutoComplete
              ref={supplierAcRef}
              value={selectedSupplier}
              suggestions={supplierSuggestions}
              completeMethod={filterSuppliers}
              field="name"
              itemTemplate={(item: SupplierOption) => (
                <span><span className="mat-exp-ac-code">{item.code}</span> {item.name}</span>
              )}
              placeholder="Tìm nhà cung cấp..."
              className="mat-exp-input mat-exp-ac"
              onChange={(e) => setSelectedSupplier(e.value as SupplierOption | null)}
              onSelect={(e) => { void addSupplier(e.value as SupplierOption) }}
              disabled={saving}
              forceSelection
            />
          </div>
        </div>
      </div>
    </div>
  )
}
