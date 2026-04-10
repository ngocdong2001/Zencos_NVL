# Tóm tắt nghiệp vụ Phiếu Thu Mua (PO)

## 1. Mục đích
Quy trình PO giúp bộ phận kho và thu mua:
- Nhận diện nguyên liệu thiếu hụt.
- Tạo và quản lý phiếu mua hàng theo chuẩn trạng thái.
- Kiểm soát chặt quyền sửa để tránh sai lệch sau khi đã gửi.

## 2. Luồng nghiệp vụ ngắn gọn
1. Kho theo dõi danh sách thiếu hụt nguyên liệu.
2. Chọn nguyên liệu cần mua và tạo PO (soạn nhanh hoặc vào màn chi tiết).
3. Lưu PO ở trạng thái Bản nháp để tiếp tục chỉnh sửa.
4. Gửi PO cho bộ phận thu mua.
5. Khi PO đã gửi, hệ thống khóa chỉnh sửa.
6. Nếu cần sửa, thực hiện Thu hồi về nháp rồi cập nhật lại.

## 3. Trạng thái PO và ý nghĩa
- Bản nháp (`draft`): đang soạn, được phép chỉnh sửa.
- Đã gửi (`submitted`): đã chuyển thu mua xử lý, không sửa trực tiếp.
- Đã duyệt (`approved`): đã được phê duyệt.
- Đã đặt (`ordered`): đã đặt hàng với nhà cung cấp.
- Đã nhận (`received`): đã nhận hàng về kho.
- Đã hủy (`cancelled`): phiếu không còn hiệu lực.

## 4. Quy tắc khóa/mở sửa
- Chỉ PO ở trạng thái Bản nháp mới được sửa nội dung.
- Sau khi Gửi, PO bị khóa để đảm bảo tính toàn vẹn nghiệp vụ.
- Muốn sửa PO đã gửi: phải Thu hồi về nháp trước, sau đó mới chỉnh sửa và gửi lại.

### 4.1 Điều kiện thu hồi phiếu về nháp
**Được phép thu hồi khi:**
- PO đang ở trạng thái **Đã gửi** (`submitted`).
- PO đã được lưu và có mã định danh trên hệ thống.

**Không thể thu hồi khi:**
- PO đang là **Bản nháp** — chưa cần thu hồi vì vẫn đang sửa được.
- PO đã **Đã duyệt** (`approved`) — bộ phận thu mua đã xử lý, mọi điều chỉnh cần đi theo quy trình riêng.
- PO đã **Đã đặt** (`ordered`) — đơn hàng đã được gửi nhà cung cấp.
- PO đã **Đã nhận** (`received`) — hàng đã về kho, dữ liệu tồn kho đã cập nhật.
- PO đã **Đã hủy** (`cancelled`) — phiếu không còn hiệu lực.

**Lưu ý vận hành:**
- Hành động thu hồi yêu cầu xác nhận trước khi thực hiện.
- Sau khi thu hồi thành công, phiếu trở về Bản nháp, lịch sử ghi nhận sự kiện "Thu hồi phiếu về bản nháp".
- Nếu cần điều chỉnh PO đã duyệt, đặt hoặc nhận, cần liên hệ bộ phận liên quan để xử lý theo quy trình phê duyệt thay đổi riêng.

## 5. Dữ liệu bắt buộc khi soạn PO
- Nhà cung cấp (khuyến nghị chọn ngay từ đầu).
- Danh mục nguyên liệu cần mua.
- Số lượng hợp lệ cho từng dòng.
- Đơn vị tính theo chuẩn nguyên liệu (không sửa tay).
- Đơn giá (nếu có) để tính tiền hàng.

## 6. Kiểm soát và truy vết
- Mọi thao tác chính (tạo, lưu, gửi, thu hồi, duyệt, nhận, hủy) đều được ghi lịch sử.
- Có xác nhận trước các hành động nhạy cảm (ví dụ thu hồi PO).
- Quy trình đảm bảo vừa linh hoạt (cho phép thu hồi) vừa kiểm soát (khóa theo trạng thái).

## 7. Nguyên tắc vận hành đề xuất
- Chỉ gửi PO khi đã rà soát đủ nhà cung cấp, số lượng, kho nhận.
- Hạn chế thu hồi nhiều lần để tránh nhiễu quy trình.
- Sau khi PO chuyển bước duyệt/đặt/nhận, mọi thay đổi nên xử lý theo quy trình nghiệp vụ chuẩn (thay vì sửa trực tiếp PO cũ).
