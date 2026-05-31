import { NavLink } from 'react-router-dom'

// Sprint 8 P-1 — onboarding route stub. Methodology content lands in Sprint 9.
export default function MethodologyPage() {
  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-medium tracking-tight m-0 text-fg">
          Методология
        </h1>
        <p className="text-sm text-fg-dim m-0 mt-1">
          Как инструмент выбирает критерий, считает sample size и проверяет план.
        </p>
      </header>

      <div className="bg-bg-elev border border-border-soft rounded-lg p-6 text-sm text-fg-dim leading-relaxed">
        <p className="m-0">
          Раздел готовится в Sprint 9. Пока за развёрнутыми объяснениями по A/B
          методологии — к внешнему ассистенту «CRO Эксперт» (ссылка в шапке).
        </p>
      </div>

      <div className="mt-6">
        <NavLink
          to="/"
          className="mono-label text-accent border border-accent rounded-md px-4 py-2 hover:bg-accent-soft transition-colors"
        >
          ← На главную
        </NavLink>
      </div>
    </div>
  )
}
