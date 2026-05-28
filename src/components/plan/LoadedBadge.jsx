// Visible when state.plan.editedExternally === true — that is, when the
// current plan came from an uploaded test_plan.md rather than being
// generated from the brief in-session. Orthogonal to StatusBadge: a
// loaded plan can be draft or approved.

export default function LoadedBadge({ visible }) {
  if (!visible) return null
  return (
    <span
      className="mono-label inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 border border-border-soft bg-bg-elev-2 text-fg-faint"
      title="План пришёл из загруженного test_plan.md. Локальные правки в брифе по-прежнему меняют его."
    >
      ↳ ЗАГРУЖЕН
    </span>
  )
}
