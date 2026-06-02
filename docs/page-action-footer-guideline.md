# Page Action Footer – Hướng dẫn áp dụng chuẩn

> **CSS classes**: `.page-action-footer` + `.page-action-footer-actions`  
> **Định nghĩa trong**: `src/App.css` (tìm `.page-action-footer {`)  
> **Áp dụng từ**: Inbound Step 1–4, ProductionBomPage

---

## Mục đích

Chuẩn hóa thanh footer hành động ở cuối các trang chi tiết/tạo mới trong toàn bộ ứng dụng. Thay thế cho các pattern ad-hoc như `outbound-page-actions` với inline style.

---

## Cấu trúc HTML chuẩn

```tsx
<footer className="page-action-footer">
  {/* Bên trái: ghi chú/hint, có thể để rỗng nhưng giữ <p> */}
  <p>
    <i className="pi pi-info-circle" />
    {isNew
      ? 'Điền đầy đủ thông tin rồi lưu bản nháp.'
      : isReadonly
      ? 'Phiếu chỉ xem, không thể chỉnh sửa.'
      : 'Cập nhật xong nhấn Lưu.'}
  </p>

  {/* Bên phải: các nút hành động */}
  <div className="page-action-footer-actions">
    {/* Nút hủy/quay lại – luôn đứng đầu bên trái nhóm nút */}
    <Button
      type="button"
      label="Quay lại"
      icon="pi pi-angle-left"
      className="btn btn-ghost"
      onClick={() => navigate('/module-list')}
    />

    {/* Các nút trạng thái – thứ tự: phá/thu hồi → chuyển tiếp → hành động chính */}
    {!isNew && status === 'submitted' && (
      <Button label="Thu hồi" icon="pi pi-undo" className="btn btn-ghost" loading={saving}
        onClick={handleRecall} />
    )}
    {!isNew && status === 'submitted' && (
      <Button label="Phê duyệt" icon="pi pi-check"
        className="btn btn-primary inbound-next-btn" loading={saving}
        onClick={handleApprove} />
    )}
    {!isNew && status === 'draft' && (
      <Button label="Gửi duyệt" icon="pi pi-send"
        className="btn btn-primary inbound-next-btn" loading={saving}
        onClick={handleSubmit} />
    )}
    {(isNew || status === 'draft') && (
      <Button label="Lưu bản nháp" icon="pi pi-save"
        className="btn btn-primary inbound-next-btn" loading={saving}
        onClick={handleSave} />
    )}
  </div>
</footer>
```

---

## Quy tắc thứ tự nút (trái → phải)

| Vị trí | Loại nút | Class gợi ý |
|--------|----------|-------------|
| 1 | Hủy phiếu / Quay lại | `btn btn-ghost` |
| 2 | Hành động phá/thu hồi (nếu có) | `btn btn-ghost` hoặc `outlined severity="danger"` |
| 3 | Hành động chuyển tiếp phụ | `btn` |
| 4 (rightmost) | Hành động chính (lưu / gửi / phê duyệt) | `btn btn-primary inbound-next-btn` |

> **Nguyên tắc**: hành động chính luôn ở ngoài cùng bên **phải**, ít rủi ro nhất ở ngoài cùng bên **trái**.

---

## CSS chính (App.css)

```css
.page-action-footer {
  border-top: 1px solid #e6e8ed;
  background: rgba(244, 244, 246, 0.05);
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-action-footer p {
  margin: 0;
  color: #5a5c68;
  font-style: italic;
  font-size: var(--font-size-caption);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.page-action-footer-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Nút hành động chính – đảm bảo chiều rộng tối thiểu */
.inbound-next-btn {
  min-width: 145px;
}
```

### Responsive (≤ 768px)

```css
@media (max-width: 768px) {
  .page-action-footer {
    flex-direction: column;
    align-items: flex-start;
  }
  .page-action-footer-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
```

---

## Modifier: `inbound-step4-footer`

Dùng riêng cho InboundStep4 (layout nút dạng grid thay vì flex):

```tsx
<footer className="page-action-footer inbound-step4-footer">
```

```css
.inbound-step4-footer {
  padding: 16px 18px;
  border: 1px solid #dee1e6;
  border-radius: 8px;
  background: #f8f9fb;
}
.inbound-step4-footer .page-action-footer-actions {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}
```

---

## Các module đã áp dụng

| Module | File |
|--------|------|
| Nhập kho – Bước 1 | `src/pages/InboundStep1Page.tsx` |
| Nhập kho – Bước 2 | `src/pages/InboundStep2Page.tsx` |
| Nhập kho – Bước 3 | `src/pages/InboundStep3Page.tsx` |
| Nhập kho – Bước 4 | `src/pages/InboundStep4Page.tsx` (+ modifier) |
| Định mức sản xuất | `src/pages/ProductionBomPage.tsx` |

---

## Áp dụng cho module mới

Khi tạo trang chi tiết / tạo mới mới, thay `<div className="outbound-page-actions">` bằng pattern trên:

1. Xóa `style={{ display: 'flex', gap: '...', padding: '...' }}` inline
2. Dùng `<footer className="page-action-footer">` bọc ngoài
3. Thêm `<p>` hint bên trái (nội dung tùy context)
4. Đặt các nút trong `<div className="page-action-footer-actions">` theo thứ tự đã quy định
5. Nút hành động chính thêm class `inbound-next-btn` để có min-width ổn định
