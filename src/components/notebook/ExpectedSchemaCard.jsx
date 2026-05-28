import { useMemo } from 'react'
import { getExpectedSchema } from '../../lib/plan/notebook-builder.js'
import { useAppState } from '../../state/AppStateContext.jsx'

export default function ExpectedSchemaCard() {
  const { state } = useAppState()
  const schema = useMemo(
    () => getExpectedSchema(state),
    [
      state.brief?.metric_column,
      state.brief?.metric_name,
      state.brief?.metric_type,
      state.brief?.randomization_unit,
      state.brief?.guardrails,
      state.notebook_config?.cells_enabled,
    ],
  )

  return (
    <section className="bg-bg-elev border border-border rounded-lg p-5">
      <h3 className="mono-label text-fg-faint mb-3">EXPECTED CSV SCHEMA</h3>
      <p className="text-xs text-fg-dim m-0 mb-3 leading-relaxed">
        Колонки, которые ожидает сгенерированный ноутбук. Список обновляется
        реактивно при переключении опциональных ячеек слева.
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
              <th className="mono-label text-fg-faint text-left pb-2">
                DESCRIPTION
              </th>
            </tr>
          </thead>
          <tbody>
            {schema.map((row) => (
              <tr key={row.column} className="border-b border-border-soft last:border-0">
                <td className="py-2 pr-3 font-mono text-fg text-xs">
                  {row.column}
                </td>
                <td className="py-2 pr-3 text-fg-dim text-xs">{row.type}</td>
                <td className="py-2 pr-3 text-xs">
                  {row.required ? (
                    <span className="text-accent">✓</span>
                  ) : (
                    <span className="text-fg-faint">optional</span>
                  )}
                </td>
                <td className="py-2 text-fg-dim text-xs">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
