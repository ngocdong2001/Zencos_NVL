# Huong dan style PrimeReact Calendar trong DataTable

## Muc tieu
- Dung Calendar cua PrimeReact trong DataTable ma khong bi vo layout.
- Giu format ngay dong nhat giua normal cell va editing cell.
- Van hien thi nut icon lich, nhung khong lam o bi gian cao/gian ngang.

## Van de thuong gap
- Cell ngay bi no chieu cao khi bat showIcon.
- Gia tri ngay hien thi khac nhau giua luc xem va luc sua.
- Khi nhap o dong new row, width cua Calendar vuot qua width cot.

## Chuan implementation

### 1) Dung Calendar cho editor va dong new row

    <Calendar
      value={parseIsoDate(String(options.value ?? ''))}
      onChange={(event) => options.editorCallback?.(normalizeDateCellValue(event.value))}
      dateFormat="dd/mm/yy"
      showIcon
      appendTo={document.body}
      aria-label="Ngay hoa don"
    />

### 2) Chuan hoa du lieu ngay truoc khi luu
- Chuan du lieu luu DB/API: yyyy-mm-dd.
- Chuan hien thi tren cell thuong: dd/mm/yyyy.
- Với gia tri tu Calendar, luon normalize ve ISO truoc khi goi API.

Goi y helper:

    function normalizeDateCellValue(value: unknown): string {
      if (value == null) return ''
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const y = value.getFullYear()
        const m = String(value.getMonth() + 1).padStart(2, '0')
        const d = String(value.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      }
      return ''
    }

## CSS chuan chong vo layout
Ap dung scope theo bang de tranh anh huong trang khac.

    .opening-stock-table .p-calendar {
      display: flex;
      align-items: stretch;
      width: 100%;
      min-width: 0;
      height: 32px;
      max-height: 32px;
      border: 1px solid var(--line);
      border-radius: 4px;
      overflow: hidden;
      background: #fff;
      box-sizing: border-box;
    }

    .opening-stock-table .p-calendar .p-inputtext {
      flex: 1 1 auto;
      width: 0;
      min-width: 0;
      height: 32px;
      max-height: 32px;
      line-height: 32px;
      border: none;
      border-radius: 0;
      padding: 0 8px;
      box-sizing: border-box;
    }

    .opening-stock-table .p-calendar .p-datepicker-trigger {
      flex: 0 0 28px;
      width: 28px;
      min-width: 28px;
      height: 32px;
      max-height: 32px;
      border: none;
      border-left: 1px solid var(--line);
      border-radius: 0;
      padding: 0;
    }

    .opening-stock-table .p-calendar .p-datepicker-trigger .p-button-icon {
      font-size: 12px;
    }

    .opening-stock-table .p-calendar.p-focus-within,
    .opening-stock-table .p-calendar:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(82, 105, 224, 0.18);
    }

## Checklist khi them cot ngay moi trong DataTable
- Editor cua cot dung Calendar, khong dung input[type=date].
- Dat dateFormat="dd/mm/yy" de UX dong nhat.
- Co helper normalize Date -> yyyy-mm-dd truoc khi submit.
- CSS scope theo class bang (vi du .opening-stock-table) de khong leak style.
- Trigger icon dung width co dinh (28px), input co gian (flex: 1 1 auto; width: 0).

## File tham chieu trong project
- src/pages/OpeningStockPage.tsx
- src/App.css
