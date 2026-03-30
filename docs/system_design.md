# WORKFLOW TỔNG THỂ ZENCOS – BẢN DEV READY

Chuẩn: cGMP ASEAN – OEM/ODM Cosmetics – Truy xuất LOT – Audit Ready

---

# 1. MỤC TIÊU

* Quản lý xuyên suốt từ Sale → R&D → Sản xuất → Giao hàng → Đóng hồ sơ lô
* Truy xuất:

  * nguyên liệu – LOT – NCC – COA/MSDS/TDS/IFRA
  * hóa đơn đầu vào
  * batch sản xuất – khách hàng
* Kiểm soát:

  * công thức – định mức – quy trình
  * tồn kho theo LOT
  * cấp phát – hao hụt
  * hồ sơ lô GMP
* Sẵn sàng:

  * thanh tra GMP
  * thu hồi – khiếu nại
  * kiểm toán tài chính

---

# 2. DANH SÁCH GIAI ĐOẠN

1. Sale tiếp nhận yêu cầu khách hàng
2. R&D nghiên cứu và chốt dữ liệu kỹ thuật
3. Phát hành dữ liệu kỹ thuật
4. Kế hoạch sản xuất
5. Mua hàng
6. Nhập kho nguyên liệu / bao bì theo LOT
7. QC đầu vào
8. QA duyệt LOT
9. Tạo lệnh sản xuất
10. Phát hành hồ sơ lô (Batch Record)
11. Cấp phát nguyên liệu theo LOT
12. Sản xuất bán thành phẩm
13. QC trong quá trình (IPC)
14. Đóng gói
15. QC thành phẩm
16. QA duyệt thành phẩm
17. Nhập kho thành phẩm
18. Giao hàng
19. Đóng hồ sơ lô
20. Truy xuất – CAPA – Thu hồi

---

# 3. CHI TIẾT TỪNG GIAI ĐOẠN

---

## 3.1 Sale → R&D

**Mục tiêu**: thu thập yêu cầu sản phẩm

**Input**:

* khách hàng
* loại sản phẩm
* công dụng
* dung tích
* số lượng

**Output**:

* yêu cầu kỹ thuật

**Điều kiện chuyển bước**:

* đủ thông tin bắt buộc

**Control**:

* thiếu dữ liệu → không chuyển R&D

---

## 3.2 R&D – Công thức

**Mục tiêu**:

* xây dựng công thức chuẩn

**Input**:

* yêu cầu Sale
* dữ liệu nguyên liệu

**Xử lý**:

* kiểm tra tồn kho
* kiểm tra LOT
* kiểm tra COA/MSDS/TDS/IFRA
* kiểm tra trạng thái hóa đơn

**Output**:

* công thức
* quy trình
* chỉ tiêu kỹ thuật

**Control**:

* nguyên liệu ngoài danh mục → CEO duyệt
* thiếu COA/MSDS → chặn
* thiếu hóa đơn → cảnh báo đỏ

---

## 3.3 Phát hành dữ liệu kỹ thuật

**Output**:

* công thức chính thức
* định mức R&D
* mapping sang GMP và kế toán

**Control**:

* chỉ version approved mới được sử dụng

---

## 3.4 Kế hoạch sản xuất

**Mục tiêu**:

* lập kế hoạch sản xuất

**Input**:

* công thức
* tồn kho

**Output**:

* kế hoạch
* đề xuất mua

**Control**:

* thiếu nguyên liệu → sinh đề xuất mua

---

## 3.5 Mua hàng

**Mục tiêu**:

* mua nguyên liệu

**Output**:

* đơn mua
* hóa đơn

---

## 3.6 Nhập kho LOT

**Mục tiêu**:

* quản lý nguyên liệu theo LOT

**Output**:

* material_lots
* hồ sơ kỹ thuật

**Control**:

* thiếu COA/MSDS → cảnh báo đỏ
* trạng thái: chờ QC

---

## 3.7 QC đầu vào

**Output**:

* kết quả QC

**Control**:

* không đạt → chặn sử dụng

---

## 3.8 QA duyệt LOT

**Output**:

* LOT đạt / giữ / loại

**Control**:

* chưa QA → không cấp phát

---

## 3.9 Tạo lệnh sản xuất

**Control**:

* thiếu công thức → chặn
* thiếu LOT đạt → chặn

---

## 3.10 Phát hành hồ sơ lô

**Output**:

* batch record

**Control**:

* khóa định mức GMP

---

## 3.11 Cấp phát nguyên liệu

**Control**:

* LOT không đạt → chặn cứng
* thiếu hóa đơn → chặn mềm + CEO duyệt

---

## 3.12 Sản xuất

**Output**:

* dữ liệu thực tế

**Control**:

* lệch định mức → cảnh báo

---

## 3.13 QC trong quá trình

**Control**:

* không đạt → chặn công đoạn tiếp

---

## 3.14 Đóng gói

**Control**:

* sai bao bì → chặn

---

## 3.15 QC thành phẩm

**Control**:

* không đạt → không nhập kho

---

## 3.16 QA duyệt thành phẩm

**Output**:

* batch đạt

---

## 3.17 Nhập kho thành phẩm

**Output**:

* tồn kho thành phẩm

---

## 3.18 Giao hàng

**Output**:

* delivery

---

## 3.19 Đóng hồ sơ lô

**Control**:

* thiếu hồ sơ → không đóng
* đóng → khóa dữ liệu

---

## 3.20 Truy xuất – CAPA

**Output**:

* báo cáo truy xuất
* CAPA

---

# 4. TRIGGER TỰ ĐỘNG

* tạo mã yêu cầu khi Sale submit
* kiểm tra nguyên liệu khi R&D tạo công thức
* sinh đề xuất mua khi thiếu tồn
* cảnh báo hết hạn LOT
* kiểm tra hóa đơn (FULL/MISSING/EXCESS)
* chặn mềm khi thiếu hóa đơn
* cảnh báo lệch định mức
* quét checklist hồ sơ lô trước khi đóng

---

# 5. HỆ THỐNG CẢNH BÁO

## Màu xanh

* đạt / đủ điều kiện

## Màu vàng

* chờ xử lý / sắp hết hạn

## Màu đỏ

* lỗi nghiêm trọng
* thiếu COA/MSDS
* thiếu hóa đơn
* LOT không đạt

---

# 6. RULE NGHIỆP VỤ

* chưa có công thức → không sản xuất
* chưa QC/QA → không dùng LOT
* thiếu COA/MSDS → không dùng
* thiếu hóa đơn → chặn mềm
* nguyên liệu mới → CEO duyệt
* IPC không đạt → dừng
* hồ sơ thiếu → không đóng

---

# 7. PHÂN QUYỀN

| Role     | Quyền chính    |
| -------- | -------------- |
| Sale     | tạo yêu cầu    |
| R&D      | công thức      |
| R&D Lead | duyệt          |
| Kế hoạch | lệnh SX        |
| Mua hàng | mua            |
| Kho      | LOT            |
| QC       | kiểm           |
| QA       | duyệt          |
| Kế toán  | hóa đơn        |
| CEO      | duyệt ngoại lệ |

---

# 8. LUỒNG DỮ LIỆU

* Sale → R&D
* R&D → QA / Kế hoạch / Kế toán
* Kế hoạch → Mua hàng
* Kho → QC → QA
* QA → Sản xuất
* Sản xuất → QC → QA
* QA → Kho thành phẩm
* Kho → Kế toán

---

# 9. 3 LỚP ĐỊNH MỨC

| Loại    | Mục đích     |
| ------- | ------------ |
| R&D     | công thức    |
| GMP     | batch record |
| Kế toán | giá thành    |

---

# 10. FLOW TUẦN TỰ

```
Sale
→ R&D
→ Công thức duyệt
→ Kế hoạch
→ Mua hàng
→ Nhập kho LOT
→ QC
→ QA duyệt LOT
→ Lệnh SX
→ Phát hành batch
→ Cấp phát
→ Sản xuất
→ IPC
→ Đóng gói
→ QC TP
→ QA duyệt
→ Nhập kho TP
→ Giao hàng
→ Đóng hồ sơ
```

---

# 11. KHUYẾN NGHỊ DEV

* bắt buộc có status + version
* tách GMP và kế toán
* không cho delete vật lý
* phải có audit log
* code theo trigger + rule

---

# 12. KẾT LUẬN

Workflow này đảm bảo:

* đúng thực tế vận hành nhà máy
* đủ để build phần mềm
* đủ để audit GMP
* đủ để truy xuất sản phẩm

---
