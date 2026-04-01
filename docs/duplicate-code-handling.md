# Hướng dẫn xử lý trùng mã trong bảng dữ liệu

## Mục tiêu
Tài liệu này ghi lại vấn đề trùng `code` trong các bảng dữ liệu catalog và cách đã xử lý để áp dụng lại cho các bảng khác.

Mẫu đã áp dụng trong repo hiện tại:
- `materials` (products trong catalog)
- `customers`
- `suppliers`
- `classifications`
- `locations`
- `units` (kiểm tra duplicate ở backend theo query, chưa đưa vào unique key DB)

Hướng xử lý được chọn là bảo vệ 3 lớp:
- Database: chặn trùng bằng unique key
- Backend: bắt lỗi unique và trả thông báo rõ ràng
- Frontend: kiểm tra sớm để giảm request thừa và hiển thị thông báo inline

## Vấn đề
Khi người dùng sửa hoặc tạo mới một dòng trong DataTable, trường `code` có thể bị trùng với một dòng đã tồn tại.

Nếu không xử lý rõ ràng:
- Database sẽ ném lỗi unique khó đọc
- Frontend có thể fail im lặng hoặc chỉ log ra console
- Người dùng không biết vì sao lưu thất bại

## Nguyên tắc xử lý

### 1. Database là lớp bảo vệ cuối cùng
Mỗi bảng có `code` dùng để định danh nghiệp vụ phải có unique key ở database.

Ví dụ:
- `customers.code`
- `suppliers.code`
- `products.code`
- `catalog_classifications.code`
- `inventory_locations.code`

Nếu bảng chưa có unique key, cần ưu tiên thêm migration trước.

### 2. Backend phải bắt lỗi và đổi sang message nghiệp vụ
Không để lỗi raw của MySQL/Prisma đi thẳng lên UI.

Cần đổi lỗi unique thành HTTP `409` và message rõ ràng, ví dụ:
- `Mã khách hàng đã tồn tại`
- `Mã nhà cung cấp đã tồn tại`
- `Mã nguyên liệu đã tồn tại`
- `Mã vị trí kho đã tồn tại`

Trong repo hiện tại đã có 2 mẫu:

#### A. Route dùng SQL raw
File:
- `server/src/routes/catalog.ts`

Pattern:
- viết helper kiểm tra duplicate index theo tên index
- `try/catch` quanh câu lệnh `INSERT` hoặc `UPDATE`
- nếu trùng, `return res.status(409).json({ message: '...', code })`

Vị trí tham khảo:
- `isDuplicateIndexError`
- xử lý cho `materials` (update code)
- xử lý cho `customers`
- xử lý cho `suppliers`
- xử lý cho `classifications`
- xử lý cho `locations`

#### B. Route dùng Prisma ORM
File:
- `server/src/routes/masterData.ts`

Pattern:
- bắt `Prisma.PrismaClientKnownRequestError`
- kiểm tra `error.code === 'P2002'`
- kiểm tra `error.meta?.target` có chứa trường `code`
- trả `409` với message nghiệp vụ

Vị trí tham khảo:
- `isDuplicateCustomerCodeError`
- `isDuplicateSupplierCodeError`
- xử lý cho `POST /customers`
- xử lý cho `PUT /customers/:id`
- xử lý cho `POST /suppliers`
- xử lý cho `PUT /suppliers/:id`

#### C. Trường hợp không có unique key DB (tạm thời)
File:
- `server/src/routes/catalog.ts`

Pattern:
- viết helper query kiểm tra tồn tại trước khi `INSERT/UPDATE`
- nếu tồn tại, trả `409` ngay

Vị trí tham khảo:
- `hasDuplicateCatalogUnitCode`
- xử lý cho `POST /units`
- xử lý cho `PUT /units/:id`

### 3. Frontend kiểm tra sớm để phản hồi nhanh
Frontend không thay thế database, nhưng nên chặn sớm để tránh request thừa.

Pattern đã dùng trong repo:
- chuẩn hóa `code` bằng `trim().toUpperCase()`
- bỏ qua chính dòng đang sửa bằng điều kiện `item.id !== row.id`
- nếu trùng, hiện thông báo inline và không gọi API

File tham khảo:
- `src/pages/CatalogPage.tsx`

Thành phần liên quan:
- `normalizeCatalogCode`
- kiểm tra trùng cho `materials`
- kiểm tra trùng cho `catalogs[tab]`
- banner thông báo inline `catalog-inline-notice`

## Cách áp dụng cho bảng khác

### Bước 1. Xác nhận bảng có cột `code` và unique key
Checklist:
- model Prisma có `code String @unique`
- bảng database có unique index
- dữ liệu cũ đã được backfill nếu trước đây chưa có `code`

Lưu ý riêng cho `units` hiện tại:
- catalog units dùng bảng `product_units` với `product_id IS NULL`
- chưa có unique key riêng cho `unit_code_name` ở lớp DB
- đang được chặn duplicate ở backend bằng helper query

### Bước 2. Thêm xử lý `409` ở backend
Nếu bảng đang dùng SQL raw:
- bắt duplicate theo tên index
- trả message nghiệp vụ riêng cho bảng đó

Nếu bảng đang dùng Prisma ORM:
- bắt `P2002`
- kiểm tra `target` có `code`
- trả message nghiệp vụ riêng cho bảng đó

Mẫu message nên thống nhất:
- `Mã <ten bang> đã tồn tại`

Ví dụ:
- `Mã nhà cung cấp đã tồn tại`
- `Mã phân loại đã tồn tại`
- `Mã đơn vị đã tồn tại`
- `Mã vị trí kho đã tồn tại`

### Bước 3. Thêm chặn sớm ở frontend
Ở hàm lưu của bảng:
- chuẩn hóa `row.code`
- so sánh với danh sách hiện có trong state
- nếu trùng thì set thông báo inline và `return false`

Mẫu logic:

```ts
const normalizedCode = normalizeCatalogCode(row.code)
const duplicated = rows.some((item) => item.id !== row.id && normalizeCatalogCode(item.code) === normalizedCode)

if (normalizedCode && duplicated) {
  setCatalogNotice({ tone: 'error', message: 'Mã ... đã tồn tại trong danh mục hiện tại.' })
  return false
}
```

### Bước 4. Hiện thông báo thay vì fail im lặng
Không dùng `alert()` nếu có thể tránh được.

Nên ưu tiên:
- inline notice trong page
- toast
- message gần bảng dữ liệu đang thao tác

Trong repo hiện tại đã đổi sang inline notice tại:
- `src/pages/CatalogPage.tsx`
- `src/App.css`

## Checklist triển khai nhanh
- [ ] Bảng có cột `code`
- [ ] `code` có unique key trong database
- [ ] Backend trả `409` khi trùng mã
- [ ] Frontend chặn sớm trước khi gọi API
- [ ] UI hiện message rõ ràng cho người dùng
- [ ] Build pass sau khi sửa
- [ ] Test 2 trường hợp: tạo mới trùng mã và sửa dòng hiện có thành mã đã tồn tại

## Trạng thái áp dụng hiện tại
- [x] `materials` (catalog) đã trả `409` khi update trùng `products.code`
- [x] `customers` đã trả `409` ở create/update
- [x] `suppliers` đã trả `409` ở create/update
- [x] `classifications` đã trả `409` ở create/update
- [x] `locations` đã trả `409` ở create/update
- [x] `units` đã chặn trùng mã ở backend (query check)
- [x] frontend catalog đã chặn trùng mã sớm và hiện inline notice

## Bổ sung fix thực tế: Import Excel Phân loại

### Triệu chứng
Khi import Excel ở tab `classifications`, nếu trùng mã (ví dụ `RAW_MATERIAL`) thì UI báo:

- `Database unavailable. Please check your DATABASE_URL and MySQL server.`

Trong log backend thấy lỗi duplicate từ MySQL:

- `Code: 1062`
- key thực tế: `product_classifications.uq_catalog_classifications_code`

### Nguyên nhân
Nhánh bắt duplicate trước đó phụ thuộc tên index cố định, nhưng trên DB thực tế tên key khác (`uq_catalog_classifications_code`), dẫn tới không match và lỗi rơi xuống global error handler.

### Cách xử lý đã áp dụng
Tại route `classifications` trong `server/src/routes/catalog.ts`:

1. Trước `INSERT`, query kiểm tra `code` đã tồn tại chưa.
2. Trước `UPDATE`, nếu có đổi `code`, query kiểm tra trùng với bản ghi khác.
3. Nếu trùng, trả ngay `409` với message nghiệp vụ:
  - `Mã phân loại đã tồn tại`

### Kết quả
- Import Excel phân loại khi trùng mã không còn rơi vào `Database unavailable`.
- UI nhận đúng lỗi nghiệp vụ để hiển thị cho người dùng.

## Lưu ý
- Kiểm tra client chỉ là lớp sớm, không được bỏ unique key trong database.
- Khi so sánh mã ở frontend nên normalize về cùng định dạng, tối thiểu là `trim + uppercase`.
- Khi update, phải bỏ qua chính dòng đang sửa. Nếu không sẽ bị báo trùng giả.
- Nếu bảng có generate mã tự động, vẫn phải giữ xử lý duplicate ở backend để tránh race condition.

## File tham khảo trong repo
- `server/src/routes/catalog.ts`
- `server/src/routes/masterData.ts`
- `src/pages/CatalogPage.tsx`
- `src/App.css`
- `server/prisma/schema.warehouse.prisma`
- `server/prisma/migrations_warehouse/202604010001_add_customers_code.sql`