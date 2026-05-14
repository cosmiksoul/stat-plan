# Architecture

## Деплой

GitHub Pages, источник = **GitHub Actions**. Push в `main` → workflow: `npm install` → `npm test` → `vite build` → upload `dist/` → deploy. Конфиг — `.github/workflows/deploy.yml`. См. ADR-010.

В Settings → Pages источник должен быть выставлен как «GitHub Actions», не «Deploy from a branch».

Все операции — на клиенте. Никакого бэкенда, баз, авторизации (ADR-001).

## Стек

См. ADR-010 для обоснования. Версии библиотек — последние стабильные на момент `npm install`, фиксируются в `package-lock.json`.

| Слой | Решение | Когда подключается |
|------|---------|---------------------|
| UI runtime | React 19 | Sprint 1 |
| Bundler / dev server | Vite (последняя стабильная) | Sprint 1 |
| Стили | Tailwind (последняя стабильная) | Sprint 1 |
| Роутинг | `react-router-dom` v7 с `HashRouter` | Sprint 1 (HashRouter обязателен для GitHub Pages — нет server-side fallback) |
| Тесты | Vitest | По мере появления math/parse-кода |
| State | `useReducer` + Context (без сторонних state-менеджеров) | По мере появления state между шагами |
| Персистентность сессии | localStorage | Отдельный спринт |
| Парсинг md / YAML | [js-yaml](https://github.com/nodeca/js-yaml) + кастомный парсер секций | Спринт парсинга `test_plan.md` |
| Парсинг csv | [papaparse](https://www.papaparse.com/) | Спринт data peek / анализа |
| Статистика на клиенте | [simple-statistics](https://simplestatistics.org/) или собственный модуль | Спринт sample size / scoring |
| Визуализация | recharts (как в `retention-calculator`) | Спринт анализа |
| Экспорт PNG | `html-to-image` | Спринт экспорта |
| Экспорт PDF | `html2pdf` или `jspdf` | Спринт экспорта |
| Сборка zip | [JSZip](https://stuk.github.io/jszip/) | Спринт read-out |

**Правило подключения зависимостей:** каждая новая зависимость добавляется в фазе PLAN конкретного спринта с осознанным решением (не «накапливать на будущее»). См. ADR-010.

**Pyodide рассматривался и отвергнут.** Тащить ~10MB рантайма ради scipy-функций — оверкилл, когда формулы можно посчитать самостоятельно. См. ADR-009.

## Структура проекта

```
stat_plan/
├── .github/
│   └── workflows/
│       └── deploy.yml          # npm install → test → build → deploy на Pages
├── public/                     # копируется в dist/ как есть
│   └── demo/                   # demo_proportion.csv и т.д. (когда появятся)
├── src/
│   ├── main.jsx                # точка входа, монтирует <App /> в #root
│   ├── App.jsx                 # HashRouter + layout (Header, Stepper)
│   ├── components/             # переиспользуемые UI-компоненты
│   │   ├── Header.jsx
│   │   ├── Stepper.jsx
│   │   └── ...
│   ├── pages/                  # компоненты-страницы под каждый шаг флоу
│   │   ├── StartScreen.jsx
│   │   ├── BriefPage.jsx
│   │   ├── PlanPage.jsx
│   │   ├── NotebookBuilderPage.jsx
│   │   ├── AnalysisPage.jsx
│   │   └── ReadoutPage.jsx
│   ├── lib/                    # чистая логика, без зависимости от React
│   │   ├── brief/              # дерево вопросов, валидаторы, data-peek
│   │   ├── plan/               # генерация md, парсинг, scoring, notebook-builder
│   │   ├── analysis/           # пересчёт, сравнение, csv-utils
│   │   └── readout/            # render, zip-builder
│   ├── state/
│   │   ├── AppStateContext.jsx # Context provider
│   │   └── reducer.js          # reducer + types
│   └── styles/
│       └── index.css           # Tailwind directives + глобальные стили
├── tests/                      # Vitest. Зеркалит структуру src/lib/
│   └── lib/
│       └── ...
├── templates/                  # шаблоны контента (md, .ipynb-ячейки) — статика
│   ├── test_plan.md.tmpl
│   ├── readout.md.tmpl
│   └── notebook/
│       └── ...
├── mockups/                    # визуальные референсы (не код)
├── docs/                       # проектная документация (этот файл и др.)
├── index.html                  # Vite entry, <div id="root"></div>
├── vite.config.js              # base: '/stat-plan/' (под GitHub Pages)
├── tailwind.config.js          # либо @config в src/styles/index.css если Tailwind v4
├── postcss.config.js           # если Tailwind v3
├── package.json
├── package-lock.json
├── vitest.config.js            # или внутри vite.config.js
├── .gitignore
├── CLAUDE.md
└── README.md
```

**Принципы организации:**

- **`src/lib/` — без зависимости от React.** Только чистые функции и классы. Это упрощает unit-тестирование и потенциально позволяет переиспользовать логику в node-скриптах.
- **`src/components/` vs `src/pages/`** — `pages/` это то, что монтируется как роут, `components/` это переиспользуемые куски. Делим по принципу «один раз использовалось = pages, два-три раза = components».
- **`templates/` — статика, не код.** Файлы вида `test_plan.md.tmpl` с плейсхолдерами `{{...}}`. Подставляются на лету в `src/lib/plan/render.js`.
- **`public/` — копируется в `dist/` один-в-один.** Сюда кладутся ассеты, доступные по абсолютному пути (favicon, demo-csv).

## Состояние приложения

Одна JS-структура (схема ниже), которая живёт в React-state через `useReducer` + Context (`src/state/AppStateContext.jsx`). Опционально мирорится в `localStorage` для восстановления между перезагрузками вкладки (отдельная задача).

Все мутации — через `dispatch` с типизированными actions; никакого прямого изменения объекта компонентами. Структура:

```javascript
{
  test_id: "bm-main-cta-v2",
  created: "2026-05-12",
  brief: {
    goal_type: "ux",
    metric_type: "proportion",
    baseline: 0.031,
    randomization_unit: "user",
    mde: { value: 8, unit: "relative_percent" },
    daily_traffic: 42000,
    hypothesis: {
      raw: "Если показать новый блок...",
      slots: { change: true, metric: true, direction_magnitude: true, mechanism: true }
    },
    guardrails: [
      { name: "bounce_rate", direction: "max", threshold: 5, unit: "relative_percent" },
      { name: "time_on_site", direction: "min", threshold: -10, unit: "relative_percent" }
    ],
    stop_conditions: [...],
    decision_rules: { ship: "...", iterate: "...", kill: "..." },
    data_peek: {
      uploaded: true,
      filename: "historical.csv",
      computed_baseline: 0.031,
      distribution_check: "ok"
    }
  },
  plan: {
    derived: {
      test_method: "z_test_proportions",
      sample_size_per_arm: 38400,
      duration_days: 5
    },
    score: { total: 78, breakdown: {...} },
    edited_externally: false  // true если пользователь загрузил отредактированный md
  },
  notebook_config: {
    cells_enabled: ["load", "srm", "balance", "novelty", "main_test", "guardrails"],
    cells_optional: ["segments", "bootstrap_ci", "cuped"]
  },
  results: {
    uploaded: false,
    csv_filename: null,
    user_provided_stats: null,    // что было в ноутбуке (если пользователь ввёл)
    recalculated_stats: null,     // что мы пересчитали
    mismatches: []
  }
}
```

## Поток данных между шагами

```
[Бриф]
  пользователь отвечает на вопросы
  опционально загружает historical.csv → парсим в браузере → корректируем baseline
  → state.brief заполняется
  → генерируется brief.md (опционально)

[Тест-план]
  на основе state.brief → derived поля (sample size, метод)
  → рендерим test_plan.md из шаблона
  → запускаем scoring → state.plan.score
  
  если пользователь загружает отредактированный test_plan.md:
    парсим YAML frontmatter + секции
    обновляем state.brief и state.plan
    пересчитываем score
  
  конструктор ноутбука: пользователь тоглит ячейки → state.notebook_config
  → собираем .ipynb из шаблонных JSON-ячеек → скачивание

[Анализ]
  пользователь загружает experiment_results.csv
  парсим, считаем независимо: CR по группам, Δ, CI, p, SRM
  опционально пользователь вводит цифры из своего ноутбука для сравнения
  рендерим таблицу сравнения и визуализации
  → state.results
  
  экспорт: PNG графика, PDF отчёт, validation.md

[Read-out]
  собираем все артефакты в zip
  рендерим readout.md из шаблона с TL;DR и follow-up
  кнопка «скачать всё»
```

## Связность артефактов

Все md-файлы используют общий `test_id` в YAML frontmatter. Это позволяет:
- При загрузке `test_plan.md` на странице анализа проверить, что это правильный план
- В zip-пакете все файлы логически связаны одним id
- Пользователь может коммитить артефакты в свой git и они легко группируются

## Ограничения, о которых надо помнить

- **Размер csv в браузере.** Парсить 100MB файлов на клиенте — не очень. Ставим лимит 50MB и предупреждаем пользователя.
- **Точность статистики в JS.** Для большинства задач simple-statistics достаточно, но для bootstrap-CI на больших выборках лучше отправлять в ноутбук.
- **localStorage квота** — 5-10MB, csv туда не пихаем, только `state.brief` и `state.plan`.
- **Base path GitHub Pages.** Сайт публикуется по `https://<user>.github.io/stat-plan/`. В `vite.config.js` обязателен `base: '/stat-plan/'`, иначе пути к ассетам в собранном `dist/` будут вести на root и ломаться на Pages. Локально через `npm run dev` Vite учитывает base автоматически.
- **HashRouter, не BrowserRouter.** GitHub Pages не делает server-side fallback на `index.html` для произвольных URL — поэтому используется hash-routing. URLы вида `https://<user>.github.io/stat-plan/#/step1`.
