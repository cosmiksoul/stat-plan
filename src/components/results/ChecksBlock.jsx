import { useMemo } from 'react'
import { useAppState } from '../../state/AppStateContext.jsx'
import { srmCheck, sanityCheck } from '../../lib/results/checks.js'
import { effectiveResults } from '../../lib/results/effective.js'

function Badge({ status, children }) {
  const cls =
    status === true
      ? 'text-ok bg-ok-soft border-ok-border'
      : status === false
        ? 'text-warn bg-warn-soft border-warn-border'
        : 'text-fg-faint bg-bg-elev-2 border-border'
  const icon = status === true ? '✓' : status === false ? '⚠' : '—'
  return (
    <li
      className={`text-sm border rounded px-3 py-2 flex items-center gap-2 ${cls}`}
    >
      <span className="font-mono text-base">{icon}</span>
      <span>{children}</span>
    </li>
  )
}

function fmt(v, digits = 4) {
  if (!Number.isFinite(Number(v))) return '—'
  return Number(v).toFixed(digits)
}

export default function ChecksBlock() {
  const { state } = useAppState()
  const eff = effectiveResults(state.results)
  const srm = useMemo(
    () => srmCheck({ control_n: eff.control_n, treatment_n: eff.treatment_n }),
    [eff.control_n, eff.treatment_n],
  )
  const sanity = useMemo(
    () =>
      sanityCheck({
        results: eff,
        plan: {
          derived: state.plan.derived || {},
          brief: state.brief,
          mde: state.brief.mde,
        },
      }),
    [eff, state.plan.derived, state.brief],
  )

  const perArm = state.plan.derived?.sample_size_per_arm
  const totalPlanned = Number.isFinite(perArm) ? perArm * 2 : null
  const direction = state.brief?.mde?.direction

  return (
    <ul className="space-y-2 m-0 p-0 list-none">
      <Badge status={srm.pass}>
        SRM: p = {fmt(srm.pvalue)}{' '}
        {srm.total != null && (
          <span className="text-fg-faint ml-2">(total = {srm.total})</span>
        )}
      </Badge>
      <Badge status={sanity.total_n_match}>
        Sample size vs план
        {totalPlanned != null && (
          <span className="text-fg-faint ml-2">
            (наблюдаем {(eff.control_n ?? 0) + (eff.treatment_n ?? 0)}, план {totalPlanned})
          </span>
        )}
      </Badge>
      <Badge status={sanity.direction_match}>
        Направление эффекта vs MDE
        {direction && direction !== 'any' && (
          <span className="text-fg-faint ml-2">
            (план: {direction}, Δ = {fmt(eff.delta_rel, 2)}%)
          </span>
        )}
      </Badge>
      {Number.isFinite(Number(eff.srm_pvalue)) && (
        <li className="text-xs text-fg-faint pl-3">
          (SRM p-value из ноутбука: {fmt(eff.srm_pvalue)})
        </li>
      )}
    </ul>
  )
}
