import type { Stream, StreamKey, WorkflowStage } from './types'

type WorkflowSectionProps = {
  activeStream: StreamKey
  selectedStage: WorkflowStage | undefined
  streams: Stream[]
  visibleStages: WorkflowStage[]
  onStageSelect: (stageId: string) => void
}

export function WorkflowSection({ activeStream, selectedStage, streams, visibleStages, onStageSelect }: WorkflowSectionProps) {
  return (
    <section className="zen-grid zen-grid-primary">
      <article className="zen-panel">
        <div className="zen-panel-head">
          <div>
            <p className="zen-eyebrow">20-step workflow</p>
            <h3>Operational stages</h3>
          </div>
          <span>{streams.find((stream) => stream.key === activeStream)?.label}</span>
        </div>

        <div className="zen-stage-list">
          {visibleStages.map((stage) => (
            <button
              key={stage.id}
              type="button"
              className={`zen-stage-item ${selectedStage?.id === stage.id ? 'is-selected' : ''}`}
              onClick={() => onStageSelect(stage.id)}
            >
              <div>
                <strong>{stage.id}</strong>
                <span>{stage.owner}</span>
              </div>
              <p>{stage.title}</p>
              <small className={`zen-gate-pill gate-${stage.gate}`}>{stage.gate}</small>
            </button>
          ))}
        </div>
      </article>

      <article className="zen-panel zen-stage-detail">
        <div className="zen-panel-head">
          <div>
            <p className="zen-eyebrow">Selected stage</p>
            <h3>
              {selectedStage?.id}. {selectedStage?.title}
            </h3>
          </div>
          <span>{selectedStage?.owner}</span>
        </div>

        <div className="zen-detail-grid">
          <section>
            <p className="zen-detail-label">Input</p>
            <p>{selectedStage?.input}</p>
          </section>
          <section>
            <p className="zen-detail-label">Output</p>
            <p>{selectedStage?.output}</p>
          </section>
          <section className="zen-detail-control">
            <p className="zen-detail-label">Control</p>
            <p>{selectedStage?.control}</p>
          </section>
        </div>
      </article>
    </section>
  )
}