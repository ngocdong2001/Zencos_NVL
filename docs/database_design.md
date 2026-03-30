# DATABASE SCHEMA – ZENCOS (OEM/ODM COSMETICS)

Chuẩn: cGMP ASEAN – Truy xuất LOT – Audit Ready

---

# 1. NGUYÊN TẮC THIẾT KẾ

* Tách riêng:

  * Products (thành phẩm)
  * Materials (nguyên liệu / bao bì)
* LOT quản lý riêng
* Hóa đơn không gộp vào kho
* Có version cho công thức
* Không delete vật lý (chỉ dùng `status`, `is_deleted`)
* Có audit trail (triển khai riêng)

---

# 2. MASTER DATA

## 2.1 products

```sql
products
--------
id (PK)
product_code (unique)
product_name

category
sub_category

uom
pack_size

spec_version
status

created_at
created_by
updated_at
updated_by
is_deleted
```

---

## 2.2 materials

```sql
materials
---------
id (PK)
material_code (unique)
material_name

material_type (RAW / PACKAGING)
group_name

uom

requires_coa
requires_msds
requires_tds
requires_ifra

requires_qc
requires_invoice

status

created_at
created_by
updated_at
updated_by
is_deleted
```

---

## 2.3 suppliers

```sql
suppliers
---------
id
supplier_name
tax_code
country
contact
status
```

---

## 2.4 customers

```sql
customers
---------
id
customer_name
contact
status
```

---

# 3. R&D – CÔNG THỨC

## 3.1 formulas

```sql
formulas
--------
id
formula_code
product_id

version
status (draft / approved / obsolete)

approved_by
approved_at
```

---

## 3.2 formula_items

```sql
formula_items
-------------
id
formula_id
material_id

percentage
sequence
is_active
```

---

## 3.3 formula_process

```sql
formula_process
---------------
id
formula_id
step_no
description
control_point
```

---

## 3.4 product_specs

```sql
product_specs
-------------
id
product_id
spec_name
min_value
max_value
unit
```

---

# 4. LOT – KHO – HỒ SƠ KỸ THUẬT

## 4.1 material_lots

```sql
material_lots
-------------
id
material_id
supplier_id

lot_supplier
lot_internal (unique)

mfg_date
exp_date
retest_date

qty_received
qty_available

qc_status
qa_status

status

created_at
```

---

## 4.2 material_documents

```sql
material_documents
------------------
id
lot_id

doc_type (COA/MSDS/TDS/IFRA/ALLERGEN)
file_url

issue_date
valid_to
```

---

## 4.3 inventory_transactions

```sql
inventory_transactions
----------------------
id
material_id
lot_id

transaction_type (IN/OUT/RETURN/ADJUST)
qty

reference_type (GRN/ISSUE/BATCH)
reference_id

created_at
```

---

# 5. HÓA ĐƠN

## 5.1 invoices

```sql
invoices
--------
id
invoice_no
supplier_id

invoice_date
total_amount
status
```

---

## 5.2 invoice_items

```sql
invoice_items
-------------
id
invoice_id
material_id

qty
unit_price
```

---

## 5.3 invoice_lot_mapping

```sql
invoice_lot_mapping
-------------------
id
invoice_item_id
lot_id

qty_linked
```

---

## 5.4 invoice_status_tracking

```sql
invoice_status_tracking
-----------------------
id
lot_id

status (FULL / MISSING / EXCESS)
note
```

---

# 6. QC / QA

## 6.1 qc_results

```sql
qc_results
----------
id
lot_id (nullable)
batch_id (nullable)

test_type (incoming / process / final)
test_name
result
conclusion

qc_user
qc_date
```

---

## 6.2 qa_approvals

```sql
qa_approvals
------------
id
ref_type (LOT / BATCH)
ref_id

status
approved_by
approved_at
```

---

# 7. SẢN XUẤT

## 7.1 production_orders

```sql
production_orders
-----------------
id
mo_code

product_id
formula_id

planned_qty
plan_date

status
```

---

## 7.2 batches

```sql
batches
-------
id
batch_code

production_order_id

start_time
end_time

status
```

---

## 7.3 batch_material_issues

```sql
batch_material_issues
---------------------
id
batch_id
material_id
lot_id

qty_planned
qty_issued
```

---

## 7.4 batch_actual_usage

```sql
batch_actual_usage
------------------
id
batch_id
material_id
lot_id

qty_used
waste_qty
```

---

# 8. THÀNH PHẨM

## 8.1 finished_goods

```sql
finished_goods
--------------
id
batch_id
product_id

qty_produced
qty_approved
status
```

---

## 8.2 fg_inventory

```sql
fg_inventory
------------
id
product_id
batch_id

qty_available
```

---

# 9. HỒ SƠ LÔ (GMP)

## 9.1 batch_records

```sql
batch_records
-------------
id
batch_id

completion_percent
status (open / closed)

closed_by
closed_at
```

---

## 9.2 batch_record_checklist

```sql
batch_record_checklist
----------------------
id
batch_record_id

item_name
status
```

---

## 9.3 deviations

```sql
deviations
----------
id
batch_id
description
status
```

---

## 9.4 capa

```sql
capa
----
id
deviation_id

action
status
```

---

# 10. TRUY XUẤT

## Chuỗi truy xuất chuẩn

```
finished_goods
→ batches
→ batch_material_issues
→ material_lots
→ suppliers
→ material_documents
→ invoice_lot_mapping
→ invoices
```

---

# 11. INDEX BẮT BUỘC

```sql
material_lots (material_id, lot_internal)
batch_material_issues (batch_id, lot_id)
invoice_lot_mapping (lot_id)
qc_results (lot_id, batch_id)
```

---

# 12. RULE NGHIỆP VỤ

* Không cấp phát nếu:

  * LOT chưa QA duyệt
  * Hết hạn / quá retest
  * Thiếu COA/MSDS

* Thiếu hóa đơn:

  * Không chặn cứng
  * Cảnh báo đỏ
  * CEO duyệt

* Không cho:

  * sửa batch đã đóng
  * sửa công thức đã duyệt
  * xóa LOT

---

# 13. KẾT LUẬN

Schema này đảm bảo:

* Truy xuất đầy đủ GMP
* Kiểm soát LOT – hồ sơ kỹ thuật
* Kiểm soát hóa đơn 3 trạng thái
* Phù hợp SME nhưng sẵn sàng scale

---
