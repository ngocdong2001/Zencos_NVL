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

## Trường hợp riêng: scrollbar ngang không nằm ở đáy container DataTable

### Triệu chứng

- Thanh cuộn ngang xuất hiện ngay dưới hàng dữ liệu đang thấy, không nằm sát đáy khung bảng.
- Khi có ít dòng dữ liệu, phần phân trang bên dưới nhìn bị tách rời khỏi vùng scroll.
- Nếu chỉnh CSS sai, DataTable có thể bị vỡ layout, cột bung rộng hoặc wrapper bị chồng scroll.

### Nguyên nhân gốc

1. Wrapper ngoài và wrapper trong cùng quản lý scroll
- `.data-grid-wrap` hoặc `.opening-stock-grid-wrap` đã có `overflow`.
- PrimeReact lại có thêm `.p-datatable-wrapper` với `overflow: auto`.
- Kết quả: thanh cuộn ngang bị render ở lớp trong, không nằm theo vị trí đáy của container hiển thị.

2. Override quá mạnh lên `.p-datatable`
- Nếu đặt `min-width: max-content` hoặc `overflow: visible` không đúng cho `.p-datatable` / `.p-datatable-wrapper`, layout bảng dễ bị vỡ.
- Kết quả: table bung kích thước, sticky width sai, cột lệch nhau.

### Cách xử lý ổn định

1. Để wrapper ngoài không tự tạo thêm một thanh cuộn riêng
- Với màn hình Opening Stock, đặt `.opening-stock-grid-wrap { overflow: hidden; }`.

2. Để PrimeReact wrapper trong tự co giãn theo chiều cao và tự scroll

```css
.opening-stock-grid-wrap .p-datatable {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.opening-stock-grid-wrap .p-datatable-wrapper {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
```

3. Không dùng các override dễ làm vỡ layout
- Không đặt `min-width: max-content` cho `.p-datatable` nếu chưa kiểm soát hết các cột.
- Không đặt `overflow: visible` cho `.p-datatable-wrapper` trong trường hợp bảng cần scroll.

### Dấu hiệu đã fix đúng

- Thanh cuộn ngang nằm ở đáy vùng bảng hiển thị.
- Table không bung layout, cột không bị lệch.
- Khi thêm dòng mới hoặc có ít dữ liệu, khu vực scroll vẫn ổn định.
