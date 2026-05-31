// Sprint 8 P-5 — shared status/info banner. `status` (✓) for approval-related
// state, `info` (ℹ) for neutral descriptions. Optional right-aligned action.

const VARIANTS = {
  status: 'bg-accent-soft border-accent text-fg',
  info: 'bg-bg-elev-2 border-border-soft text-fg-dim',
}

export default function Banner({ type = 'info', icon, children, action }) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md border mb-6 ${VARIANTS[type] || VARIANTS.info}`}
    >
      {icon && <span className="text-base shrink-0 leading-6">{icon}</span>}
      <div className="flex-1 text-sm leading-relaxed">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
