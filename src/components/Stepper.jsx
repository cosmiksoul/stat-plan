const STEPS = [
  { num: '01', label: 'Бриф' },
  { num: '02', label: 'Тест-план' },
  { num: '03', label: 'Конструктор' },
  { num: '04', label: 'Анализ' },
  { num: '05', label: 'Read-out' },
]

export default function Stepper({ currentStep }) {
  return (
    <nav
      aria-label="Шаги планирования теста"
      className="grid grid-cols-5 border border-border rounded-lg overflow-hidden bg-bg-elev mb-7"
    >
      {STEPS.map((step, idx) => {
        const stepNum = idx + 1
        const isActive = stepNum === currentStep
        const isDone = stepNum < currentStep
        const isLocked = stepNum > currentStep

        return (
          <div
            key={step.num}
            aria-current={isActive ? 'step' : undefined}
            aria-disabled={isLocked || undefined}
            className={[
              'relative px-4 py-3.5 border-r border-border last:border-r-0 select-none',
              isActive ? 'bg-bg-elev-2' : '',
              isLocked ? 'opacity-45 cursor-not-allowed' : 'cursor-default',
            ].join(' ')}
          >
            <div
              className={`mono-label ${isActive ? 'text-accent' : 'text-fg-faint'}`}
            >
              {step.num}
              {isDone && <span className="text-ok"> ✓</span>}
            </div>
            <div
              className={`mt-1 text-sm font-medium ${
                isActive ? 'text-fg' : 'text-fg-dim'
              }`}
            >
              {step.label}
            </div>
            {isActive && (
              <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-accent" />
            )}
          </div>
        )
      })}
    </nav>
  )
}
