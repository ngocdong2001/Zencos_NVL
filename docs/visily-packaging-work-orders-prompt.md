# Prompt Visily.ai - 1 Page Nhập/Xuất Sản Xuất

Sử dụng prompt dưới đây trong Visily.ai để sinh wireframe / screen frontend cho giao diện gộp 1 page duy nhất: Nhập/Xuất Sản xuất.

```text
Tạo giao diện web desktop-first, business app, bằng tiếng Việt 100%, cho module "Nhập/Xuất Sản xuất" trong hệ thống quản lý kho mỹ phẩm.

MỤC TIÊU NGHIỆP VỤ
- Gộp toàn bộ thao tác vận hành vào 1 page duy nhất.
- Ghi nhận xuyên suốt luồng chuyển công đoạn:
  1) Nguyên vật liệu -> Bán thành phẩm
  2) Bán thành phẩm -> Thành phẩm
- Trong page này phải có "Phiếu chuyển đổi" làm chứng từ chính.
- Người dùng có thể vừa xem tiến độ, vừa tạo/chỉnh chứng từ, vừa đối soát số lượng ngay trên cùng một màn hình.

BỐ CẢNH NGHIỆP VỤ
- Ví dụ SKU thương mại: MELASMA CREAM 30GR
- Mã kho liên quan:
  - MELASMA30-RM (nguyên vật liệu)
  - MELASMA30-BTP (bán thành phẩm)
  - MELASMA30-TP (thành phẩm)
- Các hành động chuẩn:
  - Xuất NVL cho sản xuất BTP
  - Nhập BTP sau sản xuất
  - Xuất BTP cho đóng gói
  - Nhập TP sau đóng gói
  - Ghi nhận hao hụt (nếu có)

YÊU CẦU THIẾT KẾ TỔNG THỂ
- Một page duy nhất, không chia thành nhiều màn hình riêng.
- Phong cách enterprise, rõ ràng, vận hành nội bộ, ưu tiên thao tác nhanh.
- Không làm theo kiểu dashboard marketing.
- Bố cục theo chiều dọc, gồm nhiều khối chức năng trong cùng trang:
  - Header + bộ lọc
  - Thanh tiến trình công đoạn
  - Khối phiếu chuyển đổi
  - Bảng nhật ký nhập/xuất sản xuất
  - Panel đối soát
  - Footer action bar
- Màu sắc: xanh navy, slate, trắng, xám nhạt; trạng thái dùng badge xanh lá/vàng/đỏ nhạt.

THÀNH PHẦN BẮT BUỘC TRÊN 1 PAGE

1. PAGE HEADER
- Tiêu đề lớn: "Nhập/Xuất Sản xuất"
- Subtitle: "Ghi nhận chuyển đổi từ nguyên vật liệu sang bán thành phẩm và thành phẩm"
- Góc phải có nút:
  - "Tạo phiếu chuyển đổi"
  - "Lưu nháp"
  - "Xác nhận"
  - "In phiếu"

2. FILTER BAR / CONTEXT BAR
- Thanh context ngay dưới header, gồm:
  - Ô tìm kiếm: "Tìm mã lệnh / SKU / mã phiếu"
  - Date range: "Từ ngày" - "Đến ngày"
  - Dropdown "Kho / phân xưởng"
  - Dropdown "Trạng thái"
  - Dropdown "Công đoạn hiện tại"
  - Nút "Áp dụng"
  - Nút "Đặt lại"

3. STEP FLOW BAR (RẤT QUAN TRỌNG)
- Thanh tiến trình ngang thể hiện 4 bước:
  - Bước 1: Xuất NVL
  - Bước 2: Nhập BTP
  - Bước 3: Xuất BTP
  - Bước 4: Nhập TP
- Mỗi bước có:
  - Trạng thái (chưa làm / đang làm / hoàn tất / lỗi)
  - Số lượng kế hoạch và thực tế
  - Badge cảnh báo chênh lệch nếu có

4. KHỐI "PHIẾU CHUYỂN ĐỔI" (CARD CHÍNH)
- Card form lớn nằm trung tâm trang.
- Chia 2 phần: Thông tin chung + dòng chi tiết.

4.1. Thông tin chung
- Các field:
  - Số phiếu
  - Ngày chứng từ
  - SKU thương mại
  - Loại chuyển đổi
  - Người lập
  - Diễn giải
  - Ghi chú nội bộ

4.2. Bảng dòng chi tiết phiếu
- Bảng kiểu enterprise DataTable / editable rows.
- Cột gợi ý:
  - STT
  - Mã hàng nguồn
  - Tên hàng nguồn
  - Lô nguồn
  - Công đoạn xuất
  - Số lượng xuất
  - Mã hàng đích
  - Tên hàng đích
  - Công đoạn nhập
  - Số lượng nhập
  - Hao hụt
  - Diễn giải dòng
  - Chứng từ gốc
  - Thao tác
- Quy tắc trình bày:
  - Số lượng, hao hụt: canh phải
  - Mã/tên/diễn giải: canh trái

5. BẢNG "NHẬT KÝ NHẬP/XUẤT SẢN XUẤT" TRONG CÙNG PAGE
- Bảng lịch sử giao dịch ngay bên dưới phiếu chuyển đổi.
- Cột gợi ý:
  - Thời gian
  - Mã chứng từ
  - Loại giao dịch
  - Công đoạn từ
  - Công đoạn đến
  - Mã hàng
  - Nhập
  - Xuất
  - Tồn lũy kế theo công đoạn
  - Diễn giải
  - Người thao tác
- Có filter nhanh theo loại giao dịch: Xuất NVL, Nhập BTP, Xuất BTP, Nhập TP, Hao hụt.

6. PANEL "ĐỐI SOÁT CHUYỂN ĐỔI"
- Panel bên phải hoặc dưới cùng của page.
- Hiển thị số liệu tổng hợp theo phiên làm việc:
  - Tổng xuất NVL
  - Tổng nhập BTP
  - Tổng xuất BTP
  - Tổng nhập TP
  - Tổng hao hụt
  - Chênh lệch quy đổi
- Có cảnh báo nếu chênh lệch vượt ngưỡng.

7. FOOTER ACTION BAR CỐ ĐỊNH
- Nút thao tác cuối trang:
  - Lưu nháp
  - Kiểm tra dữ liệu
  - Xác nhận ghi nhận nhập/xuất
  - Hủy phiếu
  - Xuất Excel
- Nút "Xác nhận ghi nhận nhập/xuất" là primary action nổi bật.

YÊU CẦU UX/UI CỤ THỂ
- Đây là 1 page duy nhất cho desktop 1440px.
- Có thể chia thành các section/card trong cùng trang, nhưng không tách thành nhiều screen độc lập.
- Bảng cần hỗ trợ scroll ngang nếu nhiều cột.
- Header và footer action nên sticky để thao tác nhanh.
- Không dùng chart phức tạp, trọng tâm là form + bảng + đối soát.
- Không dark mode.
- Không dùng màu tím làm màu chủ đạo.

OUTPUT MONG MUỐN TỪ VISILY
- 1 màn hình duy nhất: "Nhập/Xuất Sản xuất"
- Trong màn hình đó có đủ:
  - Step flow bar
  - Phiếu chuyển đổi
  - Nhật ký nhập/xuất
  - Panel đối soát
  - Footer action bar
- Có sample data tiếng Việt thực tế để nhìn ra luồng NVL -> BTP -> TP.
- Bố cục sẵn sàng chuyển thành React + PrimeReact.

TỪ KHÓA THIẾT KẾ ƯU TIÊN
- ERP manufacturing operations
- one-page production transfer
- raw material to semi-finished to finished
- internal warehouse conversion voucher
- enterprise datatable
- stock movement reconciliation
```

## Ghi chú sử dụng

- Prompt này đã gộp giao diện theo yêu cầu 1 page duy nhất.
- Nếu Visily vẫn tách thành nhiều màn hình, thêm câu: `Bắt buộc render tất cả module trong cùng 1 page, chỉ dùng section/card, không tách separate screens.`
- Nếu cần, có thể tạo thêm một biến thể "1 page compact" cho laptop 1366px.
