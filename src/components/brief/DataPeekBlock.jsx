import { lazy, Suspense, useState } from 'react'
import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'
import DataPeekTabs from './DataPeekTabs.jsx'
import DataPeekStats from './DataPeekStats.jsx'

// recharts is ~80 KB gzip and is only needed once the user actually has a
// CSV peek to visualize. Lazy-load it so the initial bundle stays small.
const DataPeekHistogram = lazy(() => import('./DataPeekHistogram.jsx'))

function badgeText(dp) {
  if (!dp?.uploaded) return null
  const source = dp.source === 'manual' ? 'manual' : 'csv'
  return `Data Peek применён (${source})`
}

function defaultOpen(dp, metricType) {
  if (dp?.uploaded) return false
  if (metricType === 'ratio' || metricType === 'continuous') return true
  return false
}

function headerHint(metricType, dp) {
  if (dp?.uploaded) return null
  if (metricType === 'proportion') {
    return 'Peek для proportion не нужен — baseline (CR) уже задан в Q05; z-test точный без peek.'
  }
  if (metricType === 'count') {
    return 'Peek опционален. По умолчанию σ = √baseline (Poisson assumption).'
  }
  return 'Для точного sample size загрузи CSV исторических данных или введи параметры вручную.'
}

export default function DataPeekBlock() {
  const { state, dispatch } = useAppState()
  const brief = state.brief
  const dp = brief.data_peek
  const metricType = brief.metric_type
  const [open, setOpen] = useState(defaultOpen(dp, metricType))

  const badge = badgeText(dp)
  const showTabs = open && metricType !== 'proportion'

  function handleReset() {
    dispatch({ type: Actions.RESET_DATA_PEEK })
  }

  return (
    <div className="mt-4 bg-bg-elev-2 border border-border-soft rounded-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer hover:bg-bg-elev"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="mono-label text-fg-faint">DATA PEEK</span>
          {badge && (
            <span className="text-xs text-ok font-medium truncate">
              ✓ {badge}
            </span>
          )}
        </div>
        <span className="text-fg-faint text-xs select-none">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="border-t border-border-soft px-4 py-3 space-y-3">
          {headerHint(metricType, dp) && (
            <div className="text-xs text-fg-faint leading-relaxed">
              {headerHint(metricType, dp)}
            </div>
          )}

          {dp?.uploaded && (
            <>
              <DataPeekStats />
              {dp.raw_values && dp.raw_values.length > 0 && (
                <Suspense
                  fallback={
                    <div className="text-xs text-fg-faint">
                      Загружаю гистограмму…
                    </div>
                  }
                >
                  <DataPeekHistogram
                    values={dp.raw_values}
                    valuesNumerator={dp.raw_values_numerator}
                    valuesDenominator={dp.raw_values_denominator}
                    labels={{
                      numerator: brief.ratio_components?.numerator,
                      denominator: brief.ratio_components?.denominator,
                    }}
                  />
                </Suspense>
              )}
              <div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mono-label text-fg-faint hover:text-accent underline-offset-2 hover:underline cursor-pointer"
                >
                  ↺ Сбросить data peek
                </button>
              </div>
            </>
          )}

          {showTabs && !dp?.uploaded && <DataPeekTabs />}
        </div>
      )}
    </div>
  )
}
