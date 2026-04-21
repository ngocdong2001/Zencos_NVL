# Kế hoạch: Mở rộng thông tin nguyên vật liệu (INCI Names, Nhà sản xuất, Nhà cung cấp)

**Ngày:** 20/04/2026  
**Phương án chọn:** Giữ nguyên bảng `products`, thêm 3 bảng phụ quan hệ 1-N và N-N

---

## Quy tắc nghiệp vụ đã xác nhận

1. Một NVL có thể có **nhiều INCI name**
2. Một NVL có thể có **nhiều nhà sản xuất** (khác nhà cung cấp)
3. Một NVL có thể có **nhiều nhà cung cấp** (dùng bảng `suppliers` đã có, nối qua junction)
4. Khi nhập kho (phiếu nhập), **phải ghi rõ nhà sản xuất** của lô hàng
5. INCI name chỉ tồn tại trên bảng phụ — xóa cột `inci_name` khỏi `products` sau khi migrate
6. Nhà sản xuất và nhà cung cấp là **2 khái niệm riêng biệt**
7. Tìm kiếm autocomplete NVL tìm theo **tất cả INCI names** (không chỉ is_primary)

---

## Mô hình quan hệ tổng thể

```
products (giữ nguyên, code vẫn UNIQUE)
├── product_inci_names      (1-N)  — nhiều INCI name, has isPrimary
├── product_manufacturers   (1-N)  — nhiều nhà sản xuất, has isPrimary, has deletedAt
│     ↑ FK từ:
│     ├── batches.manufacturer_id              (per-lô)
│     └── inbound_receipt_items.manufacturer_id (per-dòng phiếu nhập)
└── product_suppliers       (N-N)  — junction với bảng suppliers đã có
      ↑ suppliers đã tồn tại, cũng được tham chiếu bởi:
      ├── batches.supplier_id
      ├── inbound_receipts.supplier_id
      └── purchase_requests.supplier_id
```

---

## Phase 1 — Schema & Migration

### 1.1 Bảng mới `product_inci_names`

```prisma
model ProductInciName {
  id        BigInt   @id @default(autoincrement()) @db.UnsignedBigInt
  productId BigInt   @map("product_id") @db.UnsignedBigInt
  inciName  String   @map("inci_name") @db.VarChar(255)
  isPrimary Boolean  @default(false) @map("is_primary")
  notes     String?  @db.Text
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@map("product_inci_names")
}
```

### 1.2 Bảng mới `product_manufacturers`

```prisma
model ProductManufacturer {
  id          BigInt    @id @default(autoincrement()) @db.UnsignedBigInt
  productId   BigInt    @map("product_id") @db.UnsignedBigInt
  name        String    @db.VarChar(255)
  country     String?   @db.VarChar(100)
  contactInfo String?   @map("contact_info") @db.VarChar(255)
  isPrimary   Boolean   @default(false) @map("is_primary")
  notes       String?   @db.Text
  deletedAt   DateTime? @map("deleted_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  product     Product   @relation(fields: [productId], references: [id], onDelete: Restrict)
  batches              Batch[]
  inboundReceiptItems  InboundReceiptItem[]

  @@index([productId])
  @@map("product_manufacturers")
}
```

### 1.3 Bảng junction mới `product_suppliers`

Dùng lại bảng `suppliers` đã có, nối qua junction:

```prisma
model ProductSupplier {
  id         BigInt   @id @default(autoincrement()) @db.UnsignedBigInt
  productId  BigInt   @map("product_id") @db.UnsignedBigInt
  supplierId BigInt   @map("supplier_id") @db.UnsignedBigInt
  isPrimary  Boolean  @default(false) @map("is_primary")
  notes      String?  @db.Text
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  supplier   Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)

  @@unique([productId, supplierId])
  @@index([productId])
  @@index([supplierId])
  @@map("product_suppliers")
}
```

### 1.4 Sửa model `Product` — xóa `inciName`, thêm 3 relations

```diff
model Product {
-  inciName  String?  @map("inci_name") @db.VarChar(255)   // XÓA sau migrate
+  inciNames        ProductInciName[]
+  manufacturers    ProductManufacturer[]
+  productSuppliers ProductSupplier[]
}
```

### 1.5 Sửa `Batch` và `InboundReceiptItem` — thêm `manufacturerId`

```diff
model Batch {
+  manufacturerId  BigInt?              @map("manufacturer_id") @db.UnsignedBigInt
+  manufacturer    ProductManufacturer? @relation(...)
}

model InboundReceiptItem {
+  manufacturerId  BigInt?              @map("manufacturer_id") @db.UnsignedBigInt
+  manufacturer    ProductManufacturer? @relation(...)
}
```

### 1.6 Sửa `Supplier` — thêm relation ngược

```diff
model Supplier {
+  productSuppliers ProductSupplier[]
}
```

### 1.7 Migration SQL

```sql
-- Tạo product_inci_names
CREATE TABLE product_inci_names (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id  BIGINT UNSIGNED NOT NULL,
  inci_name   VARCHAR(255) NOT NULL,
  is_primary  TINYINT(1) NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) NOT NULL,
  CONSTRAINT fk_pin_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_pin_product (product_id)
);

-- Migrate dữ liệu inci_name cũ → bảng mới (is_primary = true)
INSERT INTO product_inci_names (product_id, inci_name, is_primary, created_at, updated_at)
SELECT id, inci_name, 1, NOW(3), NOW(3)
FROM products
WHERE inci_name IS NOT NULL AND inci_name != '';

-- Tạo product_manufacturers
CREATE TABLE product_manufacturers (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id   BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(255) NOT NULL,
  country      VARCHAR(100),
  contact_info VARCHAR(255),
  is_primary   TINYINT(1) NOT NULL DEFAULT 0,
  notes        TEXT,
  deleted_at   DATETIME(3),
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3) NOT NULL,
  CONSTRAINT fk_pm_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_pm_product (product_id)
);

-- Thêm manufacturer_id vào batches
ALTER TABLE batches
  ADD COLUMN manufacturer_id BIGINT UNSIGNED,
  ADD INDEX idx_batch_manufacturer (manufacturer_id),
  ADD CONSTRAINT fk_batch_manufacturer
    FOREIGN KEY (manufacturer_id) REFERENCES product_manufacturers(id) ON DELETE SET NULL;

-- Thêm manufacturer_id vào inbound_receipt_items
ALTER TABLE inbound_receipt_items
  ADD COLUMN manufacturer_id BIGINT UNSIGNED,
  ADD INDEX idx_iri_manufacturer (manufacturer_id),
  ADD CONSTRAINT fk_iri_manufacturer
    FOREIGN KEY (manufacturer_id) REFERENCES product_manufacturers(id) ON DELETE SET NULL;

-- Tạo product_suppliers (junction)
CREATE TABLE product_suppliers (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id  BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  is_primary  TINYINT(1) NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) NOT NULL,
  CONSTRAINT fk_ps_product  FOREIGN KEY (product_id)  REFERENCES products(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ps_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ps_product_supplier (product_id, supplier_id),
  INDEX idx_ps_product  (product_id),
  INDEX idx_ps_supplier (supplier_id)
);

-- Xóa cột cũ (chỉ chạy SAU KHI verify migration data OK)
ALTER TABLE products DROP COLUMN inci_name;
```

---

## Phase 2 — Backend `server/src/routes/catalog.ts`

### Sửa endpoints hiện có

**`GET /materials` và `GET /materials/:id`** — include 3 relations:
```typescript
include: {
  inciNames:       { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
  manufacturers:   { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
  productSuppliers: {
    include: { supplier: { select: { id: true, code: true, name: true } } },
    orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
  },
}
```

**`POST /materials`** — nhận thêm trong body:
```typescript
inciNames?: Array<{ inciName: string; isPrimary?: boolean; notes?: string }>
manufacturers?: Array<{ name: string; country?: string; contactInfo?: string; isPrimary?: boolean }>
supplierIds?: Array<{ supplierId: number; isPrimary?: boolean }>
```
Tạo bằng `createMany` sau khi tạo product.

**`PUT /materials/:id`** — upsert sub-lists: so sánh old vs new, insert thêm / update / xóa bị remove.

### Endpoints mới cho sub-lists

```
POST   /materials/:id/inci-names              — thêm 1 INCI name
PUT    /materials/:id/inci-names/:inciId      — sửa
DELETE /materials/:id/inci-names/:inciId      — xóa hard

POST   /materials/:id/manufacturers           — thêm 1 nhà SX
PUT    /materials/:id/manufacturers/:mfgId    — sửa
DELETE /materials/:id/manufacturers/:mfgId    — soft-delete (deletedAt)

POST   /materials/:id/suppliers               — gán nhà CC
PUT    /materials/:id/suppliers/:supplierId   — sửa isPrimary/notes
DELETE /materials/:id/suppliers/:supplierId   — xóa khỏi junction
```

### Search autocomplete — tìm theo tất cả INCI names

```typescript
WHERE p.code LIKE ? OR p.name LIKE ?
  OR EXISTS (
    SELECT 1 FROM product_inci_names pin
    WHERE pin.product_id = p.id AND pin.inci_name LIKE ?
  )
```

---

## Phase 3 — Backend `server/src/routes/warehouseInventory.ts`

### Cột `inciName` trong response

```typescript
// Trước: product.inciName
// Sau: JOIN product_inci_names WHERE is_primary = 1, lấy inci_name đầu tiên
LEFT JOIN product_inci_names pin ON pin.product_id = p.id AND pin.is_primary = 1
```

### Lots response — thêm `manufacturerName`

```typescript
lots: batches.map(b => ({
  lotNo:            b.lotNo,
  manufacturerName: b.manufacturer?.name ?? null,   // thêm mới
  // ... các field cũ giữ nguyên
}))
```

---

## Phase 4 — Backend `server/src/routes/outbound.ts`

### Lots response trong bảng chọn lô — thêm 3 trường nhận diện lô

Khi UI chọn lô để xuất, mỗi batch trả thêm:
```typescript
{
  id:              batch.id,
  lotNo:           batch.lotNo,
  expiryDate:      batch.expiryDate,
  currentQty:      batch.currentQty,
  manufacturerName: batch.manufacturer?.name ?? null,   // thêm mới
  supplierName:    batch.supplier?.name ?? null,        // thêm mới (batches.supplier_id)
  inciName:        batch.product.inciNames              // thêm mới
                     .find(i => i.isPrimary)?.inciName ?? null,
}
```

---

## Phase 5 — Backend `server/src/routes/inbound.ts`

### Step 2 — chọn NVL

Response trả kèm manufacturers và approvedSuppliers:
```typescript
{
  id: product.id,
  code: product.code,
  name: product.name,
  manufacturers: product.manufacturers
    .filter(m => !m.deletedAt)
    .map(m => ({ id: m.id, name: m.name, isPrimary: m.isPrimary })),
  approvedSuppliers: product.productSuppliers
    .map(ps => ({ id: ps.supplier.id, name: ps.supplier.name, isPrimary: ps.isPrimary })),
}
```

### Step 3/4 — tạo `InboundReceiptItem`

Nhận thêm `manufacturerId` trong body (bắt buộc nếu product có manufacturers).  
Khi post → copy `manufacturerId` sang `batches.manufacturer_id`.

---

## Phase 6 — Frontend

### Backend routes

| File                                          | Thành phần / endpoint                         | Thay đổi                                                                                    |
|-----------------------------------------------|-----------------------------------------------|---------------------------------------------------------------------------------------------|
| `server/src/routes/catalog.ts`                | `GET /materials`, `GET /materials/:id`        | Include 3 relations: `inciNames`, `manufacturers`, `productSuppliers`                       |
|                                               | `POST /materials`                             | Nhận thêm `inciNames[]`, `manufacturers[]`, `supplierIds[]` trong body                      |
|                                               | `PUT /materials/:id`                          | Upsert 3 sub-lists                                                                          |
|                                               | `POST /materials/:id/inci-names`              | Thêm 1 INCI name                                                                            |
|                                               | `PUT /materials/:id/inci-names/:inciId`       | Sửa INCI name                                                                               |
|                                               | `DELETE /materials/:id/inci-names/:inciId`    | Xóa hard                                                                                    |
|                                               | `POST /materials/:id/manufacturers`           | Thêm 1 nhà SX                                                                               |
|                                               | `PUT /materials/:id/manufacturers/:mfgId`     | Sửa nhà SX                                                                                  |
|                                               | `DELETE /materials/:id/manufacturers/:mfgId`  | Soft-delete (`deletedAt`)                                                                   |
|                                               | `POST /materials/:id/suppliers`               | Gán nhà CC vào junction                                                                     |
|                                               | `PUT /materials/:id/suppliers/:supplierId`    | Sửa `isPrimary`/`notes`                                                                     |
|                                               | `DELETE /materials/:id/suppliers/:supplierId` | Xóa khỏi junction                                                                           |
|                                               | Autocomplete search                           | Tìm theo tất cả INCI names (không chỉ `is_primary`)                                         |
| `server/src/routes/warehouseInventory.ts`     | Inventory list                                | `inciName` lấy từ `product_inci_names WHERE is_primary = 1` thay vì `products.inci_name`    |
|                                               | Lots response                                 | Thêm `manufacturerName` từ `batches.manufacturer`                                           |
| `server/src/routes/inbound.ts`                | Step 2 — GET product detail                   | Trả thêm `manufacturers[]` và `approvedSuppliers[]`                                         |
|                                               | Step 3/4 — POST/PUT item                      | Nhận `manufacturerId`; khi post → copy sang `batches.manufacturer_id`                       |
| `server/src/routes/outbound.ts`               | Lots response (bảng chọn lô)                  | Thêm `manufacturerName`, `supplierName`, `inciName` (primary)                               |

### Frontend pages & components

| File                            | Thành phần              | Thay đổi                                                                                              |
|---------------------------------|-------------------------|-------------------------------------------------------------------------------------------------------|
| `CatalogPage.tsx`               | Field INCI Name         | Từ 1 input text → list editor (thêm/sửa/xóa nhiều INCI)                                              |
|                                 | Section Nhà sản xuất    | Thêm mới: list editor với các field `name`, `country`, `contactInfo`, `isPrimary`                     |
|                                 | Section Nhà cung cấp    | Thêm mới: multi-select từ danh sách `suppliers`, đánh dấu `isPrimary`                                 |
| `ProductCreatePage.tsx`         | Field INCI Name         | Như CatalogPage                                                                                       |
|                                 | Section Nhà sản xuất    | Thêm mới như CatalogPage                                                                              |
|                                 | Section Nhà cung cấp    | Thêm mới như CatalogPage                                                                              |
| `InboundStep2Page.tsx`          | Form chọn NVL           | Sau khi chọn NVL: dropdown **Nhà sản xuất** (required nếu product có manufacturers)                  |
|                                 |                         | Dropdown **Nhà cung cấp** filter theo `approvedSuppliers`, vẫn cho chọn ngoài danh sách + cảnh báo   |
| `InboundStep3Page.tsx`          | Bảng dòng items         | Hiển thị tên nhà SX đã chọn; truyền `manufacturerId` trong payload                                   |
| `InboundStep4Page.tsx`          | Review trước post       | Hiển thị tên nhà sản xuất trong từng dòng NVL                                                        |
| `OutboundPage.tsx`              | Bảng chọn lô            | Thêm 3 cột: **Nhà SX**, **Nhà CC**, **INCI Name** để phân biệt lô                                   |
| `OutboundListPage.tsx`          | Detail view lô          | Hiển thị Nhà SX, Nhà CC, INCI Name                                                                   |
| `WarehouseItemDetailPage.tsx`   | Section thông tin NVL   | Thay field INCI (1 giá trị) → chips list tất cả INCI names                                           |
|                                 |                         | Thêm section **Nhà sản xuất** (danh sách)                                                            |
|                                 |                         | Thêm section **Nhà cung cấp** (danh sách)                                                            |
|                                 | Bảng lot                | Thêm 3 cột: **Nhà SX**, **Nhà CC**, **INCI Name**                                                    |
| `InventoryTable.tsx`            | Cột INCI Name           | Giữ nguyên, đổi source sang `product_inci_names WHERE is_primary = 1`                                |

### API types

| File                       | Type                    | Thay đổi                                                                                     |
|----------------------------|-------------------------|----------------------------------------------------------------------------------------------|
| `src/lib/warehouseApi.ts`  | `LotDetail`             | Thêm `manufacturerName: string \| null`, `supplierName: string \| null`, `inciName: string \| null` |
| `src/lib/outboundApi.ts`   | `InventoryStockBatch`   | Thêm `manufacturerName: string \| null`, `supplierName: string \| null`, `inciName: string \| null` |
| `src/lib/catalogApi.ts`    | `Material`              | Thêm `inciNames[]`, `manufacturers[]`, `productSuppliers[]`                                  |

---

## Phân biệt 3 khái niệm nhà cung cấp trong hệ thống

| Khái niệm                                 | Bảng                             | Ý nghĩa                                      |
|-------------------------------------------|----------------------------------|----------------------------------------------|
| Nhà CC được phép cung cấp NVL (catalog)   | `product_suppliers`              | Danh sách approved suppliers cho NVL         |
| Nhà CC của phiếu nhập (giao dịch)         | `inbound_receipts.supplier_id`   | Nhà CC thực tế giao hàng                     |
| Nhà CC của lô hàng (batch)                | `batches.supplier_id`            | Nhà CC của lô cụ thể                         |

UI Inbound Step 2: dropdown nhà CC **lọc theo** `approvedSuppliers`, vẫn cho chọn ngoài danh sách kèm cảnh báo.

---

## Thứ tự implement

```
1.  Schema Prisma: thêm 3 model, sửa Product/Batch/InboundReceiptItem/Supplier
    → prisma migrate dev
2.  Migration SQL: copy inci_name → product_inci_names (is_primary=true)
3.  catalog.ts: sửa GET include, sửa POST/PUT, thêm sub-endpoints (3 loại × 3 verbs = 9 endpoints)
4.  CatalogPage.tsx + ProductCreatePage.tsx: UI 3 sections sub-lists
5.  inbound.ts: step 2 trả manufacturers + approvedSuppliers; step 3/4 nhận + lưu manufacturerId
6.  InboundStep2/3/4Page.tsx: dropdown nhà SX, filter nhà CC
7.  warehouseInventory.ts: inciName từ is_primary, manufacturerName trong lots
8.  outbound.ts: lots response thêm manufacturerName, supplierName, inciName
9.  WarehouseItemDetailPage.tsx: chips INCI, section Nhà SX/CC, 3 cột mới trong lot table
10. OutboundPage.tsx + OutboundListPage.tsx: 3 cột nhận diện lô
11. Verify toàn bộ → chạy ALTER TABLE DROP COLUMN inci_name
```

---

## Checklist kiểm thử sau implement

| Kịch bản                                                             | Kết quả mong đợi                          |
|----------------------------------------------------------------------|-------------------------------------------|
| Tạo NVL với 2 INCI names                                             | Lưu 2 row product_inci_names              |
| Tạo NVL với 2 nhà SX                                                 | Lưu 2 row product_manufacturers           |
| Gán 3 nhà CC cho NVL                                                 | Lưu 3 row product_suppliers               |
| Tạo phiếu nhập → chọn NVL → dropdown nhà SX hiện đúng               | approvedSuppliers đúng                    |
| Post phiếu nhập → batch.manufacturer_id được ghi                     | batch truy vết được nhà SX                |
| Tìm NVL theo INCI name phụ (không is_primary)                        | Tìm thấy                                  |
| Detail page lot table hiển thị tên nhà SX                            | manufacturerName đúng                     |
| OutboundPage bảng chọn lô hiển thị đủ Nhà SX + Nhà CC + INCI        | 3 cột đúng dữ liệu                        |
| Xóa cột inci_name sau migrate                                        | Không có field nào bị null bất ngờ        |