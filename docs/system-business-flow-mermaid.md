# Ra soat he thong va luu do nghiep vu (Mermaid)

Tai lieu nay tong hop nhanh cac phan he hien co va luong nghiep vu chinh dua tren route, API va quy tac trong du an.

## Mo nhanh tung luu do (khuyen nghi)

Neu plugin Mermaid cua ban dang parse ca file Markdown va bao loi "No diagram type detected", hay mo truc tiep cac file `.mmd` sau:

- `docs/mermaid/00-ceo-business-flow.mmd` (ban tom tat cho CEO)
- `docs/mermaid/01-system-map.mmd`
- `docs/mermaid/02-po-inbound-flow.mmd`
- `docs/mermaid/03-inbound-flow.mmd`
- `docs/mermaid/04-production-flow.mmd`
- `docs/mermaid/05-outbound-flow.mmd`
- `docs/mermaid/06-stock-transfer-flow.mmd`

## 1) Ban do chuc nang toan he thong

```mermaid
flowchart TB
  U["Nguoi dung theo vai tro"] --> AUTH["Dang nhap va phan quyen"]
  AUTH --> DASH["Tong quan KPI va canh bao"]

  subgraph MASTER["Danh muc va du lieu nen"]
    CATALOG["Catalog NVL / TP / Don vi / NCC"]
    USERS["Quan ly nguoi dung va phan quyen"]
    OPENING["Khai bao ton dau ky"]
  end

  subgraph WH["Van hanh kho"]
    PO["Yeu cau mua hang (PO)"]
    INBOUND["Nhap kho NVL (4 buoc + QC + Post)"]
    RAWWH["Kho NVL va FEFO"]
    PROD["Phieu san xuat 4 buoc"]
    FGWH["Kho thanh pham"]
    OUTRAW["Xuat kho NVL"]
    OUTFG["Xuat kho TP"]
    TRANSFER["Chuyen kho noi bo"]
  end

  CATALOG --> PO
  OPENING --> RAWWH
  PO --> INBOUND
  INBOUND --> RAWWH
  RAWWH --> PROD
  PROD --> FGWH
  RAWWH --> OUTRAW
  FGWH --> OUTFG
  RAWWH <--> TRANSFER
  FGWH <--> TRANSFER
  DASH --> PO
  DASH --> INBOUND
  DASH --> OUTRAW
```

## 2) Luong mua hang (PO) va ket noi nhap kho

```mermaid
flowchart LR
  A["Phat hien thieu hut ton kho"] --> B["Tao PO: status=draft"]
  B --> C{"Gui PO?"}
  C -- "Co" --> D["status=submitted"]
  C -- "Khong" --> B

  D --> E{"Thu hoi de sua?"}
  E -- "Co" --> B
  E -- "Khong" --> F{"Phe duyet?"}

  F -- "Co" --> G["status=approved"]
  F -- "Khong" --> H["status=cancelled"]

  G --> I["Dat hang NCC: status=ordered"]
  I --> J{"Nhan du hay mot phan?"}
  J -- "Mot phan" --> K["status=partially_received"]
  J -- "Du" --> L["status=received"]

  K --> M["Tao/In tiep Inbound Receipt"]
  L --> M
  M --> N["Dong bo received qty vao PO"]
```

## 3) Luong nhap kho NVL (Inbound Receipt)

```mermaid
flowchart LR
  A["Step 1: Tao phieu nhap draft"] --> B["Step 2: Khai bao lo, nha san xuat, so luong"]
  B --> C["Step 3: Chung tu, QC tung dong"]
  C --> D["Step 4: Xac nhan"]

  D --> E{"Submit QC"}
  E -- "Dat" --> F["status=pending_qc -> cho post"]
  E -- "Khong dat" --> G["Sua thong tin/chung tu"]
  G --> B

  F --> H["Post phieu: status=posted"]
  H --> I["Tao/Cap nhat Batch + giao dich nhap kho"]
  I --> J["Cap nhat ton kho NVL va dashboard"]

  H --> K{"Can dinh chinh?"}
  K -- "Co" --> L["Void & re-receive (tao phieu dieu chinh)"]
  L --> A
  K -- "Khong" --> M["Hoan tat"]
```

## 4) Luong san xuat 4 buoc (NVL -> BTP -> TP)

```mermaid
flowchart TB
  A["Tao phieu san xuat: draft"] --> B["Buoc 1: Xuat NVL tu kho NVL"]
  B --> C["Buoc 2: Nhap BTP"]
  C --> D["Buoc 3: Xuat BTP"]
  D --> E["Buoc 4: Nhap TP vao kho thanh pham"]

  E --> F{"Hoan tat lenh?"}
  F -- "Co" --> G["status=completed"]
  F -- "Khong" --> H["status=in_progress"]
  H --> B

  B --> I["Sinh giao dich xuat kho NVL"]
  E --> J["Sinh giao dich nhap kho TP"]
  I --> K["Trace log theo tung step"]
  J --> K
```

## 5) Luong xuat kho (NVL/TP) va dao phieu

```mermaid
flowchart LR
  A["Tao lenh xuat: status=pending"] --> B{"Du ton FEFO?"}
  B -- "Khong" --> C["Bao thieu ton / chua fulfill"]
  B -- "Co" --> D["Fulfil lenh xuat"]

  D --> E["status=fulfilled"]
  E --> F["Tru ton theo lo duoc chon"]

  A --> G{"Huy lenh?"}
  G -- "Co" --> H["status=cancelled"]

  E --> I{"Can dao nghiep vu?"}
  I -- "Co" --> J["Void & re-release (tao lenh bu)"]
  J --> A
  I -- "Khong" --> K["Dong giao dich"]
```

## 6) Luong chuyen kho noi bo

```mermaid
flowchart LR
  A["Tao phieu chuyen: draft"] --> B["Xac nhan phieu: confirmed"]
  B --> C["Dang van chuyen: in_transit"]
  C --> D{"Kho dich da nhan?"}
  D -- "Co" --> E["received"]
  D -- "Khong" --> C

  B --> F{"Huy phieu?"}
  F -- "Co" --> G["cancelled"]

  E --> H["Giam ton kho nguon"]
  E --> I["Tang ton kho dich"]
```

## 7) Ghi chu ra soat

- Luong kho duoc van hanh theo FEFO va co co che QC truoc khi post nhap kho.
- PO co day du vong doi draft -> submitted -> approved -> ordered -> partially_received/received -> cancelled.
- Inbound va outbound deu co co che dao nghiep vu an toan theo huong tao phieu bu (void & re-receive / void & re-release).
- San xuat da mo hinh hoa 4 buoc ro rang, co ghi nhat ky va cap nhat ton kho theo huong xuat NVL, nhap TP.
