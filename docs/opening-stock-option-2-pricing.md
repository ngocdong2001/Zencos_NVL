# Khai bao ton kho dau ky - Lua chon 2

## Muc tieu
Ap dung mo hinh don vi quy doi de:
- Nhap so luong theo don vi nho nhat (quantity_base, vi du gram).
- Nhap don gia theo don vi gia linh hoat (kg, lit, thung...), tuy theo tung ma hang.
- Tu dong tinh thanh tien theo cong thuc quy doi.
- Dam bao du lieu lich su khong bi sai khi bang don vi thay doi ve sau.

## Nguyen tac tinh tien
Ky hieu:
- quantityBase: so luong theo don vi goc nho nhat.
- conversionToBaseOfPriceUnit: he so quy doi cua don vi gia ve don vi goc.
- unitPriceValue: don gia tren don vi gia.

Cong thuc:
1. so_luong_theo_don_vi_gia = quantityBase / conversionToBaseOfPriceUnit
2. lineAmount = so_luong_theo_don_vi_gia * unitPriceValue

Vi du:
- quantityBase = 2500 (gram)
- don vi gia = kg
- conversionToBaseOfPriceUnit = 1000
- unitPriceValue = 80000 (VND/kg)

Ket qua:
- so_luong_theo_don_vi_gia = 2.5
- lineAmount = 2.5 * 80000 = 200000

## Thay doi database (de xuat)
Bang: opening_stock_items

Them cot:
- unit_price_value DECIMAL(15,2) NOT NULL DEFAULT 0
- unit_price_unit_id BIGINT UNSIGNED NULL
- unit_price_conversion_to_base DECIMAL(15,4) NOT NULL DEFAULT 1
- line_amount DECIMAL(18,2) NOT NULL DEFAULT 0

Giu cot cu unit_price_per_kg trong giai doan chuyen doi de tranh gay vo API hien tai.

### Ly do can cot snapshot unit_price_conversion_to_base
Neu gia tri conversion_to_base trong product_units bi sua sau nay, chung tu cu van giu dung thanh tien tai thoi diem ghi nhan.

## SQL migration mau
```sql
ALTER TABLE opening_stock_items
  ADD COLUMN unit_price_value DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER quantity_display,
  ADD COLUMN unit_price_unit_id BIGINT UNSIGNED NULL AFTER unit_price_value,
  ADD COLUMN unit_price_conversion_to_base DECIMAL(15,4) NOT NULL DEFAULT 1 AFTER unit_price_unit_id,
  ADD COLUMN line_amount DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER unit_price_conversion_to_base;

ALTER TABLE opening_stock_items
  ADD CONSTRAINT opening_stock_items_unit_price_unit_id_fkey
  FOREIGN KEY (unit_price_unit_id) REFERENCES product_units(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX opening_stock_items_unit_price_unit_id_idx
  ON opening_stock_items(unit_price_unit_id);
```

## Backfill du lieu cu
Muc tieu: map du lieu dang dung unit_price_per_kg sang model moi.

Rule backfill de xuat:
- unit_price_value = unit_price_per_kg
- unit_price_unit_id = don vi kg cua product (neu tim thay)
- unit_price_conversion_to_base = 1000 (voi he gram-kg)
- line_amount = (quantity_base / unit_price_conversion_to_base) * unit_price_value

Neu khong tim thay don vi gia phu hop:
- Gan unit_price_unit_id = NULL
- unit_price_conversion_to_base = 1
- line_amount = quantity_base * unit_price_value
- Danh dau can review bang bao cao doi soat.

## Thay doi API

### GET /api/inventory-opening/rows
Tra them:
- unitPriceValue
- unitPriceUnitId
- unitPriceUnitCode
- unitPriceConversionToBase
- lineAmount

### POST /api/inventory-opening/rows
Nhan payload moi:
- code
- lot
- openingDate
- quantityBase
- unitPriceValue
- unitPriceUnitId
- expiryDate

Xu ly bat buoc o backend:
1. Validate product ton tai va chua xoa mem.
2. Validate unitPriceUnitId thuoc dung product.
3. Lay conversion_to_base cua unitPriceUnitId.
4. Tinh lineAmount tai server.
5. Luu unit_price_conversion_to_base (snapshot) + line_amount.
6. Tra ve row da tinh san lineAmount.

Khong tin lineAmount tu frontend.

## Thay doi UI trang ton dau
File lien quan:
- src/pages/OpeningStockPage.tsx
- src/lib/openingStockApi.ts
- src/components/catalog/types.ts (neu can bo sung type unit)

Yeu cau UI:
1. Them cot Thanh tien trong bang hien thi.
2. Dong nhap moi co:
   - So luong (don vi goc)
   - Don gia
   - Don vi don gia (dropdown theo product_units cua ma hang da chon)
   - Thanh tien (readonly, preview realtime)
3. Khi doi so luong, don gia, hoac don vi don gia => cap nhat preview ngay.
4. Dinh dang tien te theo VND.
5. Export CSV them cot THANH TIEN.

## Rule lam tron
De xuat:
- lineAmount tinh bang so thuc day du, chi lam tron khi hien thi.
- Luu DB DECIMAL(18,2).
- Frontend hien thi theo dinh dang vi-VN.

## Tinh tuong thich nguoc (rollout an toan)
Giai doan 1:
- Bo sung cot moi + API tra ve ca truong cu va moi.
- Frontend doc lineAmount neu co, fallback tu cong thuc cu neu chua co.

Giai doan 2:
- Frontend gui payload moi (unitPriceValue + unitPriceUnitId).
- Backend van chap nhan unitPricePerKg cho client cu (tam thoi).

Giai doan 3:
- Cat bo unit_price_per_kg va payload cu sau khi toan bo client da nang cap.

## Checklist test
- Them dong moi: 1000g, 25000 VND/kg => lineAmount = 25000.
- Them dong moi: 500g, 25000 VND/kg => lineAmount = 12500.
- Don vi gia khac kg (neu co): tinh dung theo conversion.
- Khong cho chon don vi gia khong thuoc ma hang.
- Doi conversion don vi sau khi da tao chung tu cu khong lam thay doi lineAmount lich su.
- Export CSV co cot THANH TIEN va gia tri dung.

## Ket luan
Lua chon 2 phu hop de mo rong he thong theo huong da don vi, giu duoc tinh dung lich su, va ho tro tinh thanh tien chinh xac ngay tai bang ton dau.