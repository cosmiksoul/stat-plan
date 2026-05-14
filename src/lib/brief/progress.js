// Derived helpers for the brief progress bar and question map.
// Pure functions, no React.

export function isQuestionAnswered(brief, num) {
  switch (num) {
    case 1:
      return brief.goal_type !== null && brief.goal_type !== ''
    case 2:
      return (brief.hypothesis?.text ?? '').trim() !== ''
    case 3:
      return brief.metric_type !== null && brief.metric_type !== ''
    case 4:
      return (brief.metric_name ?? '').trim() !== ''
    case 5:
      return brief.baseline?.value !== null && brief.baseline?.value !== ''
    case 6:
      return brief.randomization_unit !== null && brief.randomization_unit !== ''
    case 7:
      return brief.mde?.value !== null && brief.mde?.value !== ''
    case 8:
      return (
        brief.daily_traffic?.value !== null &&
        brief.daily_traffic?.value !== ''
      )
    case 9:
      return Array.isArray(brief.guardrails) && brief.guardrails.length > 0
    case 10: {
      const dr = brief.decision_rules ?? {}
      return [dr.ship, dr.iterate, dr.kill].some(
        (s) => (s ?? '').trim() !== '',
      )
    }
    default:
      return false
  }
}

export function countAnswered(brief) {
  let n = 0
  for (let i = 1; i <= 10; i += 1) {
    if (isQuestionAnswered(brief, i)) n += 1
  }
  return n
}

export function shortAnswerPreview(brief, num) {
  switch (num) {
    case 1:
      return brief.goal_type ?? null
    case 2: {
      const t = brief.hypothesis?.text ?? ''
      if (!t.trim()) return null
      const slots = brief.hypothesis?.slots ?? {}
      const filled = Object.values(slots).filter(Boolean).length
      return `${filled}/4 слотов · ${truncate(t.trim(), 48)}`
    }
    case 3:
      return brief.metric_type ?? null
    case 4:
      return brief.metric_name?.trim() || null
    case 5: {
      const b = brief.baseline ?? {}
      if (b.value == null || b.value === '') return null
      return formatNumberWithUnit(b.value, b.unit)
    }
    case 6: {
      if (!brief.randomization_unit) return null
      if (brief.randomization_unit === 'cluster' && brief.cluster_field) {
        return `cluster · ${brief.cluster_field}`
      }
      return brief.randomization_unit
    }
    case 7: {
      const m = brief.mde ?? {}
      if (m.value == null || m.value === '') return null
      return formatMde(m)
    }
    case 8: {
      const t = brief.daily_traffic ?? {}
      if (t.value == null || t.value === '') return null
      return `${t.value} ${t.unit ?? ''}`.trim()
    }
    case 9: {
      const list = brief.guardrails ?? []
      if (!list.length) return null
      return `${list.length} метрик${pluralRu(list.length)}`
    }
    case 10: {
      const dr = brief.decision_rules ?? {}
      const set = ['ship', 'iterate', 'kill'].filter(
        (k) => (dr[k] ?? '').trim() !== '',
      )
      if (!set.length) return null
      return `правил: ${set.join(' / ')}`
    }
    default:
      return null
  }
}

function truncate(s, max) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function pluralRu(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'а'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'и'
  return ''
}

function formatNumberWithUnit(value, unit) {
  if (unit === 'percent') return `${value}%`
  if (unit === 'fraction') return `${value}`
  if (!unit) return `${value}`
  return `${value} ${unit}`
}

function formatMde(mde) {
  const v = mde.value
  switch (mde.unit) {
    case 'relative_percent':
      return `${v}% rel.`
    case 'absolute_percentage_points':
      return `${v} п.п.`
    case 'absolute_value':
      return `${v}`
    default:
      return `${v}`
  }
}
