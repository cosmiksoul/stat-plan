# Sprint 8 FIX iter 1 — Report (Code)

**Дата:** 2026-05-31
**Источник:** `docs/project/sprints/sprint-8-fix-prompt.md` (F-1..F-6, browser smoke пользователя)
**Тип:** Code FIX, одна фаза. Чисто UI/routing.
**Результат:** 6/6 правок сделаны. `npm test` 467/467 ✓, `npm run build` чистый.

---

## Trace-ability F-1..F-6

### F-1 — кликабельный логотип → `/`
`src/components/Header.jsx`: добавил `Link` в импорт `react-router-dom`. Логотип-блок `<div className="flex items-baseline gap-3">` → `<Link to="/" className="flex items-baseline gap-3 hover:opacity-80 transition-opacity">`. Navigation, не reset — state нетронут (как и просили в edge-case).

### F-2 — rename CRO Эксперт → AI-компаньон
`Header.jsx`: label `↗ CRO Эксперт` → `↗ AI-компаньон`; title → «AI-компаньон по A/B методологии (внешний NotebookLM)». URL без изменений. Стиль ссылки (`text-tour border-tour hover:bg-tour-soft`) не трогал.

### F-3 — `/tutorial`+`/methodology` → `/docs` (index + 3 sub-routes)
**Решение: recreate, не rename** (чище именование + shared-header pattern проще задать с нуля).

- **NEW** `src/pages/DocsIndexPage.jsx` — index с 3 Link-cards (`🚀 С чего начать`, `📖 Туториалы`, `📘 Методология`), hover `border-accent`/`bg-bg-elev-2`.
- **NEW** `src/pages/DocsStartPage.jsx` — shared-header (`← К документации`) + обзор флоу из 4 шагов (placeholder; Cowork инлайнит `outputs/docs-start-content.md`).
- **NEW** `src/pages/DocsTutorialPage.jsx` — контент бывшего TutorialPage, cross-ref на `docs/project/sprints/e2e-scenarios-sprint-7.md`, header `← К документации`.
- **NEW** `src/pages/DocsMethodologyPage.jsx` — контент бывшего MethodologyPage, header `← К документации`.
- **DELETE** `src/pages/TutorialPage.jsx`, `src/pages/MethodologyPage.jsx`.
- `src/App.jsx`: импорты+routes `/tutorial`,`/methodology` → 4 eager-импорта Docs* + routes `/docs`, `/docs/start`, `/docs/tutorial`, `/docs/methodology` (вне ProtectedStep).
- `Header.jsx`: 2 NavLink → 1 `<NavLink to="/docs">📖 Документация</NavLink>` (класс `NAV_LINK`). NavLink сам ставит `active` на `/docs*`.

### F-4 — `↺ НАЧАТЬ СНАЧАЛА` → amber reset
`Header.jsx`: className restart-кнопки → `mono-label text-warn border border-warn rounded-md px-3.5 py-1.5 hover:bg-warn-soft transition-colors cursor-pointer`. **Reuse существующих `--color-warn*` токенов** (Sprint 2 closure) — новых не вводил. Логика/ConfirmDialog без изменений.

### F-5 — `↺ НОВЫЙ ТЕСТ` → в footer
`src/pages/ValidationReportPage.jsx`: удалил inline-секцию «Готов начать следующий тест?» (была между section 6 и footer). Добавил в `StepFooter` slot `secondary` = amber-кнопка `↺ НОВЫЙ ТЕСТ` (`text-warn border border-warn hover:bg-warn-soft`), `onClick={() => setShowRestart(true)}`. `handleFullRestart`/`showRestart`/ConfirmDialog уже были на месте — не дублировал.

### F-6 — footer button design pattern
- **F-6a token:** `src/styles/index.css` `@theme` — добавил `--color-download: #60a5fa;` + `--color-download-hover: #93c5fd;`. **Новый token, не reuse `--color-tour`** — чтобы AI-компаньон (border-only blue) и download (filled blue) были семантически раздельны; стиль AI-компаньона не затронут. Download-кнопки используют `bg-download text-bg ... hover:opacity-90` (консистентно с accent-кнопками; `--color-download-hover` добавлен по спецификации, но hover решён через opacity для единообразия со всеми filled-кнопками проекта).
- **F-6b /step2** `src/components/plan/PlanActions.jsx`: `↓ СКАЧАТЬ TEST_PLAN.MD` → `bg-download text-bg`. (Кнопка реально в PlanActions.jsx, не в PlanPage.jsx.) «Загрузить отредактированный» и «Вернуть в черновик» (amber) — не трогал.
- **F-6b /step3** `src/pages/NotebookBuilderPage.jsx`: **swap slots** — `secondary` = download `↓ СКАЧАТЬ {filename}` (`bg-download text-bg`), `primary` = `К ВАЛИДАЦИИ →` (`bg-accent text-bg`). Итог слева-направо: `← К плану · ↓ Скачать ipynb (blue) · К валидации → (green)`.
- **F-6b /step4** `src/components/results/ExportButtons.jsx`: все 3 кнопки (html/md/zip) → `bg-download text-bg`. `ValidationReportPage.jsx` footer ZIP primary → `bg-download text-bg`.
- **F-6c** `src/components/layout/StepFooter.jsx`: **изменений нет** — slot-порядок уже корректен (`back · secondary · flex-1 · primary` = left / center / right). Подтверждено Read.

---

## Files

**NEW (4):** `src/pages/DocsIndexPage.jsx`, `DocsStartPage.jsx`, `DocsTutorialPage.jsx`, `DocsMethodologyPage.jsx`
**DELETE (2):** `src/pages/TutorialPage.jsx`, `src/pages/MethodologyPage.jsx`
**Modify (7):** `src/App.jsx`, `src/components/Header.jsx`, `src/pages/NotebookBuilderPage.jsx`, `src/pages/ValidationReportPage.jsx`, `src/components/plan/PlanActions.jsx`, `src/components/results/ExportButtons.jsx`, `src/styles/index.css`
**НЕ трогал:** StepFooter.jsx, Banner.jsx, decision-rules/effective/templates, PlanActions «вернуть в черновик».

## Verification

- `npm test` → **467 passed (27 files)**. Tests delta **0** (UI/routing без unit-тестов, как в acceptance §1). Ни один тест не импортировал удалённые страницы.
- `npm run build` → чистый. 693 модуля (было 691: +4 новых page − 2 удалённых). Initial bundle `index.js` gzip **136.45 KB** (было 135.61 KB → **+0.84 KB**, < +2 KB target). CSS gzip 6.48 KB.
- Browser smoke — на стороне пользователя (acceptance §3).

## Time tracking

~1 ч active (правки механические, спецификация исчерпывающая).

## Для Cowork (CLOSE)

- F-3 architecture: onboarding теперь `/docs` (index + start/tutorial/methodology sub-routes). JTBD §1 / CONTEXT / PROJECT_STATUS обновить под новую docs-структуру (вместо tutorial+methodology в Sprint 8 main).
- `/docs/start` — placeholder-контент готов к замене на `outputs/docs-start-content.md` (Cowork). Точка вставки — блок `bg-bg-elev` в `DocsStartPage.jsx`.
- F-6 — новый design-token `--color-download` зафиксирован в `index.css`. Если нужен ADR/правило в CLAUDE.md про button-pattern (forward=green / download=blue / reset=amber / back=link) — это Cowork-зона.
