import { CELL_CATALOG } from '../../lib/plan/notebook-builder.js'
import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'

const FUTURE_PLACEHOLDERS = [
  {
    id: 'cuped',
    name: 'CUPED variance reduction',
    description: 'Снижение дисперсии через pre-period — следующий мини-спринт.',
  },
  {
    id: 'delta_method',
    name: 'Delta method для ratio',
    description:
      'Точный CI для ratio-метрик — следующий мини-спринт.',
  },
]

export default function CellsList() {
  const { state, dispatch } = useAppState()
  const enabled = state.notebook_config.cells_enabled

  const mandatory = Object.values(CELL_CATALOG).filter((c) => c.mandatory)
  const optional = Object.values(CELL_CATALOG).filter((c) => !c.mandatory)

  function toggle(id) {
    dispatch({ type: Actions.TOGGLE_NOTEBOOK_CELL, id })
  }

  return (
    <section className="bg-bg-elev border border-border rounded-lg p-5">
      <h3 className="mono-label text-fg-faint mb-3">ОБЯЗАТЕЛЬНЫЕ ЯЧЕЙКИ</h3>
      <ul className="m-0 p-0 list-none space-y-2 mb-5">
        {mandatory.map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-3 bg-bg-elev-2 border border-border-soft rounded-md px-3 py-2.5"
          >
            <input
              type="checkbox"
              checked
              disabled
              readOnly
              className="mt-1 w-4 h-4 accent-accent cursor-not-allowed"
              aria-label={`${c.name} — всегда включена`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-fg font-medium leading-tight">
                {c.name}
              </div>
              <div className="text-xs text-fg-dim mt-0.5 leading-relaxed">
                {c.description}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <h3 className="mono-label text-fg-faint mb-3">ОПЦИОНАЛЬНЫЕ ЯЧЕЙКИ</h3>
      <ul className="m-0 p-0 list-none space-y-2 mb-5">
        {optional.map((c) => {
          const on = enabled.includes(c.id)
          return (
            <li
              key={c.id}
              className={`flex items-start gap-3 border rounded-md px-3 py-2.5 cursor-pointer transition-colors ${
                on
                  ? 'bg-accent-soft border-accent'
                  : 'bg-bg-elev-2 border-border-soft hover:border-border'
              }`}
              onClick={() => toggle(c.id)}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(c.id)}
                className="mt-1 w-4 h-4 accent-accent cursor-pointer"
                aria-label={c.name}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-fg font-medium leading-tight">
                  {c.name}
                </div>
                <div className="text-xs text-fg-dim mt-0.5 leading-relaxed">
                  {c.description}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <h3 className="mono-label text-fg-faint mb-3">СКОРО</h3>
      <ul className="m-0 p-0 list-none space-y-2">
        {FUTURE_PLACEHOLDERS.map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-3 bg-bg-elev-2 border border-border-soft rounded-md px-3 py-2.5 opacity-60"
          >
            <input
              type="checkbox"
              disabled
              className="mt-1 w-4 h-4 cursor-not-allowed"
              aria-label={`${c.name} — недоступно`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-fg-dim font-medium leading-tight">
                {c.name}
              </div>
              <div className="text-xs text-fg-faint mt-0.5 leading-relaxed">
                {c.description}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
