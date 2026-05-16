import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog.jsx'

export default function PlanActions({
  status,
  onDownload,
  onUploadStub,
  onApprove,
  onReturnToDraft,
}) {
  const [showReturnConfirm, setShowReturnConfirm] = useState(false)
  const [uploadHint, setUploadHint] = useState(false)
  const isApproved = status === 'approved'

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
        onClick={() => {
          setUploadHint(true)
          if (onUploadStub) onUploadStub()
          setTimeout(() => setUploadHint(false), 4000)
        }}
        className="mono-label text-fg-faint border border-border-soft rounded-md px-4 py-2 hover:text-fg transition-colors cursor-pointer"
        title="Парсинг загруженного test_plan.md появится в Sprint 4+"
      >
        ↑ ЗАГРУЗИТЬ ОТРЕДАКТИРОВАННЫЙ
      </button>

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

      {uploadHint && (
        <div className="w-full text-xs text-fg-faint bg-bg-elev-2 border border-border-soft rounded-md px-3 py-2 mt-2">
          Парсинг загруженного test_plan.md появится в следующем спринте
          (Sprint 4+). Сейчас редактирование плана идёт через бриф.
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
