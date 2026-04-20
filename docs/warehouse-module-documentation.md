# Warehouse Management Module Documentation

## Overview
The Warehouse Management Module is an FEFO (First Expiration First Out) inventory system that provides comprehensive inventory tracking, management, and reporting capabilities.

## Module Structure

### API Layer (`src/lib/warehouseApi.ts`)
Provides all backend communication for warehouse operations.

**Types:**
- `LotDetail` - Details of a single lot/batch
- `InventoryItem` - Main inventory item with lot details
- `InventorySummary` - Summary statistics
- `FilterOptions` - Filter type options ('all' | 'expiring_soon' | 'low_stock')

**Main Functions:**
- `fetchInventorySummary()` - Get warehouse summary statistics
- `fetchInventoryItems(filter, search, page, pageSize)` - Fetch paginated inventory list with filtering
- `fetchInventoryItem(id)` - Get single item details
- `createInventoryItem(payload)` - Create new inventory item
- `updateInventoryItem(id, payload)` - Update inventory item
- `deleteInventoryItem(id)` - Delete inventory item
- `exportInventoryToExcel()` - Export inventory to Excel file

### Page Component (`src/pages/WarehousePage.tsx`)
Main page component that orchestrates the warehouse management interface.

**Features:**
- Summary cards showing key metrics
- Advanced filtering and search
- Paginated data table
- Export functionality
- Error handling with toast notifications

**State Management:**
- Summary data
- Inventory items list
- Pagination (page, pageSize)
- Filtering (filter option, search query)
- Loading states

### Components

#### InventorySummaryCards (`src/components/warehouse/InventorySummaryCards.tsx`)
Displays four summary cards:
1. **Tổng Nguyên Liệu** (Total Raw Materials) - Total count
2. **Cần Hạn (CoDō)** (Near Expiration) - Count of items nearing expiration
3. **Tồn Kho Thấp** (Low Stock) - Count of low stock items
4. **Tổng Giá Trị Kho** (Total Inventory Value) - Currency formatted value

#### InventoryTable (`src/components/warehouse/InventoryTable.tsx`)
PrimeReact DataTable component with:

**Columns:**
- MÃ NVL (Material Code)
- INCI NAME (INCI Name)
- TÊN NGUYÊN LIỆU (Material Name)
- NHẬP (g) (Import Quantity)
- XUẤT (g) (Export Quantity)
- TỐN (g) (Stock Quantity)
- Tổng Tồn (g) (Total Stock)
- Giá Trị (Value)
- Hành Động (Actions)

**Features:**
- Expandable rows showing lot details
- Sortable columns
- Pagination with configurable page size
- Action buttons (Edit, Delete, More Options)
- Status badges for lot conditions

**Lot Detail Table:**
- Lot No
- Hạn Sử Dụng (Expiration Date)
- Đơn Giá / 1kg (Unit Price)
- Tồn Kho (g) (Stock Quantity)
- Trạng Thái (Status) - with color-coded badges

### Styling

#### CSS Files:
- `WarehousePage.css` - Page layout and structure
- `InventorySummaryCards.css` - Summary cards styling
- `InventoryTable.css` - Table and lot details styling

**Key CSS Classes:**
- `.warehouse-page` - Main container
- `.page-header` - Header with title and actions
- `.summary-card` - Individual summary card
- `.filter-section` - Filter bar with search
- `.inventory-table` - Main data table
- `.lot-details` - Expandable lot details section
- `.status-badge` - Status indicator badge

## Quantity Formatting

The module follows strict quantity formatting rules per `docs/quantity-format-guideline.md`:

- **Display Format:** vi-VN locale with up to 3 decimal digits
- **Parse Function:** Uses `parseDecimalInput()` from shared utilities
- **Supported Input Formats:** 
  - 1000
  - 1.000 (European)
  - 1,000 (US/Vietnamese)
  - 1000.5
  - 1.000,5 (European decimal)

**Implementation:**
- Uses `formatQuantity()` for display
- Uses `parseDecimalInput()` for parsing user input
- Uses `formatCurrency()` for currency values

## API Endpoints Expected

The module expects the following backend endpoints:

```
GET  /api/warehouse/summary
GET  /api/warehouse/items?filter=all|expiring_soon|low_stock&search=query&page=1&pageSize=10
GET  /api/warehouse/items/:id
POST /api/warehouse/items
PATCH /api/warehouse/items/:id
DELETE /api/warehouse/items/:id
GET  /api/warehouse/export/excel
```

## Routing

Added to `src/routes/config.tsx`:
```typescript
{ 
  path: '/warehouse', 
  label: 'Quản lý kho', 
  icon: 'pi pi-building', 
  component: WarehousePage 
}
```

## User Interface Features

### Header Section
- Title: "Danh sách Tồn kho (FEFO)"
- Subtitle: "Quản lý nguyên liệu theo nguyên tắc Hết hạn trước - Xuất trước."
- Action Buttons:
  - "Xuất Excel" - Export to Excel
  - "Nhập kho mới" - Create new inventory entry

### Filter and Search Section
- Quick search input for Material Code or INCI Name
- Filter buttons:
  - Tất cả (All)
  - Sắp hết hạn (Expiring Soon)
  - Tồn thấp (Low Stock)
- Add Filter button for advanced filtering

### Status Badges
- **Alert (Red):** Cần hạn (X ngày) - Item expiring within X days
- **Monitoring (Blue):** Theo dõi (X ngày) - Item to monitor
- **Normal (Green):** Bình thường - Normal status

## Future Enhancements

1. **New Entry Form** - Create modal/form for adding new inventory
2. **Edit Functionality** - Update existing inventory items
3. **Delete Confirmation** - Confirm deletion with warning
4. **Batch Operations** - Select multiple items for actions
5. **Advanced Filters** - Custom filter criteria
6. **Export Options** - PDF, CSV export formats
7. **Analytics** - Charts and analytics for inventory trends
8. **Notifications** - Real-time alerts for expiring items
9. **Lot Tracking** - Detailed lot history and traceability
10. **Barcode Scanning** - Barcode input for quick operations

## Error Handling

The module includes comprehensive error handling:
- API failures show error toast messages
- Network errors are caught and displayed
- Invalid data parsing shows validation messages
- Loading states prevent user confusion

## Performance Considerations

- Lazy loading of inventory items
- Pagination to limit data transfer
- Expandable rows only load details on demand
- Efficient filtering on backend
- Debounced search input (recommended for full implementation)

## Accessibility

- Semantic HTML structure
- ARIA labels on buttons
- Keyboard navigation support
- Color contrast compliance
- Screen reader friendly

## Dependencies

- `primereact` - UI components (DataTable, Column, Toast)
- `react` - Core framework
- `react-router-dom` - Routing
- Shared utilities from `src/components/purchaseOrder/format.ts`

## Testing Recommendations

1. Test all filter combinations
2. Verify pagination works correctly
3. Test export functionality
4. Validate quantity formatting in all scenarios
5. Test expandable row functionality
6. Verify API error handling
7. Test search with various query patterns
