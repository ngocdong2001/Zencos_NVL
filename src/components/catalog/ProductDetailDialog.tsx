import { useEffect, useState } from 'react'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { TabPanel, TabView } from 'primereact/tabview'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import type { MaterialRow } from './types'

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

type Props = {
  product: MaterialRow | null
  onHide: () => void
}

export function ProductDetailDialog({ product, onHide }: Props) {
  const visible = product !== null
  const productId = product?.id ?? ''

  const [inciNames, setInciNames] = useState<InciName[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplierRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add forms
  const [newInci, setNewInci] = useState('')
  const [newInciPrimary, setNewInciPrimary] = useState(false)
  const [newMfgName, setNewMfgName] = useState('')
  const [newMfgCountry, setNewMfgCountry] = useState('')
  const [newMfgPrimary, setNewMfgPrimary] = useState(false)
  const [newSupplierId, setNewSupplierId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!productId || !visible) return
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
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu chi tiết.')
      })
      .finally(() => setLoading(false))
  }, [productId, visible])

  async function addInciName() {
    if (!newInci.trim()) return
    setSaving(true)
    try {
      const raw = await apiJson<Record<string, unknown>>(`/api/catalog/materials/${encodeURIComponent(productId)}/inci-names`, {
        method: 'POST',
        body: JSON.stringify({ inciName: newInci.trim(), isPrimary: newInciPrimary }),
      })
      const created: InciName = {
        id: String(raw.id),
        inciName: String(raw.inci_name ?? ''),
        isPrimary: Boolean(raw.is_primary),
        notes: raw.notes != null ? String(raw.notes) : null,
      }
      setInciNames((prev) => [...prev, created])
      setNewInci('')
      setNewInciPrimary(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm INCI name.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteInciName(id: string) {
    setSaving(true)
    try {
      await apiJson<void>(`/api/catalog/materials/${encodeURIComponent(productId)}/inci-names/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setInciNames((prev) => prev.filter((n) => n.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa INCI name.')
    } finally {
      setSaving(false)
    }
  }

  async function addManufacturer() {
    if (!newMfgName.trim()) return
    setSaving(true)
    try {
      const raw = await apiJson<Record<string, unknown>>(`/api/catalog/materials/${encodeURIComponent(productId)}/manufacturers`, {
        method: 'POST',
        body: JSON.stringify({ name: newMfgName.trim(), country: newMfgCountry.trim() || undefined, isPrimary: newMfgPrimary }),
      })
      const created: Manufacturer = {
        id: String(raw.id),
        name: String(raw.name ?? ''),
        country: raw.country != null ? String(raw.country) : null,
        contactInfo: raw.contact_info != null ? String(raw.contact_info) : null,
        isPrimary: Boolean(raw.is_primary),
        notes: raw.notes != null ? String(raw.notes) : null,
      }
      setManufacturers((prev) => [...prev, created])
      setNewMfgName('')
      setNewMfgCountry('')
      setNewMfgPrimary(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm nhà sản xuất.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteManufacturer(id: string) {
    setSaving(true)
    try {
      await apiJson<void>(`/api/catalog/materials/${encodeURIComponent(productId)}/manufacturers/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setManufacturers((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa nhà sản xuất.')
    } finally {
      setSaving(false)
    }
  }

  async function addSupplier() {
    if (!newSupplierId.trim()) return
    setSaving(true)
    try {
      const raw = await apiJson<Record<string, unknown>>(`/api/catalog/materials/${encodeURIComponent(productId)}/suppliers`, {
        method: 'POST',
        body: JSON.stringify({ supplierId: newSupplierId.trim() }),
      })
      const created: ProductSupplierRow = {
        supplierId: String(raw.supplier_id),
        supplierName: String(raw.supplier_name ?? ''),
        isPrimary: Boolean(raw.is_primary),
        notes: raw.notes != null ? String(raw.notes) : null,
      }
      setProductSuppliers((prev) => [...prev, created])
      setNewSupplierId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm nhà cung cấp.')
    } finally {
      setSaving(false)
    }
  }

  async function removeSupplier(supplierId: string) {
    setSaving(true)
    try {
      await apiJson<void>(`/api/catalog/materials/${encodeURIComponent(productId)}/suppliers/${encodeURIComponent(supplierId)}`, { method: 'DELETE' })
      setProductSuppliers((prev) => prev.filter((s) => s.supplierId !== supplierId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa nhà cung cấp.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={`Chi tiết: ${product?.code ?? ''} — ${product?.materialName ?? ''}`}
      style={{ width: '680px', maxWidth: '95vw' }}
      modal
      dismissableMask
    >
      {loading ? <p>Đang tải...</p> : null}
      {error ? <p style={{ color: 'var(--red-500)' }}>{error}</p> : null}

      {!loading ? (
        <TabView>
          {/* INCI Names */}
          <TabPanel header="INCI Names">
            <DataTable value={inciNames} size="small" emptyMessage="Chưa có INCI name nào.">
              <Column field="inciName" header="INCI Name" />
              <Column field="isPrimary" header="Chính" body={(row: InciName) => row.isPrimary ? <i className="pi pi-check" /> : null} style={{ width: 60, textAlign: 'center' }} />
              <Column header="" style={{ width: 50 }} body={(row: InciName) => (
                <Button icon="pi pi-trash" text severity="danger" size="small" disabled={saving} onClick={() => void deleteInciName(row.id)} />
              )} />
            </DataTable>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <InputText
                value={newInci}
                onChange={(e) => setNewInci(e.target.value)}
                placeholder="Thêm INCI name mới"
                style={{ flex: 1, minWidth: 200 }}
                onKeyDown={(e) => { if (e.key === 'Enter') void addInciName() }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                <input type="checkbox" checked={newInciPrimary} onChange={(e) => setNewInciPrimary(e.target.checked)} />
                Chính
              </label>
              <Button label="Thêm" icon="pi pi-plus" size="small" disabled={saving || !newInci.trim()} onClick={() => void addInciName()} />
            </div>
          </TabPanel>

          {/* Manufacturers */}
          <TabPanel header="Nhà sản xuất">
            <DataTable value={manufacturers} size="small" emptyMessage="Chưa có nhà sản xuất nào.">
              <Column field="name" header="Tên NSX" />
              <Column field="country" header="Quốc gia" style={{ width: 100 }} />
              <Column field="isPrimary" header="Chính" body={(row: Manufacturer) => row.isPrimary ? <i className="pi pi-check" /> : null} style={{ width: 60, textAlign: 'center' }} />
              <Column header="" style={{ width: 50 }} body={(row: Manufacturer) => (
                <Button icon="pi pi-trash" text severity="danger" size="small" disabled={saving} onClick={() => void deleteManufacturer(row.id)} />
              )} />
            </DataTable>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <InputText
                value={newMfgName}
                onChange={(e) => setNewMfgName(e.target.value)}
                placeholder="Tên nhà sản xuất"
                style={{ flex: 2, minWidth: 180 }}
                onKeyDown={(e) => { if (e.key === 'Enter') void addManufacturer() }}
              />
              <InputText
                value={newMfgCountry}
                onChange={(e) => setNewMfgCountry(e.target.value)}
                placeholder="Quốc gia"
                style={{ flex: 1, minWidth: 100 }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                <input type="checkbox" checked={newMfgPrimary} onChange={(e) => setNewMfgPrimary(e.target.checked)} />
                Chính
              </label>
              <Button label="Thêm" icon="pi pi-plus" size="small" disabled={saving || !newMfgName.trim()} onClick={() => void addManufacturer()} />
            </div>
          </TabPanel>

          {/* Suppliers */}
          <TabPanel header="Nhà cung cấp">
            <DataTable value={productSuppliers} size="small" emptyMessage="Chưa có nhà cung cấp được chấp thuận.">
              <Column field="supplierName" header="Nhà cung cấp" />
              <Column field="isPrimary" header="Chính" body={(row: ProductSupplierRow) => row.isPrimary ? <i className="pi pi-check" /> : null} style={{ width: 60, textAlign: 'center' }} />
              <Column header="" style={{ width: 50 }} body={(row: ProductSupplierRow) => (
                <Button icon="pi pi-trash" text severity="danger" size="small" disabled={saving} onClick={() => void removeSupplier(row.supplierId)} />
              )} />
            </DataTable>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <InputText
                value={newSupplierId}
                onChange={(e) => setNewSupplierId(e.target.value)}
                placeholder="Mã hoặc ID nhà cung cấp"
                style={{ flex: 1, minWidth: 200 }}
                onKeyDown={(e) => { if (e.key === 'Enter') void addSupplier() }}
              />
              <Button label="Thêm" icon="pi pi-plus" size="small" disabled={saving || !newSupplierId.trim()} onClick={() => void addSupplier()} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-color-secondary)', marginTop: 8 }}>
              Nhập ID hoặc mã của nhà cung cấp đã có trong hệ thống.
            </p>
          </TabPanel>
        </TabView>
      ) : null}
    </Dialog>
  )
}
