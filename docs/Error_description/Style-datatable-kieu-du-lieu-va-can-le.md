# Style DataTable theo kiểu dữ liệu và cách căn lề đúng

## Vấn đề thường gặp

PrimeReact DataTable với `scrollable` render nội dung cell bằng **flex container** nội bộ.
Các cách căn lề thông thường như `text-align: right` trên `td` hay `justify-content` đặt qua class **không đảm bảo** hoạt động đúng.

Prop `align="right"` trên `<Column>` cũng không đủ vì nó chỉ gán class, không kiểm soát được layout bên trong khi nội dung là text node thuần.

---

## Giải pháp đúng: bọc nội dung trong `<span>` với style trực tiếp

Thay vì trả về text thuần từ `body`, bọc trong `<span>` với `display: block; width: 100%; text-align: right`:

```tsx
// ❌ Không đáng tin cậy
body={(rowData) => formatNumber(rowData.quantity)}

// ✅ Đúng
body={(rowData) => (
  <span className="num-r">{formatNumber(rowData.quantity)}</span>
)}
```

CSS:

```css
.num-r {
  display: block;
  width: 100%;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
```

---

## Quy ước style theo kiểu dữ liệu

### Số (quantity, price, amount)

```css
.num-r {
  display: block;
  width: 100%;
  text-align: right;
  font-variant-numeric: tabular-nums; /* căn chỉnh chữ số dạng mono */
}
```

- Dùng `<span className="num-r">` để bọc giá trị hiển thị trong `body`.
- Thêm `align="right"` trên `<Column>` để header cũng căn phải.
- Input trong new row: đặt `style={{ textAlign: 'right' }}` hoặc qua class CSS `input { text-align: right }`.
- Format số: dùng `Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 })` — dấu `.` phân cách nghìn, dấu `,` thập phân.

```tsx
function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
}
```

### Ngày (date)

- DB lưu dạng `YYYY-MM-DD`, **hiển thị** chuyển sang `dd/MM/yyyy`.
- Dùng hàm `formatDate`:

```ts
function formatDate(value: string | null | undefined): string {
  if (!value) return '---'
  const [y, m, d] = value.split('-')
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}
```

- Input nhập liệu vẫn dùng `input[type=date]` (trình duyệt yêu cầu `YYYY-MM-DD` — không thay đổi).
- Bọc bằng `<span className="status-pill">` nếu muốn badge style, hoặc text thuần.
- Căn trái (mặc định).
- Input: `input[type=date]` — cần wrap `stopPropagation` (xem file `Loi date picker trong DataTable - huong dan xu ly.md`).

### Văn bản (string)

- Căn trái (mặc định).
- Nếu có thể rỗng, hiển thị `'---'` thay vì chuỗi rỗng.

### Trạng thái / boolean

- Căn giữa: dùng `bodyClassName="opening-stock-center-col"`.

```css
.opening-stock-center-col {
  text-align: center;
}
```

### Khóa ngoại / tham chiếu danh mục (FK lookup)

Khi cột lưu ID tham chiếu đến bảng khác (ví dụ: `supplierId`, `categoryId`, `unitId`), **mặc định dùng AutoComplete** thay vì `<select>`.

**Lý do:**
- `<select>` trong DataTable bị DataTable nuốt sự kiện, khó style đồng bộ với phần còn lại.
- AutoComplete cho phép tìm nhanh khi danh sách dài, không cần scroll toàn bộ dropdown.
- Nhất quán với pattern đã dùng cho cột nguyên liệu.

**Cách triển khai:**

1. Load toàn bộ danh sách FK một lần khi mount (với danh sách không quá lớn, < vài nghìn bản ghi).
2. Tạo component editor riêng quản lý state nội bộ — tránh re-render toàn bảng:

```tsx
function FkEditorCell({
  initialId,
  options,        // mảng { id, code, name }
  onConfirm,      // callback trả về id đã chọn
}: {
  initialId: string
  options: { id: string; code: string; name: string }[]
  onConfirm: (id: string) => void
}) {
  const initial = options.find((o) => o.id === initialId) ?? null
  const [value, setValue] = useState(initial ?? '')
  const [suggestions, setSuggestions] = useState<typeof options>([])

  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <AutoComplete
        value={value}
        suggestions={suggestions}
        field="name"
        itemTemplate={(o) => `${o.code} - ${o.name}`}
        completeMethod={(e) => {
          const q = e.query.toLowerCase()
          setSuggestions(
            options.filter((o) => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)).slice(0, 10)
          )
        }}
        onChange={(e) => setValue(e.value)}
        onSelect={(e) => { setValue(e.value); onConfirm(e.value.id) }}
        onClear={() => onConfirm('')}
        appendTo={document.body}
        autoFocus
      />
    </div>
  )
}
```

3. Trong `body` của new row: dùng `AutoComplete` bound vào state ngoài (vd. `selectedSupplier`), bọc trong `div` có `stopPropagation`.
4. Hiển thị khi không edit: dùng `name` hoặc `code - name` của bản ghi được chọn, fallback `'---'`.

**Lưu ý bắt buộc:**
- Luôn `appendTo={document.body}` để tránh dropdown bị cắt bởi overflow.
- Luôn `stopPropagation` trên wrapper div (cả `onClick` và `onMouseDown`) để DataTable không tranh sự kiện.
- Xem chi tiết tại: `Loi autocomplete trong datatable - huong dan xu ly.md`

---

### Cột readonly (tính toán tự động)

- Thêm class riêng để tô màu nền phân biệt:

```css
.opening-stock-readonly-column {
  background: #f8f8f8;
  color: #555;
}
.opening-stock-readonly-column-header {
  background: #f0f0f0;
}
```

- Input dùng `readOnly` với class `.opening-stock-readonly-input` để bỏ border/focus style.

---

## Checklist khi thêm cột mới

| Kiểu dữ liệu | Body template | CSS class | `align` prop | Format |
|---|---|---|---|---|
| Số nguyên / thực | `<span className="num-r">` | `num-r` | `"right"` | `formatNumber()` |
| Tiền tệ | `<span className="num-r">` | `num-r` | `"right"` | `formatNumber()` |
| Ngày | text / `status-pill` | — | — | `formatDate()` → `dd/MM/yyyy` |
| Chuỗi | text | — | — | `'---'` nếu rỗng |
| Boolean | icon/badge | `center-col` | `"center"` | — |
| Khóa ngoại (FK) | `AutoComplete` (FkEditorCell) | — | — | hiển thị `code - name` |
| Tính toán (readonly) | `<input readOnly>` | `readonly-column` | theo kiểu | `formatNumber()` |

---

## Tài liệu liên quan

- Lỗi date picker trong DataTable: `Loi date picker trong DataTable - huong dan xu ly.md`
- Lỗi AutoComplete trong DataTable: `Loi autocomplete trong datatable - huong dan xu ly.md`
- Lỗi scrollbar ngang / layout bảng: `horizontal-scroll-fix.md`
