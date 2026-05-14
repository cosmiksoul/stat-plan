import { countAnswered } from '../../lib/brief/progress.js'
import { TOTAL_QUESTIONS } from '../../lib/brief/questions.js'

export default function ProgressBar({ brief }) {
  const answered = countAnswered(brief)
  const percent = (answered / TOTAL_QUESTIONS) * 100

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="mono-label text-fg-faint">ПРОГРЕСС</span>
        <span className="mono-label text-fg-dim">
          {answered} / {TOTAL_QUESTIONS} вопросов
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-bg-elev-3 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={TOTAL_QUESTIONS}
        aria-valuenow={answered}
        aria-label="Прогресс заполнения брифа"
      >
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
