import { useRef, useState } from 'react'
import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'

// Sprint 7 S4 — drag-drop .ipynb upload. Lazy-loads the parser (no jszip
// dependency here, just native JSON.parse + iteration).

async function loadIpynbParser() {
  const mod = await import('../../lib/results/ipynb.js')
  return mod.parseIpynb
}

const MAX_FILE_BYTES = 50 * 1024 * 1024

export default function IpynbUpload() {
  const { dispatch } = useAppState()
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  function readAndDispatch(file) {
    if (!file) return
    setErrorMessage(null)

    if (file.size > MAX_FILE_BYTES) {
      setErrorMessage(
        `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} MB). До 50 MB.`,
      )
      return
    }
    const reader = new FileReader()
    reader.onerror = () => setErrorMessage('Не удалось прочитать файл.')
    reader.onload = async () => {
      const text = reader.result
      if (typeof text !== 'string') {
        setErrorMessage('Не удалось прочитать файл как текст.')
        return
      }
      try {
        const parseIpynb = await loadIpynbParser()
        const parsed = parseIpynb(text)
        if (!parsed.ok) {
          setErrorMessage(parsed.error?.message ?? 'Не удалось разобрать .ipynb.')
          return
        }
        dispatch({
          type: Actions.UPLOAD_IPYNB,
          payload: {
            parsed,
            ipynb_filename: file.name,
            ipynb_raw_text: text,
          },
        })
      } catch {
        setErrorMessage('Не удалось загрузить парсер .ipynb.')
      }
    }
    reader.readAsText(file)
  }

  function handleManual() {
    dispatch({ type: Actions.SET_RESULTS_SOURCE_MANUAL })
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    readAndDispatch(e.dataTransfer.files?.[0])
  }

  return (
    <div>
      <div className="text-xs text-fg-faint mb-2 leading-relaxed">
        Загрузи <code className="font-mono text-accent">analysis.ipynb</code>{' '}
        выполненный в Jupyter — результаты подтянутся автоматически из ячейки
        с тегом <code className="font-mono text-accent">stat-plan-results</code>.
        PNG-графики подцепятся в HTML-отчёт.
      </div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        role="button"
        tabIndex={0}
        className={`border border-dashed rounded-md px-4 py-5 text-center bg-bg-elev-2 text-fg-dim text-xs transition-colors cursor-pointer hover:bg-bg-elev hover:text-fg ${
          dragOver ? 'border-accent text-accent' : 'border-border'
        }`}
      >
        Перетащи .ipynb сюда{' '}
        <span className="text-accent underline-offset-2 hover:underline">
          или выбери
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".ipynb,application/json,application/x-ipynb+json"
        onChange={(e) => {
          readAndDispatch(e.target.files?.[0])
          e.target.value = ''
        }}
        className="hidden"
      />
      <div className="mt-2 text-xs text-fg-faint">
        Нет ноутбука?{' '}
        <button
          type="button"
          onClick={handleManual}
          className="text-accent underline-offset-2 hover:underline cursor-pointer bg-transparent border-0 p-0 font-inherit"
        >
          ввести числа вручную →
        </button>
      </div>
      {errorMessage && (
        <div
          role="alert"
          className="mt-2 text-xs text-warn bg-warn-soft border border-warn-border rounded-md px-3 py-2"
        >
          {errorMessage}
        </div>
      )}
    </div>
  )
}
