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

---

## 11. Đề xuất nghiệp vụ thẻ kho BTP / TP

### 11.1 Vấn đề phát sinh từ mẫu thẻ kho

Mẫu thẻ kho trong thực tế không chỉ theo dõi nhập mua và xuất bán. Một mã hàng có thể đi qua nhiều trạng thái nội bộ:

- Nhập bán thành phẩm vào kho
- Xuất bán thành phẩm cho công đoạn đóng gói / hoàn thiện
- Nhập thành phẩm sau đóng gói trở lại kho
- Xuất thành phẩm giao khách

Điểm quan trọng trong mẫu là tồn được theo dõi tách riêng theo 2 cột:

- `BTP` = bán thành phẩm
- `TP` = thành phẩm

Vì vậy nếu chỉ dùng `inbound_receipts` cho nhập mua và `export_orders` cho xuất bán thì chưa đủ để phản ánh luồng chuyển đổi nội bộ.

### 11.2 Kết luận nghiệp vụ

Hệ thống cần bổ sung khái niệm **chuyển công đoạn nội bộ** chứ không chỉ có nhập mua / xuất bán.

Khuyến nghị chia phát sinh kho thành 4 nhóm rõ ràng:

1. `Nhập mua ngoài` -> tăng tồn nguyên liệu hoặc vật tư từ NCC
2. `Nhập nội bộ` -> tăng tồn BTP hoặc TP từ xưởng / phòng đóng gói
3. `Xuất nội bộ` -> giảm tồn BTP hoặc TP để chuyển sang công đoạn tiếp theo
4. `Xuất bán` -> giảm tồn TP khi giao khách

Nguyên tắc kế toán kho:

- Chuyển BTP -> TP **không phải** là sửa trực tiếp tồn của một dòng cũ.
- Phải được ghi nhận bằng chứng từ kho có vế xuất và vế nhập rõ ràng.
- Mọi thay đổi tồn vẫn phải đi qua ledger (`inventory_transactions`) để giữ audit trail.

### 11.3 Đề xuất mô hình vận hành

Đề xuất theo mô hình 2 tầng:

**Tầng 1 - Nhanh để vận hành**

- Bổ sung chứng từ `Phiếu chuyển công đoạn`.
- Cho phép ghi nhận 3 nghiệp vụ nội bộ chính:
  - `NK-BTP`: Nhập bán thành phẩm từ sản xuất / đóng gói cấp 1 vào kho
  - `XK-BTP`: Xuất bán thành phẩm cho đóng gói cấp 2 / hoàn thiện
  - `NK-TP`: Nhập thành phẩm sau đóng gói vào kho thành phẩm
- Giữ `ExportOrder` cho nghiệp vụ giao hàng ra ngoài.

**Tầng 2 - Đầy đủ cho sản xuất**

- Sau này có thể bổ sung `Lệnh sản xuất`, `Batch sản xuất`, `định mức BOM`, `hao hụt`, `thu hồi`, `rework`.
- Nhưng tầng 2 không phải điều kiện bắt buộc để ra được báo cáo thẻ kho theo mẫu.

### 11.4 Khuyến nghị tổ chức mã hàng

Có 2 cách tổ chức dữ liệu, nhưng nên chọn **Cách B**.

**Cách A - Một mã hàng, thêm cột stage BTP/TP**

- Ưu điểm: báo cáo thẻ kho cùng 1 mã hàng dễ nhìn.
- Nhược điểm: phức tạp hơn khi tính tồn, định giá, FEFO, và truy vết lô theo từng trạng thái.

**Cách B - Tách mã BTP và mã TP, nhưng liên kết cùng SKU thương mại**

- Ví dụ:
  - `MELASMA30-BTP`
  - `MELASMA30-TP`
- Cả hai cùng map về một `SKU thương mại` hoặc `product_family` là “Melasma Cream 30gr”.
- Báo cáo thẻ kho gom 2 mã này lên cùng một form, hiển thị thành 2 cột BTP và TP.

Khuyến nghị dùng **Cách B** vì:

- Tồn BTP và TP thực chất là 2 đối tượng kho khác nhau
- Dễ kiểm soát lô, giá vốn, hao hụt, và QC
- Không làm méo mô hình hiện có của `batches` và `current_qty_base`

### 11.5 Chứng từ nên có

Đề xuất thêm module mới: `stock_stage_transfers`.

Header của phiếu:

- `transfer_ref`
- `transfer_date`
- `status`: `draft | posted | cancelled`
- `from_stage`: `semi_finished | finished | production | packaging_lv1 | packaging_lv2`
- `to_stage`: tương tự
- `dien_giai`
- `created_by`, `posted_by`

Detail dòng phiếu:

- `product_id`
- `batch_id` hoặc `source_batch_id` nếu xuất theo lô
- `quantity_base`
- `unit_used`
- `target_product_id` nếu có chuyển đổi từ mã BTP sang mã TP
- `target_quantity_base`
- `loss_quantity_base`
- `notes`

Ý nghĩa vận hành:

- `XK-BTP` có thể xuất từ mã BTP
- `NK-TP` có thể nhập vào mã TP
- Hao hụt công đoạn được ghi nhận tách riêng, không nuốt vào số nhập

### 11.6 Rule hạch toán tồn kho

Để ra thẻ kho đúng mẫu, mỗi nghiệp vụ phải sinh ledger như sau:

**A. Nhập BTP từ sản xuất vào kho**

- Tạo batch BTP mới hoặc tăng lô BTP phù hợp
- Sinh `inventory_transaction(import)` cho batch BTP
- `diễn giải`: “NK từ phòng đóng gói cấp 1”

**B. Xuất BTP sang đóng gói cấp 2**

- Chọn lô BTP theo rule nghiệp vụ
- Sinh `inventory_transaction(export)` cho batch BTP
- `diễn giải`: “XK cho phòng đóng gói cấp 2”

**C. Nhập TP sau đóng gói**

- Tạo batch TP mới
- Sinh `inventory_transaction(import)` cho batch TP
- `diễn giải`: “NK từ phòng đóng gói cấp 2”

**D. Xuất TP giao hàng**

- Dùng `ExportOrder` như hiện tại
- Sinh `inventory_transaction(export)` cho batch TP
- `diễn giải`: “Giao hàng”

**E. Hao hụt / hủy / rework**

- Không gộp vào xuất bán hay nhập kho
- Ghi bằng `adjustment` hoặc một loại chứng từ riêng
- Bắt buộc có lý do: hao hụt, hủy QC, thu hồi, tái chế, rework

### 11.7 Cách ra báo cáo thẻ kho theo mẫu screenshot

Một dòng trên thẻ kho nên được dựng từ ledger đã chuẩn hóa, không lấy trực tiếp từ chứng từ đầu vào.

Các cột báo cáo:

- `Ngày`
- `Diễn giải`
- `Nhập BTP`
- `Nhập TP`
- `Xuất BTP`
- `Xuất TP`
- `Tồn BTP`
- `Tồn TP`
- `Ký nhận`
- `Ghi chú`

Logic running balance:

```text
ton_btp_cuoi = ton_btp_dau + nhap_btp - xuat_btp +/- dieu_chinh_btp
ton_tp_cuoi  = ton_tp_dau  + nhap_tp  - xuat_tp  +/- dieu_chinh_tp
```

Nguồn mapping đề xuất:

- `NK-BTP` -> cột `Nhập BTP`
- `XK-BTP` -> cột `Xuất BTP`
- `NK-TP` -> cột `Nhập TP`
- `XK-TP` / giao hàng -> cột `Xuất TP`

Lợi ích của cách này:

- Mỗi lần in lại thẻ kho đều ra cùng một kết quả
- Truy ngược được về chứng từ gốc
- Không phụ thuộc user nhập tay bảng Excel ngoài hệ thống

### 11.8 Vì sao không nên nhồi vào `purchase_requests` / `inbound_receipts` / `export_orders`

Có thể tận dụng tạm các bảng hiện tại bằng cách thêm `business_kind`, nhưng đó chỉ là giải pháp ngắn hạn.

Không nên dùng chung dài hạn vì:

- `purchase_requests` mang ý nghĩa mua hàng, không đúng bản chất chuyển công đoạn
- `inbound_receipts` hiện đang gắn logic NCC / PR / chứng từ nhận hàng
- `export_orders` đang mang nghĩa giao khách hoặc xuất hàng ra ngoài
- Báo cáo mua hàng, giao hàng, dashboard hiện tại sẽ bị nhiễu nếu trộn thêm chuyển nội bộ

Kết luận:

- `Dien_giai` vừa thêm là hữu ích cho phần mô tả hiển thị
- Nhưng để đúng mô hình, vẫn nên có **module chứng từ chuyển công đoạn riêng**

### 11.9 Lộ trình triển khai khuyến nghị

**Giai đoạn 1 - Đủ để chạy thẻ kho**

1. Bổ sung phân loại hàng:
   - `semi_finished`
   - `finished_good`
2. Tạo liên kết SKU thương mại giữa BTP và TP
3. Tạo module `Phiếu chuyển công đoạn`
4. Chuẩn hóa `diễn giải` theo danh mục mẫu:
   - `NK từ phòng đóng gói cấp 1`
   - `XK cho phòng đóng gói cấp 2`
   - `NK từ phòng đóng gói cấp 2`
   - `Giao hàng`
   - `Điều chỉnh`
5. Tạo report `Thẻ kho BTP/TP`

**Giai đoạn 2 - Hoàn thiện sản xuất**

1. Thêm lệnh sản xuất / lệnh đóng gói
2. Thêm định mức và hao hụt chuẩn
3. Ràng buộc phiếu chuyển công đoạn phải tham chiếu lệnh sản xuất nếu phát sinh từ sản xuất
4. Bổ sung QC gate giữa BTP và TP

### 11.10 Quyết định khuyến nghị cho dự án hiện tại

Nếu mục tiêu là **ra nhanh mẫu thẻ kho đúng vận hành**, nên chốt theo hướng sau:

1. Không sửa nghĩa của `PurchaseRequest`, `InboundReceipt`, `ExportOrder`.
2. Tạo mới module `Phiếu chuyển công đoạn` để hạch toán BTP <-> TP.
3. Tách mã BTP và TP nhưng liên kết chung một SKU báo cáo.
4. Dùng ledger làm nguồn dữ liệu duy nhất cho báo cáo thẻ kho.
5. Dùng `Dien_giai` làm text hiển thị chuẩn trên từng dòng thẻ kho.

Hướng này giữ được 3 thứ cùng lúc:

- chạy nhanh theo nhu cầu kho hiện tại,
- không phá thiết kế nhập mua / xuất bán đã gần hoàn chỉnh,
- và vẫn mở đường lên bài toán sản xuất đầy đủ sau này.

### 11.11 Đề xuất API và cấu trúc report thẻ kho

Mục tiêu của API này là phục vụ 2 nhu cầu riêng:

1. Xem nhanh thẻ kho trên màn hình
2. In / xuất đúng form thẻ kho theo từng mã hàng

Không nên dùng chung endpoint `GET /api/reports/stock` hiện tại vì endpoint đó chỉ trả summary tồn theo product, không có ledger chi tiết để dựng running balance theo ngày.

#### A. Endpoint tổng quan danh sách thẻ kho

```http
GET /api/reports/stock-cards
```

Query đề xuất:

- `q`: tìm theo mã / tên hàng / SKU thương mại
- `familyId`: lọc theo SKU thương mại hoặc product family
- `stageMode`: `all | semi_finished | finished | combined`
- `fromDate`
- `toDate`
- `page`
- `limit`

Ý nghĩa:

- Dùng cho màn hình danh sách để user chọn đúng thẻ kho cần xem
- Không trả ledger đầy đủ, chỉ trả header summary

Response đề xuất:

```json
{
  "data": [
    {
      "familyId": "101",
      "familyCode": "MELASMA30",
      "familyName": "Melasma Cream 30gr",
      "semiFinishedProduct": {
        "id": "201",
        "code": "MELASMA30-BTP",
        "name": "Melasma Cream 30gr - Ban thanh pham"
      },
      "finishedProduct": {
        "id": "202",
        "code": "MELASMA30-TP",
        "name": "Melasma Cream 30gr - Thanh pham"
      },
      "openingSemiQty": 0,
      "openingFinishedQty": 0,
      "closingSemiQty": 1045,
      "closingFinishedQty": 0,
      "lastTransactionDate": "2025-10-15",
      "rowCount": 4
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### B. Endpoint chi tiết một thẻ kho để render màn hình và in

```http
GET /api/reports/stock-cards/:familyId
```

Query đề xuất:

- `fromDate`
- `toDate`
- `includeOpening=true|false`
- `includeClosing=true|false`
- `viewMode=combined|semi_finished|finished`

Ý nghĩa:

- `combined`: đúng layout mẫu screenshot, gồm cả BTP và TP trên cùng một thẻ
- `semi_finished`: chỉ xem BTP
- `finished`: chỉ xem TP

Response đề xuất:

```json
{
  "header": {
    "familyId": "101",
    "cardTitle": "THE KHO - THANH PHAM",
    "companyName": "CONG TY TNHH OHELAH COSMETICS",
    "printDate": "2026-04-27",
    "sheetNo": "01/25",
    "productName": "MELASMA CREAM 30GR",
    "orderDate": "2025-04-03",
    "orderedQty": 1000,
    "unitName": "HOP",
    "semiFinishedProduct": {
      "id": "201",
      "code": "MELASMA30-BTP",
      "name": "Melasma Cream 30gr - Ban thanh pham"
    },
    "finishedProduct": {
      "id": "202",
      "code": "MELASMA30-TP",
      "name": "Melasma Cream 30gr - Thanh pham"
    }
  },
  "openingBalance": {
    "semiFinishedQty": 0,
    "finishedQty": 0
  },
  "rows": [
    {
      "sequence": 1,
      "transactionDate": "2025-09-09",
      "documentType": "stage_transfer",
      "documentId": "9001",
      "documentRef": "SCT-20250909-001",
      "businessAction": "semi_import",
      "dienGiai": "NK tu phong dong goi cap 1",
      "nhapBtp": 1045,
      "nhapTp": 0,
      "xuatBtp": 0,
      "xuatTp": 0,
      "tonBtp": 1045,
      "tonTp": 0,
      "signedBy": "",
      "note": ""
    },
    {
      "sequence": 2,
      "transactionDate": "2025-09-09",
      "documentType": "stage_transfer",
      "documentId": "9002",
      "documentRef": "SCT-20250909-002",
      "businessAction": "semi_export",
      "dienGiai": "XK cho phong dong goi cap 2",
      "nhapBtp": 0,
      "nhapTp": 0,
      "xuatBtp": 1045,
      "xuatTp": 0,
      "tonBtp": 0,
      "tonTp": 0,
      "signedBy": "",
      "note": ""
    },
    {
      "sequence": 3,
      "transactionDate": "2025-09-09",
      "documentType": "stage_transfer",
      "documentId": "9003",
      "documentRef": "SCT-20250909-003",
      "businessAction": "finished_import",
      "dienGiai": "NK tu phong dong goi cap 2",
      "nhapBtp": 0,
      "nhapTp": 1045,
      "xuatBtp": 0,
      "xuatTp": 0,
      "tonBtp": 0,
      "tonTp": 1045,
      "signedBy": "",
      "note": ""
    },
    {
      "sequence": 4,
      "transactionDate": "2025-10-15",
      "documentType": "export_order",
      "documentId": "8001",
      "documentRef": "XK-20251015-001",
      "businessAction": "finished_export",
      "dienGiai": "Giao hang",
      "nhapBtp": 0,
      "nhapTp": 0,
      "xuatBtp": 0,
      "xuatTp": 1045,
      "tonBtp": 0,
      "tonTp": 0,
      "signedBy": "",
      "note": ""
    }
  ],
  "totals": {
    "nhapBtp": 1045,
    "nhapTp": 1045,
    "xuatBtp": 1045,
    "xuatTp": 1045,
    "closingBtp": 0,
    "closingTp": 0
  }
}
```

#### C. Endpoint export / print

```http
GET /api/reports/stock-cards/:familyId/print
GET /api/reports/stock-cards/:familyId/export-excel
```

Khuyến nghị:

- `print`: trả HTML print-friendly hoặc PDF nếu backend có engine render
- `export-excel`: trả file Excel giống layout form mẫu, nhưng vẫn dựa trên cùng nguồn dữ liệu của endpoint detail

Không nên để frontend tự dựng Excel từ lẻ tẻ nhiều endpoint vì sẽ dễ lệch số running balance.

### 11.12 Chuẩn hóa ledger đầu vào cho report

Để API detail ở mục 11.11 dựng được thẻ kho, backend cần một lớp normalize ledger trước khi group theo ngày.

Mỗi ledger item nên có cấu trúc logic như sau:

```ts
type StockCardLedgerEvent = {
  transactionDate: Date
  documentType: 'opening_stock' | 'inbound_receipt' | 'stage_transfer' | 'export_order' | 'adjustment'
  documentId: string
  documentRef: string
  productId: string
  familyId: string
  stage: 'semi_finished' | 'finished'
  direction: 'in' | 'out'
  quantityBase: number
  dienGiai: string
  note?: string
}
```

Mapping nguồn dữ liệu đề xuất:

- `opening_stock_items` -> `documentType = opening_stock`
- `inbound_receipts` -> `documentType = inbound_receipt`
- `stock_stage_transfers` -> `documentType = stage_transfer`
- `export_orders` -> `documentType = export_order`
- `inventory_transactions.type = adjustment` -> `documentType = adjustment`

Sau khi normalize, report engine chỉ cần:

1. lấy opening balance trước `fromDate`
2. lấy ledger trong khoảng ngày
3. map từng event vào 1 trong 4 bucket:
   - `nhapBtp`
   - `nhapTp`
   - `xuatBtp`
   - `xuatTp`
4. chạy running balance theo thứ tự thời gian

### 11.13 Rule sắp xếp và gộp dòng

Để giống thẻ kho giấy, cần cố định rule sắp xếp:

1. `transaction_date ASC`
2. `created_at ASC`
3. `document_ref ASC`
4. `sequence nội bộ ASC`

Rule gộp dòng khuyến nghị:

- Mặc định: **không gộp nhiều chứng từ thành một dòng**
- Chỉ gộp nếu cùng:
  - ngày
  - chứng từ gốc
  - loại nghiệp vụ
  - diễn giải

Lý do:

- Thẻ kho cần truy ngược chứng từ
- Nếu gộp quá mạnh sẽ làm mất khả năng đối soát với phiếu gốc

### 11.14 Giao diện frontend đề xuất

Màn hình `Thẻ kho BTP/TP` nên có 2 lớp:

#### A. Màn hình danh sách

- Filter theo mã hàng / tên hàng
- Filter theo khoảng ngày
- Filter theo chế độ xem:
  - `Tất cả`
  - `BTP`
  - `TP`
  - `BTP + TP`
- Bảng danh sách gồm:
  - Mã SKU
  - Tên hàng
  - Tồn đầu BTP
  - Tồn đầu TP
  - Tồn cuối BTP
  - Tồn cuối TP
  - Ngày phát sinh cuối
  - Nút `Xem thẻ`
  - Nút `In`
  - Nút `Excel`

#### B. Màn hình chi tiết thẻ

- Block header đúng form giấy
- Bảng PrimeReact `DataTable` cho phần chi tiết
- Footer có dòng `Tổng cộng`
- Nút thao tác:
  - `In thẻ kho`
  - `Xuất Excel`
  - `Xem chứng từ gốc`

Với DataTable, mỗi dòng nên bind đúng 4 cột số liệu nhập xuất và 2 cột tồn lũy kế, không để frontend tự tính lại từ formatted string.

### 11.15 API type gợi ý cho frontend

File gợi ý: `src/lib/stockCardApi.ts`

```ts
export type StockCardListRow = {
  familyId: string
  familyCode: string
  familyName: string
  openingSemiQty: number
  openingFinishedQty: number
  closingSemiQty: number
  closingFinishedQty: number
  lastTransactionDate: string
  rowCount: number
}

export type StockCardDetailRow = {
  sequence: number
  transactionDate: string
  documentType: string
  documentId: string
  documentRef: string
  businessAction: string
  dienGiai: string
  nhapBtp: number
  nhapTp: number
  xuatBtp: number
  xuatTp: number
  tonBtp: number
  tonTp: number
  signedBy: string
  note: string
}

export type StockCardDetailResponse = {
  header: {
    familyId: string
    cardTitle: string
    companyName: string
    printDate: string
    sheetNo: string
    productName: string
    orderDate: string
    orderedQty: number
    unitName: string
  }
  openingBalance: {
    semiFinishedQty: number
    finishedQty: number
  }
  rows: StockCardDetailRow[]
  totals: {
    nhapBtp: number
    nhapTp: number
    xuatBtp: number
    xuatTp: number
    closingBtp: number
    closingTp: number
  }
}
```

### 11.16 Phạm vi MVP nên chốt

Để ra nhanh phiên bản đầu, nên chốt MVP như sau:

1. Chỉ hỗ trợ `viewMode=combined`
2. Chỉ hỗ trợ 4 nghiệp vụ hiển thị:
   - tồn đầu
   - nhập BTP
   - xuất BTP
   - nhập TP
   - xuất TP / giao hàng
3. Chưa xử lý in PDF server-side, chỉ cần:
   - endpoint detail JSON
   - endpoint export Excel
4. Chưa cần chữ ký số hay workflow duyệt report

Nếu MVP chạy ổn, mới mở rộng tiếp:

1. `viewMode=semi_finished` và `finished`
2. drill-down tới chứng từ gốc
3. PDF print template
4. hao hụt / rework / QC hold như bucket riêng
