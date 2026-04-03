# BỘ PROMPT HOÀN CHỈNH
## Phần mềm Quản lý Xuất Nhập Tồn Kho Nguyên Vật Liệu

---

## HƯỚNG DẪN SỬ DỤNG

---

## TỔNG QUAN NGHIỆP VỤ

### Hai loại hàng hóa

**A. Nguyên vật liệu (raw_material)**
- Có lot_no, ngày sản xuất, hạn sử dụng → dùng FEFO
- Nhiều quy cách: 1 drum = 2kg = 2000gr, 1kg = 1000gr, v.v.
- Đơn vị cơ sở: **GRAM**
- Tài liệu theo **lô**: Invoice, COA (Certificate of Analysis)
- Tài liệu theo **sản phẩm**: MSDS, Spec Sheet

**B. Bao bì (packaging)**
- Không có HSD, không dùng FEFO
- Đơn vị: cái/chiếc, **PCS**
- Không có quy cách phức tạp
- Tài liệu theo lô: Invoice

### Nghiệp vụ xuất kho thiếu hàng
Khi xuất kho thiếu hàng: **KHÔNG xuất gì cả**, tạo `ExportOrder(pending)` + tự động tạo `PurchaseRequest(draft)`. Khi hàng về → thông báo → người dùng **chủ động** bấm "Xuất cho đơn này".

---

## LƯỢT CHAT 1: KIẾN TRÚC, DATABASE & SERVICES

> **Mở session Claude Code mới. Gửi từng prompt theo thứ tự.**

---

### PROMPT 0 — Khởi tạo kiến trúc & tài liệu

```
Bạn là Senior Laravel Developer. Dự án: Phần mềm Quản lý Xuất Nhập Tồn Kho
Nguyên Vật Liệu.

STACK BẮT BUỘC:
  - Frontend: React + TypeScript + Vite
  - Backend: Express + TypeScript
  - Database: MySQL + Prisma ORM

QUY TẮC KỸ THUẬT — KHÔNG ĐƯỢC BỎ QUA:
1. Số lượng (gram/PCS): DECIMAL(15,4) — tuyệt đối KHÔNG dùng FLOAT/DOUBLE
2. Tiền tệ (đơn giá/kg):  DECIMAL(15,2) — tuyệt đối KHÔNG dùng FLOAT/DOUBLE
3. SoftDeletes: BẮT BUỘC cho products, suppliers, customers, batches
4. Concurrency: DB::transaction() + lockForUpdate() cho mọi thao tác nhập/xuất
5. FEFO: xuất lô gần hết hạn trước (expiry_date ASC NULLS LAST), cắt qua
   nhiều lô nếu 1 lô không đủ số lượng
6. Primary key: bigIncrements (không dùng UUID)
7. Ngôn ngữ: 100% tiếng Việt (UI, comment, validation message, flash message)
8. Kiến trúc: Controller → Service → Model
   (Controller KHÔNG được gọi Model trực tiếp, chỉ gọi qua Service)

HAI LOẠI HÀNG HÓA (product_type):
  A. raw_material: có lot, NSX, HSD, FEFO, nhiều quy cách, COA/MSDS
     Đơn vị cơ sở: GRAM
  B. packaging   : không có HSD, không FEFO, đơn giản
     Đơn vị cơ sở: PCS

NGHIỆP VỤ XUẤT KHO THIẾU HÀNG:
  - Khi thiếu hàng: KHÔNG xuất gì cả
  - Tạo ExportOrder(status='pending') + PurchaseRequest(status='draft') tự động
  - Khi hàng về: thông báo, người dùng CHỦ ĐỘNG bấm xuất cho đơn đang chờ
  - PurchaseRequest cần duyệt: draft → submitted → approved → ordered → received

```

---

### PROMPT 1 — Database Phần 1: Hàng hóa & Danh mục

```
Bắt đầu Giai đoạn 1: Database (Phần 1 — Hàng hóa & Danh mục).

━━━ 1. users  ━━━

━━━ 2. products ━━━
- id
- code             string, unique
- name             string
- inci_name        string, nullable         (tên khoa học/INCI cho NVL)
- product_type     BIGINT UNSIGNED, FK → product_classifications.id
- has_expiry       boolean, default true    (packaging = false)
- use_fefo         boolean, default true    (packaging = false)
- base_unit        BIGINT UNSIGNED, FK → product_units.id
- min_stock_level  DECIMAL(15,4), default 0
- notes            text, nullable
- SoftDeletes + timestamps

━━━ 3. product_units (đơn vị + quy cách quy đổi) ━━━
- id
- product_id       FK → products, nullable
- parent_unit_id   FK tự tham chiếu product_units.id, nullable
- unit_code_name   string, nullable (mã đơn vị)
- unit_name        string   VD: 'drum', 'kg', 'gói', 'PCS'
- unit_memo        string, nullable
- conversion_to_base DECIMAL(15,4)
    VD: drum→2000 (1 drum = 2000 gram), kg→1000, gói→500
- is_purchase_unit boolean  (đơn vị dùng khi nhập hàng từ NCC)
- is_default_display boolean (đơn vị hiển thị mặc định trên UI)
- timestamps
- UNIQUE KEY: (product_id, unit_name)
- Ghi chú: bảng này đang dùng theo mô hình hybrid:
  - product_id = null: đơn vị danh mục dùng chung
  - product_id != null: quy cách riêng theo từng sản phẩm

━━━ 4. product_documents (tài liệu cấp sản phẩm) ━━━
- id
- product_id       FK → products
- doc_type         ENUM('MSDS','Spec','Other')
- file_path        string
- original_name    string
- file_size        unsignedBigInteger, nullable
- uploaded_by      FK → users
- valid_until      date, nullable
- notes            text, nullable
- timestamps

━━━ 5. suppliers ━━━
- id, code(unique), name, contact_info, address, notes
- SoftDeletes + timestamps

━━━ 6. customers ━━━
- id, code(unique), name, phone, email, address, notes
- SoftDeletes + timestamps

TRONG CÁC MODEL — thiết lập đầy đủ:

Product:
- hasMany(ProductUnit), hasMany(ProductDocument)
- hasMany(Batch)
- belongsTo(ProductClassification) qua product_type
- baseUnit tham chiếu ProductUnit qua base_unit
- getDisplayUnitAttribute(): trả về ProductUnit có is_default_display = true,
  nếu không có trả về base_unit

ProductUnit:
- belongsTo(Product)
- Method convertToBase(float $qty): float
    return round($qty * $this->conversion_to_base, 4)

Supplier: hasMany(Batch)
Customer: hasMany(ExportOrder)
---

### PROMPT 2 — Database Phần 2: Kho, Giao dịch & Xuất kho

```
Tiếp tục Giai đoạn 1: Database (Phần 2 — Kho & Giao dịch).

━━━ 1. batches ━━━
- id
- product_id           FK → products
- supplier_id          FK → suppliers, nullable
- lot_no               string
- invoice_number       string, nullable
- invoice_date         date, nullable
- unit_price_per_kg    DECIMAL(15,2), default 0
- received_qty_base    DECIMAL(15,4)   (số lượng nhập theo đơn vị cơ sở: gram/PCS)
- purchase_unit        string, nullable (đơn vị khi mua: 'drum', 'kg', 'PCS')
- purchase_qty         DECIMAL(15,4), nullable (số lượng theo đơn vị mua)
- manufacture_date     date, nullable
- expiry_date          date, nullable
- status               ENUM('available','quarantine','rejected','expired')
                       DEFAULT 'available'
- notes                text, nullable
- SoftDeletes + timestamps

INDEX QUAN TRỌNG: (product_id, status, expiry_date) — cho query FEFO

━━━ 2. batch_documents (tài liệu cấp lô hàng) ━━━
- id
- batch_id             FK → batches
- doc_type             ENUM('Invoice','COA','Other')
- file_path            string
- original_name        string
- mime_type            string
- file_size            unsignedBigInteger
- uploaded_by          FK → users
- timestamps

━━━ 3. export_orders (phiếu xuất — header) ━━━
- id
- customer_id          FK → customers, nullable
- order_ref            string, nullable  (số phiếu xuất, tự sinh)
- exported_at          datetime, nullable
- created_by           FK → users
- status               ENUM('pending','fulfilled','cancelled') DEFAULT 'pending'
- notes                text, nullable
- timestamps

━━━ 4. export_order_items (từng dòng NVL/bao bì trong phiếu xuất) ━━━
- id
- export_order_id      FK → export_orders
- batch_id             FK → batches, nullable  (null khi pending, điền khi fulfilled)
- product_id           FK → products
- quantity_base        DECIMAL(15,4)   (số lượng theo đơn vị cơ sở)
- unit_used            string          (đơn vị nhập trên form: 'gram', 'kg', 'PCS')
- quantity_display     DECIMAL(15,4)   (số lượng theo unit_used để hiển thị)
- unit_price_snapshot  DECIMAL(15,2), default 0 (đơn giá lúc xuất, lưu lại)
- status               ENUM('pending','fulfilled','cancelled') DEFAULT 'pending'
- timestamps

━━━ 5. inventory_transactions (sổ cái — mọi giao dịch) ━━━
- id
- batch_id             FK → batches
- user_id              FK → users
- export_order_item_id FK → export_order_items, nullable
                       (null khi nhập hoặc điều chỉnh)
- type                 ENUM('import','export','adjustment')
- quantity_base        DECIMAL(15,4)  LUÔN DƯƠNG — chiều do type quyết định
- notes                text, nullable
- transaction_date     datetime
- timestamps

━━━ 6. purchase_requests (đề xuất mua hàng) ━━━
- id
- export_order_id      FK → export_orders, nullable
                       (null nếu tạo thủ công, không từ đơn xuất)
- request_ref          string, unique  (auto-gen: PR-YYYY-XXXX)
- requested_by         FK → users
- approved_by          FK → users, nullable
- supplier_id          FK → suppliers, nullable  (NCC dự kiến)
- status               ENUM('draft','submitted','approved','ordered',
                            'received','cancelled') DEFAULT 'draft'
- expected_date        date, nullable
- notes                text, nullable
- submitted_at         datetime, nullable
- approved_at          datetime, nullable
- ordered_at           datetime, nullable
- received_at          datetime, nullable
- timestamps

INDEX: (status), (export_order_id)

━━━ 7. purchase_request_items (chi tiết đề xuất mua) ━━━
- id
- purchase_request_id  FK → purchase_requests
- product_id           FK → products
- export_order_item_id FK → export_order_items, nullable
                       (liên kết dòng xuất bị thiếu hàng)
- quantity_needed_base DECIMAL(15,4)  (số lượng cần mua, đơn vị cơ sở)
- unit_display         string         (đơn vị hiển thị: 'kg', 'drum', 'PCS')
- quantity_display     DECIMAL(15,4)  (số lượng theo unit_display)
- notes                text, nullable
- timestamps

━━━ 8. notifications ━━━
- id
- user_id              FK → users
- type                 string   (VD: 'pending_order_stock_available')
- data                 JSON     (chứa: product_id, batch_id, order_ids[], message)
- read_at              datetime, nullable
- timestamps

---

### PROMPT 3 — Database Phần 3: Danh mục tra cứu (Catalog Tables)

```
Bổ sung 3 bảng danh mục tra cứu cho giao diện Catalog (trang quản lý danh mục):

━━━ 1. product_classifications (Phân loại NVL) ━━━
- id         bigIncrements (unsigned BIGINT)
- code       string, unique   (VD: 'RAW_MATERIAL', 'FRAGRANCE', 'PACKAGING')
- name       string           (tên hiển thị tiếng Việt)
- notes      text, nullable
- deleted_at datetime, nullable  (soft delete)
- timestamps (created_at, updated_at)

Mục đích: Dropdown chọn phân loại khi tạo/sửa NVL trong bảng products.
Trường products.product_type tham chiếu product_classifications.id.

━━━ 2. product_units (Đơn vị tính) ━━━
- id         bigIncrements (unsigned BIGINT)
- product_id       FK → products, nullable
- parent_unit_id   FK tự tham chiếu product_units.id, nullable
- unit_code_name   string, nullable
- unit_name        string
- unit_memo        string, nullable
- conversion_to_base DECIMAL(15,4)
- is_purchase_unit boolean
- is_default_display boolean
- timestamps

Mục đích:
- Danh mục đơn vị dùng chung (product_id = null)
- Quy cách chuyển đổi theo từng sản phẩm (product_id != null)
- Liên kết với products.base_unit (FK → product_units.id)

━━━ 3. inventory_locations (Vị trí kho) ━━━
- id         bigIncrements (unsigned BIGINT)
- code       string, unique   (VD: 'LOC-001', 'KEA1', 'PHONG_LANH')
- name       string           (tên vị trí: 'Kệ A1', 'Phòng lạnh', ...)
- notes      text, nullable
- deleted_at datetime, nullable  (soft delete)
- timestamps

Mục đích: Dropdown chọn vị trí lưu trữ trong phiếu nhập/xuất (batches).

GHI CHÚ TRIỂN KHAI:
- product_classifications và inventory_locations dùng cấu trúc BasicRow gần đúng
- product_units có cấu trúc chuyên biệt để hỗ trợ quy đổi đơn vị
- API endpoint: /api/catalog/{classifications|units|locations}
- CRUD đầy đủ: GET (list, filter deleted_at IS NULL), POST, PUT/:id, DELETE/:id (soft)
- Không có FK sang bảng khác (bảng tra cứu độc lập)
```
---

## CONTEXT BLOCK MASTER
### (Dùng để tham chiếu bất kỳ lúc nào, cập nhật tiến độ)

```
=== CONTEXT BLOCK MASTER — CẬP NHẬT TIẾN ĐỘ ===

STACK: 
  - Frontend: React + TypeScript + Vite
  - Backend: Express + TypeScript
  - Database: MySQL + Prisma ORM

── QUY TẮC BẤT BIẾN ───────────────────────────────────────────
• DECIMAL(15,4) cho số lượng | DECIMAL(15,2) cho tiền | KHÔNG FLOAT
• SoftDeletes: products, suppliers, customers, batches
• DB::transaction() + lockForUpdate() cho nhập/xuất
• FEFO: expiry_date ASC NULLS LAST, cắt qua nhiều lô
• Thiếu hàng → pending + PR, KHÔNG xuất
• Controller → Service → Model (không bỏ qua tầng)
• React: .tsx, useForm @inertiajs/react, Shadcn/UI
• Tiếng Việt 100%: UI, comment, validation, flash

── DATABASE (18 bảng) ──────────────────────────────────────────
users                  | role: admin/warehouse_staff/viewer
products               | product_type FK → product_classifications.id | base_unit FK → product_units.id | SoftDeletes
product_units          | đơn vị + quy đổi (hybrid catalog/ theo sản phẩm) | conversion_to_base DEC(15,4)
product_documents      | MSDS/Spec — cấp sản phẩm
suppliers              | SoftDeletes
customers              | SoftDeletes
batches                | status: available/quarantine/rejected/expired | SoftDeletes
batch_documents        | Invoice/COA — cấp lô
export_orders          | status: pending/fulfilled/cancelled
export_order_items     | status: pending/fulfilled/cancelled | batch_id nullable khi pending
inventory_transactions | quantity_base luôn dương | type quyết định chiều
purchase_requests      | PR-YYYY-XXXX | status 6 bước
purchase_request_items | link về export_order_item
notifications          | data JSON | read_at nullable
product_classifications | danh mục phân loại sản phẩm
inventory_locations    | danh mục vị trí kho
opening_stock_declarations | phiếu khai báo tồn kho đầu kỳ (draft/posted/cancelled)
opening_stock_items    | chi tiết dòng khai báo tồn kho đầu kỳ

```


