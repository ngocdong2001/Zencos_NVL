import { useEffect, useMemo, useState } from 'react'
import { Button } from 'primereact/button'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import type { PurchaseRequestInboundDrilldownResponse } from '../../lib/purchaseShortageApi'
import { formatQuantity } from './format'

type Props = {
  data: PurchaseRequestInboundDrilldownResponse
  onOpenReceipt: (receiptId: string, receiptRef: string) => void | Promise<void>
  title?: string
  showHeader?: boolean
  compact?: boolean
  showLegend?: boolean
  allowOpenReceipt?: boolean
  activeReceiptId?: string | null
}

type ReceiptDetailNode = {
  receiptId: string
  receiptRef: string
  isSuperseded: boolean
  createdAt: string
  lotNo: string
  quantityBase: number
  quantityDisplay: number
  unitUsed: string
}

export function PurchaseOrderLineSummarySection({
  data,
  onOpenReceipt,
  title = 'Tổng hợp theo dòng PO',
  showHeader = true,
  compact = false,
  showLegend = true,
  allowOpenReceipt = true,
  activeReceiptId = null,
}: Props) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [drillSearch, setDrillSearch] = useState('')

  const receiptDetailsByPoItemId = useMemo(() => {
    const nextMap = new Map<string, ReceiptDetailNode[]>()

    for (const receipt of data.receipts) {
      for (const item of receipt.items) {
        if (!item.purchaseRequestItemId) continue
        const current = nextMap.get(item.purchaseRequestItemId) ?? []
        current.push({
          receiptId: receipt.id,
          receiptRef: receipt.receiptRef,
          isSuperseded: !!receipt.adjustedByReceipt,
          createdAt: receipt.createdAt,
          lotNo: item.lotNo,
          quantityBase: item.quantityBase,
          quantityDisplay: item.quantityDisplay,
          unitUsed: item.unitUsed,
        })
        nextMap.set(item.purchaseRequestItemId, current)
      }
    }

    return nextMap
  }, [data])

  const poDrillNodes = useMemo(() => {
    const keyword = drillSearch.trim().toLowerCase()

    const nodes = data.poItems.map((poItem) => {
      const details = (receiptDetailsByPoItemId.get(poItem.id) ?? [])
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

      const progressRatio = poItem.quantityNeededBase > 0
        ? Math.min(1, Math.max(0, poItem.receivedQtyBase / poItem.quantityNeededBase))
        : 0
      const progressPercent = Math.round(progressRatio * 100)
      const statusLabel = progressPercent >= 100 ? 'Hoàn tất' : (progressPercent > 0 ? 'Một phần' : 'Chưa nhận')

      return {
        id: poItem.id,
        poItem,
        details,
        progressPercent,
        statusLabel,
      }
    })

    if (!keyword) return nodes

    return nodes.filter((node) => {
      const detailMatch = node.details.some((detail) =>
        detail.receiptRef.toLowerCase().includes(keyword)
        || detail.lotNo.toLowerCase().includes(keyword),
      )

      return node.poItem.product.code.toLowerCase().includes(keyword)
        || node.poItem.product.name.toLowerCase().includes(keyword)
        || detailMatch
    })
  }, [data, drillSearch, receiptDetailsByPoItemId])

  useEffect(() => {
    const next: Record<string, boolean> = {}
    for (const node of poDrillNodes) next[node.id] = true
    setExpandedRows(next)
  }, [data.id])

  return (
    <section className="purchase-detail-card po-drilldown-card">
      {showHeader ? <h3><i className="pi pi-list" aria-hidden /> {title}</h3> : null}
      <div className={`po-drilldown-toolbar${compact ? ' compact' : ''}`}>
        <div className="po-drilldown-toolbar-left">
          <div className="po-drilldown-toolbar-actions">
            <Button
              type="button"
              label="Mở rộng hết"
              className="p-button-text p-button-sm"
              onClick={() => {
                const next: Record<string, boolean> = {}
                for (const node of poDrillNodes) next[node.id] = true
                setExpandedRows(next)
              }}
            />
            <Button
              type="button"
              label="Thu gọn hết"
              className="p-button-text p-button-sm"
              onClick={() => setExpandedRows({})}
            />
          </div>
          <IconField iconPosition="left" className="po-drilldown-search">
            <InputIcon className="pi pi-search" />
            <InputText
              value={drillSearch}
              onChange={(event) => setDrillSearch(event.target.value)}
              placeholder="Tìm SKU, LOT..."
            />
          </IconField>
        </div>

        {showLegend ? (
          <div className="po-drilldown-toolbar-right">
            <span className="po-drilldown-legend"><i className="pi pi-minus" /> LUỒNG NHẬP HÀNG</span>
            <span className="po-drilldown-legend"><i className="pi pi-circle-fill" /> ĐIỂM NEO (NODE)</span>
          </div>
        ) : null}
      </div>

      <div className="po-drilldown-flow">
        {poDrillNodes.length === 0 ? <p className="purchase-side-note">Không có dòng phù hợp bộ lọc.</p> : null}

        {poDrillNodes.map((node) => {
          const isExpanded = Boolean(expandedRows[node.id])
          const progressWidth = `${node.progressPercent}%`

          return (
            <div key={node.id} className={`po-drill-node${isExpanded ? ' expanded' : ''}`}>
              <div className={`po-drill-node-card${isExpanded ? ' active' : ''}`}>
                <div className="po-drill-node-icon" aria-hidden>
                  <i className="pi pi-box" />
                </div>

                <div className="po-drill-node-main">
                  <div className="po-drill-node-title-row">
                    <strong>{node.poItem.product.code}</strong>
                    <span className={`po-drill-node-chip ${node.statusLabel === 'Hoàn tất' ? 'done' : node.statusLabel === 'Một phần' ? 'partial' : 'none'}`}>{node.statusLabel}</span>
                  </div>
                  <p>{node.poItem.product.name}</p>
                </div>

                <div className="po-drill-node-progress-wrap">
                  <div className="po-drill-node-progress-head">
                    <span>
                      Đã nhận / Kế hoạch: <br />
                      <strong>
                        {formatQuantity(node.poItem.receivedQtyDisplay)} / {formatQuantity(node.poItem.quantityDisplay)} {node.poItem.unitDisplay}
                      </strong>
                    </span>
                  
                    <strong className="po-drill-node-progress-percent">{node.progressPercent}%</strong>
                  </div>
                  <div className="po-drill-node-progress-track">
                    <div className="po-drill-node-progress-bar" style={{ width: progressWidth }} />
                  </div>
                </div>

                <button
                  type="button"
                  className="po-drill-node-toggle"
                  onClick={() => setExpandedRows((prev) => ({ ...prev, [node.id]: !isExpanded }))}
                  aria-label={isExpanded ? 'Thu gọn chi tiết nhận hàng' : 'Mở rộng chi tiết nhận hàng'}
                >
                  <i className={`pi ${isExpanded ? 'pi-chevron-down' : 'pi-chevron-right'}`} />
                </button>
              </div>

              {isExpanded ? (
                <div className="po-drill-branch-list">
                  {node.details.length === 0 ? <p className="purchase-side-note">Chưa có phiếu nhập phát sinh.</p> : null}

                  {node.details.map((detail) => (
                    <div
                      key={`${detail.receiptId}-${detail.lotNo}-${detail.createdAt}`}
                      className={`po-drill-branch-item${activeReceiptId === detail.receiptId ? ' is-active-receipt' : ''}`}
                    >
                      <div className="po-drill-branch-col main">
                        <span>PHIẾU / LOT</span>
                        <div className="po-drill-branch-receipt-line">
                          <button
                            type="button"
                            className="inbound-code-btn"
                            onClick={() => {
                              if (!allowOpenReceipt) return
                              void onOpenReceipt(detail.receiptId, detail.receiptRef)
                            }}
                            disabled={!allowOpenReceipt}
                          >
                            {detail.receiptRef}
                          </button>
                        </div>
                        <div className="po-drill-branch-lot-line">
                          <strong>{detail.lotNo}</strong>
                          {detail.isSuperseded ? <span className="inbound-status-badge cancelled">Đã điều chỉnh</span> : null}
                        </div>
                      </div>

                      <div className="po-drill-branch-col quantity">
                        <span>SỐ LƯỢNG</span>
                        <strong>{formatQuantity(detail.quantityDisplay)} {detail.unitUsed}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
