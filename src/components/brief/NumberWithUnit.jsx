export default function NumberWithUnit({
  value,
  unit,
  unitOptions,
  freeUnit = false,
  noUnit = false,
  onChange,
  placeholder,
  label,
  hint,
  step,
}) {
  function update(patch) {
    onChange({ value, unit, ...patch })
  }

  const numberInput = (
    <input
      type="number"
      inputMode="decimal"
      step={step ?? 'any'}
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value
        update({ value: raw === '' ? null : Number(raw) })
      }}
      placeholder={placeholder}
      className={
        (noUnit ? 'w-full ' : 'flex-1 ') +
        'bg-bg-elev border border-border rounded-md px-3 py-2.5 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors'
      }
    />
  )

  return (
    <div>
      {label && (
        <div className="mono-label text-fg-faint mb-1.5">{label}</div>
      )}
      {noUnit ? (
        numberInput
      ) : (
        <div className="flex gap-2">
          {numberInput}
          {freeUnit ? (
            <input
              type="text"
              value={unit ?? ''}
              onChange={(e) => update({ unit: e.target.value || null })}
              placeholder="ед."
              className="w-32 bg-bg-elev border border-border rounded-md px-3 py-2.5 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors"
            />
          ) : (
            <select
              value={unit ?? ''}
              onChange={(e) => update({ unit: e.target.value || null })}
              className="w-44 bg-bg-elev border border-border rounded-md px-3 py-2.5 text-sm text-fg focus:outline-none focus:border-accent transition-colors cursor-pointer"
            >
              {unitOptions?.length > 1 && <option value="">—</option>}
              {(unitOptions ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      {hint && <div className="text-xs text-fg-faint mt-1.5">{hint}</div>}
    </div>
  )
}
