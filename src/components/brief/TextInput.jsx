export default function TextInput({
  value,
  onChange,
  placeholder,
  label,
  hint,
  multiline = false,
  rows = 3,
}) {
  const sharedClasses =
    'w-full bg-bg-elev border border-border rounded-md px-3 py-2.5 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors'

  return (
    <label className="block">
      {label && (
        <span className="mono-label text-fg-faint block mb-1.5">{label}</span>
      )}
      {multiline ? (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={sharedClasses + ' resize-y leading-relaxed font-sans'}
        />
      ) : (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={sharedClasses}
        />
      )}
      {hint && <div className="text-xs text-fg-faint mt-1.5">{hint}</div>}
    </label>
  )
}
