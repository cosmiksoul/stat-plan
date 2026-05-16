const GROUP_LABELS = {
  hypothesis: 'Полнота гипотезы',
  design: 'Полнота дизайна',
  consistency: 'Методологическая консистентность',
  dataPeek: 'Pre-flight на данных',
}

const GROUP_MAX = {
  hypothesis: 20,
  design: 30,
  consistency: 30,
  dataPeek: 20,
}

const SEVERITY_STYLE = {
  info: 'text-fg-dim border-border-soft bg-bg-elev-2',
  warn: 'text-warn border-warn-border bg-warn-soft',
  critical: 'text-danger border-danger-soft bg-danger-soft',
}

const SEVERITY_ICON = { info: '·', warn: '!', critical: '✕' }

function GroupRow({ name, pts, max, remarks }) {
  const filledPct = max > 0 ? (pts / max) * 100 : 0
  const groupRemarks = remarks.filter((r) => r.group === name)
  return (
    <details className="border border-border-soft rounded-md bg-bg-elev-2" open>
      <summary className="px-4 py-3 cursor-pointer flex items-center justify-between gap-3 list-none">
        <div className="flex items-center gap-3 min-w-0">
          <span className="mono-label text-fg-dim flex-shrink-0">
            {pts.toString().padStart(2, '0')}/{max}
          </span>
          <span className="text-sm text-fg truncate">{GROUP_LABELS[name]}</span>
        </div>
        <div className="flex-1 max-w-[120px] h-1.5 bg-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-accent"
            style={{ width: `${filledPct}%` }}
          />
        </div>
      </summary>
      {groupRemarks.length > 0 && (
        <ul className="px-4 pb-3 m-0 list-none space-y-1.5">
          {groupRemarks.map((r) => (
            <li
              key={r.id}
              className={`text-xs border rounded-md px-2.5 py-1.5 leading-relaxed ${SEVERITY_STYLE[r.severity]}`}
            >
              <span className="mono-label inline-block mr-2">
                {SEVERITY_ICON[r.severity]}
              </span>
              {r.message}
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}

export default function ScoringCard({ score }) {
  if (!score || typeof score.total !== 'number') {
    return (
      <div className="bg-bg-elev border border-border rounded-lg p-6">
        <div className="text-sm text-fg-dim">
          Скоринг будет рассчитан после заполнения брифа.
        </div>
      </div>
    )
  }

  const { total, breakdown, remarks } = score

  let summary
  if (total >= 90) summary = 'План готов к запуску.'
  else if (total >= 70) summary = 'План хороший, есть мелкие замечания.'
  else if (total >= 50) summary = 'План есть, но методология под вопросом.'
  else summary = 'План сырой, отправка преждевременна.'

  return (
    <section className="bg-bg-elev border border-border rounded-lg p-6">
      <div className="mb-4">
        <div className="mono-label text-fg-faint mb-2">ОЦЕНКА ТЕСТ-ПЛАНА</div>
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-5xl font-medium tracking-tight text-fg">
            {total}
          </span>
          <span className="text-fg-faint text-lg">/ 100</span>
        </div>
        <div className="text-sm text-fg-dim mt-2">{summary}</div>
      </div>

      <div className="space-y-2">
        {['hypothesis', 'design', 'consistency', 'dataPeek'].map((g) => (
          <GroupRow
            key={g}
            name={g}
            pts={breakdown?.[g] ?? 0}
            max={GROUP_MAX[g]}
            remarks={remarks ?? []}
          />
        ))}
      </div>
    </section>
  )
}
