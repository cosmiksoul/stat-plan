import { NavLink } from 'react-router-dom'

// Sprint 8 P-1 — onboarding route stub. Cowork inlines the final user-facing
// walkthrough markdown in a later commit; this placeholder ships meanwhile.
export default function TutorialPage() {
  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-medium tracking-tight m-0 text-fg">
          Туториал
        </h1>
        <p className="text-sm text-fg-dim m-0 mt-1">
          Пошаговый разбор полного цикла — от брифа до отчёта.
        </p>
      </header>

      <div className="bg-bg-elev border border-border-soft rounded-lg p-6 text-sm text-fg-dim leading-relaxed">
        <p className="m-0">
          Раздел готовится. Пока — пройди продукт по шагам: на старте загрузи
          демо-CSV или опиши тест вручную, и инструмент проведёт тебя от
          гипотезы до готового отчёта.
        </p>
        <p className="m-0 mt-3">
          Подробные сценарии прогона лежат в репозитории:{' '}
          <code className="font-mono text-fg">
            docs/project/e2e-scenarios-sprint-7.md
          </code>
          .
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
