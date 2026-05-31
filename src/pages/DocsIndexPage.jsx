import { Link } from 'react-router-dom'

// Sprint 8 FIX F-3 — единая точка входа в документацию. Объединяет бывшие
// /tutorial и /methodology stubs в /docs с тремя подразделами. Реальный
// контент готовит Cowork (start) и Sprint 9 (tutorial/methodology).
const SECTIONS = [
  {
    to: '/docs/start',
    icon: '🚀',
    title: 'С чего начать',
    desc: 'Быстрый обзор продукта: 4 шага флоу, какие артефакты получаешь на выходе, как переходить между шагами.',
  },
  {
    to: '/docs/tutorial',
    icon: '📖',
    title: 'Туториалы',
    desc: 'Три end-to-end сценария: proportion (конверсия), continuous (ARPU), ratio (CTR). С CSV-данными и пошаговыми инструкциями.',
  },
  {
    to: '/docs/methodology',
    icon: '📘',
    title: 'Методология',
    desc: 'Глубокий разбор: выбор test_method, расчёт sample size, SRM, novelty, guardrails, decision rules. Что мы НЕ делаем и почему.',
  },
]

export default function DocsIndexPage() {
  return (
    <div className="max-w-[920px] mx-auto">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-medium tracking-tight m-0 text-fg">
          Документация
        </h1>
        <p className="text-sm text-fg-dim m-0 mt-2">
          Всё про stat·plan: с чего начать, как пройти типовой сценарий, как
          устроена методология под капотом.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SECTIONS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="block p-5 rounded-lg border border-border-soft hover:border-accent hover:bg-bg-elev-2 transition-colors"
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <h2 className="text-base font-semibold mb-1 text-fg">{s.title}</h2>
            <p className="text-xs text-fg-faint leading-relaxed m-0">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
