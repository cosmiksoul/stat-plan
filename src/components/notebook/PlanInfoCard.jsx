export default function PlanInfoCard({ state }) {
  const brief = state.brief || {}
  const derived = state.plan?.derived || {}
  const testId =
    state.test_id ||
    (brief.metric_name ? `${brief.metric_name}-v1` : 'test-v1')
  const items = [
    { label: 'TEST_ID', value: testId, mono: true },
    {
      label: 'METRIC',
      value: brief.metric_name || '—',
      sub: brief.metric_type ? `(${brief.metric_type})` : null,
    },
    { label: 'METHOD', value: derived.test_method || '—', mono: true },
    {
      label: 'SAMPLE / ARM',
      value:
        derived.sample_size_per_arm != null
          ? `~${derived.sample_size_per_arm.toLocaleString('ru-RU')}`
          : '—',
    },
    {
      label: 'ДЛИТЕЛЬНОСТЬ',
      value:
        derived.duration_days != null ? `~${derived.duration_days} дн.` : '—',
    },
    {
      label: 'α / POWER',
      value: `${brief.advanced?.alpha ?? 0.05} / ${brief.advanced?.power ?? 0.8}`,
      mono: true,
    },
  ]

  return (
    <section className="bg-bg-elev border border-border rounded-lg p-6 mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <h2 className="font-serif text-2xl font-medium tracking-tight m-0 text-fg">
          Конструктор ноутбука
        </h2>
        <span className="mono-label text-accent">
          ↳ ПЛАН УТВЕРЖДЁН
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {items.map((it) => (
          <div key={it.label}>
            <div className="mono-label text-fg-faint mb-1">{it.label}</div>
            <div
              className={`text-sm text-fg ${it.mono ? 'font-mono' : ''} break-words`}
            >
              {it.value}
            </div>
            {it.sub && (
              <div className="text-xs text-fg-dim mt-0.5">{it.sub}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
