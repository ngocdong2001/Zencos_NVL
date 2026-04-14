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

### PROMPT 4 — Database Phần 4: Phiếu nhập kho (Inbound)

```
Bổ sung module Phiếu nhập kho (Inbound Receipt) để tách rõ khỏi Purchase Request.

MỤC TIÊU NGHIỆP VỤ:
- Purchase Request là kế hoạch mua hàng.
- Inbound Receipt là chứng từ nhận hàng thực tế.
- Một Purchase Request có thể được nhận nhiều lần.
- Mỗi lần nhận có thể nhận một phần hoặc toàn bộ số lượng.
- Chỉ khi phiếu nhập kho được xác nhận/posted thì mới tạo Batch và InventoryTransaction type='import'.

YÊU CẦU THIẾT KẾ:
- Giữ chuẩn DECIMAL(15,4) cho số lượng, DECIMAL(15,2) cho đơn giá, DECIMAL(18,2) cho thành tiền.
- Tách rõ header, item, documents, history.
- Hỗ trợ lưu nháp nhiều bước cho wizard nhập kho.
- Hỗ trợ truy vết từ Purchase Request → Inbound Receipt → Batch → InventoryTransaction.
- Hỗ trợ partial receiving.

━━━ 1. inbound_receipts (header phiếu nhập kho) ━━━
- id
- receipt_ref            string, unique  (auto-gen: NK-YYYY-XXXX)
- purchase_request_id    FK → purchase_requests.id, nullable
- supplier_id            FK → suppliers.id, nullable
- receiving_location_id  FK → inventory_locations.id, nullable
- status                 ENUM('draft','pending_qc','posted','cancelled') DEFAULT 'draft'
- expected_date          date, nullable
- received_at            datetime, nullable
- qc_checked_at          datetime, nullable
- created_by             FK → users.id
- posted_by              FK → users.id, nullable
- notes                  text, nullable
- timestamps

INDEX:
- (status)
- (purchase_request_id)
- (supplier_id)
- (receiving_location_id)

Mục đích:
- Là header của chứng từ nhập kho thực tế.
- Dùng cho wizard nhiều bước: Step 1, Step 2, Step 3, Step 4.
- Chỉ khi status = posted thì mới sinh dữ liệu kho thật.

━━━ 2. inbound_receipt_items (chi tiết từng dòng hàng nhận thực tế) ━━━
- id
- inbound_receipt_id         FK → inbound_receipts.id
- purchase_request_item_id   FK → purchase_request_items.id, nullable
- product_id                 FK → products.id
- lot_no                     string
- invoice_number             string, nullable
- invoice_date               date, nullable
- manufacture_date           date, nullable
- expiry_date                date, nullable
- quantity_base              DECIMAL(15,4)
- unit_used                  string
- quantity_display           DECIMAL(15,4)
- unit_price_per_kg          DECIMAL(15,2), default 0
- line_amount                DECIMAL(18,2), default 0
- qc_status                  ENUM('pending','passed','failed') DEFAULT 'pending'
- has_document               boolean, default false
- posted_batch_id            FK → batches.id, nullable
- posted_tx_id               FK → inventory_transactions.id, nullable
- notes                      text, nullable
- timestamps

UNIQUE KEY:
- (inbound_receipt_id, product_id, lot_no)

INDEX:
- (product_id)
- (purchase_request_item_id)
- (posted_batch_id)
- (posted_tx_id)
- (expiry_date)

Mục đích:
- Lưu số lượng thực nhận, lot, NSX, HSD, đơn giá, thành tiền theo từng dòng nhập thực tế.
- Tại thời điểm posted, mỗi dòng có thể sinh ra đúng 1 Batch và 1 InventoryTransaction import.

━━━ 3. inbound_receipt_item_documents (tài liệu đính kèm theo dòng nhập) ━━━
- id
- item_id                   FK → inbound_receipt_items.id
- doc_type                  ENUM('Invoice','COA','MSDS','Other')
- file_path                 string
- original_name             string
- mime_type                 string
- file_size                 unsignedBigInteger
- uploaded_by               FK → users.id
- created_at
- updated_at

INDEX:
- (item_id)

Mục đích:
- Lưu chứng từ upload ở Step 3.
- COA, Invoice, MSDS gắn với lần nhập thực tế.
- Có thể copy/sync sang batch_documents hoặc product_documents tùy loại tài liệu và quy trình QC.

━━━ 4. inbound_receipt_history (nhật ký thao tác phiếu nhập) ━━━
- id
- inbound_receipt_id        FK → inbound_receipts.id
- action_type               string
- action_label              string
- actor_id                  FK → users.id
- data                      JSON, nullable
- created_at

INDEX:
- (inbound_receipt_id)
- (created_at)

Mục đích:
- Ghi log các hành động: tạo phiếu, lưu nháp, cập nhật Step 1/2/3, upload tài liệu, posted, hủy phiếu.

━━━ 5. Điều chỉnh bảng hiện có để hỗ trợ partial receiving ━━━

purchase_requests:
- status nên đổi thành ENUM('draft','submitted','approved','ordered','partially_received','received','cancelled')
- Giữ received_at như hiện tại.
- Mục tiêu: phân biệt rõ PO đã nhận một phần với PO đã nhận đủ.

purchase_request_items:
- thêm received_qty_base DECIMAL(15,4), default 0
- công thức nghiệp vụ:
  pending_qty_base = quantity_needed_base - received_qty_base

inventory_transactions:
- thêm inbound_receipt_item_id FK → inbound_receipt_items.id, nullable
- giúp truy vết giao dịch import được tạo từ dòng inbound nào.

batches:
- thêm inbound_receipt_item_id FK → inbound_receipt_items.id, nullable
- giúp truy vết batch thực tế được sinh từ dòng inbound nào.

━━━ 6. Luồng xử lý chuẩn ━━━

1. Người dùng chọn Purchase Request và tạo inbound_receipt ở trạng thái draft.
2. Wizard Step 1-3 lưu lần lượt vào inbound_receipts, inbound_receipt_items, inbound_receipt_item_documents.
3. Step 4 chỉ là bước rà soát và xác nhận.
4. Khi người dùng xác nhận posted:
   - kiểm tra dữ liệu lot, số lượng, chứng từ bắt buộc
   - tạo Batch cho từng dòng inbound_receipt_items
   - tạo InventoryTransaction(type='import') tương ứng
   - cập nhật posted_batch_id, posted_tx_id
   - cập nhật purchase_request_items.received_qty_base
   - nếu nhận đủ toàn bộ thì purchase_requests.status = 'received'
   - nếu mới nhận một phần thì purchase_requests.status = 'partially_received'

━━━ 7. Quan hệ model bắt buộc ━━━

InboundReceipt:
- belongsTo(PurchaseRequest)
- belongsTo(Supplier)
- belongsTo(CatalogLocation) qua receiving_location_id
- belongsTo(User) qua created_by
- belongsTo(User) qua posted_by
- hasMany(InboundReceiptItem)
- hasMany(InboundReceiptHistory)

InboundReceiptItem:
- belongsTo(InboundReceipt)
- belongsTo(PurchaseRequestItem)
- belongsTo(Product)
- belongsTo(Batch) qua posted_batch_id
- belongsTo(InventoryTransaction) qua posted_tx_id
- hasMany(InboundReceiptItemDocument)

InboundReceiptItemDocument:
- belongsTo(InboundReceiptItem)
- belongsTo(User) qua uploaded_by

InboundReceiptHistory:
- belongsTo(InboundReceipt)
- belongsTo(User) qua actor_id

GHI CHÚ TRIỂN KHAI:
- Không dùng Purchase Request làm chứng từ nhập kho cuối cùng nữa.
- Purchase Request chỉ giữ vai trò yêu cầu mua và theo dõi trạng thái mua/nhận.
- Batch chỉ được tạo khi inbound_receipt được posted.
- Step 3 upload chứng từ phải gắn với inbound_receipt_items hoặc draft inbound tương ứng, không gắn trực tiếp vào Purchase Request.
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

── DATABASE (23 bảng) ──────────────────────────────────────────
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
opening_stock_item_documents | chứng từ đính kèm của tồn kho đầu kỳ
inbound_receipts       | phiếu nhập kho thực tế | draft/pending_qc/posted/cancelled
inbound_receipt_items  | chi tiết dòng nhập kho | lot, SL thực nhận, đơn giá, line amount
inbound_receipt_item_documents | chứng từ nhập kho theo dòng | Invoice/COA/MSDS/Other
inbound_receipt_history | nhật ký thao tác phiếu nhập kho

```


