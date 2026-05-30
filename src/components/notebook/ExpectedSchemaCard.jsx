import { useMemo } from 'react'
import { getExpectedSchema } from '../../lib/plan/notebook-builder.js'
import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'

// Sprint 7 S11 (JTBD §6 ◆): editable schema row — user renames a column to
// match their warehouse, or overrides the expected type. Overrides live in
// state.notebook_config.schema_overrides and apply at notebook-build time
// (placeholder substitution + schema preview).

const TYPE_OPTIONS = [
  'int',
  'int (0/1)',
  'int / string',
  'int (1..N)',
  'float',
  'string',
]

function EditableRow({ row, override, dispatch }) {
  const hasOverride =
    !!override &&
    ((typeof override.rename === 'string' && override.rename !== '') ||
      (typeof override.type === 'string' && override.type !== ''))

  const currentName = row.column // already resolved by getExpectedSchema
  const currentType = row.type
  const typeOptions = TYPE_OPTIONS.includes(currentType)
    ? TYPE_OPTIONS
    : [currentType, ...TYPE_OPTIONS]

  function setRename(e) {
    const value = e.target.value
    dispatch({
      type: Actions.SET_SCHEMA_OVERRIDE,
      column: row.original,
      patch: { rename: value === row.original ? '' : value },
    })
  }

  function setType(e) {
    dispatch({
      type: Actions.SET_SCHEMA_OVERRIDE,
      column: row.original,
      patch: { type: e.target.value },
    })
  }

  function reset() {
    dispatch({
      type: Actions.SET_SCHEMA_OVERRIDE,
      column: row.original,
      patch: { rename: '', type: '' },
    })
  }

  return (
    <tr className="border-b border-border-soft last:border-0">
      <td className="py-2 pr-3">
        <input
          type="text"
          value={currentName}
          onChange={setRename}
          spellCheck={false}
          className="bg-bg-elev-2 border border-border rounded px-2 py-1 font-mono text-xs text-fg focus:border-accent focus:outline-none w-full min-w-[140px]"
        />
      </td>
      <td className="py-2 pr-3">
        <select
          value={currentType}
          onChange={setType}
          className="bg-bg-elev-2 border border-border rounded px-2 py-1 text-xs text-fg-dim focus:border-accent focus:outline-none"
        >
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-3 text-xs">
        {row.required ? (
          <span className="text-accent">✓</span>
        ) : (
          <span className="text-fg-faint">optional</span>
        )}
      </td>
      <td className="py-2 pr-3 text-fg-dim text-xs">{row.description}</td>
      <td className="py-2 text-xs text-right">
        {hasOverride ? (
          <button
            type="button"
            onClick={reset}
            title={`Сбросить override (исходное имя: ${row.original})`}
            className="text-fg-faint hover:text-warn cursor-pointer bg-transparent border-0 underline-offset-2 hover:underline"
          >
            ↺ сбросить
          </button>
        ) : (
          <span className="text-fg-faint">—</span>
        )}
      </td>
    </tr>
  )
}

export default function ExpectedSchemaCard() {
  const { state, dispatch } = useAppState()
  const overrides = state.notebook_config?.schema_overrides || {}
  const schema = useMemo(
    () => getExpectedSchema(state),
    [
      state.brief?.metric_column,
      state.brief?.metric_name,
      state.brief?.metric_type,
      state.brief?.randomization_unit,
      state.brief?.guardrails,
      state.notebook_config?.cells_enabled,
      state.notebook_config?.schema_overrides,
    ],
  )

  return (
    <section className="bg-bg-elev border border-border rounded-lg p-5">
      <h3 className="mono-label text-fg-faint mb-3">EXPECTED CSV SCHEMA</h3>
      <p className="text-xs text-fg-dim m-0 mb-3 leading-relaxed">
        Колонки, которые ожидает сгенерированный ноутбук. Переименуй колонку
        или поправь тип под имена в своём warehouse — изменения применятся к
        Python-коду ноутбука (Sprint 7 / JTBD §6 ◆).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border-soft">
              <th className="mono-label text-fg-faint text-left pb-2 pr-3">
                COLUMN
              </th>
              <th className="mono-label text-fg-faint text-left pb-2 pr-3">
                TYPE
              </th>
              <th className="mono-label text-fg-faint text-left pb-2 pr-3">
                REQUIRED
              </th>
              <th className="mono-label text-fg-faint text-left pb-2 pr-3">
                DESCRIPTION
              </th>
              <th className="mono-label text-fg-faint text-right pb-2">
                OVERRIDE
              </th>
            </tr>
          </thead>
          <tbody>
            {schema.map((row) => (
              <EditableRow
                key={row.original}
                row={row}
                override={overrides[row.original]}
                dispatch={dispatch}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
