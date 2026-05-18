/**
 * Export "Phiếu Yêu Cầu Xuất Nguyên Vật Liệu" (WH-SOP-006)
 *
 * Uses docxtemplater to fill `public/templates/phieu-yeu-cau-xuat-nvl.docx`.
 *
 * To update layout / branding: open the .docx file in Word, adjust
 * formatting, then save — the placeholders are preserved automatically.
 *
 * Template placeholders:
 *   {ten_nguoi_su_dung}  {so_phieu}  {ma_lenh}  {ngay}
 *   {#items}
 *     {stt}  {ten_nvl}  {ma_so}  {so_kiem_nhan}  {don_vi}
 *     {so_lo_sp}  {sl_xin_cap}  {sl_cap_phat}  {ghi_chu}
 *   {/items}
 */

import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { saveAs } from 'file-saver'
import type { ProductionOrderDetail, ProductionOrderLine } from './productionApi'
import { fetchInventoryStock } from './outboundApi'

const TEMPLATE_PATH = '/templates/phieu-yeu-cau-xuat-nvl.docx'

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDateVn(dateStr: string | null | undefined): string {
  if (!dateStr) return '---'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const day   = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year  = d.getFullYear()
  return `${day}/${month}/${year}`
}

function formatQtyVn(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '---'
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
}

function buildCurrentDateVn(): string {
  const now   = new Date()
  const day   = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year  = now.getFullYear()
  return `ngày ${day} tháng ${month} năm ${year}`
}

// ─── types ────────────────────────────────────────────────────────────────────

interface NvlRequestRow {
  stt:           string
  ten_nvl:       string
  ma_so:         string
  so_kiem_nhan:  string
  don_vi:        string
  so_lo_sp:      string
  sl_xin_cap:    string
  sl_cap_phat:   string
  ghi_chu:       string
}

interface NvlRequestTemplateData {
  ten_nguoi_su_dung: string
  so_phieu:          string
  ma_lenh:           string
  ngay:              string
  items:             NvlRequestRow[]
}

// ─── build data ───────────────────────────────────────────────────────────────

export function buildNvlRequestData(
  order: ProductionOrderDetail,
  invoiceMap: Map<string, string> = new Map(),
  /** Filter to lines whose product classification code is in this set. null/empty = all items. */
  classificationCodes: string[] | null = null,
): NvlRequestTemplateData {
  const codeSet = classificationCodes && classificationCodes.length > 0 ? new Set(classificationCodes) : null
  // Step-1 outbound lines only, optionally filtered by classification codes
  const step1Lines: ProductionOrderLine[] = (order.lines ?? []).filter((l) => {
    if (l.step !== 1 || l.direction !== 'out') return false
    if (codeSet === null) return true
    return codeSet.has(l.product?.productClassification?.code ?? '')
  })

  // Group by productId (or productCode if no id) so one row per material
  const grouped = new Map<string, ProductionOrderLine[]>()
  for (const line of step1Lines) {
    const key = line.productId ?? line.productCode
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(line)
  }

  const items: NvlRequestRow[] = []
  let idx = 1
  for (const group of grouped.values()) {
    const first      = group[0]
    const plannedQty = first.plannedQty                              // same for all rows in group
    const actualQty  = group.reduce((s, l) => s + l.actualQty, 0)  // sum allocations

    // Collect unique lot numbers → Số lô SP
    const lots = [...new Set(group.map((l) => l.lotNo).filter(Boolean))]
    const lotDisplay = lots.join(', ') || '---'

    // Collect unique invoice numbers → Số kiểm nhận
    const invoiceNos = [...new Set(
      lots.map((lo) => invoiceMap.get(`${first.productId}:${lo}`)).filter(Boolean)
    )].join(', ') || '---'

    items.push({
      stt:          String(idx++),
      ten_nvl:      first.productName || '---',
      ma_so:        first.productCode || '---',
      so_kiem_nhan: invoiceNos,
      don_vi:       first.unit || '---',
      so_lo_sp:     lotDisplay,
      sl_xin_cap:   formatQtyVn(plannedQty),
      sl_cap_phat:  actualQty > 0 ? formatQtyVn(actualQty) : '---',
      ghi_chu:      '',
    })
  }

  return {
    ten_nguoi_su_dung: order.creator?.fullName ?? '---',
    so_phieu:          order.orderRef ?? String(order.id),
    ma_lenh:           order.orderRef ?? String(order.id),
    ngay:              order.issuedAt ? formatDateVn(order.issuedAt) : buildCurrentDateVn(),
    items,
  }
}

// ─── main export function ────────────────────────────────────────────────────

export async function exportNvlRequestDoc(
  order: ProductionOrderDetail,
  /** Classification codes to filter items. null/empty = export all items. */
  classificationCodes: string[] | null = null,
  classificationName = '',
): Promise<void> {
  // Build invoiceNumber map: "productId:lotNo" → invoiceNumber
  const step1Lines = (order.lines ?? []).filter((l) => l.step === 1 && l.direction === 'out')
  const uniqueProductIds = [...new Set(step1Lines.map((l) => l.productId).filter(Boolean))] as string[]

  const invoiceMap = new Map<string, string>()
  await Promise.all(
    uniqueProductIds.map(async (productId) => {
      try {
        const batches = await fetchInventoryStock(productId)
        for (const b of batches) {
          if (b.invoiceNumber) invoiceMap.set(`${productId}:${b.lotNo}`, b.invoiceNumber)
        }
      } catch {
        // non-fatal — invoice numbers will show as '---'
      }
    }),
  )

  const response = await fetch(TEMPLATE_PATH)
  if (!response.ok) {
    throw new Error(`Không thể tải mẫu phiếu: HTTP ${response.status}`)
  }
  const templateBuffer = await response.arrayBuffer()

  const zip = new PizZip(templateBuffer)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks:    true,
  })

  doc.render(buildNvlRequestData(order, invoiceMap, classificationCodes))

  const blob = doc.getZip().generate({
    type:     'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  const safeRef = (order.orderRef ?? String(order.id)).replace(/[^A-Za-z0-9_-]/g, '_')
  const safeCls = classificationName
    ? classificationName.replace(/[^A-Za-z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_').replace(/_+/g, '_')
    : 'NVL'
  saveAs(blob, `Phieu_yeu_cau_xuat_${safeCls}_${safeRef}.docx`)
}
