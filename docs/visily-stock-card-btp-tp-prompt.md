# Prompt Visily.ai - Màn hình Thẻ Kho BTP/TP

Sử dụng prompt dưới đây trong Visily.ai để sinh wireframe / screen frontend cho nghiệp vụ mới.

```text
Tạo giao diện web desktop-first, business app, bằng tiếng Việt 100%, cho module báo cáo "Thẻ kho BTP/TP" trong hệ thống quản lý kho mỹ phẩm.

MỤC TIÊU NGHIỆP VỤ
- Quản lý thẻ kho cho 1 SKU thương mại, nhưng theo dõi riêng 2 nhóm tồn:
  - BTP = Bán thành phẩm
  - TP = Thành phẩm
- Dữ liệu trên thẻ kho được hiển thị theo running balance, giống mẫu thẻ kho giấy truyền thống.
- Màn hình này không phải màn hình mua hàng hoặc bán hàng.
- Đây là màn hình báo cáo và đối soát chứng từ kho nội bộ.

BỐ CẢNH SẢN PHẨM
- Ví dụ SKU: MELASMA CREAM 30GR
- Có 2 mã kho liên kết cùng 1 SKU:
  - MELASMA30-BTP
  - MELASMA30-TP
  - NK từ phòng đóng gói cấp 1 -> nhập BTP
  - XK cho phòng đóng gói cấp 2 -> xuất BTP
  - NK từ phòng đóng gói cấp 2 -> nhập TP
  - Giao hàng -> xuất TP

YÊU CẦU THIẾT KẾ TỔNG THỂ
- Phong cách enterprise, sạch, rõ ràng, hữu dụng, tin cậy.
- Ưu tiên bố cục rộng để đọc bảng dữ liệu, không thiết kế theo kiểu landing page.
- Giao diện phải nhìn giống một module trong hệ thống ERP/warehouse hiện đại.
- Sử dụng bố cục card + toolbar + bảng dữ liệu lớn.
- Màu sắc trung tính, chuyên nghiệp: xanh đậm, slate, trắng, xám nhạt, nhấn màu vàng nhạt hoặc xanh ngọc nhẹ cho KPI.
- Không dùng phong cách quá marketing, quá flashy, quá gradient.
- Typography rõ ràng, ưu tiên tiêu đề đậm, số liệu canh phải, text nghiệp vụ canh trái.

THÀNH PHẦN MÀN HÌNH CẦN TẠO

1. PAGE HEADER
- Tiêu đề lớn: "Thẻ kho BTP/TP"
- Subtitle: "Theo dõi luân chuyển bán thành phẩm và thành phẩm theo từng SKU thương mại"
- Bên phải có 3 action button:
  - "In thẻ kho"
  - "Xuất Excel"
  - "Xem chứng từ gốc"

2. FILTER BAR / SEARCH BAR
- Thanh filter nằm ngang phía dưới header
- Gồm các control sau:
  - Ô tìm kiếm: "Tìm mã SKU / tên sản phẩm"
  - Date range: "Từ ngày" và "Đến ngày"
  - Dropdown "Chế độ xem" gồm:
    - Tất cả
    - BTP
    - TP
    - BTP + TP
  - Dropdown "Kho / vị trí"
  - Nút "Áp dụng"
  - Nút "Đặt lại"
- Hiển thị như business filter bar, không quá cao, dễ thao tác nhanh.

3. SUMMARY CARDS
- Tạo 4 summary card nằm ngang
- Card 1: "Tồn đầu BTP"
- Card 2: "Tồn đầu TP"
- Card 3: "Tồn cuối BTP"
- Card 4: "Tồn cuối TP"
- Mỗi card có:
  - label nhỏ
  - giá trị lớn
  - đơn vị hiển thị ở dạng subtitle
- Giá trị số phải nổi bật, canh phải nếu hợp lý

4. BLOCK THÔNG TIN THẺ KHO GIỐNG FORM GIẤY
- Tạo một card lớn có visual như biểu mẫu văn phòng / phiếu in
- Phần đầu card hiển thị theo 2 cột:
  - Bên trái:
    - Tên sản phẩm
    - Ngày đặt hàng
    - Số lượng đặt hàng
    - Đơn vị tính
  - Bên phải:
    - Ngày lập thẻ
    - Tờ số
    - SKU thương mại
    - Mã BTP / Mã TP
- Tiêu đề ở giữa:
  - THE KHO - THANH PHAM
  - Tên công ty ở dòng dưới
- Block này phải cho cảm giác có thể in ra được.

5. BẢNG CHI TIẾT THẺ KHO
- Đây là thành phần quan trọng nhất.
- Thiết kế 1 bảng dữ liệu lớn, kiểu enterprise datatable.
- Cột bảng cần có cấu trúc 2 tầng header:
  - STT
  - Ngày, tháng
  - Số lượng
    - Nhập
      - BTP
      - TP
    - Xuất
      - BTP
      - TP
    - Tồn
      - BTP
      - TP
  - Diễn giải
  - Ký nhận
  - Ghi chú

- Cần tạo visual group header rõ ràng cho 3 nhóm:
  - Nhập
  - Xuất
  - Tồn

- Các dòng dữ liệu mẫu nên gồm:
  - Dòng tồn đầu kỳ
  - Dòng NK từ phòng đóng gói cấp 1
  - Dòng XK cho phòng đóng gói cấp 2
  - Dòng NK từ phòng đóng gói cấp 2
  - Dòng giao hàng

- Ở cột Diễn giải, sử dụng text thực tế:
  - NK từ phòng đóng gói cấp 1
  - XK cho phòng đóng gói cấp 2
  - NK từ phòng đóng gói cấp 2
  - Giao hàng

- Ở cuối bảng có dòng TỔNG CỘNG.
- Số liệu canh phải, text canh trái.
- Bảng phải dễ đọc, không quá decorative.

6. RIGHT SIDE OR BOTTOM SUPPORT PANEL
- Tạo 1 panel phụ để hỗ trợ người dùng đối soát
- Tiêu đề: "Thông tin đối soát"
- Gồm các mục:
  - Số chứng từ gần nhất
  - Ngày phát sinh cuối
  - Tổng số dòng giao dịch
  - Chứng từ chờ xử lý
- Có thêm khu vực "Chú giải nghiệp vụ" với badge nhỏ:
  - Nhập BTP
  - Xuất BTP
  - Nhập TP
  - Xuất TP

7. MODAL / DRAWER GỢI Ý
- Đề xuất thêm 1 drawer hoặc modal "Xem chứng từ gốc"
- Trong drawer hiển thị:
  - Mã chứng từ
  - Loại chứng từ
  - Diễn giải
  - Số lượng
  - Link xem chi tiết
- Không cần quá phức tạp, chỉ cần wireframe rõ ràng.

YÊU CẦU UX/UI CỤ THỂ
- Đây là giao diện cho desktop 1440px, sau đó responsive xuống laptop và tablet ngang.
- Bảng phải có horizontal scroll nếu cần, nhưng header vẫn dễ đọc.
- Toàn bộ giao diện ưu tiên tính rõ ràng và khả năng đọc số liệu.
- Không dùng chart cho màn hình này. Trọng tâm là form + table + filter.
- Cần thể hiện đây là màn hình PrimeReact DataTable-style business table, không phải spreadsheet thủ công.
- Canh lề:
  - Số lượng, tổng cộng, tồn kho: canh phải
  - Diễn giải, tên sản phẩm, ghi chú: canh trái
- Không đưa dark mode.
- Không dùng màu tím là màu chủ đạo.

OUTPUT MONG MUỐN TỪ VISILY
- 1 main screen đầy đủ cho màn hình chi tiết thẻ kho
- 1 danh sách screen để tìm và mở thẻ kho
- 1 drawer/modal xem chứng từ gốc
- Có sample data tiếng Việt thực tế
- Có bố cục sẵn sàng để chuyển thành React + PrimeReact sau này

TÊN CÁC SCREEN GỢI Ý
- Danh sách thẻ kho BTP/TP
- Chi tiết thẻ kho BTP/TP
- Xem chứng từ gốc

TỪ KHÓA THIẾT KẾ ƯU TIÊN
- ERP
- warehouse report
- stock card
- manufacturing handoff
- semi-finished to finished goods
- enterprise datatable
- printable stock ledger
```

## Ghi chú sử dụng

- Prompt này ưu tiên sinh wireframe/màn hình cho Visily, không phải prompt code.
- Nếu Visily trả layout quá generic, hãy thêm 1 câu bổ sung: `Làm màn hình giống phần mềm ERP kho nội bộ, ưu tiên bảng dữ liệu và form in, không giống dashboard marketing.`
- Nếu cần bản mobile/tablet, tạo sau khi màn desktop đã ổn định.