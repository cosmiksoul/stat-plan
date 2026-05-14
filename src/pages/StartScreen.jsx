import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../state/AppStateContext.jsx'
import { Actions } from '../state/reducer.js'

export default function StartScreen() {
  const { dispatch } = useAppState()
  const navigate = useNavigate()
  const [dropMessage, setDropMessage] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  function handleStartBrief() {
    dispatch({ type: Actions.START_BRIEF })
    navigate('/step1')
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setDropMessage(
        `Получен «${file.name}». Парсинг загруженного плана будет реализован в Sprint 2/3. Пока используй «Начать с брифа».`,
      )
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  return (
    <div>
      <section className="text-center pt-8 pb-8">
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] m-0 mb-3">
          Тест-план без сюрпризов
        </h1>
        <p className="text-base text-fg-dim max-w-[580px] mx-auto leading-relaxed m-0">
          Пройди бриф, получи методологически проверенный план A/B-теста
          и готовый Jupyter-ноутбук для анализа. Без серверов и регистрации.
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
            className={`border border-dashed rounded-md px-4 py-5 text-center bg-bg-elev-2 text-fg-dim text-xs transition-colors mb-3.5 ${
              dragOver ? 'border-accent text-accent' : 'border-border'
            }`}
          >
            Перетащи файл сюда
          </div>
          {dropMessage && (
            <div
              role="status"
              className="text-xs text-warn bg-[rgba(255,184,102,0.08)] border border-[rgba(255,184,102,0.25)] rounded-md px-3 py-2 mb-3.5"
            >
              {dropMessage}
            </div>
          )}
          <div className="mono-label text-fg-faint pt-3.5 border-t border-border-soft">
            ПАРСИНГ — SPRINT 2/3
          </div>
        </div>
      </div>

      <div className="mono-label text-fg-faint text-center mt-7">
        ВСЁ ХРАНИТСЯ ЛОКАЛЬНО · NO BACKEND
      </div>
    </div>
  )
}
