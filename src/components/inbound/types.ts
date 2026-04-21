export type TransportType = 'road' | 'sea' | 'air'

export type InboundStep1State = {
  draftCode: string
  supplierKeyword: string
  poNumber: string
  expectedDate: string
  receivingWarehouseId: string
  receivingWarehouseName: string
  transportType: TransportType
}

export type InboundStep2State = {
  lotNo: string
  unitPrice: number | null
  quantity: number | null
  invoiceNumber: string
  invoiceDate: string
  mfgDate: string
  expDate: string
  selectedMaterialId?: string
  selectedMaterialCode?: string
  selectedMaterialName?: string
  selectedUnitDisplay?: string
  selectedPriceUnit?: string
  selectedUnitConversionToBase?: number
  selectedPriceUnitConversionToBase?: number
  selectedManufacturerId?: string
  selectedManufacturerName?: string
}

export type AttachedFileInfo = {
  id?: string
  name: string
  size: number
  docType: string
  mimeType?: string
  createdAt?: string
}

export type InboundStep3State = {
  files: AttachedFileInfo[]
}

export type InboundWizardState = {
  receiptId?: string          // Set after first draft save; used for subsequent PATCH calls
  receiptStatus?: 'draft' | 'pending_qc' | 'posted' | 'cancelled'
  currentStep?: 1 | 2 | 3 | 4
  step1: InboundStep1State
  step2: InboundStep2State
  step3?: InboundStep3State
  maxReachedStep?: number  // Highest step number user has visited
}
