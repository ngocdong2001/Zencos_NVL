# Module Build Map - G Manufacturing Execution System

Tai lieu nay chuyen hoa yeu cau trong system design thanh module dev-ready theo 3 lop:
- Man hinh
- API
- Du lieu DB

## 1. Sale Request Module

- Man hinh:
  - Danh sach yeu cau khach hang
  - Tao yeu cau moi
  - Chi tiet yeu cau va tien do xu ly
- API:
  - POST /api/sales-requests
  - GET /api/sales-requests
  - GET /api/sales-requests/:id
  - PATCH /api/sales-requests/:id
  - POST /api/sales-requests/:id/submit
- DB:
  - sales_requests
  - sales_request_items
  - sales_request_attachments

## 2. R&D Formula Module

- Man hinh:
  - Workspace tao cong thuc
  - BOM nguyen lieu theo LOT
  - Kiem tra tai lieu COA/MSDS/TDS/IFRA
  - Trinh duyet cong thuc
- API:
  - POST /api/formulas
  - GET /api/formulas
  - GET /api/formulas/:id
  - PATCH /api/formulas/:id
  - POST /api/formulas/:id/submit
  - POST /api/formulas/:id/approve
  - POST /api/formulas/:id/reject
- DB:
  - formulas
  - formula_versions
  - formula_components
  - formula_approvals

## 3. Technical Release Module

- Man hinh:
  - Phat hanh du lieu ky thuat
  - Mapping sang GMP va ke toan
  - Lich su version da approved
- API:
  - POST /api/technical-releases
  - GET /api/technical-releases
  - GET /api/technical-releases/:id
  - POST /api/technical-releases/:id/publish
- DB:
  - technical_releases
  - technical_release_items
  - spec_snapshots

## 4. Production Planning Module

- Man hinh:
  - Ke hoach san xuat theo ngay tuan thang
  - MRP check thieu nguyen lieu
  - De xuat mua tu dong
- API:
  - POST /api/production-plans
  - GET /api/production-plans
  - GET /api/production-plans/:id
  - POST /api/production-plans/:id/run-mrp
  - POST /api/production-plans/:id/confirm
- DB:
  - production_plans
  - production_plan_items
  - material_requirements
  - purchase_suggestions

## 5. Purchasing Module

- Man hinh:
  - Danh sach de xuat mua
  - Tao PO
  - Theo doi giao hang va hoa don dau vao
- API:
  - POST /api/purchase-orders
  - GET /api/purchase-orders
  - GET /api/purchase-orders/:id
  - PATCH /api/purchase-orders/:id
  - POST /api/purchase-orders/:id/receive
- DB:
  - purchase_orders
  - purchase_order_items
  - vendor_invoices
  - vendor_invoice_lines

## 6. Warehouse Inbound LOT Module

- Man hinh:
  - Nhap kho theo LOT
  - Upload tai lieu ky thuat LOT
  - Trang thai cho QC
- API:
  - POST /api/material-lots
  - GET /api/material-lots
  - GET /api/material-lots/:id
  - PATCH /api/material-lots/:id
  - POST /api/material-lots/:id/attach-documents
- DB:
  - material_lots
  - lot_documents
  - inventory_transactions

## 7. QC Incoming Module

- Man hinh:
  - Danh sach LOT cho kiem
  - Form ket qua QC
  - Bien ban khong dat
- API:
  - POST /api/qc-incoming-results
  - GET /api/qc-incoming-results
  - GET /api/qc-incoming-results/:id
  - POST /api/qc-incoming-results/:id/finalize
- DB:
  - qc_incoming_results
  - qc_incoming_result_items
  - qc_nonconformities

## 8. QA LOT Approval Module

- Man hinh:
  - Queue duyet LOT
  - Duyet Dat Giu Loai
  - Ly do giu/loai
- API:
  - GET /api/qa/lot-approvals
  - POST /api/qa/lot-approvals/:lotId/approve
  - POST /api/qa/lot-approvals/:lotId/hold
  - POST /api/qa/lot-approvals/:lotId/reject
- DB:
  - qa_lot_decisions
  - qa_lot_decision_reasons

## 9. Work Order Module

- Man hinh:
  - Tao lenh san xuat
  - Kiem tra du dieu kien lot cong thuc
  - Dashboard trang thai lenh
- API:
  - POST /api/work-orders
  - GET /api/work-orders
  - GET /api/work-orders/:id
  - POST /api/work-orders/:id/release
  - POST /api/work-orders/:id/close
- DB:
  - work_orders
  - work_order_items
  - work_order_status_logs

## 10. Batch Record Module

- Man hinh:
  - Phat hanh ho so lo
  - Checklist GMP
  - Khoa dinh muc GMP
- API:
  - POST /api/batch-records
  - GET /api/batch-records
  - GET /api/batch-records/:id
  - POST /api/batch-records/:id/release
  - POST /api/batch-records/:id/finalize-checklist
- DB:
  - batch_records
  - batch_record_lines
  - batch_record_checklists

## 11. Material Dispensing Module

- Man hinh:
  - Cap phat theo LOT
  - Canh bao lot khong dat
  - Chot cap phat
- API:
  - POST /api/dispensings
  - GET /api/dispensings
  - GET /api/dispensings/:id
  - POST /api/dispensings/:id/confirm
- DB:
  - dispensings
  - dispensing_lines
  - dispensing_exceptions

## 12. Production Execution Module

- Man hinh:
  - Ghi nhan thuc te san xuat
  - Theo doi hao hut
  - Canh bao lech dinh muc
- API:
  - POST /api/production-runs
  - GET /api/production-runs
  - GET /api/production-runs/:id
  - POST /api/production-runs/:id/complete-step
- DB:
  - production_runs
  - production_run_steps
  - production_consumptions

## 13. IPC Module

- Man hinh:
  - Form QC trong qua trinh
  - Rule chan cong doan tiep
  - Dashboard su co IPC
- API:
  - POST /api/ipc-results
  - GET /api/ipc-results
  - GET /api/ipc-results/:id
  - POST /api/ipc-results/:id/approve-step
  - POST /api/ipc-results/:id/stop-line
- DB:
  - ipc_results
  - ipc_result_items
  - ipc_actions

## 14. Packaging Module

- Man hinh:
  - Ke hoach dong goi
  - Kiem bao bi dung quy cach
  - Xac nhan dong goi
- API:
  - POST /api/packaging-orders
  - GET /api/packaging-orders
  - GET /api/packaging-orders/:id
  - POST /api/packaging-orders/:id/confirm
- DB:
  - packaging_orders
  - packaging_order_items
  - packaging_material_checks

## 15. Finished Goods QC and QA Module

- Man hinh:
  - QC thanh pham
  - QA duyet thanh pham
  - Ket qua Dat Khong dat
- API:
  - POST /api/fg-qc-results
  - GET /api/fg-qc-results
  - POST /api/fg-qc-results/:id/finalize
  - POST /api/qa/fg-approvals/:batchId/approve
  - POST /api/qa/fg-approvals/:batchId/reject
- DB:
  - fg_qc_results
  - fg_qc_result_items
  - qa_fg_decisions

## 16. Finished Goods Warehouse Module

- Man hinh:
  - Nhap kho thanh pham
  - Ton kho theo batch/LOT
  - Lich su xuat nhap
- API:
  - POST /api/fg-receipts
  - GET /api/fg-receipts
  - GET /api/fg-inventory
- DB:
  - fg_receipts
  - fg_lots
  - fg_inventory_balances

## 17. Delivery Module

- Man hinh:
  - Tao lenh giao hang
  - Theo doi giao va xac nhan
  - Truy xuat batch giao cho khach
- API:
  - POST /api/deliveries
  - GET /api/deliveries
  - GET /api/deliveries/:id
  - POST /api/deliveries/:id/confirm
- DB:
  - deliveries
  - delivery_items
  - delivery_confirmations

## 18. Batch Closure Module

- Man hinh:
  - Checklist dong ho so lo
  - Kiem tra thieu chung tu
  - Khoa du lieu sau dong
- API:
  - GET /api/batch-closures/pending
  - POST /api/batch-closures/:batchId/validate
  - POST /api/batch-closures/:batchId/close
- DB:
  - batch_closures
  - batch_closure_checklists

## 19. Traceability and CAPA Module

- Man hinh:
  - Truy xuat 1 click theo LOT/batch/khach hang
  - Quan ly khieu nai va CAPA
  - Bao cao thu hoi
- API:
  - GET /api/traceability/lot/:lotNo
  - GET /api/traceability/batch/:batchNo
  - POST /api/capa
  - GET /api/capa
  - POST /api/recalls
- DB:
  - traceability_links
  - complaints
  - capa_records
  - recalls

## 20. Governance Module (RBAC, Audit, Versioning)

- Man hinh:
  - Quan ly role va permission
  - Nhat ky thao tac
  - Lich su version du lieu ky thuat
- API:
  - GET /api/roles
  - POST /api/roles
  - GET /api/audit-logs
  - GET /api/version-history/:entity/:id
- DB:
  - roles
  - permissions
  - role_permissions
  - user_roles
  - audit_logs
  - version_histories

## Cross-cutting rules can implement as middleware/services

- Rule gate:
  - Chua du cong thuc approved: chan tao lenh SX
  - LOT chua QC/QA: chan cap phat
  - Thieu COA/MSDS: chan cung
  - Thieu hoa don: chan mem + yeu cau CEO approve
- Alert engine:
  - Green Yellow Red theo muc do
  - Canh bao lot sap het han
  - Canh bao lech dinh muc
- Data policy:
  - Khong xoa vat ly
  - Bat buoc status + version
  - Day du audit log cho cac hanh dong phe duyet va chot ho so

## Suggested implementation order

- Sprint 1:
  - Governance, Sale Request, R&D Formula, Technical Release
- Sprint 2:
  - Planning, Purchasing, Inbound LOT, QC Incoming, QA LOT Approval
- Sprint 3:
  - Work Order, Batch Record, Dispensing, Production Execution, IPC
- Sprint 4:
  - Packaging, FG QC/QA, FG Warehouse, Delivery, Batch Closure, Traceability/CAPA
