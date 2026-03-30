export type StreamKey = 'sale' | 'rnd' | 'planning' | 'warehouse' | 'quality' | 'production' | 'closure'

export type Stream = {
  key: StreamKey
  label: string
  short: string
  summary: string
}

export type WorkflowStage = {
  id: string
  stream: StreamKey
  owner: string
  title: string
  input: string
  output: string
  control: string
  gate: 'hard' | 'soft' | 'close' | 'flow'
}

export type ModuleCard = {
  id: string
  stream: StreamKey
  title: string
  screens: string
  api: string
  db: string
}

export type DomainCard = {
  title: string
  description: string
  tables: string[]
}

export type ControlGate = {
  type: string
  rule: string
}

export type DashboardStats = {
  workflowCount: number
  moduleCount: number
  hardBlocks: number
  traceNodes: number
}