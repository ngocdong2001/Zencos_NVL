# Loi AutoComplete trong DataTable - Huong dan xu ly

## Trieu chung thuong gap
- Go vao o AutoComplete thay icon loading nhung khong hien danh sach goi y.
- Chon item xong bi nhay sang item khac (thuong la item dau tien).
- Click vao o AutoComplete bi DataTable chuyen sang che do cell edit, mat focus hoac dong panel.

## Nguyen nhan goc
1. DataTable cell memoization
- DataTable mac dinh co cellMemo=true.
- Neu suggestions la state ben ngoai rowData, cell co the khong re-render khi suggestions thay doi.
- Ket qua: panel khong duoc cap nhat du lieu moi.

2. Xung dot su kien voi editMode="cell"
- Click vao o co the bi DataTable bat su kien cell edit truoc AutoComplete.
- Ket qua: dropdown khong mo dung hoac mat focus ngay.

3. Overlay bi cat boi container
- Cac wrapper co overflow hidden/auto co the cat panel cua AutoComplete.
- Ket qua: loading co chay nhung khong thay danh sach.

4. Flow chon item khong on dinh
- Xu ly chon item trong ca onChange va onSelect cung luc.
- Ket hop forceSelection/coercion co the lam gia tri vua chon bi ghi de.

## Mau xu ly on dinh de tai su dung
1. Cho column chua AutoComplete trong DataTable editMode cell
- Them onBeforeCellEditShow va chan edit voi dong new row.
- Muc tieu: khong cho DataTable tranh focus voi AutoComplete.

2. Dat overlay ra ngoai container table
- Dat appendTo=document.body cho AutoComplete.
- Muc tieu: tranh bi cat boi overflow.

3. Chan bubble su kien o wrapper cua AutoComplete
- Wrapper quanh AutoComplete nen stopPropagation cho click va mousedown.
- Muc tieu: tranh DataTable bat su kien cua input.

4. Don gian hoa luong chon item
- onSelect: chi dung de chot item duoc chon.
- onChange: chi xu ly text nguoi dung dang go (kieu string) va clear khi rong.
- Khong goi ham chon item trong onChange khi e.value la object.

5. Tranh race condition khi da chon item
- Khi onSelect chay:
  - clear timeout search dang cho.
  - tang request id de vo hieu hoa request cu.
  - clear suggestions de dong panel sach.

6. Neu van gap hien tuong khong re-render suggestions
- Tat cell memo cho bang co dong nhap moi:
  - Dat cellMemo=false tren DataTable.
- Luu y: bang lon can can nhac hieu nang.

## Checklist debug nhanh
1. Kiem tra suggestions co cap nhat khong (React DevTools/state).
2. Kiem tra panel co render trong DOM khong.
3. Neu panel co render nhung khong thay, uu tien check overflow va appendTo.
4. Neu click xong nhay item, check lai onChange/onSelect va forceSelection.
5. Neu state dung ma UI khong doi, check cellMemo.

## Tai lieu lien quan
- Loi scrollbar ngang / layout bang: xem file `horizontal-scroll-fix.md` trong cung thu muc.

## Ghi chu cho codebase nay
- Da ap dung nhom fix tren Opening Stock DataTable.
- Build da pass sau moi buoc chinh sua.
- Neu sao chep mau nay sang DataTable khac, uu tien giu nguyen thu tu xu ly nhu tren de tranh bug lap lai.
