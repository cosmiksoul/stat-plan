import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'

const OPTIONS = [
  {
    id: 'demo_proportion',
    label: 'demo_proportion.csv',
    metric: 'proportion',
    description: '~75k user_id × variant × converted (CR 3.1% / 3.4%)',
    available: true,
  },
  {
    id: 'demo_continuous',
    label: 'demo_continuous.csv',
    metric: 'continuous',
    description: '~75k user_id × variant × arpu (μ 100 / 106, σ ≈ 80)',
    available: true,
  },
  {
    id: 'demo_ratio',
    label: 'demo_ratio.csv',
    metric: 'ratio',
    description: 'появится в следующем спринте',
    available: false,
  },
  {
    id: 'demo_count',
    label: 'demo_count.csv',
    metric: 'count',
    description: 'появится в следующем спринте',
    available: false,
  },
]

function defaultChoiceFor(metricType) {
  if (metricType === 'continuous') return 'demo_continuous'
  return 'demo_proportion'
}

export default function DemoCsvCard() {
  const { state, dispatch } = useAppState()
  const metricType = state.brief?.metric_type
  const chosen =
    state.notebook_config.demo_csv_choice || defaultChoiceFor(metricType)
  const showsFallbackHint =
    metricType === 'ratio' || metricType === 'count'
  const advancedVarianceReduction = state.brief?.advanced?.variance_reduction

  function setChoice(id) {
    dispatch({ type: Actions.SET_DEMO_CSV_CHOICE, choice: id })
  }

  function downloadHref(id) {
    const base = import.meta.env.BASE_URL || '/'
    return `${base}demo/${id}.csv`
  }

  return (
    <section className="bg-bg-elev border border-border rounded-lg p-5">
      <h3 className="mono-label text-fg-faint mb-3">DEMO CSV</h3>
      <ul className="m-0 p-0 list-none space-y-2 mb-4">
        {OPTIONS.map((opt) => {
          const selected = chosen === opt.id
          const disabled = !opt.available
          return (
            <li
              key={opt.id}
              className={`flex items-start gap-3 border rounded-md px-3 py-2.5 transition-colors ${
                disabled
                  ? 'bg-bg-elev-2 border-border-soft opacity-60 cursor-not-allowed'
                  : selected
                    ? 'bg-accent-soft border-accent cursor-pointer'
                    : 'bg-bg-elev-2 border-border-soft hover:border-border cursor-pointer'
              }`}
              onClick={() => !disabled && setChoice(opt.id)}
            >
              <input
                type="radio"
                name="demo-csv"
                checked={selected && !disabled}
                disabled={disabled}
                onChange={() => setChoice(opt.id)}
                className="mt-1 w-4 h-4 accent-accent"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-mono ${disabled ? 'text-fg-dim' : 'text-fg'}`}
                >
                  {opt.label}
                </div>
                <div className="text-xs text-fg-dim mt-0.5 leading-relaxed">
                  {opt.description}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <a
        href={downloadHref(chosen)}
        download={`${chosen}.csv`}
        className="block text-center mono-label font-semibold bg-download text-bg rounded-md px-4 py-2 hover:opacity-90 transition-opacity"
      >
        ↓ СКАЧАТЬ DEMO-CSV
      </a>

      {showsFallbackHint && (
        <div className="text-xs text-fg-faint bg-bg-elev-2 border border-border-soft rounded-md px-3 py-2 mt-3 leading-relaxed">
          Для метрики типа {metricType} demo появится позже. Сейчас можно
          использовать proportion как заглушку — структура колонок такая
          же, ноутбук запустится.
        </div>
      )}

      {advancedVarianceReduction === 'cuped' && (
        <div className="text-xs text-warn bg-warn-soft border border-warn-border rounded-md px-3 py-2 mt-3 leading-relaxed">
          ⚠ В плане включён CUPED, но demo-csv не содержит pre-period
          колонок. Ячейка CUPED (когда будет добавлена) будет пропущена.
        </div>
      )}
    </section>
  )
}
