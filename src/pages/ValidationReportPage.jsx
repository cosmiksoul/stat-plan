import Stepper from '../components/Stepper.jsx'
import IpynbUpload from '../components/results/IpynbUpload.jsx'
import ResultsForm from '../components/results/ResultsForm.jsx'
import ChecksBlock from '../components/results/ChecksBlock.jsx'
import DecisionRulesBlock from '../components/results/DecisionRulesBlock.jsx'
import ImagesGallery from '../components/results/ImagesGallery.jsx'
import ExportButtons from '../components/results/ExportButtons.jsx'
import { useAppState } from '../state/AppStateContext.jsx'
import { Actions } from '../state/reducer.js'

function SourceBadge({ source, warnings, filename }) {
  if (source === 'ipynb') {
    const hasWarn = warnings && warnings.length > 0
    if (hasWarn) {
      return (
        <div className="text-xs text-warn bg-warn-soft border border-warn-border rounded-md px-3 py-2">
          ⚠ Ноутбук <code className="font-mono">{filename}</code> загружен, но
          без ячейки с тегом <code className="font-mono">stat-plan-results</code>.
          Заполни числа вручную ниже. PNG-графики подцепились — они попадут в
          HTML-отчёт.
        </div>
      )
    }
    return (
      <div className="text-xs text-ok bg-ok-soft border border-ok-border rounded-md px-3 py-2">
        ✓ Результаты извлечены из <code className="font-mono">{filename}</code>.
        Перепроверь поля ниже — твои правки переопределят значения из ноутбука.
      </div>
    )
  }
  if (source === 'manual') {
    return (
      <div className="text-xs text-fg-dim bg-bg-elev-2 border border-border rounded-md px-3 py-2">
        📝 Ручной ввод. Введи числа из своего анализа ниже — или загрузи
        ноутбук, чтобы автозаполнить.
      </div>
    )
  }
  return null
}

export default function ValidationReportPage() {
  const { state, dispatch } = useAppState()
  const results = state.results
  const hasResults = results.source !== null
  const ipynbWarnings = (results.warnings || []).filter((w) =>
    /stat-plan-results/.test(w),
  )

  function handleReset() {
    dispatch({ type: Actions.RESET_RESULTS })
  }

  return (
    <div>
      <Stepper
        currentStep={4}
        planStatus={state.plan.status}
        briefSubmitted={state.plan.briefSubmitted}
      />

      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight m-0 text-fg">
            Валидация и отчёт
          </h1>
          <p className="text-sm text-fg-dim m-0 mt-1">
            Прогнал тест, выполнил ноутбук — перетащи <code className="font-mono">.ipynb</code>{' '}
            сюда и получи HTML-отчёт для стейкхолдеров за 3 секунды.
          </p>
        </div>
        {hasResults && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-fg-dim hover:text-warn underline-offset-2 hover:underline cursor-pointer bg-transparent border-0"
          >
            ↺ Сбросить результаты
          </button>
        )}
      </div>

      <div className="text-xs text-fg-faint bg-bg-elev border border-border-soft rounded-md px-4 py-3 mb-6">
        <strong className="text-fg-dim">Что здесь происходит:</strong> тул
        <strong className="text-fg-dim"> не пересчитывает</strong> Δ, p, CI —
        это твоя работа в ноутбуке. Здесь — SRM/sanity-проверки против плана,
        применение твоих decision rules и сборка финального пакета (test_plan.md
        + analysis.ipynb + report.html + readout.md). Поле «Принятое решение»
        ты заполняешь сам — тул не подменяет решение PM (ADR-004).
      </div>

      <section className="mb-6">
        <h2 className="font-serif text-xl font-medium m-0 mb-3 text-fg">
          1. Загрузи выполненный ноутбук
        </h2>
        <IpynbUpload />
      </section>

      {hasResults && (
        <section className="mb-6">
          <SourceBadge
            source={results.source}
            warnings={ipynbWarnings}
            filename={results.ipynb_filename}
          />
        </section>
      )}

      {hasResults && (
        <section className="mb-6">
          <h2 className="font-serif text-xl font-medium m-0 mb-3 text-fg">
            2. Результаты
          </h2>
          <ResultsForm />
        </section>
      )}

      {hasResults && (
        <section className="mb-6">
          <h2 className="font-serif text-xl font-medium m-0 mb-3 text-fg">
            3. Sanity checks
          </h2>
          <ChecksBlock />
        </section>
      )}

      {hasResults && (
        <section className="mb-6">
          <h2 className="font-serif text-xl font-medium m-0 mb-3 text-fg">
            4. Decision rules
          </h2>
          <DecisionRulesBlock />
        </section>
      )}

      {hasResults && results.images && results.images.length > 0 && (
        <section className="mb-6">
          <h2 className="font-serif text-xl font-medium m-0 mb-3 text-fg">
            5. Графики из ноутбука
          </h2>
          <ImagesGallery images={results.images} />
        </section>
      )}

      {hasResults && (
        <section className="mb-6">
          <h2 className="font-serif text-xl font-medium m-0 mb-3 text-fg">
            6. Скачать артефакты
          </h2>
          <ExportButtons />
        </section>
      )}
    </div>
  )
}
