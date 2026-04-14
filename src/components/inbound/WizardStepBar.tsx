type Props = {
  activeStep: number
  maxReachedStep?: number
  onNavigate?: (stepId: number) => void
}

const STEPS = [
  { id: 1, title: 'Chọn NCC & NVL' },
  { id: 2, title: 'Chi tiết Lô hàng' },
  { id: 3, title: 'Số lượng & Chứng từ' },
  { id: 4, title: 'Xác nhận' },
]

export function WizardStepBar({ activeStep, maxReachedStep, onNavigate }: Props) {
  return (
    <div className="inbound-create-steps">
      {STEPS.map((step, index) => {
        const isActive = step.id === activeStep
        const isDone = step.id <= (maxReachedStep ?? activeStep - 1)
        const isClickable = isDone && step.id !== activeStep && !!onNavigate
        const circleContent = isDone ? <i className="pi pi-check" /> : step.id
        const circleClass = `inbound-step-circle${isActive ? ' active' : ''}${isDone ? ' done' : ''}${isClickable ? ' clickable' : ''}`
        return (
          <div key={step.id} className="inbound-step-item-wrap">
            {isClickable ? (
              <button
                type="button"
                className={circleClass}
                aria-label={`Quay lại Bước ${step.id}: ${step.title}`}
                title={`Quay lại Bước ${step.id}: ${step.title}`}
                onClick={() => onNavigate(step.id)}
              >
                {circleContent}
              </button>
            ) : (
              <div className={circleClass} aria-label={`Bước ${step.id}`}>
                {circleContent}
              </div>
            )}
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
