# Fix: Layout bị giãn ngang, không có horizontal scroll trong datatable

## Triệu chứng

- Toàn bộ layout app bị giãn rộng hơn viewport.
- Datatable có nhiều cột nhưng không hiện thanh cuộn ngang — thay vào đó đẩy layout ra ngoài màn hình.
- Header, nội dung, footer đều bị cắt bên phải.

## Nguyên nhân

CSS Grid và Flexbox mặc định có `min-width: auto` / `min-height: auto` cho các item. Điều này khiến item tự **giãn theo nội dung bên trong** thay vì bị giới hạn bởi container cha. Kết quả: `overflow: auto/hidden` trên container không có tác dụng vì container đã giãn ra đủ rộng để chứa nội dung, không bao giờ bị "tràn".

Vấn đề thứ hai: khi một grid container chỉ khai báo `grid-template-rows` mà không khai báo `grid-template-columns`, browser tạo một **implicit column** có size mặc định là `auto` = `minmax(auto, auto)`, tức là tự giãn theo content.

## Chuỗi fix

Phải áp dụng `min-width: 0` (hoặc `minmax(0, 1fr)` cho grid column) cho **toàn bộ chuỗi** từ ngoài vào trong:

```
catalog-app-shell  (grid: 256px minmax(0, 1fr))
  └─ catalog-main-shell  (grid-template-columns: minmax(0, 1fr); min-width: 0)
       └─ catalog-main  (min-width: 0)
            └─ catalog-page-shell  (min-width: 0)
                 ├─ catalog-page-top  (min-width: 0)
                 ├─ catalog-page-table  (min-width: 0)
                 │    └─ data-grid-wrap  (min-width: 0; overflow: auto) ← scroll ngang ở đây
                 └─ catalog-page-bottom  (min-width: 0)
```

## Các thay đổi CSS cụ thể

```css
/* Level 1 – Grid columns gốc */
.catalog-app-shell {
  grid-template-columns: 256px minmax(0, 1fr); /* thay vì 256px 1fr */
}

/* Level 2 – Khai báo explicit column để tránh implicit auto column */
.catalog-main-shell {
  grid-template-columns: minmax(0, 1fr); /* QUAN TRỌNG: không để implicit */
  min-width: 0;
}

/* Level 3-6 – Chain min-width: 0 xuống tất cả các cấp */
.catalog-main          { min-width: 0; }
.catalog-page-shell    { min-width: 0; }
.catalog-page-top,
.catalog-page-bottom   { min-width: 0; }
.catalog-page-table    { min-width: 0; }
.data-grid-wrap        { min-width: 0; overflow: auto; }

/* Table bên trong có min-width cố định để kích hoạt scroll */
.opening-stock-table   { min-width: 1240px; }
```

## Quy tắc tổng quát

> Bất cứ khi nào muốn `overflow: auto` hoạt động bên trong một grid/flex container, **phải** thêm `min-width: 0` (hoặc `minmax(0, ...)`) cho **tất cả** các cấp từ phần tử đó lên đến phần tử gốc có kích thước cố định (viewport).

Nếu thiếu bất kỳ một cấp nào trong chuỗi, item đó sẽ tự giãn và vô hiệu hóa constraint của tất cả các cấp bên dưới.

## Trường hợp riêng: Datatable nhiều cột, nhập liệu ở mép phải bị giật layout

### Triệu chứng

- Khi nhập ở các cột gần mép phải và tiếp tục Tab sang cột đang khuất, bảng có thể giật ngang.
- Có lúc xuất hiện cảm giác bảng bị lệch trái, dư khoảng trắng ở mép phải.
- Tình trạng rõ nhất khi bảng có nhiều cột và đang ở trạng thái cell edit.

### Kết luận nguyên nhân

- Cơ chế scroll do CSS wrapper tự quản lý dễ xung đột với cách PrimeReact xử lý focus + scroll của DataTable.
- Các workaround kiểu bắt focus/Tab thủ công có thể xử lý tạm, nhưng dễ phát sinh regression khi thay cột hoặc thay editor.

### Cách fix hiện tại (khuyến nghị)

Ưu tiên dùng cơ chế scroll native của PrimeReact, không tự quản lý overflow bằng CSS/JS custom.

1. Bật scrollable trực tiếp trên DataTable.
2. Dùng scrollHeight flex để vùng bảng tự co giãn theo layout.
3. Giữ min-width cho table bên trong để đảm bảo có horizontal scroll khi số cột lớn.
4. Đóng băng cột THAO TÁC ở bên phải (frozen, alignFrozen right) để vùng thao tác ổn định khi cuộn.

Ví dụ cấu hình:

```tsx
<DataTable
  ...
  scrollable
  scrollHeight="flex"
  className="catalog-table opening-stock-table prime-catalog-table"
>
```

```tsx
<Column
  header="THAO TÁC"
  frozen
  alignFrozen="right"
  ...
/>
```

```css
.opening-stock-table .p-datatable-table {
  min-width: 2100px;
}
```

### Lưu ý quan trọng

- Không giữ song song nhiều lớp custom scroll cho opening stock (wrapper ngoài, wrapper trong, JS bắt Tab/focus).
- Tránh override mạnh vào `.p-datatable-wrapper` hoặc ép scroll thủ công trừ khi thật sự bắt buộc.
- Nếu cần tinh chỉnh thêm, ưu tiên chỉnh width cột và min-width table thay vì can thiệp hành vi focus.

### Dấu hiệu đã fix đúng

- Tab qua các cột mép phải không làm grid giật ngang bất thường.
- Không còn khoảng trắng lạ ở bên phải khi đang nhập liệu.
- Cột THAO TÁC luôn ổn định ở mép phải khi cuộn ngang.
