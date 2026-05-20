interface ProductionStepBarProps {
  activeStep: 1 | 2 | 3 | 4
  orderId?: string
  maxReachedStep?: number
  onNavigate?: (stepId: number) => void
}

const STEPS = [
  { id: 1 as const, title: 'Xuất NVL' },
  { id: 2 as const, title: 'Nhập BTP (Sản xuất nền)' },
  { id: 3 as const, title: 'Xuất BTP (ĐG cấp 1)' },
  { id: 4 as const, title: 'Nhập TP (ĐG cấp 2)'  },
]

export function ProductionStepBar({ activeStep, maxReachedStep, onNavigate }: ProductionStepBarProps) {
  return (
    <div className="inbound-create-steps">
      {STEPS.map((step, index) => {
        const isActive = step.id === activeStep
        const isDone = step.id <= (maxReachedStep ?? activeStep - 1)
        const isClickable = isDone && step.id !== activeStep && !!onNavigate
        const circleContent = isDone ? <i className="pi pi-check" /> : step.id
        const circleClass = `inbound-step-circle${isActive ? ' active' : ''}${isDone ? ' done' : ''}${isClickable ? ' clickable' : ''}`

        const handleClick = isClickable ? () => onNavigate(step.id) : undefined

        return (
          <div
            key={step.id}
            className={`inbound-step-item-wrap${isClickable ? ' clickable' : ''}`}
            onClick={handleClick}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate(step.id) } : undefined}
            aria-label={isClickable ? `Chuyển đến Bước ${step.id}: ${step.title}` : undefined}
            title={isClickable ? `Bước ${step.id}: ${step.title}` : undefined}
          >
            <div className={circleClass}>
              {circleContent}
            </div>
            <p className={`inbound-step-label${isActive ? ' active' : ''}${isClickable ? ' clickable' : ''}`}>
              {step.title}
            </p>
            {index < STEPS.length - 1 ? <span className={`inbound-step-divider${isDone ? ' done' : ''}`} aria-hidden /> : null}
          </div>
        )
      })}
    </div>
  )
}
