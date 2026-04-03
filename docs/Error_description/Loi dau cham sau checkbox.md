# Lỗi dấu chấm sau checkbox trong Catalog DataTable

## Mô tả hiện tượng
- Ở tab Nguyên liệu Master trong mục Catalog, cột đầu tiên (row selector) xuất hiện thêm ký tự dấu chấm . ngay sau checkbox của từng dòng.
- Lỗi chỉ xuất hiện ở cột checkbox chọn dòng, không liên quan dữ liệu của cột Mã NVL.
- Ảnh minh họa: Loi dau cham sau checkbox.jpg.

## Phạm vi ảnh hưởng
- Màn hình Catalog DataTable.
- Cột selection checkbox của PrimeReact DataTable.

## Nguyên nhân gốc
CSS custom đang áp quá rộng cho toàn bộ input trong bảng:
- Selector cũ áp cho tất cả input trong .prime-catalog-table.
- PrimeReact selection checkbox cũng có input nội bộ.
- Khi input nội bộ bị override sai ngữ cảnh, giao diện checkbox bị lệch và phát sinh ký tự hiển thị rác (dấu chấm .) cạnh checkbox.

## Cách sửa
Đã chỉnh CSS trong src/App.css theo 2 hướng:

1. Thu hẹp selector input chung, loại trừ checkbox
- Trước: .prime-catalog-table input, .prime-catalog-table select
- Sau: .prime-catalog-table input:not([type='checkbox']), .prime-catalog-table select

2. Bổ sung style riêng cho cột selection của PrimeReact DataTable
- Đặt font-size và line-height về 0 ở cell/header selection để triệt ký tự rác.
- Giữ checkbox canh giữa.
- Đặt lại font-size, line-height cho .p-checkbox-box để icon checkbox hiển thị đúng.

## Thay đổi đã áp dụng
File cập nhật:
- src/App.css

Các khối sửa chính:
- .prime-catalog-table input:not([type='checkbox'])
- .prime-catalog-table input:not([type='checkbox']):focus
- .prime-catalog-table .p-datatable-tbody > tr > td[data-p-selection-column='true']
- .prime-catalog-table .p-datatable-thead > tr > th[data-p-selection-column='true']
- .prime-catalog-table .p-datatable-tbody > tr > td[data-p-selection-column='true'] .p-checkbox
- .prime-catalog-table .p-datatable-thead > tr > th[data-p-selection-column='true'] .p-checkbox
- .prime-catalog-table .p-datatable-tbody > tr > td[data-p-selection-column='true'] .p-checkbox-box
- .prime-catalog-table .p-datatable-thead > tr > th[data-p-selection-column='true'] .p-checkbox-box

## Kết quả
- Dấu chấm sau checkbox không còn xuất hiện.
- Checkbox selection ở header và từng row hiển thị bình thường.

## Ngày cập nhật
- 2026-04-02

## Quy tắc tránh tái phát (Checklist)

### A. Quy tắc selector CSS
- [ ] Không dùng selector quá rộng kiểu .prime-catalog-table input nếu trong bảng có component nội bộ của PrimeReact.
- [ ] Luôn loại trừ checkbox/radio khi style input text: input:not([type='checkbox']):not([type='radio']).
- [ ] Ưu tiên target theo class của business field (vd: .unit-conversion-input) thay vì target theo tag HTML chung.
- [ ] Với cột selection, style theo data attribute của PrimeReact (data-p-selection-column='true') để khoanh vùng chính xác.

### B. Quy tắc custom DataTable
- [ ] Kiểm tra cột selection đang dùng checkbox mặc định của PrimeReact hay checkbox tự render.
- [ ] Không ghi đè trực tiếp .p-checkbox-input nếu không thật sự cần.
- [ ] Nếu cần căn chỉnh cột checkbox, chỉnh ở wrapper/cell trước (td/th) rồi mới chỉnh .p-checkbox-box.
- [ ] Tránh đặt font-size/line-height bất thường ở container bao ngoài toàn bảng vì có thể ảnh hưởng icon nội bộ.

### C. Quy tắc kiểm thử sau khi sửa CSS
- [ ] Kiểm tra cả header checkbox (select all) và row checkbox ở trạng thái unchecked/checked/disabled/focus.
- [ ] Kiểm tra trên tất cả tab dùng chung DataTable (materials, suppliers, customers, units).
- [ ] Kiểm tra ở dòng new row và dòng dữ liệu thường để tránh style xung đột giữa input editor và checkbox selector.
- [ ] Zoom trình duyệt 90%, 100%, 125% để phát hiện artifact hiển thị do baseline/line-height.

### D. Quy tắc review code
- [ ] Mỗi lần thêm CSS mới cho bảng, rà lại các rule bắt đầu bằng .prime-catalog-table input, .catalog-table input, th, td.
- [ ] Không merge nếu có selector global mới mà chưa chứng minh không ảnh hưởng .p-checkbox.
- [ ] Nếu có lỗi hiển thị lạ trong ô selection, kiểm tra thứ tự ưu tiên: CSS override của app -> theme PrimeReact -> PrimeIcons.
