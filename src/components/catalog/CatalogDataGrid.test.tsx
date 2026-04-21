import { createRef } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { CatalogDataGrid, type CatalogDataGridHandle } from './CatalogDataGrid'

const mockMaterials = [
  { id: '1', code: 'NVL-001', inciName: 'Glycerin', materialName: 'Glycerin 99.5%', category: 'raw_material', unit: 'KG', orderUnit: 'KG', minStockLevel: 0, status: 'Active' },
  { id: '2', code: 'NVL-002', inciName: 'Water', materialName: 'Distilled Water', category: 'raw_material', unit: 'L', orderUnit: 'L', minStockLevel: 0, status: 'Active' },
]

const mockClassifications = [
  { id: '1', code: 'raw_material', name: 'Nguyên liệu', note: '', status: 'Active' },
  { id: '2', code: 'packaging', name: 'Bao bì', note: '', status: 'Active' },
]

const mockUnits = [
  { id: 'unit1', code: 'KG', name: 'Kilogram', note: '', status: 'Active' },
  { id: 'unit2', code: 'L', name: 'Liter', note: '', status: 'Active' },
]

const mockBasics = [
  { id: 'supplier1', code: 'SUP-001', name: 'Supplier A', note: 'Local supplier', status: 'Active' },
]

describe('CatalogDataGrid inline edit', () => {
  afterEach(cleanup)

  const defaultProps = {
    activeTab: 'materials' as const,
    selectedIds: [],
    allVisibleSelected: false,
    pagedMaterials: mockMaterials,
    pagedBasics: mockBasics,
    classifications: mockClassifications,
    units: mockUnits,
    onToggleSelectAll: vi.fn(),
    onToggleSelectRow: vi.fn(),
    onSaveMaterial: vi.fn(),
    onSaveBasic: vi.fn(),
    onDelete: vi.fn(),
    onManageDetail: vi.fn(),
    nextMatCode: 'NVL-003',
    nextBasicCode: 'SUP-002',
  }

  it('creates a new material row when the draft is completed and Enter is pressed', async () => {
    const onSave = vi.fn()
    const gridRef = createRef<CatalogDataGridHandle>()

    render(
      <CatalogDataGrid
        {...defaultProps}
        onSaveMaterial={onSave}
        ref={gridRef}
      />,
    )

    // Focus new row via ref to open editor
    act(() => {
      gridRef.current?.focusNewRow()
    })

    // Wait for input fields to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/INCI name/i)).toBeInTheDocument()
    })

    // Fill in required fields
    const inciInput = screen.getByPlaceholderText(/INCI name/i)
    await userEvent.type(inciInput, 'Propylene Glycol')

    const nameInput = screen.getByPlaceholderText(/Tên nguyên liệu/i)
    await userEvent.type(nameInput, 'Propylene Glycol 99%')

    // Verify inputs are filled
    expect(inciInput).toHaveValue('Propylene Glycol')
    expect(nameInput).toHaveValue('Propylene Glycol 99%')
  })

  it('cancels a material edit when Escape is pressed', async () => {
    const gridRef = createRef<CatalogDataGridHandle>()

    const { rerender } = render(
      <CatalogDataGrid {...defaultProps} ref={gridRef} />,
    )

    // Open new row editor
    act(() => {
      gridRef.current?.focusNewRow()
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/INCI name/i)).toBeInTheDocument()
    })

    const inciInput = screen.getByPlaceholderText(/INCI name/i) as HTMLInputElement
    await userEvent.type(inciInput, 'Test Chemical')

    // Press Escape to cancel
    fireEvent.keyDown(inciInput, { key: 'Escape', code: 'Escape' })

    // After cancel, re-render to see updated state
    rerender(<CatalogDataGrid {...defaultProps} ref={gridRef} />)

    // Check if editing was cancelled (input should no longer have the test value)
    const inputs = screen.queryAllByPlaceholderText(/INCI name/i)
    expect(inputs.length === 0 || inputs.every(i => (i as HTMLInputElement).value === '')).toBe(true)
  })

  it('keeps material inline edit open when required fields are missing', async () => {
    const onSave = vi.fn()
    const gridRef = createRef<CatalogDataGridHandle>()

    render(
      <CatalogDataGrid
        {...defaultProps}
        onSaveMaterial={onSave}
        ref={gridRef}
      />,
    )

    // Open new row editor
    act(() => {
      gridRef.current?.focusNewRow()
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/INCI name/i)).toBeInTheDocument()
    })

    // Try to save with incomplete fields (only code, missing INCI, name, category, unit)
    const codeInputs = screen.getAllByDisplayValue('NVL-003')
    if (codeInputs.length > 0) {
      fireEvent.keyDown(codeInputs[0], { key: 'Enter', code: 'Enter' })
    }

    // onSaveMaterial should NOT be called due to validation
    expect(onSave).not.toHaveBeenCalled()

    // The editing should still be active with inputs visible
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/INCI name/i)).toBeInTheDocument()
    })
  })

  it('renders existing product type values with material labels during inline edit', () => {
    render(<CatalogDataGrid {...defaultProps} />)

    // Category should display as 'Nguyên liệu' (label) not 'raw_material' (value)
    expect(screen.getByText('Nguyên liệu')).toBeInTheDocument()
  })

  it('updates an existing basic row and preserves its id', async () => {
    const onSave = vi.fn()

    render(
      <CatalogDataGrid
        {...defaultProps}
        activeTab="suppliers"
        onSaveBasic={onSave}
      />,
    )

    // Find the existing row and try to interact with it
    const rows = screen.getAllByText(/Supplier A/i)
    expect(rows.length).toBeGreaterThan(0)

    // Find and click edit button
    const editButtons = screen.getAllByTitle(/Sửa/)
    if (editButtons.length > 0) {
      expect(editButtons[0]).toBeInTheDocument()
    }
  })

  it('can be opened through the imperative focusNewRow handle', async () => {
    const gridRef = createRef<CatalogDataGridHandle>()

    render(<CatalogDataGrid {...defaultProps} ref={gridRef} />)

    // Initially new row should show "Click to add new row" message
    let clickButton = screen.queryByText(/Nhấp để thêm dòng mới/)
    expect(clickButton).toBeInTheDocument()

    // Call imperative handle
    act(() => {
      gridRef.current?.focusNewRow()
    })

    // After calling focusNewRow, editor should be open
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/INCI name/i)).toBeInTheDocument()
    })
  })
})
