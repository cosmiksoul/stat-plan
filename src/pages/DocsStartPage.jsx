import { Link } from 'react-router-dom'

// Sprint 8 FIX F-3 — «С чего начать». Stub: Cowork инлайнит финальный markdown
// (outputs/docs-start-content.md). Пока — краткий обзор флоу из 4 шагов.
export default function DocsStartPage() {
  return (
    <div className="max-w-[920px] mx-auto">
      <div className="mb-4">
        <Link to="/docs" className="text-xs text-fg-faint hover:text-fg">
          ← К документации
        </Link>
      </div>
      <h1 className="font-serif text-2xl font-medium tracking-tight m-0 text-fg">
        С чего начать
      </h1>

      <div className="mt-6 bg-bg-elev border border-border-soft rounded-lg p-6 text-sm text-fg-dim leading-relaxed space-y-3">
        <p className="m-0">
          stat·plan ведёт тебя через полный цикл A/B теста — от гипотезы до
          пост-анализа — за 4 шага:
        </p>
        <ol className="m-0 pl-5 space-y-1.5">
          <li>
            <strong className="text-fg">Бриф</strong> — описываешь тест в 10
            вопросах. Можно загрузить демо-CSV или ввести метрику вручную.
          </li>
          <li>
            <strong className="text-fg">Тест-план</strong> — инструмент сам
            подбирает критерий и считает sample size. Проверяешь, скачиваешь,
            утверждаешь.
          </li>
          <li>
            <strong className="text-fg">Конструктор ноутбука</strong> — получаешь
            готовый <code className="font-mono">.ipynb</code> под свои данные:
            balance, SRM, основной критерий, guardrails, novelty.
          </li>
          <li>
            <strong className="text-fg">Валидация и отчёт</strong> — выполнил
            ноутбук, перетащил его обратно — и получаешь HTML-отчёт для
            стейкхолдеров плюс ZIP со всеми артефактами.
          </li>
        </ol>
        <p className="m-0">
          Раздел дополняется. Полные сценарии прогона —{' '}
          <Link to="/docs/tutorial" className="text-accent hover:underline">
            в туториалах
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
