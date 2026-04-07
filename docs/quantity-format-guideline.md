# Hướng Dẫn Format Ô Số Lượng

## Mục tiêu
Đảm bảo tất cả ô nhập và hiển thị số lượng trong hệ thống đều thống nhất định dạng số, để:
- Dễ đọc và dễ đối soát.
- Không bị sai số khi tính tổng.
- Không bị lỗi parse khi người dùng nhập có dấu phân cách.

## Quy định bắt buộc
Áp dụng cho mọi trường số lượng trong chương trình (form, modal, datatable, import preview, detail view):

1. Ô hiển thị số lượng phải format theo vi-VN (có dấu phân tách hàng nghìn, tối đa 3 chữ số thập phân).
2. Ô nhập số lượng phải cho phép nhập số theo nhiều kiểu phổ biến:
- 1000
- 1.000
- 1,000
- 1000.5
- 1.000,5
3. Khi focus vào input số lượng:
- Hiển thị dạng số thuần để người dùng sửa nhanh.
4. Khi blur input số lượng:
- Tự động format lại theo quy tắc hiển thị.
5. Giá trị dùng để tính toán và lưu DB phải là giá trị số đã parse, không dùng chuỗi đã format để tính trực tiếp.
6. Nếu parse không hợp lệ thì cần:
- Chặn lưu, hiển thị thông báo lỗi rõ ràng.
- Không được làm ngắt app hoặc tạo NaN trong giao diện.

## Chuẩn hóa hàm dùng chung
Nên sử dụng thống nhất 2 nhóm hàm:
- Hàm format hiển thị: formatNumber(value)
- Hàm parse input: parseDecimalInput(raw)

Yêu cầu parseDecimalInput:
- Tự xử lý dấu phân cách theo ngữ cảnh (dấu phẩy hoặc dấu chấm là phần thập phân).
- Loại bỏ ký tự lạ.
- Trả về số hợp lệ hoặc NaN.

## Quy tắc áp dụng theo khu vực

### 1) DataTable cột số lượng
- Cell view: bắt buộc format.
- Cell edit: nhập raw, blur thì format.

### 2) Modal chi tiết
- Ô Số lượng nhập: focus raw, blur format.
- Các trường tổng hợp phụ thuộc số lượng phải tính trên giá trị parse.

### 3) Import Excel preview
- Cột số lượng trong bảng preview phải format.
- Logic tổng hợp sử dụng số đã parse, tránh vênh số do làm tròn không đồng nhất.

### 4) Export và template
- Số lượng trong file export phải đồng nhất quy tắc parse/format với UI.
- Tiêu đề cột và thứ tự cột cần đồng bộ với màn hình hiển thị.

## Checklist trước khi merge
- [ ] Đã format tất cả ô số lượng ở màn hình đang sửa.
- [ ] Đã test nhập 1000, 1.000, 1,000, 1000.5, 1.000,5.
- [ ] Không phát sinh NaN trong UI.
- [ ] Tính tổng đúng và không vênh số với giá trị đang hiển thị.
- [ ] Build thành công.

## Ghi chú thực thi
Nếu tạo thêm ô số lượng mới trong bất kỳ module nào, bắt buộc áp dụng hướng dẫn này ngay từ đầu. Không merge code nếu bỏ sót format ô số lượng.
