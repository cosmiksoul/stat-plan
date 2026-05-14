const SLOT_LABELS = [
  { key: 'change', label: 'изменение' },
  { key: 'metric', label: 'метрика' },
  { key: 'direction_magnitude', label: 'направление + Δ' },
  { key: 'mechanism', label: 'механизм' },
]

export default function HypothesisInput({
  text,
  slots,
  onChange,
  template,
}) {
  const filled = SLOT_LABELS.filter((s) => slots?.[s.key]).length

  return (
    <div>
      <textarea
        value={text ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={template}
        className="w-full bg-bg-elev border border-border rounded-md px-3 py-3 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors resize-y leading-relaxed font-sans"
      />

      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
        {SLOT_LABELS.map((s) => {
          const ok = !!slots?.[s.key]
          return (
            <div
              key={s.key}
              className="flex items-center gap-1.5 text-xs"
              aria-label={`${s.label}: ${ok ? 'найдено' : 'не найдено'}`}
            >
              <span
                className={`font-mono w-4 text-center ${ok ? 'text-ok' : 'text-fg-faint'}`}
              >
                {ok ? '✓' : '·'}
              </span>
              <span className={ok ? 'text-fg-dim' : 'text-fg-faint'}>
                {s.label}
              </span>
            </div>
          )
        })}
        <div className="ml-auto mono-label text-fg-faint">
          {filled} / 4 слотов
        </div>
      </div>
    </div>
  )
}
