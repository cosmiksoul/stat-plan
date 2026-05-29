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

export default function DataPeekHistogram({ values, title = 'Гистограмма' }) {
  const data = useMemo(() => binValues(values), [values])
  if (data.length === 0) return null
  return (
    <div>
      <div className="mono-label text-fg-faint mb-2">{title.toUpperCase()}</div>
      <div className="h-40 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="bin"
              tick={{ fontSize: 9, fill: 'currentColor' }}
              interval="preserveStartEnd"
              height={22}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'currentColor' }}
              width={26}
            />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              contentStyle={{ fontSize: 11, padding: '4px 8px' }}
              formatter={(v) => [v, 'count']}
            />
            <Bar dataKey="count" fill="currentColor" className="text-accent" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
