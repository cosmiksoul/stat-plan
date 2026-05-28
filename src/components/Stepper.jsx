import { useNavigate } from 'react-router-dom'

const STEPS = [
  { num: '01', label: 'Бриф', route: '/step1' },
  { num: '02', label: 'Тест-план', route: '/step2' },
  { num: '03', label: 'Конструктор', route: '/step3' },
  { num: '04', label: 'Быстрая валидация', route: null },
  { num: '05', label: 'Скачать артефакты', route: null },
]

function isStepUnlocked(stepNum, planStatus, briefSubmitted) {
  if (stepNum === 1) return true
  if (stepNum === 2) return briefSubmitted === true
  if (stepNum === 3) return planStatus === 'approved'
  return false // steps 4-5 are always locked in Sprint 3
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
      className="grid grid-cols-5 border border-border rounded-lg overflow-hidden bg-bg-elev mb-7"
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
