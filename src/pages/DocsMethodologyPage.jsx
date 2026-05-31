import { Link } from 'react-router-dom'

// Sprint 8 FIX F-3 — переехал из /methodology в /docs/methodology. Контент —
// Sprint 9.
export default function DocsMethodologyPage() {
  return (
    <div className="max-w-[920px] mx-auto">
      <div className="mb-4">
        <Link to="/docs" className="text-xs text-fg-faint hover:text-fg">
          ← К документации
        </Link>
      </div>
      <h1 className="font-serif text-2xl font-medium tracking-tight m-0 text-fg">
        Методология
      </h1>

      <div className="mt-6 bg-bg-elev border border-border-soft rounded-lg p-6 text-sm text-fg-dim leading-relaxed">
        <p className="m-0">
          Глубокий разбор готовится в Sprint 9: выбор test_method, расчёт sample
          size, SRM, novelty, guardrails, decision rules — и что мы намеренно НЕ
          делаем.
        </p>
        <p className="m-0 mt-3">
          Пока за развёрнутыми объяснениями по A/B методологии — к внешнему
          ассистенту «AI-компаньон» (ссылка в шапке).
        </p>
      </div>
    </div>
  )
}
