import { useEffect } from 'react'

// Modal-like confirmation. No external library — overlay + centered panel.
// Closes on ESC and on backdrop click.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Отмена',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onCancel?.()
      if (e.key === 'Enter') onConfirm?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel, onConfirm])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" />
      <div
        className="relative bg-bg-elev border border-border rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3
            id="confirm-dialog-title"
            className="font-serif text-xl font-medium text-fg m-0 mb-3"
          >
            {title}
          </h3>
        )}
        <p className="text-sm text-fg-dim m-0 mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="mono-label text-fg-dim border border-border rounded-md px-4 py-2 hover:border-fg hover:text-fg transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`mono-label font-semibold rounded-md px-5 py-2 transition-opacity cursor-pointer ${
              destructive
                ? 'bg-danger text-bg hover:opacity-90'
                : 'bg-accent text-bg hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
