import { useRef } from 'react'

import { Dialog } from 'primereact/dialog'
import { QRCodeCanvas } from 'qrcode.react'

interface Props {
  material: { code: string; materialName: string } | null
  onHide: () => void
}

export function MaterialQrDialog({ material, onHide }: Props) {
  const canvasWrapRef = useRef<HTMLDivElement>(null)

  if (!material) return null

  function getCanvas() {
    return canvasWrapRef.current?.querySelector('canvas') ?? null
  }

  function handleDownloadPng() {
    const canvas = getCanvas()
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${material!.code}.png`
    a.click()
  }

  function handlePrint() {
    const canvas = getCanvas()
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const code = material!.code
    const name = material!.materialName
    const win = window.open('', '_blank', 'width=400,height=520')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>QR – ${code}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      background: #fff;
    }
    .label { font-size: 11px; color: #666; text-align: center; margin-bottom: 8px; max-width: 220px; word-break: break-word; }
    img { display: block; width: 220px; height: 220px; }
    .code { margin-top: 10px; font-family: monospace; font-size: 14px; letter-spacing: 0.06em; color: #111; text-align: center; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <p class="label">${name}</p>
  <img src="${dataUrl}" alt="QR ${code}" />
  <p class="code">${code}</p>
  <script>window.onload = function(){ window.print(); window.close(); }<\/script>
</body>
</html>`)
    win.document.close()
  }

  return (
    <Dialog
      visible
      onHide={onHide}
      header={`Mã QR – ${material.code}`}
      style={{ width: '320px' }}
      modal
      draggable={false}
      resizable={false}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#555', textAlign: 'center' }}>
          {material.materialName}
        </p>
        <div ref={canvasWrapRef} style={{ background: '#fff', padding: 8, borderRadius: 4, border: '1px solid #e0e0e0' }}>
          <QRCodeCanvas
            value={material.code}
            size={220}
            level="M"
            marginSize={1}
          />
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', letterSpacing: '0.05em', color: '#333', fontFamily: 'monospace' }}>
          {material.code}
        </p>
        <button type="button" className="p-button p-component p-button-outlined p-button-sm" onClick={handleDownloadPng} style={{ marginTop: 4 }}>
          <i className="pi pi-download" style={{ marginRight: 6 }} />
          Tải PNG
        </button>
              <button type="button" className="p-button p-component p-button-outlined p-button-sm" onClick={handlePrint} style={{ marginTop: 0 }}>
                <i className="pi pi-print" style={{ marginRight: 6 }} />
                In QR
              </button>
      </div>
    </Dialog>
  )
}
