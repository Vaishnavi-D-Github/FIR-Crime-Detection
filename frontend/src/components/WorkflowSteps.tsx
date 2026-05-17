import { PageDots } from './PageDots'

export function WorkflowSteps({ step }: { step: number }) {
  const steps = [
    { n: 1, label: 'Verify' },
    { n: 2, label: 'Describe' },
    { n: 3, label: 'Results' },
  ]

  return (
    <nav className="workflow-steps" aria-label="Progress">
      <ol className="step-track">
        {steps.map((s) => (
          <li
            key={s.n}
            className={`step-item ${s.n === step ? 'step-active' : ''} ${s.n < step ? 'step-done' : ''}`}
          >
            <span className="step-number">{s.n}</span>
            <span className="step-label">{s.label}</span>
          </li>
        ))}
      </ol>
      <PageDots active={step} />
    </nav>
  )
}
