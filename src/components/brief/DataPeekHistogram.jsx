import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// Sprint 6: lightweight histogram using recharts (ADR-014).
// Sprint 6 FIX iter 1 (C-2): for ratio peek we render a 3-up grid
// (numerator | denominator | ratio); other metric types keep the single chart.
// Bin count rule-of-thumb: min(30, ceil(sqrt(n))).

function binValues(values) {
  if (!Array.isArray(values) || values.length === 0) return []
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min === max) {
    return [{ bin: min.toFixed(3), count: values.length, low: min, high: max }]
  }
  const n = values.length
  const k = Math.min(30, Math.max(3, Math.ceil(Math.sqrt(n))))
  const step = (max - min) / k
  const counts = new Array(k).fill(0)
  for (const v of values) {
    let idx = Math.floor((v - min) / step)
    if (idx >= k) idx = k - 1
    if (idx < 0) idx = 0
    counts[idx] += 1
  }
  return counts.map((count, i) => {
    const low = min + i * step
    const high = i === k - 1 ? max : low + step
    return {
      bin: `${low.toFixed(2)}…${high.toFixed(2)}`,
      count,
      low,
      high,
    }
  })
}

function SingleHistogram({ values, title, heightClass = 'h-40' }) {
  const data = useMemo(() => binValues(values), [values])
  if (data.length === 0) return null
  return (
    <div>
      <div className="mono-label text-fg-faint mb-2">{title.toUpperCase()}</div>
      <div className={`${heightClass} -mx-1`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="bin"
              tick={{ fontSize: 9, fill: 'currentColor' }}
              interval="preserveStartEnd"
              height={22}
            />
            <YAxis tick={{ fontSize: 9, fill: 'currentColor' }} width={26} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.06)' }}
              contentStyle={{
                fontSize: 11,
                padding: '4px 8px',
                background: 'var(--color-bg-elev-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                color: 'var(--color-fg)',
              }}
              labelStyle={{ color: 'var(--color-fg)' }}
              itemStyle={{ color: 'var(--color-fg)' }}
              formatter={(v) => [v, 'count']}
            />
            <Bar dataKey="count" fill="currentColor" className="text-accent" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function DataPeekHistogram({
  values,
  valuesNumerator,
  valuesDenominator,
  labels,
  title = 'Гистограмма',
}) {
  const hasRatioTriple =
    Array.isArray(valuesNumerator) &&
    Array.isArray(valuesDenominator) &&
    valuesNumerator.length > 0 &&
    valuesDenominator.length > 0

  if (hasRatioTriple) {
    const numLabel = labels?.numerator
      ? `Числитель (${labels.numerator})`
      : 'Числитель'
    const denLabel = labels?.denominator
      ? `Знаменатель (${labels.denominator})`
      : 'Знаменатель'
    const ratioLabel =
      labels?.numerator && labels?.denominator
        ? `Ratio (${labels.numerator}/${labels.denominator})`
        : 'Ratio (N/D)'
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SingleHistogram
          values={valuesNumerator}
          title={numLabel}
          heightClass="h-36"
        />
        <SingleHistogram
          values={valuesDenominator}
          title={denLabel}
          heightClass="h-36"
        />
        <SingleHistogram
          values={values}
          title={ratioLabel}
          heightClass="h-36"
        />
      </div>
    )
  }

  return <SingleHistogram values={values} title={title} />
}
