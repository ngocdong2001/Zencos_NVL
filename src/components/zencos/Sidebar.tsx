import type { ControlGate, Stream, StreamKey, WorkflowStage } from './types'

type SidebarProps = {
  activeStream: StreamKey
  controlGates: ControlGate[]
  streams: Stream[]
  workflowStages: WorkflowStage[]
  onStreamSelect: (stream: StreamKey, firstStageId: string | null) => void
}

export function Sidebar({ activeStream, controlGates, streams, workflowStages, onStreamSelect }: SidebarProps) {
  return (
    <aside className="zen-sidebar">
      <div className="zen-brand">
        <span className="zen-brand-mark">G</span>
        <div>
          <p>G Manufacturing Execution System</p>
          <h1>ZenCos Compliance Flow</h1>
        </div>
      </div>

      <div className="zen-sidebar-copy">
        <p className="zen-eyebrow">System intent</p>
        <h2>OEM / ODM cosmetics with GMP-grade LOT traceability.</h2>
        <span>Audit ready from Sale to CAPA and recall.</span>
      </div>

      <nav className="zen-stream-nav" aria-label="Business streams">
        {streams.map((stream) => (
          <button
            key={stream.key}
            type="button"
            className={`zen-stream-item ${activeStream === stream.key ? 'is-active' : ''}`}
            onClick={() => {
              const firstStage = workflowStages.find((stage) => stage.stream === stream.key)
              onStreamSelect(stream.key, firstStage?.id ?? null)
            }}
          >
            <span>{stream.short}</span>
            <div>
              <strong>{stream.label}</strong>
              <small>{stream.summary}</small>
            </div>
          </button>
        ))}
      </nav>

      <div className="zen-side-card">
        <p className="zen-eyebrow">Gate summary</p>
        <ul>
          {controlGates.map((gate) => (
            <li key={gate.type}>
              <strong>{gate.type}</strong>
              <span>{gate.rule}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}