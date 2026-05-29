import { useState } from 'react'
import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'
import { buildManualDataPeek } from '../../lib/data-peek/calculator.js'

function NumberInput({ label, value, onChange, error, placeholder, hint }) {
  return (
    <label className="block">
      <span className="mono-label text-fg-faint block mb-1">{label}</span>
      <input
        type="number"
        step="any"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 bg-bg-elev border rounded-md text-sm text-fg font-mono ${
          error ? 'border-warn' : 'border-border'
        }`}
      />
      {hint && !error && (
        <span className="text-xs text-fg-faint block mt-1">{hint}</span>
      )}
      {error && (
        <span className="text-xs text-warn block mt-1">{error}</span>
      )}
    </label>
  )
}

function toNum(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export default function DataPeekManualForm() {
  const { state, dispatch } = useAppState()
  const brief = state.brief
  const metricType = brief.metric_type
  const [fields, setFields] = useState({})
  const [errors, setErrors] = useState({})

  function set(key, raw) {
    setFields((f) => ({ ...f, [key]: raw }))
  }

  function submit() {
    const numericFields = {}
    for (const key of Object.keys(fields)) {
      numericFields[key] = toNum(fields[key])
    }
    const result = buildManualDataPeek({
      metric_type: metricType,
      fields: numericFields,
      brief,
    })
    if (!result.ok) {
      setErrors(result.errors || {})
      return
    }
    setErrors({})
    dispatch({ type: Actions.SET_DATA_PEEK, payload: { data_peek: result } })
  }

  if (metricType === 'continuous') {
    return (
      <div className="space-y-3">
        <NumberInput
          label="σ (СТАНДАРТНОЕ ОТКЛОНЕНИЕ МЕТРИКИ)"
          value={fields.sigma}
          onChange={(v) => set('sigma', v)}
          error={errors.sigma}
          hint="Из исторических данных. Без σ — расчёт через bootstrap fallback (±20-30%)."
        />
        <SubmitButton onClick={submit} />
      </div>
    )
  }

  if (metricType === 'count') {
    const poissonDefault = brief.baseline?.value
      ? Math.sqrt(brief.baseline.value).toFixed(2)
      : undefined
    return (
      <div className="space-y-3">
        <NumberInput
          label="σ (СТАНДАРТНОЕ ОТКЛОНЕНИЕ)"
          value={fields.sigma}
          onChange={(v) => set('sigma', v)}
          error={errors.sigma}
          placeholder={poissonDefault}
          hint={`По умолчанию σ = √baseline = ${poissonDefault ?? '?'} (Poisson). Перепиши, если overdispersed.`}
        />
        <SubmitButton onClick={submit} />
      </div>
    )
  }

  if (metricType === 'ratio') {
    return (
      <div className="space-y-3">
        <div className="text-xs text-fg-faint leading-relaxed">
          Введи 5 параметров для delta-method: средние числителя и знаменателя,
          их дисперсии и ковариация. Из исторических данных.
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="μ(N) СРЕДНЕЕ ЧИСЛИТЕЛЯ"
            value={fields.mean_n}
            onChange={(v) => set('mean_n', v)}
            error={errors.mean_n}
          />
          <NumberInput
            label="μ(D) СРЕДНЕЕ ЗНАМЕНАТЕЛЯ"
            value={fields.mean_d}
            onChange={(v) => set('mean_d', v)}
            error={errors.mean_d}
          />
          <NumberInput
            label="Var(N)"
            value={fields.var_n}
            onChange={(v) => set('var_n', v)}
            error={errors.var_n}
          />
          <NumberInput
            label="Var(D)"
            value={fields.var_d}
            onChange={(v) => set('var_d', v)}
            error={errors.var_d}
          />
          <NumberInput
            label="Cov(N, D)"
            value={fields.cov_nd}
            onChange={(v) => set('cov_nd', v)}
            error={errors.cov_nd}
            hint="Если N и D независимы — 0."
          />
        </div>
        {errors._form && (
          <div
            role="alert"
            className="text-xs text-warn bg-warn-soft border border-warn-border rounded-md px-3 py-2"
          >
            {errors._form}
          </div>
        )}
        <SubmitButton onClick={submit} />
      </div>
    )
  }

  return (
    <div className="text-xs text-fg-faint">
      Manual calculator недоступен для metric_type=
      <code className="font-mono">{String(metricType)}</code>.
    </div>
  )
}

function SubmitButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mono-label text-accent hover:underline cursor-pointer"
    >
      ✓ Применить Data Peek
    </button>
  )
}
