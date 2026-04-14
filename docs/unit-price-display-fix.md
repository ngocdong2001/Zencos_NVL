# Fix: Đơn vị đơn giá hiển thị sai ở Step 4

## Vấn đề
Khi xem chi tiết phiếu nhập kho ở Step 4 (bước kiểm tra QC), đơn vị đơn giá hiển thị **sai** so với dữ liệu trong database.

**Ví dụ:**
- Database chỉ định: `VND/L` (lít)
- Front-end hiển thị: `VND/ml` (mililít)

## Nguyên nhân gốc rễ

### 1. Backend không trả về `orderUnitRef` trong response
**File:** `server/src/routes/inbound.ts` - Endpoint `GET /receipts/:id`

**Vấn đề:**
- Query truy vấn `product.orderUnitRef` từ Prisma (lines 203-209):
  ```typescript
  product: {
    select: {
      id: true,
      code: true,
      name: true,
      orderUnitRef: {
        select: {
          unitName: true,
          conversionToBase: true,
        }
      }
    }
  }
  ```
- Nhưng khi **mapping response JSON** (lines 304-307), **không trả về** `orderUnitRef`:
  ```typescript
  // ❌ Thiếu orderUnitRef
  product: {
    id: item.product.id.toString(),
    code: item.product.code,
    name: item.product.name,
  }
  ```

**Kết quả:** Frontend không có dữ liệu đơn vị đơn giá từ DB.

### 2. Frontend fallback về `step2.selectedPriceUnit` (sai)
**File:** `src/pages/InboundStep4Page.tsx` - Line 162

**Vấn đề:**
```typescript
// ❌ Fallback sai số
const priceUnitLabel = (dbFirstItem?.product?.orderUnitRef?.unitName ?? step2.selectedPriceUnit ?? quantityUnitLabel)
```

Khi mở chi tiết phiếu từ danh sách (không navigate qua Step 3):
- `dbDetail` vẫn loading → `dbFirstItem` = null
- Fallback sang `step2.selectedPriceUnit` → **sử dụng đơn vị từ lần edit trước đó** → **sai**

**Ví dụ flow sai:**
1. Tạo phiếu mới với sản phẩm A (đơn vị: L)
2. Đi step 2, chọn đơn vị tính là "ml" → lưu vào `step2.selectedPriceUnit = "ml"`
3. Đi step 4, save draft
4. **Sau đó:** Mở chi tiết phiếu phiếu khác từ danh sách
5. Step 4 hiển thị: "VND/ml" (từ `step2.selectedPriceUnit` của lần edit trước)
6. ❌ Sai! Phiếu này phải là "VND/L" (từ DB)

## Giải pháp

### Fix 1: Backend trả về `orderUnitRef` đầy đủ ✅

**File:** `server/src/routes/inbound.ts`  
**Lines:** 280-307

**Thay đổi:**

```typescript
// Trước ❌
items: receipt.items.map((item: {
  id: bigint
  lotNo: string
  // ...
  product: { id: bigint; code: string; name: string }
  // ...
}) => ({
  id: item.id.toString(),
  product: {
    id: item.product.id.toString(),
    code: item.product.code,
    name: item.product.name,
  },
  // ...
})),

// Sau ✅
items: receipt.items.map((item: {
  id: bigint
  lotNo: string
  // ...
  product: { id: bigint; code: string; name: string; orderUnitRef: { unitName: string; conversionToBase: unknown } | null }
  // ...
}) => ({
  id: item.id.toString(),
  product: {
    id: item.product.id.toString(),
    code: item.product.code,
    name: item.product.name,
    orderUnitRef: item.product.orderUnitRef
      ? {
          unitName: item.product.orderUnitRef.unitName,
          conversionToBase: Number(item.product.orderUnitRef.conversionToBase),
        }
      : null,
  },
  // ...
})),
```

**Kết quả:** API trả về `{..., product: { ..., orderUnitRef: { unitName: "L", conversionToBase: 1 } } }`

### Fix 2: Frontend loại bỏ fallback sai số ✅

**File:** `src/pages/InboundStep4Page.tsx`  
**Line:** 162

**Thay đổi:**

```typescript
// Trước ❌
const priceUnitLabel = (dbFirstItem?.product?.orderUnitRef?.unitName ?? step2.selectedPriceUnit ?? quantityUnitLabel).trim() || 'đơn vị tính đơn giá'

// Sau ✅ - Loại bỏ fallback sai số
const priceUnitLabel = (dbFirstItem?.product?.orderUnitRef?.unitName ?? quantityUnitLabel).trim() || 'đơn vị tính đơn giá'
```

**Kết quả:**
- Nếu có DB data: dùng `dbFirstItem.product.orderUnitRef.unitName` → **"L"** ✅
- Nếu DB loading: fallback `quantityUnitLabel` (từ `unitUsed`) → hợp lý
- ❌ **Không fallback sang sai số** `step2.selectedPriceUnit`

## Alur fix hoạt động

### Scenario: Mở chi tiết phiếu từ danh sách

```
1. User click "View" trên danh sách
   ↓
2. Fetch API: GET /receipts/:id
   ↓
3. Backend response với:
   {
     items: [{
       product: {
         name: "Nước mắm",
         orderUnitRef: {
           unitName: "L",           ← ✅ Bây giờ có
           conversionToBase: 1
         }
       }
     }]
   }
   ↓
4. Frontend: dbFirstItem.product.orderUnitRef.unitName = "L"
   ↓
5. priceUnitLabel = "L"   ← ✅ Đúng!
   ↓
6. UI hiển thị: "VND/L"   ← ✅ Hiển thị đúng
```

## Kiểm tra kết quả

1. **Backend:**
   ```bash
   npx tsc -b --noEmit
   # ✅ Không có lỗi TypeScript
   ```

2. **Frontend:**
   ```bash
   npm run dev
   # ✅ Build thành công
   ```

3. **Test:**
   - Mở danh sách phiếu nhập kho
   - Click "Xem chi tiết" → Step 4
   - Kiểm tra "Đơn giá (VND/...)" → phải hiển thị đơn vị từ DB (L, kg, ml, etc.)
   - **Không phải** đơn vị từ lần edit trước

## Summary

| Aspect | Trước ❌ | Sau ✅ |
|--------|---------|--------|
| Backend query | ✅ Fetch orderUnitRef | ✅ Fetch orderUnitRef |
| Backend response | ❌ Không trả về orderUnitRef | ✅ Trả về orderUnitRef |
| Frontend DB check | ✅ Check orderUnitRef | ✅ Check orderUnitRef |
| Frontend fallback | ❌ Rơi vào step2.selectedPriceUnit | ✅ Rơi vào quantityUnitLabel (safe) |
| Hiển thị chi tiết | ❌ Sai (VND/ml) | ✅ Đúng (VND/L) |

## Files thay đổi

1. **`server/src/routes/inbound.ts`** - Lines 280-307
   - Thêm `orderUnitRef` vào type annotation
   - Mapping `orderUnitRef` vào response JSON

2. **`src/pages/InboundStep4Page.tsx`** - Line 162
   - Loại bỏ fallback `step2.selectedPriceUnit`
   - Giữ fallback `quantityUnitLabel` (an toàn)
