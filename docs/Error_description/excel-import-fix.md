# Fix loi import Excel

## Van de
Khi import danh muc khach hang tu file Excel, cot `SDT` khong duoc doc vao preview va payload import.

File mau da duoc kiem tra:
- `docs/Test files/Test Import Excel/test import khach hang.xlsx`

## Nguyen nhan goc
Parser map header bang ham chuan hoa text trong `src/components/catalog/excelImport.ts`.

Truoc khi sua:
- Header trong file mau la `SĐT`
- Ham `normalizeText` co bo dau Unicode, nhung khong chuyen ky tu `Đ/đ` thanh `d`
- Ket qua la `SĐT` khong map duoc sang key `sdt`
- Parser bo trong cot so dien thoai du du lieu trong file Excel van co

## Cach fix
Da sua parser trong `src/components/catalog/excelImport.ts`:

1. Chuan hoa them ky tu `đ -> d` trong `normalizeText`
2. Bo sung alias cho header so dien thoai:
   - `sdt`
   - `sđt`
   - `so dien thoai`
   - `số điện thoại`
   - `dien thoai`
   - `phone`
3. Giữ cach doc gia tri hien thi tu worksheet cell (`cell.w`) de han che mat du lieu khi Excel luu cell dang number

## Ket qua
Sau khi sua:
- Cot `SĐT` trong file Excel mau duoc map dung
- So dien thoai duoc dua vao preview import va payload API cho tab `customers`
- `npm run build` pass

## Luu y
Neu Excel luu so dien thoai o dang number, so `0` o dau co the da mat ngay trong file nguon.
Parser khong the tu khoi phuc so `0` neu workbook khong con giu lai gia tri do.

De tranh mat du lieu:
- Dat cot so dien thoai o dang `Text` trong Excel truoc khi nhap
- Hoac nhap so dien thoai voi dau nhay don o dau neu can giu dinh dang

## File lien quan
- `src/components/catalog/excelImport.ts`
- `src/pages/CatalogPage.tsx`
- `src/components/catalog/CatalogImportModal.tsx`

---

## Bo sung: Loi import phan loai khi trung ma

### Trieu chung
Khi import Excel tab `classifications`, neu ma bi trung (VD: `RAW_MATERIAL`) thi UI hien:

- `Database unavailable. Please check your DATABASE_URL and MySQL server.`

Log backend:
- MySQL duplicate key (`Code: 1062`)
- key thuc te: `product_classifications.uq_catalog_classifications_code`

### Nguyen nhan
Nhanh bat duplicate truoc day phu thuoc ten index co dinh.
Tren DB thuc te ten key khac, nen khong match va loi roi xuong global error handler.

### Cach fix da ap dung
Tai route `classifications` trong backend:

1. Kiem tra ton tai `code` truoc khi `INSERT`
2. Kiem tra trung `code` voi ban ghi khac truoc khi `UPDATE`
3. Neu trung, tra `409` voi message nghiep vu:
   - `Mã phân loại đã tồn tại`

### Ket qua
- Import trung ma o tab phan loai khong con roi vao `Database unavailable`
- Frontend nhan duoc message nghiep vu de hien thong bao dung nguyen nhan
