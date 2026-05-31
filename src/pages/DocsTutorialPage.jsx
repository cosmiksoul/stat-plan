import { Link } from 'react-router-dom'

// Sprint 8 FIX F-3 — переехал из /tutorial в /docs/tutorial. Cowork инлайнит
// финальные сценарии в Sprint 9; пока — stub с cross-ref на e2e-сценарии.
export default function DocsTutorialPage() {
  return (
    <div className="max-w-[920px] mx-auto">
      <div className="mb-4">
        <Link to="/docs" className="text-xs text-fg-faint hover:text-fg">
          ← К документации
        </Link>
      </div>
      <h1 className="font-serif text-2xl font-medium tracking-tight m-0 text-fg">
        Туториалы
      </h1>

      <div className="mt-6 bg-bg-elev border border-border-soft rounded-lg p-6 text-sm text-fg-dim leading-relaxed">
        <p className="m-0">
          Туториалы готовятся в Sprint 9 — три end-to-end сценария: proportion
          (конверсия), continuous (ARPU), ratio (CTR), с CSV-данными и
          пошаговыми инструкциями.
        </p>
        <p className="m-0 mt-3">
          Пока подробные сценарии прогона лежат в репозитории:{' '}
          <code className="font-mono text-fg">
            docs/project/e2e-scenarios-sprint-7.md
          </code>
          .
        </p>
      </div>
    </div>
  )
}
