import { useState } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import Stepper from '../components/Stepper.jsx'
import Banner from '../components/layout/Banner.jsx'
import StepFooter from '../components/layout/StepFooter.jsx'
import ConfirmDialog from '../components/plan/ConfirmDialog.jsx'
import IpynbUpload from '../components/results/IpynbUpload.jsx'
import ResultsForm from '../components/results/ResultsForm.jsx'
import ChecksBlock from '../components/results/ChecksBlock.jsx'
import DecisionRulesBlock from '../components/results/DecisionRulesBlock.jsx'
import ImagesGallery from '../components/results/ImagesGallery.jsx'
import ExportButtons from '../components/results/ExportButtons.jsx'
import { useAppState } from '../state/AppStateContext.jsx'
import { Actions } from '../state/reducer.js'
import { clearState } from '../lib/storage.js'
import { renderTestPlanMd } from '../lib/plan/render.js'

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

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
  const navigate = useNavigate()
  const results = state.results
  const hasResults = results.source !== null
  const ipynbWarnings = (results.warnings || []).filter((w) =>
    /stat-plan-results/.test(w),
  )
  const [showClearForm, setShowClearForm] = useState(false)
  const [showRestart, setShowRestart] = useState(false)
  const [zipBusy, setZipBusy] = useState(false)

  function handleReset() {
    dispatch({ type: Actions.RESET_RESULTS })
    setShowClearForm(false)
  }

  function handleFullRestart() {
    clearState()
    dispatch({ type: Actions.RESET_STATE })
    setShowRestart(false)
    navigate('/')
  }

  async function handleDownloadZip() {
    setZipBusy(true)
    try {
      const mod = await import('../lib/results/zip.js')
      const { blob, filename } = await mod.buildZip(state, {
        testPlanMd: renderTestPlanMd(state),
        ipynbRawText: state.results.ipynb_raw_text,
      })
      downloadBlob(filename, blob)
    } catch {
      // ExportButtons (section 6) surfaces detailed errors; footer stays quiet.
    } finally {
      setZipBusy(false)
    }
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
            onClick={() => setShowClearForm(true)}
            title="Очистить только результаты Шага 4. Бриф и план останутся."
            className="text-xs text-fg-dim hover:text-warn underline-offset-2 hover:underline cursor-pointer bg-transparent border-0"
          >
            🗑 ОЧИСТИТЬ ФОРМУ
          </button>
        )}
      </div>

      <Banner type="info" icon="ℹ">
        <strong className="text-fg-dim">Что здесь происходит:</strong> тул
        <strong className="text-fg-dim"> не пересчитывает</strong> Δ, p, CI —
        это твоя работа в ноутбуке. Здесь — SRM/sanity-проверки против плана,
        применение твоих decision rules и сборка финального пакета (test_plan.md
        + analysis.ipynb + report.html + readout.md). Поле «Принятое решение»
        ты заполняешь сам — тул не подменяет решение PM (ADR-004).
      </Banner>

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

      <section className="mt-8 pt-6 border-t border-border-soft text-center">
        <p className="text-sm text-fg-faint mb-3">Готов начать следующий тест?</p>
        <button
          type="button"
          onClick={() => setShowRestart(true)}
          className="mono-label text-fg-faint border border-border-soft rounded-md px-4 py-2 hover:text-fg hover:border-border transition-colors cursor-pointer"
        >
          ↺ НОВЫЙ ТЕСТ
        </button>
      </section>

      <StepFooter
        back={
          <NavLink
            to="/step3"
            className="text-xs text-fg-faint underline-offset-2 hover:underline"
          >
            ← К КОНСТРУКТОРУ
          </NavLink>
        }
        primary={
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={zipBusy}
            className="mono-label font-semibold bg-accent text-bg rounded-md px-6 py-3 hover:opacity-90 transition-opacity cursor-pointer text-base disabled:opacity-50"
          >
            {zipBusy ? '…' : '↓ СКАЧАТЬ ВСЁ (.zip)'}
          </button>
        }
      />

      <ConfirmDialog
        open={showClearForm}
        title="Очистить форму результатов?"
        message="Будут удалены: загруженный ноутбук, числа в форме, decision rule checkboxes, принятое решение. Бриф и тест-план останутся неизменными."
        confirmLabel="ОЧИСТИТЬ"
        cancelLabel="ОТМЕНА"
        destructive
        onConfirm={handleReset}
        onCancel={() => setShowClearForm(false)}
      />

      <ConfirmDialog
        open={showRestart}
        title="Начать новый тест?"
        message="Все данные текущего теста (бриф, план, ноутбук, результаты) будут сброшены. Сохрани ZIP, если хочешь сохранить артефакты."
        confirmLabel="НАЧАТЬ НОВЫЙ"
        cancelLabel="ОТМЕНА"
        destructive
        onConfirm={handleFullRestart}
        onCancel={() => setShowRestart(false)}
      />
    </div>
  )
}
