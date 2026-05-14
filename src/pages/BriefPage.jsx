import Stepper from '../components/Stepper.jsx'

const BRIEF_QUESTIONS = [
  { num: '01', label: 'Цель теста' },
  { num: '02', label: 'Гипотеза' },
  { num: '03', label: 'Тип метрики' },
  { num: '04', label: 'Имя метрики' },
  { num: '05', label: 'Baseline' },
  { num: '06', label: 'Единица рандомизации' },
  { num: '07', label: 'MDE' },
  { num: '08', label: 'Доступный трафик' },
  { num: '09', label: 'Guardrails' },
  { num: '10', label: 'Stop & Decision rules' },
]

const TOTAL = BRIEF_QUESTIONS.length
const ANSWERED = 0
const PROGRESS_PERCENT = (ANSWERED / TOTAL) * 100

export default function BriefPage() {
  return (
    <div>
      <Stepper currentStep={1} />

      <div className="grid md:grid-cols-[1.4fr_1fr] gap-6">
        <section className="bg-bg-elev border border-border rounded-lg p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif text-2xl font-medium tracking-tight m-0">
              Бриф
            </h2>
            <span className="mono-label text-fg-faint">
              {ANSWERED} / {TOTAL} вопросов
            </span>
          </div>

          <div
            className="h-1.5 rounded-full bg-bg-elev-3 overflow-hidden mb-6"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={TOTAL}
            aria-valuenow={ANSWERED}
            aria-label="Прогресс заполнения брифа"
          >
            <div
              className="h-full bg-accent transition-[width] duration-300"
              style={{ width: `${PROGRESS_PERCENT}%` }}
            />
          </div>

          <div className="border border-dashed border-border rounded-md p-8 text-center text-fg-dim text-sm leading-relaxed">
            Здесь появятся вопросы брифа.
            <br />
            Реализация — следующий спринт.
          </div>
        </section>

        <aside className="bg-bg-elev border border-border rounded-lg p-6 self-start">
          <div className="mono-label text-fg-faint mb-4">КАРТА ВОПРОСОВ</div>
          <ol className="m-0 p-0 list-none space-y-2.5">
            {BRIEF_QUESTIONS.map((q) => (
              <li
                key={q.num}
                className="flex items-baseline gap-3 text-fg-dim text-sm"
              >
                <span className="font-mono text-xs text-fg-faint w-6 shrink-0">
                  {q.num}
                </span>
                <span>{q.label}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  )
}
