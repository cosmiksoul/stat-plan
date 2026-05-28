import { useRef, useState } from 'react'
import ConfirmDialog from './ConfirmDialog.jsx'

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

export default function PlanActions({
  status,
  onDownload,
  onUpload,
  onApprove,
  onReturnToDraft,
}) {
  const [showReturnConfirm, setShowReturnConfirm] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)
  const isApproved = status === 'approved'

  function handleFileChange(e) {
    setUploadError(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setUploadError(
        `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} MB). Ожидается до 5 MB.`,
      )
      return
    }
    const reader = new FileReader()
    reader.onerror = () => setUploadError('Не удалось прочитать файл.')
    reader.onload = () => {
      const text = reader.result
      if (typeof text !== 'string') {
        setUploadError('Не удалось прочитать файл как текст.')
        return
      }
      const errorMessage = onUpload?.(text)
      if (errorMessage) setUploadError(errorMessage)
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onDownload}
        className="mono-label text-fg-dim border border-border rounded-md px-4 py-2 hover:border-accent hover:text-accent transition-colors cursor-pointer"
      >
        ↓ СКАЧАТЬ TEST_PLAN.MD
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mono-label text-fg-dim border border-border rounded-md px-4 py-2 hover:border-accent hover:text-accent transition-colors cursor-pointer"
      >
        ↑ ЗАГРУЗИТЬ ОТРЕДАКТИРОВАННЫЙ
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex-1" />

      {!isApproved && (
        <button
          type="button"
          onClick={onApprove}
          className="mono-label font-semibold bg-accent text-bg rounded-md px-5 py-2 hover:opacity-90 transition-opacity cursor-pointer"
        >
          ✓ УТВЕРДИТЬ ПЛАН
        </button>
      )}

      {isApproved && (
        <button
          type="button"
          onClick={() => setShowReturnConfirm(true)}
          className="mono-label text-warn border border-warn-border bg-warn-soft rounded-md px-5 py-2 hover:opacity-90 transition-opacity cursor-pointer"
        >
          ↻ ВЕРНУТЬ В ЧЕРНОВИК
        </button>
      )}

      {uploadError && (
        <div
          role="alert"
          className="w-full text-xs text-warn bg-warn-soft border border-warn-border rounded-md px-3 py-2 mt-2"
        >
          {uploadError}
        </div>
      )}

      <ConfirmDialog
        open={showReturnConfirm}
        title="Вернуть план в черновик?"
        message="Бриф станет редактируемым, а план перестанет считаться утверждённым. Шаг 3 (когда будет реализован) снова заблокируется."
        confirmLabel="ВЕРНУТЬ В ЧЕРНОВИК"
        cancelLabel="ОТМЕНА"
        destructive
        onConfirm={() => {
          setShowReturnConfirm(false)
          onReturnToDraft?.()
        }}
        onCancel={() => setShowReturnConfirm(false)}
      />
    </div>
  )
}
