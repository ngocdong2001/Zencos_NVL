# Lỗi `input[type=date]` trong DataTable - Bấm icon lịch không xổ popup

## Triệu chứng
- Ô nhập ngày (`input[type=date]`) hiển thị bình thường nhưng bấm vào biểu tượng lịch không mở được giao diện chọn ngày.
- Xảy ra ở cả dòng nhập mới (new row) và dòng đang chỉnh sửa (editor mode).

## Nguyên nhân
DataTable bắt sự kiện `click` và `mousedown` trên cell trước khi input nhận được chúng.  
Trình duyệt cần nhận được cả hai sự kiện để kích hoạt popup lịch bên trong `input[type=date]`.  
Nếu DataTable "nuốt" sự kiện trước, popup không xuất hiện.

## Cách fix: `stopPropagation` trên wrapper và bản thân input

Bọc input trong `<div>` và thêm `stopPropagation` trên cả wrapper lẫn input:

```tsx
// Trong editor (hàng đang chỉnh sửa sẵn có)
editor={(options) => (
  <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
    <input
      type="date"
      value={String(options.value ?? '')}
      onChange={(e) => options.editorCallback?.(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      aria-label="..."
    />
  </div>
)}

// Trong body (dòng new row)
body={(rowData) => (
  rowData.id !== NEW_ROW_ID
    ? <span>{rowData.dateField}</span>  // hiển thị bình thường
    : (
      <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <input
          type="date"
          value={draft.dateField}
          onChange={(e) => handleDraftChange('dateField', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="..."
        />
      </div>
    )
)}
```

## Lưu ý
- Phải có `stopPropagation` ở cả 4 chỗ: div wrapper (`click` + `mousedown`) và input (`click` + `mousedown`).
- Chỉ dùng input HTML thuần (`input[type=date]`), KHÔNG dùng `Calendar` của PrimeReact vì nó còn bị thêm các sự kiện phức tạp hơn.
- Đã áp dụng cho cột "Ngày tồn đầu kỳ" và cột "Hạn sử dụng" trong Opening Stock DataTable.

## Tài liệu liên quan
- Lỗi AutoComplete trong DataTable: xem file `Loi autocomplete trong datatable - huong dan xu ly.md` trong cùng thư mục.
- Lỗi scrollbar ngang / layout bảng: xem file `horizontal-scroll-fix.md` trong cùng thư mục.
