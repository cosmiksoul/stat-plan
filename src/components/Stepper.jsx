import { useNavigate } from 'react-router-dom'

// Sprint 7 (ADR-013): 4-шаговый флоу. Step 5 «Скачать артефакты» убран —
// артефакты теперь живут на Step 4 как часть «Валидации и отчёта».
const STEPS = [
  { num: '01', label: 'Бриф', route: '/step1' },
  { num: '02', label: 'Тест-план', route: '/step2' },
  { num: '03', label: 'Конструктор', route: '/step3' },
  { num: '04', label: 'Валидация и отчёт', route: '/step4' },
]

function isStepUnlocked(stepNum, planStatus, briefSubmitted) {
  if (stepNum === 1) return true
  if (stepNum === 2) return briefSubmitted === true
  // Sprint 7: после approve plan и Step 3 (конструктор), и Step 4
  // (валидация) разблокированы параллельно — PM может прийти на Step 4
  // напрямую если ноутбук уже выполнен.
  if (stepNum === 3) return planStatus === 'approved'
  if (stepNum === 4) return planStatus === 'approved'
  return false
}

export default function Stepper({
  currentStep,
  planStatus = 'draft',
  briefSubmitted = false,
}) {
  const navigate = useNavigate()

  return (
    <nav
      aria-label="Шаги планирования теста"
      className="grid grid-cols-4 border border-border rounded-lg overflow-hidden bg-bg-elev mb-7"
    >
      {STEPS.map((step, idx) => {
        const stepNum = idx + 1
        const isActive = stepNum === currentStep
        const isDone = stepNum < currentStep
        const isUnlocked = isStepUnlocked(stepNum, planStatus, briefSubmitted)
        const isLocked = !isUnlocked
        const isClickable = isUnlocked && !isActive && step.route

        return (
          <div
            key={step.num}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-current={isActive ? 'step' : undefined}
            aria-disabled={isLocked || undefined}
            onClick={() => isClickable && navigate(step.route)}
            onKeyDown={(e) => {
              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                navigate(step.route)
              }
            }}
            className={[
              'relative px-4 py-3.5 border-r border-border last:border-r-0 select-none',
              isActive ? 'bg-bg-elev-2' : '',
              isLocked
                ? 'opacity-45 cursor-not-allowed'
                : isClickable
                  ? 'cursor-pointer hover:bg-bg-elev-2 transition-colors'
                  : 'cursor-default',
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
