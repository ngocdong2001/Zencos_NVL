# PrimeReact DataTable Migration Log

## 1. Mục tiêu
Tài liệu này ghi lại toàn bộ quá trình chuyển đổi giao diện bảng dữ liệu từ HTML table sang PrimeReact DataTable trong module mua hàng và đồng bộ style/pagination giữa các trang liên quan.

## 2. Phạm vi migration
- Purchase shortage list trong `src/pages/PurchaseOrderPage.tsx`
- Footer pagination dùng chung:
  - `src/pages/PurchaseOrderPage.tsx`
  - `src/pages/CatalogPage.tsx`
  - `src/pages/OpeningStockPage.tsx`
- Shared pagination component mới:
  - `src/components/layout/PagedTableFooter.tsx`
- CSS đồng bộ style:
  - `src/App.css`

## 3. Hiện trạng trước khi đổi
- Shortage list ở trang mua hàng đang dùng HTML `<table>` thủ công.
- Checkbox chọn dòng trong shortage chỉ là UI placeholder, chưa có state thật.
- Pagination footer bị lặp logic giữa Catalog/OpeningStock/Purchase.
- Typography và visual style shortage table chưa đồng bộ với DataTable trên Catalog.

## 4. Timeline và các bước đã thực hiện

### Bước A - Nâng cấp pagination UX trên shortage + PO list
- Tăng page size mặc định và bổ sung select số dòng/trang.
- Thêm thông tin range: "Hiển thị x-y trong tổng số z bản ghi".
- Thêm pagination có ellipsis.

Kết quả:
- Shortage và PO list có pagination đầy đủ thông tin, dễ quan sát dữ liệu hơn.

### Bước B - Tạo shared component cho footer pagination
- Tạo `PagedTableFooter` tại `src/components/layout/PagedTableFooter.tsx`.
- Component hỗ trợ 3 prefix style: `shortage`, `po`, `catalog`.
- Chuyển các trang sau sang dùng component chung:
  - `CatalogPage.tsx`
  - `OpeningStockPage.tsx`
  - `PurchaseOrderPage.tsx`
- Xóa component cũ không còn dùng:
  - `src/components/catalog/CatalogGridFooter.tsx`

Kết quả:
- Loại bỏ duplicate code pagination.
- Dễ bảo trì và mở rộng style/pagination sau này.

### Bước C - Đồng bộ style datatable shortage
- Chỉnh lại CSS shortage table để giống style DataTable trên Catalog:
  - Header/background/padding/border/hover
  - Width + fixed layout + ellipsis
  - Typography: size, weight, line-height
- Các class shortage được tinh chỉnh trong `src/App.css`.

Kết quả:
- Bảng shortage nhìn đồng nhất hơn với các bảng PrimeReact hiện có.

### Bước D - Chuyển shortage từ HTML table sang PrimeReact DataTable
- Trong `PurchaseOrderPage.tsx`:
  - Thêm import `DataTable`, `Column`.
  - Thay block HTML `<table>` bằng `DataTable` + `Column`.
  - Giữ nguyên mapping cột dữ liệu và badge trạng thái.
  - Giữ nguyên loading + empty message.
- Trong `src/App.css`:
  - Đổi selector từ `.shortage-table thead/tbody` sang selector PrimeReact:
    - `.shortage-table .p-datatable-wrapper`
    - `.shortage-table .p-datatable-table`
    - `.shortage-table .p-datatable-thead > tr > th`
    - `.shortage-table .p-datatable-tbody > tr > td`

Kết quả:
- Shortage table đã là PrimeReact DataTable, không còn HTML table thủ công.

### Bước E - Bật selection thật cho shortage (mục 1)
- Thêm state `selectedShortageIds`.
- Thêm logic chọn theo trang hiện tại:
  - `selectedShortageRows`
  - `allShortageVisibleSelected`
  - `handleToggleShortageVisibleRows`
  - `handleShortageSelectionChange`
- Kết nối vào DataTable:
  - `selectionMode="checkbox"`
  - `selection={selectedShortageRows}`
  - `onSelectionChange=...`
  - `selectAll={allShortageVisibleSelected}`
  - `onSelectAllChange=...`

Kết quả:
- Checkbox row/select-all của shortage đã hoạt động thật.
- Phạm vi select-all áp dụng trên trang shortage hiện tại (không tác động các trang khác).

## 5. Danh sách file đã thay đổi trong migration này
- `src/pages/PurchaseOrderPage.tsx`
- `src/pages/CatalogPage.tsx`
- `src/pages/OpeningStockPage.tsx`
- `src/components/layout/PagedTableFooter.tsx` (mới)
- `src/App.css`
- `src/components/catalog/CatalogGridFooter.tsx` (đã xóa)

## 6. Quy ước và quyết định kỹ thuật
- Sử dụng PrimeReact DataTable cho shortage thay vì HTML table để đồng bộ hệ thống.
- Tiếp tục dùng `PagedTableFooter` cho tất cả list chính để tránh duplicate logic.
- Bảo toàn dữ liệu API và mapping nghiệp vụ hiện có, chỉ thay đổi presentation + interaction.
- Selection shortage đang được quản lý theo trang hiện tại để UX rõ ràng và dễ kiểm soát.
- Quy ước canh lề dữ liệu trong DataTable:
  - Dữ liệu kiểu số (quantity, amount, conversion, tồn kho...) canh phải.
  - Dữ liệu kiểu text (mã, tên, mô tả, trạng thái...) canh trái.

## 7. Kiểm thử đã thực hiện
Sau mỗi đợt sửa, đã chạy:
- `npm run build`

Trạng thái:
- Build thành công.
- Không phát hiện lỗi TypeScript/CSS từ các thay đổi migration.

## 8. Tình trạng hiện tại và bước tiếp theo
Đã xong:
- Chuyển shortage sang PrimeReact DataTable.
- Đồng bộ style/typography theo Catalog DataTable.
- Bật selection thật cho shortage.
- Chuẩn hóa pagination dùng chung trên Catalog/OpeningStock/Purchase.

Chưa làm (nếu cần):
- Nối dữ liệu dòng đã chọn trong shortage vào panel "Soạn nhanh yêu cầu mua hàng (PO)".
- Xuất báo cáo dựa trên danh sách đã chọn.

## 9. Lưu ý rollback nhanh
Nếu cần rollback riêng shortage DataTable:
1. Khôi phục block HTML table trong `PurchaseOrderPage.tsx`.
2. Đổi CSS `.shortage-table .p-datatable-*` về selector HTML table cũ.
3. Bỏ state/handler `selectedShortageIds` nếu không dùng selection nữa.

## 10. Rule tự động cho AI agent (Figma -> UI)
Đã bổ sung rule bắt buộc trong `.github/copilot-instructions.md` để các lần generate code sau tự động tuân thủ:
- Khi convert từ Figma mà gặp bảng/list dạng dữ liệu: dùng PrimeReact `DataTable` + `Column`.
- Tránh tạo mới bảng nghiệp vụ bằng HTML `<table>` (trừ khi user yêu cầu rõ ràng).
- Các control phổ biến ưu tiên dùng PrimeReact (`InputText`, `InputNumber`, `InputTextarea`, `Dropdown`, `Calendar`, `Checkbox`, `RadioButton`, `Button`, `Dialog`, `TabView/TabPanel`).
- Ưu tiên đồng bộ visual/interaction với các trang đã chuẩn hóa PrimeReact trong dự án.

---
Người cập nhật: GitHub Copilot (GPT-5.3-Codex)
Ngày cập nhật: 2026-04-07
