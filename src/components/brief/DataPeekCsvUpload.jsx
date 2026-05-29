import { useRef, useState } from 'react'
import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'

// papaparse is ~20KB gzip — lazy-load it so it doesn't sit in the initial
// bundle when the user might never open Data Peek.
async function loadCsvParser() {
  const mod = await import('../../lib/data-peek/csv.js')
  return mod.parseDataPeekCsv
}

const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB, parser also enforces

function schemaText(brief) {
  if (brief.metric_type === 'ratio') {
    const n = brief.ratio_components?.numerator || '<numerator>'
    const d = brief.ratio_components?.denominator || '<denominator>'
    return (
      <>
        Ожидаем колонки: <code className="font-mono text-accent">{n}</code>,{' '}
        <code className="font-mono text-accent">{d}</code> + опционально{' '}
        <code className="font-mono text-accent">day</code>.
      </>
    )
  }
  const col = brief.metric_column || '<metric_column>'
  return (
    <>
      Ожидаем колонку: <code className="font-mono text-accent">{col}</code> +
      опционально <code className="font-mono text-accent">day</code>.
    </>
  )
}

export default function DataPeekCsvUpload() {
  const { state, dispatch } = useAppState()
  const brief = state.brief
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [warnings, setWarnings] = useState([])

  function readAndDispatch(file) {
    if (!file) return
    setErrorMessage(null)
    setWarnings([])

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
        const parseDataPeekCsv = await loadCsvParser()
        const result = parseDataPeekCsv(text, brief)
        if (!result.ok) {
          setErrorMessage(result.error?.message ?? 'Не удалось распарсить CSV.')
          return
        }
        if (result.warnings?.length > 0) setWarnings(result.warnings)
        dispatch({
          type: Actions.SET_DATA_PEEK,
          payload: { data_peek: result },
        })
      } catch {
        setErrorMessage('Не удалось загрузить CSV-парсер.')
      }
    }
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    readAndDispatch(e.dataTransfer.files?.[0])
  }

  return (
    <div>
      <div className="text-xs text-fg-faint mb-2 leading-relaxed">
        {schemaText(brief)}
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
        Перетащи CSV сюда{' '}
        <span className="text-accent underline-offset-2 hover:underline">
          или выбери
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          readAndDispatch(e.target.files?.[0])
          e.target.value = ''
        }}
        className="hidden"
      />
      {errorMessage && (
        <div
          role="alert"
          className="mt-2 text-xs text-warn bg-warn-soft border border-warn-border rounded-md px-3 py-2"
        >
          {errorMessage}
        </div>
      )}
      {warnings.length > 0 && (
        <ul className="mt-2 m-0 pl-0 list-none space-y-1">
          {warnings.map((w, i) => (
            <li
              key={i}
              className="text-xs text-warn bg-warn-soft border border-warn-border rounded-md px-2.5 py-1.5"
            >
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
