# UI Control Styling Guidelines

This document defines standard styling for UI controls to maintain consistency across the application when adding new filters, inputs, or components.

## Table Toolbar & Filters (app-table-toolbar)

### Container Styles
```css
.app-table-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #dee1e6;
  flex-wrap: wrap;
}
```

### Filter Control Wrapper (app-filter-control)
```css
.app-filter-control {
  border: 1px solid #dee1e6;
  border-radius: 6px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  color: #171a1f;
  background: #fff;
}
```

### Control Elements inside app-filter-control
- Height: **40px** (consistent)
- Font Size: **0.875rem** (14px)
- Border: **1px solid #dee1e6** (light gray)
- Border-radius: **6px**
- Padding: **0 12px** (left-right) or **0.5rem 0.875rem** (for individual controls)
- Background: **#fff** (white)
- Focus State: **border-color: #5269e0; box-shadow: 0 0 0 3px rgba(82, 105, 224, 0.1);**

### Icons in Controls
- Position: **absolute left: 0.75rem**
- Font Size: **0.875rem**
- Color: **#9ca3af** (medium gray)
- z-index: **1**
- pointer-events: **none**

### PrimeReact Components in Toolbar

#### Dropdown
```tsx
<label className="app-filter-control">
  <i className="pi pi-filter" aria-hidden />
  <Dropdown
    value={statusFilter}
    options={STATUS_OPTIONS}
    optionLabel="label"
    optionValue="value"
    onChange={(e) => handleChange(e.value)}
  />
  <i className="pi pi-angle-down" aria-hidden />
</label>
```
- **optionLabel** and **optionValue** are REQUIRED (PrimeReact v10.9.7)
- Must include icon indicators for visual consistency

#### Calendar (Date Range — split 2 inputs)

InboundPage and similar list pages use **two separate Calendar controls** wrapped in `app-filter-control app-date-control`:

```tsx
<div className="app-filter-control app-date-control">
  <i className="pi pi-calendar" aria-hidden />
  <span>Từ ngày</span>
  <Calendar
    value={fromDate}
    onChange={(e) => setFromDate((e.value as Date | null) ?? null)}
    dateFormat="dd/mm/yy"
    readOnlyInput
    showIcon
    aria-label="Từ ngày"
  />
</div>

<div className="app-filter-control app-date-control">
  <i className="pi pi-calendar" aria-hidden />
  <span>Đến ngày</span>
  <Calendar
    value={toDate}
    onChange={(e) => setToDate((e.value as Date | null) ?? null)}
    dateFormat="dd/mm/yy"
    readOnlyInput
    showIcon
    aria-label="Đến ngày"
  />
</div>
```

**`app-date-control`** modifier adds `min-width: 210px` and styles the label `<span>` in muted gray.

> **Do NOT use** `selectionMode="range"` with a single Calendar in the toolbar — it does not match the current pattern.

#### Clear Button Style (app-filter-clear-btn)
```css
.app-filter-clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  transition: color 0.2s ease;
}

.app-filter-clear-btn:hover {
  color: #475569;
}
```

## Status Badge (app-status-badge)

Dùng `<span className="app-status-badge {status}">` để hiển thị trạng thái. Class modifier là giá trị status string nguyên bản từ API (không dịch).

```tsx
<span className={`app-status-badge ${row.status}`}>
  {STATUS_LABELS[row.status] ?? row.status}
</span>
```

### Các modifier hiện có

| Class modifier | Màu | Ý nghĩa |
|---|---|---|
| `draft` | xám | Bản nháp |
| `pending` | xám | Chờ xử lý |
| `submitted` | xanh dương | Chờ duyệt |
| `waiting_qc` | xanh dương | Chờ QC |
| `approved` | vàng amber | Đã duyệt |
| `ordered` | tím | Đã đặt hàng |
| `processing` | tím | Đang xử lý |
| `partially_received` | vàng nâu | Nhập một phần |
| `received` | xanh lá | Đã nhập kho |
| `done` | xanh lá | Hoàn thành |
| `completed` | xanh lá | Hoàn thành (đơn sản xuất) |
| `fulfilled` | xanh lá | Đã thực hiện |
| `cancelled` | đỏ | Đã hủy |
| `inactive` | đỏ nhạt | Ngưng hiệu lực |
| `archived` | xám | Lưu trữ |

> **Không** tự viết inline style cho badge. Nếu cần thêm status mới, bổ sung vào `src/App.css` theo cùng pattern.

## Quantity Formatting

**Source of Truth**: `docs/quantity-format-guideline.md`

- Display: `vi-VN` locale, max 3 decimal digits
- On focus: show raw numeric value
- On blur: show formatted value
- Parsing: support `1000`, `1.000`, `1,000`, `1000.5`, `1.000,5`

## Common Color Palette
- **Primary**: `#5269e0` (blue)
- **Primary Dark**: `#4457cc`
- **Success**: `#10b981` (green)
- **Danger**: `#ef4444` (red)
- **Text Dark**: `#171a1f` (nearly black)
- **Text Medium**: `#6b7280` (medium gray)
- **Text Light**: `#9ca3af` (light gray)
- **Border**: `#dee1e6` (light border)
- **Background Light**: `#f9fafb` (off-white)

## PrimeReact Best Practices

### Required Props for Components Used in This Project
1. **Dropdown**: Always set `optionLabel` and `optionValue` explicitly
2. **Calendar**: Include `dateFormat="dd/mm/yy"` and `readOnlyInput` for date range pickers
3. **Button**: Use `type="button"` to prevent form submission
4. **Column**: Specify `style={{ width: '...' }}` for consistent column sizing

### Icon Integration
- Use PrimeReact icon library: `<i className="pi pi-<icon-name>" />`
- Always set `aria-hidden` on decorative icons
- Include meaningful `aria-label` on interactive icons/buttons

## When Adding a New Control
1. Wrap in `app-filter-control` label if in toolbar
2. Use height: **40px** for consistency
3. Include icon prefix (e.g., `pi-filter`, `pi-calendar`, `pi-search`)
4. Set focus state to **blue border + light blue shadow**
5. Test with PrimeReact component's `optionLabel` and `optionValue` if applicable
6. Document component behavior in this guide if it differs from standard patterns
7. Use existing CSS classes — minimize inline styles

## Spacing & Gaps
- Between controls: **10px** (in toolbar)
- Within control (icon to element): **8px**
- Padding within control: **12px** (left-right) or **0.5rem** (top-bottom)

## Typography
- Font Size (filters/toolbar): **0.875rem** (14px)
- Font Weight (labels): **500** or **600** for emphasis
- Line Height: **1.25rem** or **1.5**

---

**Last Updated**: 2026-05-20  
**Related Files**: 
- `src/App.css` — Global toolbar, filter, and badge styles
- `docs/quantity-format-guideline.md` — Numeric formatting rules
