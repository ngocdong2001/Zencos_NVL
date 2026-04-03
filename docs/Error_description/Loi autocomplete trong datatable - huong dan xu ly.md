# Lỗi AutoComplete trong DataTable - Hướng dẫn xử lý

## Triệu chứng thường gặp
- Gõ vào ô AutoComplete thấy icon loading nhưng không hiện danh sách gợi ý.
- Chọn item xong bị nhảy sang item khác (thường là item đầu tiên).
- Click vào ô AutoComplete bị DataTable chuyển sang chế độ cell edit, mất focus hoặc đóng panel.

## Nguyên nhân gốc
1. DataTable cell memoization
- DataTable mặc định có `cellMemo=true`.
- Nếu `suggestions` là state bên ngoài `rowData`, cell có thể không re-render khi suggestions thay đổi.
- Kết quả: panel không được cập nhật dữ liệu mới.

2. Xung đột sự kiện với `editMode="cell"`
- Click vào ô có thể bị DataTable bắt sự kiện cell edit trước AutoComplete.
- Kết quả: dropdown không mở đúng hoặc mất focus ngay.

3. Overlay bị cắt bởi container
- Các wrapper có `overflow: hidden/auto` có thể cắt panel của AutoComplete.
- Kết quả: loading có chạy nhưng không thấy danh sách.

4. Flow chọn item không ổn định
- Xử lý chọn item trong cả `onChange` và `onSelect` cùng lúc.
- Kết hợp `forceSelection`/coercion có thể làm giá trị vừa chọn bị ghi đè.

## Mẫu xử lý ổn định để tái sử dụng
1. Cho column chứa AutoComplete trong DataTable `editMode="cell"`
- Thêm `onBeforeCellEditShow` và chặn edit với dòng new row.
- Mục tiêu: không cho DataTable tranh focus với AutoComplete.

2. Đặt overlay ra ngoài container table
- Đặt `appendTo={document.body}` cho AutoComplete.
- Mục tiêu: tránh bị cắt bởi overflow.

3. Chặn bubble sự kiện ở wrapper của AutoComplete
- Wrapper quanh AutoComplete nên `stopPropagation` cho `click` và `mousedown`.
- Mục tiêu: tránh DataTable bắt sự kiện của input.

4. Đơn giản hóa luồng chọn item
- `onSelect`: chỉ dùng để chốt item được chọn.
- `onChange`: chỉ xử lý text người dùng đang gõ (kiểu string) và clear khi rỗng.
- Không gọi hàm chọn item trong `onChange` khi `e.value` là object.

5. Tránh race condition khi đã chọn item
- Khi `onSelect` chạy:
  - clear timeout search đang chờ.
  - tăng request id để vô hiệu hóa request cũ.
  - clear suggestions để đóng panel sạch.

6. Nếu vẫn gặp hiện tượng không re-render suggestions
- Tắt cell memo cho bảng có dòng nhập mới:
  - Đặt `cellMemo={false}` trên DataTable.
- Lưu ý: bảng lớn cần cân nhắc hiệu năng.

## Checklist debug nhanh
1. Kiểm tra `suggestions` có cập nhật không (React DevTools/state).
2. Kiểm tra panel có render trong DOM không.
3. Nếu panel có render nhưng không thấy, ưu tiên check `overflow` và `appendTo`.
4. Nếu click xong nhảy item, check lại `onChange`/`onSelect` và `forceSelection`.
5. Nếu state đúng mà UI không đổi, check `cellMemo`.

## Tài liệu liên quan
- Lỗi date picker (`input[type=date]`) trong DataTable: xem file `Loi date picker trong DataTable - huong dan xu ly.md` trong cùng thư mục.
- Lỗi scrollbar ngang / layout bảng: xem file `horizontal-scroll-fix.md` trong cùng thư mục.

## Ghi chú cho codebase này
- Đã áp dụng nhóm fix trên Opening Stock DataTable.
- Build đã pass sau mỗi bước chỉnh sửa.
- Nếu sao chép mẫu này sang DataTable khác, ưu tiên giữ nguyên thứ tự xử lý như trên để tránh bug lặp lại.
