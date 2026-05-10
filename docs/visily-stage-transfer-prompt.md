# Prompt Visily.ai - Màn hình Phiếu Chuyển Công Đoạn

Sử dụng prompt dưới đây trong Visily.ai để sinh wireframe / screen frontend cho màn hình bước 1 của nghiệp vụ mới: Phiếu chuyển công đoạn giữa BTP và TP.

```text
Tạo giao diện web desktop-first, business app, bằng tiếng Việt 100%, cho module "Phiếu chuyển công đoạn" trong hệ thống quản lý kho mỹ phẩm.

MỤC TIÊU NGHIỆP VỤ
- Đây là chứng từ kho nội bộ dùng để ghi nhận luân chuyển giữa các công đoạn.
- Chứng từ này không phải phiếu mua hàng và không phải phiếu giao khách.
- Chứng từ phục vụ các nghiệp vụ:
  - Nhập BTP từ sản xuất / đóng gói cấp 1 vào kho
  - Xuất BTP cho đóng gói cấp 2 / hoàn thiện
  - Nhập TP sau đóng gói vào kho thành phẩm
  - Ghi nhận hao hụt công đoạn nếu có
- Chứng từ cần rõ 2 vế:
  - Vế xuất
  - Vế nhập

BỐ CẢNH NGHIỆP VỤ
- Ví dụ sản phẩm thương mại: MELASMA CREAM 30GR
- Mã kho liên quan:
  - MELASMA30-BTP
  - MELASMA30-TP
- Loại chứng từ có thể chọn:
  - NK BTP
  - XK BTP
  - NK TP
  - Chuyển BTP sang TP
  - Điều chỉnh / hao hụt

YÊU CẦU THIẾT KẾ TỔNG THỂ
- Phong cách enterprise, vận hành nội bộ, rõ ràng, thực dụng.
- Ưu tiên cảm giác như màn hình chứng từ trong ERP kho / sản xuất.
- Không làm kiểu dashboard marketing.
- Sử dụng layout gồm:
  - Header chứng từ
  - Form thông tin chung
  - Bảng chi tiết dòng hàng
  - Panel tóm tắt / đối soát bên phải hoặc bên dưới
  - Footer action bar cố định
- Màu sắc chuyên nghiệp: xanh navy, slate, trắng, xám nhạt, trạng thái dùng thêm xanh lá, vàng, đỏ nhạt.

THÀNH PHẦN MÀN HÌNH CẦN TẠO

1. PAGE HEADER
- Tiêu đề lớn: "Phiếu chuyển công đoạn"
- Subtitle: "Ghi nhận luân chuyển BTP và TP giữa các công đoạn sản xuất, đóng gói và kho"
- Góc phải có status badge:
  - Nháp
  - Đã xác nhận
  - Đã hủy

2. THÔNG TIN CHUNG CHỨNG TỪ
- Card form đầu trang gồm 2 cột field
- Cột trái:
  - Số phiếu
  - Ngày chứng từ
  - Loại nghiệp vụ
  - Từ công đoạn
  - Đến công đoạn
- Cột phải:
  - SKU thương mại
  - Mã BTP
  - Mã TP
  - Người lập
  - Diễn giải
- Có field textarea cho "Diễn giải"
- Có field note nhỏ cho "Ghi chú nội bộ"

3. BẢNG CHI TIẾT DÒNG HÀNG
- Thiết kế kiểu enterprise DataTable / editable rows
- Các cột gợi ý:
  - STT
  - Mã hàng nguồn
  - Tên hàng nguồn
  - Lô nguồn
  - Số lượng xuất
  - Đơn vị
  - Mã hàng đích
  - Tên hàng đích
  - Số lượng nhập
  - Hao hụt
  - Diễn giải dòng
  - Chứng từ gốc / thao tác
- Có visual rõ để thấy quan hệ giữa hàng nguồn và hàng đích.
- Số liệu phải canh phải.
- Text mô tả canh trái.

4. PANEL TÓM TẮT ĐỐI SOÁT
- Một panel nhỏ bên phải hoặc dưới bảng
- Hiển thị:
  - Tổng số dòng
  - Tổng xuất BTP
  - Tổng nhập TP
  - Tổng hao hụt
  - Chênh lệch còn lại
- Có badge cảnh báo nếu tổng xuất và tổng nhập không khớp logic mong đợi.

5. KHU VỰC CHỨNG TỪ GỐC / DRILLDOWN
- Một card hoặc drawer hiển thị danh sách chứng từ liên quan:
  - Lệnh sản xuất
  - Phiếu đóng gói
  - Phiếu xuất nội bộ trước đó
  - Báo cáo QC
- Mỗi item có:
  - Mã chứng từ
  - Loại chứng từ
  - Ngày
  - Trạng thái
  - Nút xem chi tiết

6. FOOTER ACTION BAR
- Cố định cuối trang
- Các nút:
  - Lưu nháp
  - Kiểm tra dữ liệu
  - Xác nhận phiếu
  - Hủy phiếu
  - In phiếu
- Nút "Xác nhận phiếu" là primary action nổi bật.

7. MÀN HÌNH DANH SÁCH PHIẾU CHUYỂN CÔNG ĐOẠN
- Tạo thêm một screen danh sách
- Có filter:
  - Tìm mã phiếu / SKU / mã BTP / mã TP
  - Loại nghiệp vụ
  - Từ ngày / đến ngày
  - Trạng thái
- Bảng danh sách gồm:
  - Số phiếu
  - Ngày chứng từ
  - SKU thương mại
  - Loại nghiệp vụ
  - Từ công đoạn
  - Đến công đoạn
  - Tổng số lượng
  - Trạng thái
  - Thao tác xem / sửa / in

YÊU CẦU UX/UI CỤ THỂ
- Đây là màn hình desktop 1440px, tối ưu cho nhân viên kho và điều phối sản xuất.
- Ưu tiên đọc nhanh, thao tác nhanh, giảm nhầm lẫn.
- Bảng phải có khả năng scroll ngang nếu nhiều cột.
- Form đầu trang phải gọn, rõ, nhìn ra ngay đây là chứng từ nội bộ.
- Có thể dùng step indicator nhẹ nếu muốn gợi ý quy trình: Nhập thông tin -> Nhập dòng hàng -> Kiểm tra -> Xác nhận.
- Không dùng chart.
- Không dùng dark mode.
- Không dùng màu tím làm màu chủ đạo.

OUTPUT MONG MUỐN TỪ VISILY
- 1 screen danh sách phiếu chuyển công đoạn
- 1 screen chi tiết phiếu chuyển công đoạn
- 1 drawer/modal xem chứng từ gốc liên quan
- Có sample data tiếng Việt thực tế
- Có bố cục sẵn sàng để sau này chuyển thành React + PrimeReact

TÊN CÁC SCREEN GỢI Ý
- Danh sách phiếu chuyển công đoạn
- Chi tiết phiếu chuyển công đoạn
- Xem chứng từ gốc liên quan

TỪ KHÓA THIẾT KẾ ƯU TIÊN
- ERP voucher
- warehouse internal transfer
- manufacturing handoff
- stage transfer form
- semi-finished to finished goods
- enterprise editable datatable
- internal stock movement
```

## Ghi chú sử dụng

- Prompt này dành cho bước 1 của nghiệp vụ mới: thiết kế UI cho chứng từ vận hành trước khi làm báo cáo thẻ kho hoàn chỉnh.
- Nếu Visily render quá chung chung, hãy thêm câu: `Làm giống phần mềm ERP nội bộ cho kho và sản xuất, ưu tiên form chứng từ và bảng dữ liệu thay vì layout dashboard.`
- Nếu cần, mình có thể viết tiếp prompt bước 2 cho màn hình danh sách lệnh đóng gói hoặc màn hình đối soát hao hụt.