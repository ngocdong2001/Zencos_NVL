# Quản lý tồn kho — Logic & Kiến trúc

## 1. Kịch bản áp dụng: Kịch bản B

Hệ thống đang vận hành theo **Kịch bản B**:

- Khi khai báo tồn đầu kỳ (`OpeningStockItem`), hệ thống tạo `Batch` với `received_qty_base` = số lượng đầu kỳ.
- **Không có** `InventoryTransaction` loại `import` tương ứng cho batch đầu kỳ này.
- Mọi phát sinh xuất/nhập/điều chỉnh **sau đó** mới được ghi vào `inventory_transactions`.

Công thức tồn hiện tại đúng theo kịch bản B:

```
tồn_hiện_tại(batch) = received_qty_base
                     + SUM(transactions loại import)
                     - SUM(transactions loại export)
                     + SUM(transactions loại adjustment có dấu)
```

---

## 2. Cấu trúc dữ liệu liên quan

### 2.1 Bảng `batches`

Một batch = một lô nguyên liệu vật lý được nhập vào kho. Có thể truy vết đến số lô thực tế, hóa đơn, nhà cung cấp, và hạn sử dụng.

| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | BIGINT | Khóa chính |
| `product_id` | BIGINT FK | Sản phẩm thuộc lô này |
| `lot_no` | VARCHAR | Số lô từ nhà sản xuất/NCC |
| `received_qty_base` | DECIMAL(15,4) | **Số lượng nhập lúc tạo batch — ghi 1 lần, không đổi** |
| `status` | ENUM | `available` / `quarantine` / `rejected` / `expired` |
| `expiry_date` | DATE | Dùng cho xuất kho theo FEFO |
| `unit_price_per_kg` | DECIMAL(15,2) | Giá vốn để tính COGS |

> `received_qty_base` là **lịch sử nhập**, không phải tồn thực tế. Tồn thực tế luôn phải tính qua công thức ở mục 1.

### 2.2 Bảng `inventory_transactions`

Mỗi record là một phát sinh kho sau khi batch được tạo.

| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `batch_id` | BIGINT FK | Lô bị tác động |
| `type` | ENUM | `import` / `export` / `adjustment` |
| `quantity_base` | DECIMAL(15,4) | Luôn là **số dương**; chiều dương/âm xác định bởi `type` |
| `transaction_date` | DATETIME | Thời điểm phát sinh thực tế |

Quy ước dấu khi tính tồn:
- `import` → **cộng** `quantity_base`
- `export` → **trừ** `quantity_base`
- `adjustment` → **cộng trực tiếp** `quantity_base` (client truyền âm để giảm, dương để tăng)

### 2.3 Bảng `opening_stock_items` & `opening_stock_declarations`

Dữ liệu khai báo tồn đầu kỳ khi hệ thống mới đi vào vận hành.

| Trạng thái declaration | Ý nghĩa |
|---|---|
| `draft` | Đang nhập liệu, chưa chính thức |
| `posted` | Đã duyệt → tạo `Batch` tương ứng với `received_qty_base = quantity_base` |
| `cancelled` | Hủy |

Khi `status = posted`, mỗi `OpeningStockItem` sinh ra đúng 1 `Batch`. **Không có `InventoryTransaction`** được tạo ở bước này (Kịch bản B).

---

## 3. Hai nguồn tạo Batch

```
Nguồn 1 — Tồn đầu kỳ
  opening_stock_declarations (posted)
    └─ opening_stock_items
           └─ [tạo] Batch
                  received_qty_base = quantity_base khai báo
                  KHÔNG có InventoryTransaction

Nguồn 2 — Nhập kho thực tế
  PurchaseRequest (status: received)
    └─ [tạo] Batch
           received_qty_base = số lượng nhận thực tế
           CÓ InventoryTransaction loại import
```

---

## 4. Tính tồn theo product

Tổng tồn của một product = cộng dồn từ tất cả batch `available` chưa bị xóa:

```sql
SELECT
  p.id,
  p.code,
  p.name,
  p.min_stock_level,
  COALESCE(SUM(
    b.received_qty_base
    + COALESCE(tx_in.qty, 0)
    - COALESCE(tx_out.qty, 0)
    + COALESCE(tx_adj.qty, 0)
  ), 0) AS qty_on_hand
FROM products p
LEFT JOIN batches b
  ON b.product_id = p.id AND b.status = 'available' AND b.deleted_at IS NULL
LEFT JOIN (
  SELECT batch_id, SUM(quantity_base) AS qty
  FROM inventory_transactions WHERE type = 'import'
  GROUP BY batch_id
) tx_in ON tx_in.batch_id = b.id
LEFT JOIN (
  SELECT batch_id, SUM(quantity_base) AS qty
  FROM inventory_transactions WHERE type = 'export'
  GROUP BY batch_id
) tx_out ON tx_out.batch_id = b.id
LEFT JOIN (
  SELECT batch_id, SUM(quantity_base) AS qty
  FROM inventory_transactions WHERE type = 'adjustment'
  GROUP BY batch_id
) tx_adj ON tx_adj.batch_id = b.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.code, p.name, p.min_stock_level
```

---

## 5. Phương án tăng tốc: `current_qty_base` trên Batch

Để tránh GROUP BY + JOIN lớn mỗi lần đọc, thêm cột `current_qty_base` vào bảng `batches` và cập nhật **cùng DB transaction** với `inventory_transactions`.

### 5.1 Migration

```sql
ALTER TABLE batches
  ADD COLUMN current_qty_base DECIMAL(15,4) NOT NULL DEFAULT 0
  COMMENT 'Running balance. Init = received_qty_base. Updated atomically with inventory_transactions.';

-- Backfill theo kịch bản B
UPDATE batches b
SET current_qty_base = b.received_qty_base + COALESCE((
  SELECT SUM(
    CASE type
      WHEN 'import'     THEN  quantity_base
      WHEN 'export'     THEN -quantity_base
      ELSE quantity_base
    END
  )
  FROM inventory_transactions
  WHERE batch_id = b.id
), 0);
```

### 5.2 Atomic update trong API (TypeScript / Prisma)

API `POST /api/inventory/transactions` hiện tại cần sửa để ghi cả hai bảng trong cùng transaction:

```typescript
const delta =
  type === 'import'     ?  quantityBase :
  type === 'export'     ? -quantityBase :
  /* adjustment */        quantityBase  // client truyền âm để giảm

await prisma.$transaction([
  prisma.inventoryTransaction.create({
    data: { batchId, userId, type, quantityBase, notes, transactionDate }
  }),
  prisma.batch.update({
    where: { id: batchId },
    data: { currentQtyBase: { increment: delta } }
  }),
])
```

Kết quả: hai record được commit cùng lúc, không bao giờ lệch sổ.

### 5.3 Đọc tồn / thiếu hụt sau khi có `current_qty_base`

```sql
SELECT
  p.id, p.code, p.name, p.min_stock_level,
  COALESCE(SUM(b.current_qty_base), 0)                             AS qty_on_hand,
  p.min_stock_level - COALESCE(SUM(b.current_qty_base), 0)        AS shortage
FROM products p
LEFT JOIN batches b
  ON b.product_id = p.id AND b.status = 'available' AND b.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.code, p.name, p.min_stock_level
HAVING shortage > 0
ORDER BY shortage DESC
```

Query này chỉ quét `batches`, không cần JOIN `inventory_transactions` nữa.

---

## 6. Workflow PurchaseRequest (mua hàng → nhập kho)

```
draft
  │  PATCH /:id/submit
  ▼
submitted
  │  PATCH /:id/approve
  ▼
approved
  │  PATCH /:id/receive  (hoặc từ ordered)
  ▼
received  ◄── tại bước này tạo Batch + InventoryTransaction(import)
```

Trạng thái `cancelled` có thể gọi từ bất kỳ bước nào trước `received`.

---

## 7. Sửa sai bằng bút toán bù (Reversal)

`inventory_transactions` chỉ INSERT, không bao giờ UPDATE hoặc DELETE. Khi cần đính chính, ghi thêm giao dịch ngược chiều thay vì xóa record cũ.

### 7.1 Tại sao không DELETE/UPDATE

```sql
-- TUYỆT ĐỐI KHÔNG LÀM
DELETE FROM inventory_transactions WHERE id = 501;
UPDATE inventory_transactions SET quantity_base = 80 WHERE id = 501;
```

Hệ quả xấu:
- Mất audit trail — không ai biết giao dịch đó từng tồn tại hay ai sửa lúc mấy giờ
- `current_qty_base` đã được cập nhật theo record sai, xóa record không tự rollback lại cột đó
- Báo cáo kỳ trước sẽ ra số khác khi chạy lại

### 7.2 Cách đúng: ghi 2 record bù

**Ví dụ:** Ghi nhầm xuất 100 kg, thực tế chỉ xuất 80 kg.

```
#501 — record sai (giữ nguyên, không đụng vào)
  type: export  |  quantity_base: 100  |  notes: "Xuất cho đơn XK-2026-001"

#502 — bút toán bù: đảo chiều cái sai
  type: import  |  quantity_base: 100  |  notes: "Hủy bút toán #501 — ghi nhầm số lượng"

#503 — ghi lại đúng
  type: export  |  quantity_base: 80   |  notes: "Xuất cho đơn XK-2026-001 (đã đính chính)"
```

Net tác động lên tồn: $-100 + 100 - 80 = -80$ ✓

### 7.3 Reversal trong code (TypeScript / Prisma)

```typescript
const original = await prisma.inventoryTransaction.findUnique({ where: { id: originalId } })

const reversalType = original.type === 'import' ? 'export'
                   : original.type === 'export' ? 'import'
                   : 'adjustment'

// adjustment: truyền âm để bù; import/export: dùng chiều ngược
const reversalQty  = original.type === 'adjustment' ? -original.quantityBase : original.quantityBase
const delta        = reversalType === 'import' ?  Math.abs(reversalQty)
                   : reversalType === 'export' ? -Math.abs(reversalQty)
                   : reversalQty

await prisma.$transaction([
  prisma.inventoryTransaction.create({
    data: {
      batchId: original.batchId,
      type: reversalType,
      quantityBase: Math.abs(reversalQty),
      notes: `Hủy bút toán #${original.id}`,
      transactionDate: new Date(),
    }
  }),
  prisma.batch.update({
    where: { id: original.batchId },
    data: { currentQtyBase: { increment: delta } }
  }),
])
```

---

## 8. Sửa số lượng trên phiếu nhập hàng (PurchaseRequest)

Hướng xử lý phụ thuộc vào trạng thái phiếu **tại thời điểm sửa**.

### 8.1 Phiếu chưa received (draft / submitted / approved)

Chưa có Batch, chưa ảnh hưởng tồn kho. Sửa trực tiếp `quantity_needed_base` trên `purchase_request_items` là hợp lệ.

### 8.2 Phiếu đã received — Batch đã được tạo

`received_qty_base` không được UPDATE. Có hai hướng tùy mức độ sai lệch:

**Hướng A — Chênh lệch nhỏ, cùng lô → Adjustment transaction**

Giữ nguyên `received_qty_base`, tạo adjustment để bù phần chênh:

```
Ví dụ: received_qty_base = 100, thực nhận = 80 → chênh -20

inventory_transactions #502
  type: adjustment
  quantity_base: -20
  notes: "Đính chính phiếu nhập PO-2026-001: thực nhận 80 kg, đã ghi 100 kg"
```

Tồn sau: $current\_qty\_base = 100 + (-20) = 80$ ✓

**Hướng B — Sai hoàn toàn, cần làm lại → Void & re-receive**

```
Bước 1: Tạo adjustment = -received_qty_base   → current_qty_base về 0
Bước 2: batch.status = 'rejected'             → loại khỏi tồn available (không xóa)
Bước 3: Tạo Batch mới với received_qty_base đúng
```

### 8.3 Bảng quyết định

```
Phiếu chưa received?
  └─ Có  → Sửa trực tiếp PurchaseRequestItem (an toàn, tồn chưa bị ảnh hưởng)

Phiếu đã received → Batch đã tạo
  ├─ Chênh lệch nhỏ, cùng lô  → Adjustment transaction (-delta)
  └─ Sai hoàn toàn             → Void batch (status=rejected) + Batch mới
```

> **Nguyên tắc bất biến:** `received_qty_base` không bao giờ được UPDATE sau khi batch tồn tại. Mọi đính chính đều đi qua `inventory_transactions` để giữ audit trail nguyên vẹn.

---

## 9. Ràng buộc vận hành

| Quy tắc | Lý do |
|---|---|
| `inventory_transactions` chỉ INSERT, không UPDATE/DELETE | Đảm bảo ledger bất biến, audit đầy đủ |
| Sửa sai bằng bút toán bù (reversal) | Ghi giao dịch ngược chiều thay vì xóa record cũ |

---

## 10. Logic post tồn đầu kỳ (đề xuất triển khai)

Mục tiêu: đảm bảo dữ liệu nhập tại màn hình khai báo tồn đầu kỳ được phản ánh ngay vào tồn thực tế dùng cho báo cáo thiếu hụt.

### 10.1 Vấn đề hiện tại

- Người dùng nhập dữ liệu vào `opening_stock_items`.
- Báo cáo thiếu hụt đọc từ `batches.current_qty_base`.
- Nếu chưa có bước post từ `opening_stock_items` sang `batches`, số liệu sẽ lệch (khai báo có số lượng nhưng thiếu hụt vẫn thấy tồn = 0).

### 10.2 Mô hình post được áp dụng

Hệ thống **chỉ dùng duy nhất Mô hình A (Auto-post theo từng dòng)**.

#### Mô hình A — Auto-post từng dòng khi bấm Lưu (khuyến nghị cho trải nghiệm)

Khi user lưu 1 dòng hợp lệ:

1. Insert `opening_stock_items` (lưu chứng từ, giá trị, lot, ngày).
2. Trong cùng transaction DB:
   - Tạo `batch` tương ứng.
   - Tạo `inventory_transaction` loại `import` với `quantity_base = opening quantity`.
   - `batch.current_qty_base` tăng đúng bằng lượng import.
3. Gắn cờ đã post cho dòng (`posting_status = posted`, `posted_at`, `posted_batch_id`, `posted_tx_id`).

Ưu điểm:
- Không cần bước thao tác bổ sung cho user.
- Báo cáo thiếu hụt cập nhật tức thì.

Nhược điểm:
- Cần xử lý kỹ luồng sửa/xóa dòng đã post (phải qua bút toán bù).

### 10.3 Quy tắc idempotent (bắt buộc)

Để tránh post trùng khi retry/network timeout:

- Mỗi `opening_stock_item` chỉ được post đúng 1 lần.
- Trước khi post, check:
  - `posting_status = posted` hoặc
  - `posted_batch_id` đã tồn tại.
- Dùng unique index chống trùng theo quan hệ item-posted:

```sql
-- Gợi ý cột mới
ALTER TABLE opening_stock_items
  ADD COLUMN posting_status ENUM('draft','posted','failed') NOT NULL DEFAULT 'draft',
  ADD COLUMN posted_batch_id BIGINT NULL,
  ADD COLUMN posted_tx_id BIGINT NULL,
  ADD COLUMN posted_at DATETIME(3) NULL;

-- Một item chỉ map tối đa 1 batch được post
CREATE UNIQUE INDEX ux_opening_item_posted_batch ON opening_stock_items(posted_batch_id);
```

### 10.4 Transaction chuẩn khi post 1 dòng

```typescript
await prisma.$transaction(async (db) => {
  const item = await db.openingStockItem.findUnique({ where: { id: itemId } })
  if (!item) throw new Error('ITEM_NOT_FOUND')
  if (item.postingStatus === 'posted') return item // idempotent

  const batch = await db.batch.create({
    data: {
      productId: item.productId,
      supplierId: item.supplierId ?? undefined,
      lotNo: item.lotNo,
      invoiceNumber: item.invoiceNo,
      invoiceDate: item.invoiceDate,
      receivedQtyBase: item.quantityBase,
      currentQtyBase: 0,
      manufactureDate: item.manufactureDate,
      expiryDate: item.expiryDate,
      status: 'available',
      notes: `Opening stock item #${item.id}`,
    },
  })

  const tx = await db.inventoryTransaction.create({
    data: {
      batchId: batch.id,
      userId,
      type: 'import',
      quantityBase: item.quantityBase,
      notes: `Opening stock posting from item #${item.id}`,
      transactionDate: item.openingDate ?? new Date(),
    },
  })

  await db.batch.update({
    where: { id: batch.id },
    data: { currentQtyBase: { increment: item.quantityBase } },
  })

  await db.openingStockItem.update({
    where: { id: item.id },
    data: {
      postingStatus: 'posted',
      postedBatchId: batch.id,
      postedTxId: tx.id,
      postedAt: new Date(),
    },
  })
})
```

### 10.5 Quy tắc sửa/xóa sau khi đã post

- UX cho phép user vẫn sửa dòng đã post ngay trên màn hình, nhưng backend không sửa sổ kho trực tiếp.
- Nếu user sửa giảm/tăng số lượng: hệ thống tự tạo `adjustment` transaction cho `posted_batch_id` với `delta = new_quantity - old_quantity`.
- Nếu user sửa metadata lô (`lot`, `invoice`, `supplier`, `NSX`, `HSD`, `unit_price_per_kg`): hệ thống đồng bộ sang `batch` đã post trong cùng DB transaction.
- Nếu user xóa dòng đã post: hệ thống tự tạo transaction đảo chiều (`adjustment` âm theo lượng tồn đầu đã post) rồi mới xóa dòng khai báo.
- Chặn thao tác nếu adjustment/reversal làm `batch.current_qty_base < 0`.
- Luôn giữ lịch sử đầy đủ, không xóa `inventory_transactions`.

### 10.6 Checklist test bắt buộc

1. Lưu dòng tồn đầu kỳ -> shortage tăng/giảm đúng ngay sau thao tác.
2. Retry API lưu cùng payload -> không tạo batch/transaction trùng.
3. Sửa số lượng dòng đã post -> tạo adjustment đúng dấu, `batch.current_qty_base` đổi đúng bằng delta.
4. Xóa dòng đã post -> tạo reversal tự động, rollback đúng mà không làm tồn âm.
5. Báo cáo tổng tồn theo product khớp với tổng `current_qty_base` của batch available.

| `received_qty_base` ghi 1 lần, không đổi | Là lịch sử nhập gốc; đính chính qua adjustment |
| Kiểm tra tồn từ `current_qty_base` trước khi xuất | Chặn tồn âm nếu nghiệp vụ yêu cầu |
| Backfill `current_qty_base` chạy 1 lần trước go-live | Sau đó mọi cập nhật đều qua `prisma.$transaction` |

---

## 10. Checklist triển khai

- [x] Viết migration SQL thêm cột `current_qty_base` vào `batches`
- [x] Chạy backfill `received_qty_base + SUM(transactions)`
- [x] Sửa `POST /api/inventory/transactions` dùng `prisma.$transaction`
- [x] Sửa `POST /api/purchases/:id/receive` tạo Batch + Transaction trong cùng transaction
- [x] Thêm endpoint `GET /api/reports/shortages` đọc từ `current_qty_base`
- [x] Wiring frontend `PurchaseOrderPage` gọi endpoint thiếu hụt thay cho `SHORTAGE_ROWS` mock
