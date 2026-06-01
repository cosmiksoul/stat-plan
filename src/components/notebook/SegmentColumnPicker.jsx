import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'

// Sprint 9 K-6 — explicit «по какому полю сегментировать» picker, shown when the
// segments cell is enabled. Reuses the existing schema_overrides['geo'] channel
// (lookup key stays 'geo' per ADR; the rename feeds the {{segment_column}}
// placeholder and the editable schema row), so there is no second source of
// truth and no new reducer state.

const PRESETS = ['geo', 'device', 'country', 'plan', 'segment']

export default function SegmentColumnPicker() {
  const { state, dispatch } = useAppState()
  const current = state.notebook_config?.schema_overrides?.geo?.rename || 'geo'
  const isOther = !PRESETS.includes(current)

  function setColumn(value) {
    dispatch({
      type: Actions.SET_SCHEMA_OVERRIDE,
      column: 'geo',
      patch: { rename: value === 'geo' ? '' : value },
    })
  }

  return (
    <div className="bg-bg-elev-2 border border-border-soft rounded-md px-3 py-2.5 mb-5 -mt-3">
      <label className="block text-xs text-fg-dim mb-1.5">
        По какому полю сегментировать?
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={isOther ? '__other' : current}
          onChange={(e) => {
            const v = e.target.value
            setColumn(v === '__other' ? '' : v)
          }}
          className="bg-bg-elev border border-border rounded px-2 py-1 text-xs text-fg focus:border-accent focus:outline-none"
        >
          {PRESETS.map((p) => (
            <option key={p} value={p}>
              {p}
              {p === 'geo' ? ' (по умолчанию)' : ''}
            </option>
          ))}
          <option value="__other">Другое…</option>
        </select>
        {isOther && (
          <input
            type="text"
            value={current === 'geo' ? '' : current}
            onChange={(e) => setColumn(e.target.value)}
            placeholder="имя колонки в CSV"
            spellCheck={false}
            className="bg-bg-elev border border-border rounded px-2 py-1 font-mono text-xs text-fg focus:border-accent focus:outline-none min-w-[160px]"
          />
        )}
      </div>
      <p className="text-[11px] text-fg-faint mt-1.5 leading-relaxed">
        Колонка применится к ноутбуку и синхронизируется с таблицей ожидаемой
        схемы ниже.
      </p>
    </div>
  )
}
