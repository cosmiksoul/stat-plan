import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppState } from '../state/AppStateContext.jsx'
import { Actions } from '../state/reducer.js'
import { parseTestPlanMd } from '../lib/plan/parse.js'

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

export default function StartScreen() {
  const { dispatch } = useAppState()
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  function handleStartBrief() {
    dispatch({ type: Actions.START_BRIEF })
    navigate('/step1')
  }

  function readAndDispatch(file) {
    if (!file) return
    setErrorMessage(null)

    if (file.size > MAX_FILE_BYTES) {
      setErrorMessage(
        `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} MB). Ожидается до 5 MB.`,
      )
      return
    }

    const reader = new FileReader()
    reader.onerror = () => setErrorMessage('Не удалось прочитать файл.')
    reader.onload = () => {
      const text = reader.result
      if (typeof text !== 'string') {
        setErrorMessage('Не удалось прочитать файл как текст.')
        return
      }
      const result = parseTestPlanMd(text)
      if (!result.ok) {
        setErrorMessage(result.error?.message ?? 'Не удалось распарсить файл.')
        return
      }
      dispatch({ type: Actions.LOAD_TEST_PLAN_MD, payload: result })
      // ProtectedStep will route to /step2 if status=draft, render /step3
      // if status=approved (see App.jsx).
      navigate('/step3')
    }
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    readAndDispatch(e.dataTransfer.files?.[0])
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleFileInputChange(e) {
    readAndDispatch(e.target.files?.[0])
    // Reset so picking the same file twice still fires onChange.
    e.target.value = ''
  }

  return (
    <div>
      <section className="text-center pt-8 pb-8">
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] m-0 mb-3">
          Управляем процессом тестирования без сюрпризов
        </h1>
        <p className="text-base text-fg-dim max-w-[640px] mx-auto leading-relaxed m-0">
          Пройди бриф, получи методологически проверенный план A/B-теста,
          сгенерируй Jupyter-ноутбук для анализа, упакуй результаты в отчёт.
          Есть вопросы — загляни в{' '}
          <Link to="/docs" className="text-accent hover:underline">
            документацию
          </Link>{' '}
          или проконсультируйся с{' '}
          <a
            href="https://notebooklm.google.com/notebook/040498fe-3843-4562-a854-863d2101a0d8"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            AI-компаньоном
          </a>
          .
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-5 max-w-[920px] mx-auto">
        <button
          type="button"
          onClick={handleStartBrief}
          className="text-left bg-bg-elev border border-border rounded-[10px] p-7 cursor-pointer transition-all hover:border-accent hover:bg-bg-elev-2 hover:-translate-y-px group flex flex-col"
        >
          <div className="mono-label font-semibold text-accent mb-3.5">
            ВАРИАНТ A · ПОЛНЫЙ ПУТЬ
          </div>
          <h2 className="font-serif text-2xl font-medium tracking-tight leading-tight m-0 mb-2">
            Начать с брифа
          </h2>
          <p className="text-[13px] text-fg-dim leading-relaxed m-0 mb-4 flex-1">
            10 вопросов про гипотезу, метрику и MDE. Тул выберет
            подходящий критерий, посчитает sample size и соберёт
            ноутбук под твою конфигурацию.
          </p>
          <div className="mono-label text-fg-faint pt-3.5 border-t border-border-soft flex items-center justify-between">
            <span>~5–10 минут</span>
            <span className="text-accent transition-transform group-hover:translate-x-1">
              →
            </span>
          </div>
        </button>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          className="text-left bg-bg-elev border border-border rounded-[10px] p-7 flex flex-col"
        >
          <div className="mono-label font-semibold text-accent mb-3.5">
            ВАРИАНТ B · ПРОДОЛЖИТЬ
          </div>
          <h2 className="font-serif text-2xl font-medium tracking-tight leading-tight m-0 mb-2">
            У меня уже есть план
          </h2>
          <p className="text-[13px] text-fg-dim leading-relaxed m-0 mb-4">
            Загрузи <code className="bg-bg-elev-2 px-1.5 py-0.5 rounded font-mono text-[11px] text-accent">test_plan.md</code>{' '}
            — попадёшь сразу на конструктор ноутбука, бриф восстановится
            из YAML frontmatter.
          </p>
          <div
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            role="button"
            tabIndex={0}
            className={`border border-dashed rounded-md px-4 py-5 text-center bg-bg-elev-2 text-fg-dim text-xs transition-colors mb-3.5 cursor-pointer hover:bg-bg-elev hover:text-fg ${
              dragOver ? 'border-accent text-accent' : 'border-border'
            }`}
          >
            Перетащи файл сюда{' '}
            <span className="text-accent underline-offset-2 hover:underline">
              или выбери
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            onChange={handleFileInputChange}
            className="hidden"
          />
          {errorMessage && (
            <div
              role="alert"
              className="text-xs text-warn bg-warn-soft border border-warn-border rounded-md px-3 py-2 mb-3.5"
            >
              {errorMessage}
            </div>
          )}
          <div className="mono-label text-fg-faint pt-3.5 border-t border-border-soft">
            YAML FRONTMATTER → STATE.BRIEF
          </div>
        </div>
      </div>

      <div className="mono-label text-fg-faint text-center mt-7">
        ВСЕ ДАННЫЕ ХРАНЯТСЯ ЛОКАЛЬНО НА ВАШЕМ КОМПЬЮТЕРЕ
      </div>
    </div>
  )
}
