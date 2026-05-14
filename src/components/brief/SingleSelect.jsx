export default function SingleSelect({ value, defaultValue, options, onChange }) {
  const effective = value ?? defaultValue ?? null

  return (
    <div className="grid gap-2.5">
      {options.map((opt) => {
        const selected = effective === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={[
              'text-left rounded-lg border px-4 py-3.5 transition-colors cursor-pointer',
              selected
                ? 'bg-bg-elev-2 border-accent'
                : 'bg-bg-elev border-border hover:bg-bg-elev-2 hover:border-border-soft',
            ].join(' ')}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={`font-medium text-sm ${selected ? 'text-fg' : 'text-fg-dim'}`}
              >
                {opt.label}
              </span>
              {selected && (
                <span className="mono-label text-accent shrink-0">ВЫБРАНО</span>
              )}
            </div>
            {opt.hint && (
              <div className="text-xs text-fg-faint mt-1">{opt.hint}</div>
            )}
          </button>
        )
      })}
    </div>
  )
}
