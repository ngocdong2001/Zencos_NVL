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

#### Calendar (Date Range)
```tsx
<label className="app-filter-control">
  <i className="pi pi-calendar" aria-hidden />
  <Calendar
    value={dateRange}
    onChange={(e) => setDateRange(e.value)}
    selectionMode="range"
    readOnlyInput
    placeholder="Từ ngày - Đến ngày"
    dateFormat="dd/mm/yy"
    showButtonBar
  />
  {dateRange?.[0] && (
    <button
      type="button"
      className="app-filter-clear-btn"
      onClick={() => setDateRange(null)}
      title="Xóa bộ lọc"
      aria-label="Xóa bộ lọc"
    >
      <i className="pi pi-times" />
    </button>
  )}
</label>
```

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

## Filter Section (filter-section)

### Container (used outside toolbar, e.g., in page header area)
```css
.filter-section {
  background: rgba(243, 244, 246, 0.3);
  border: 1px solid #dee1e6;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 1px 2px rgba(23, 26, 31, 0.05);
}
```

### Divider (filter-divider)
```css
.filter-divider {
  width: 1px;
  height: 24px;
  background: #dee1e6;
  flex-shrink: 0;
}
```

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
- `src/App.css` — Global toolbar and filter styles
- `src/pages/WarehousePage.css` — Filter section examples
- `docs/quantity-format-guideline.md` — Numeric formatting rules
