/**
 * One-time script: generates public/templates/phieu-yeu-cau-xuat-nvl.docx
 * Run: node scripts/generate-nvl-request-template.mjs
 *
 * The produced file is a proper Word document with docxtemplater placeholder tags:
 *   {ten_nguoi_yeu_cau}  {so_phieu}  {ma_lenh}  {ngay}
 *   Table rows loop: {#items} … {/items}
 *     {stt}  {ten_nvl}  {ma_so}  {so_kiem_nhan}  {don_vi}
 *     {so_lo_sp}  {sl_xin_cap}  {sl_cap_phat}  {ghi_chu}
 *
 * Open the output file in Microsoft Word to tweak fonts/colours/logo etc.
 */

import {
  Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
  AlignmentType, WidthType, BorderStyle, VerticalAlign,
  HeightRule, convertInchesToTwip,
} from 'docx'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_PATH  = path.resolve(__dirname, '../public/templates/phieu-yeu-cau-xuat-nvl.docx')

// ─── helpers ──────────────────────────────────────────────────────────────────

const pt  = (n) => n * 20        // points → half-points (twip for font size)
const cm  = (n) => n * 567       // cm → twip (for column widths)

const BORDER_THIN = { style: BorderStyle.SINGLE, size: 6, color: '000000' }
const NO_BORDER   = { style: BorderStyle.NONE,   size: 0, color: 'FFFFFF' }

const cell = (paragraphs, { width, bold = false, center = false, vAlign = VerticalAlign.CENTER, span, noBorder = false, shading } = {}) =>
  new TableCell({
    width:     width ? { size: width, type: WidthType.DXA } : undefined,
    columnSpan: span,
    verticalAlign: vAlign,
    shading:   shading ? { fill: shading, type: 'clear' } : undefined,
    borders: noBorder ? {
      top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
    } : {
      top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN,
    },
    children: paragraphs.map((p) =>
      p instanceof Paragraph
        ? p
        : new Paragraph({
            alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [new TextRun({ text: p, bold, size: pt(9), font: 'Times New Roman' })],
          })
    ),
  })

const hCell = (text, width) => cell([text], { width, bold: true, center: true, shading: 'D9D9D9' })

const infoLine = (label, value) =>
  new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: label, bold: true,  size: pt(11), font: 'Times New Roman' }),
      new TextRun({ text: value,              size: pt(11), font: 'Times New Roman' }),
    ],
  })

const signatureCell = (label) =>
  new TableCell({
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: label, bold: true, size: pt(10), font: 'Times New Roman' })],
      }),
      new Paragraph({ children: [new TextRun({ text: '', size: pt(10) })] }),
      new Paragraph({ children: [new TextRun({ text: '', size: pt(10) })] }),
      new Paragraph({ children: [new TextRun({ text: '', size: pt(10) })] }),
    ],
  })

// ─── page-wide total width in DXA (A4, 2 cm margins each side) ───────────────
// A4 = 11906 DXA wide; margins 1134 each → usable ≈ 9638 DXA
const TW = 9638

// ─── column widths (must sum to TW) ──────────────────────────────────────────
const COLS = [
  { label: 'STT',                    w: cm(0.8)  },
  { label: 'Tên nguyên vật liệu',   w: cm(3.8)  },
  { label: 'Mã số',                  w: cm(2.0)  },
  { label: 'Số kiểm nhận',           w: cm(2.5)  },
  { label: 'Đơn vị',                 w: cm(1.5)  },
  { label: 'Số lô SP',               w: cm(3.5)  },
  { label: 'Số lượng\nxin cấp',     w: cm(2.0)  },
  { label: 'Số lượng\ncấp phát',    w: cm(2.0)  },
  { label: 'Ghi chú',               w: cm(2.5)  },
]

const TAG_CELLS = [
  '{stt}', '{ten_nvl}', '{ma_so}', '{so_kiem_nhan}', '{don_vi}',
  '{so_lo_sp}', '{sl_xin_cap}', '{sl_cap_phat}', '{ghi_chu}',
]

// ─── document ─────────────────────────────────────────────────────────────────

const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: { top: cm(1), bottom: cm(1), left: cm(2), right: cm(2) },
      },
    },
    children: [

      // ── 1. HEADER TABLE (logo | title | doc-code) ──────────────────────────
      new Table({
        width: { size: TW, type: WidthType.DXA },
        rows: [
          new TableRow({
            height: { value: cm(1.6), rule: HeightRule.ATLEAST },
            children: [
              // Logo cell
              cell([
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'ZENCOS', bold: true, size: pt(16), color: '1F497D', font: 'Arial' })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40 },
                  children: [new TextRun({ text: 'CÔNG NGHỆ NHẤT · CHẤT LƯỢNG NHẤT', size: pt(7), color: '595959', font: 'Times New Roman' })],
                }),
              ], { width: cm(3.5), center: true }),

              // Title cell
              cell([
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'PHIẾU YÊU CẦU XUẤT NGUYÊN VẬT LIỆU', bold: true, size: pt(14), font: 'Times New Roman' })],
                }),
              ], { width: cm(9.5), center: true }),

              // Doc-code cell
              cell([
                'Mã tài liệu: WH-SOP-006',
                'Ấn bản số: 01',
                'Trang: 1/1',
              ], { width: cm(3.5) }),
            ],
          }),
        ],
      }),

      new Paragraph({ spacing: { after: 80 }, children: [] }),

      // ── 2. INFO BLOCK ───────────────────────────────────────────────────────
      new Table({
        width: { size: TW, type: WidthType.DXA },
        rows: [
          new TableRow({
            children: [
              cell([infoLine('Tên người yêu cầu cấp phát:  ', '{ten_nguoi_yeu_cau}')],
                { width: Math.round(TW * 0.55), noBorder: true }),
              cell([infoLine('Số phiếu:  ', '{so_phieu}    Bộ phận: Phòng sản xuất')],
                { width: Math.round(TW * 0.45), noBorder: true }),
            ],
          }),
          new TableRow({
            children: [
              cell([infoLine('Mục đích sử dụng:  ', 'Sản xuất theo mã lệnh: {ma_lenh}')],
                { span: 2, noBorder: true }),
            ],
          }),
          new TableRow({
            children: [
              cell([infoLine('Ngày:  ', '{ngay}')], { span: 2, noBorder: true }),
            ],
          }),
        ],
      }),

      new Paragraph({ spacing: { after: 60 }, children: [] }),

      // ── 3. DATA TABLE ───────────────────────────────────────────────────────
      new Table({
        width: { size: TW, type: WidthType.DXA },
        rows: [
          // Header row
          new TableRow({
            tableHeader: true,
            height: { value: cm(1.2), rule: HeightRule.ATLEAST },
            children: COLS.map((c) => hCell(c.label, c.w)),
          }),

          // Template data row — docxtemplater will loop {#items}…{/items}
          new TableRow({
            height: { value: cm(0.9), rule: HeightRule.ATLEAST },
            children: TAG_CELLS.map((tag, i) => {
              const isFirst = i === 0
              const isLast  = i === TAG_CELLS.length - 1
              // Wrap first cell with loop-open, last cell with loop-close
              const text = isFirst ? `{#items}${tag}` : isLast ? `${tag}{/items}` : tag
              return cell([text], { width: COLS[i].w, center: true })
            }),
          }),

          // 5 blank rows (for manual use / visual reference)
          ...[...Array(5)].map(() =>
            new TableRow({
              height: { value: cm(0.8), rule: HeightRule.ATLEAST },
              children: COLS.map((c) =>
                cell([' '], { width: c.w })
              ),
            })
          ),
        ],
      }),

      new Paragraph({ spacing: { after: 120 }, children: [] }),

      // ── 4. SIGNATURE ROW ────────────────────────────────────────────────────
      new Table({
        width: { size: TW, type: WidthType.DXA },
        rows: [
          new TableRow({
            children: [
              signatureCell('Trưởng bộ phận yêu cầu'),
              signatureCell('Ban giám đốc duyệt'),
              signatureCell('Người phát hàng'),
              signatureCell('Người nhận hàng'),
            ],
          }),
        ],
      }),
    ],
  }],
})

// ─── write ────────────────────────────────────────────────────────────────────
mkdirSync(path.dirname(OUT_PATH), { recursive: true })
const buffer = await Packer.toBuffer(doc)
writeFileSync(OUT_PATH, buffer)
console.log('✅  Template saved to:', OUT_PATH)
console.log()
console.log('Docxtemplater placeholders used:')
console.log('  {ten_nguoi_yeu_cau}  {so_phieu}  {ma_lenh}  {ngay}')
console.log('  Loop: {#items} … {/items}')
console.log('    {stt}  {ten_nvl}  {ma_so}  {so_kiem_nhan}  {don_vi}')
console.log('    {so_lo_sp}  {sl_xin_cap}  {sl_cap_phat}  {ghi_chu}')
