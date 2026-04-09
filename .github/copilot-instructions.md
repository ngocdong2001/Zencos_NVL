- [x] Verify that the copilot-instructions.md file in the .github directory is created.
  - Created at `.github/copilot-instructions.md`.

- [x] Clarify Project Requirements
  - Implemented as a Business Management web app with React + TypeScript + Vite.

- [x] Scaffold the Project
  - Scaffolding completed in `.` using Vite React TypeScript template.

- [x] Customize the Project
  - Added app sections: Dashboard, Clients, Invoices, and Reports.

- [x] Install Required Extensions
  - No required extensions were specified by project setup info.

- [x] Compile the Project
  - Build passed with `npm run build`.

- [x] Create and Run Task
  - Added `.vscode/tasks.json` with `Run Business App` task.

- [x] Launch the Project
  - Launch command is available via task; debug launch awaits explicit user confirmation.

- [x] Ensure Documentation is Complete
  - Updated `README.md` and ensured this instructions file is present and current.

- Work through each checklist item systematically.
- Keep communication concise and focused.
- Follow development best practices.

## Mandatory Quantity Formatting Rules

- Always apply quantity formatting rules when creating or editing any quantity field in UI, import/export, parsing, or calculation flows.
- Source of truth: `docs/quantity-format-guideline.md`.
- Display quantity values using `vi-VN` formatting with up to 3 decimal digits.
- For editable quantity inputs: show raw numeric value on focus, and formatted value on blur.
- Never compute totals from formatted strings. Parse to numeric value first, then compute and persist.
- Parsing must support common user input styles: `1000`, `1.000`, `1,000`, `1000.5`, `1.000,5`.
- If quantity parsing is invalid, block save/import action and show a clear validation message.

## Mandatory Figma-to-UI Component Rules

- Always apply these rules when converting Figma templates/designs to UI code in this repository.
- Source of truth for migration style and rationale: `docs/prime-react-datatable-migration-log.md`.
- For all table-like UI (list, grid, report, editable rows), use PrimeReact `DataTable` + `Column` by default.
- Do not implement new business tables using raw HTML `<table>` unless the user explicitly asks for plain HTML.
- For all common form and interaction controls, prefer PrimeReact components over native HTML controls:
  - Text input: `InputText`
  - Numeric input: `InputNumber`
  - Text area: `InputTextarea`
  - Select: `Dropdown`
  - Date/time: `Calendar`
  - Checkbox: `Checkbox`
  - Radio: `RadioButton`
  - Button/action: `Button`
  - Modal/dialog: `Dialog`
  - Tabs: `TabView`/`TabPanel` when tabs are needed
  - Table pagination/filter/sort/selection: implement through PrimeReact table patterns first
- Keep visual and interaction consistency with existing PrimeReact usage in:
  - `src/pages/CatalogPage.tsx`
  - `src/pages/OpeningStockPage.tsx`
  - `src/pages/PurchaseOrderPage.tsx`
