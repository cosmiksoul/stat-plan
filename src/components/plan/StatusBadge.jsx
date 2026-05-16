export default function StatusBadge({ status }) {
  const isApproved = status === 'approved'
  return (
    <span
      className={`mono-label font-semibold inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 border ${
        isApproved
          ? 'bg-accent-soft text-accent border-accent'
          : 'bg-bg-elev-2 text-fg-dim border-border'
      }`}
    >
      {isApproved ? '✓ УТВЕРЖДЁН' : '○ DRAFT'}
    </span>
  )
}
