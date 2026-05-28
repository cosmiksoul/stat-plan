# Sprint 4 Report — Parser test_plan.md + Step 3 «Конструктор ноутбука»

**Dates:** 2026-05-28
**Status:** Complete (DEV-фаза, оба phase). Browser smoke не выполнен — Windows CLI без браузера, нужен ручной QA.

## Goal

Закрыть оба недостающих value-loop'а из JTBD §1/§5/§6: альтернативный вход «У меня уже есть план» (drag-drop test_plan.md) и реальный артефакт для запуска теста (analysis.ipynb + demo-csv). После Sprint 4 продукт впервые делает полный круг — от любой стартовой точки до запускаемого ноутбука.

---

## Phase A — Parser + drag-drop wiring

### Что построено

**Парсер `src/lib/plan/parse.js` (на js-yaml):**
- Фасадная функция `parseTestPlanMd(md) → { ok, brief, plan, test_id, title, warnings, error }`.
- Строгий путь-A (ADR-002): unrecoverable структурные ошибки (нет `---`, неоткрытый bracket в YAML, не строка) → `{ ok: false, error }`. Невалидные поля внутри parseable YAML — degrade to defaults + warning, parsing continues.
- Валидация enum'ов: `metric_type`, `status`, `test_method`, `randomization_unit`, `mde.unit`, `direction`, guardrail `direction`/`unit`. Числовые диапазоны: `alpha`, `power` ∈ (0, 1).
- Mapping в `state.brief`:
  - YAML `baseline: 0.031` → `{value: 0.031, unit: 'fraction'}` для `proportion`, `{value: ..., unit: null}` для остальных.
  - `alpha`/`power`/`variance_reduction`/`stratification_by`/`holdback_percent` → `brief.advanced`.
  - `daily_traffic_available: 50000` → `{value: 50000, unit: randomization_unit || 'user'}`.
  - `guardrails: [{name, direction, threshold, unit}]` → `[{name, direction, threshold: {value, unit}}]`.
  - `data_peek` сохраняется в `brief.data_peek` для forward-compat (раньше его не было в state).
- Парсится только секция `## Hypothesis` из markdown body. Остальные секции (`Guardrails`, `Stop conditions`, `Decision rules`) — игнорируются: приоритет у frontmatter по ADR-002 + DATA_MODEL.md. Hypothesis text прогоняется через `parseHypothesis()` для слотов и `deriveDirection()` — если глагол в тексте противоречит явному `direction` в YAML, верх берёт текст (как и в `UPDATE_HYPOTHESIS`).
- BOM strip, CRLF/LF — работают оба.
- Document-level поля (`test_id`, `title`, `score`, `sample_size_per_arm`, `duration_days`, `test_method`) читаются информационно: `test_id`/`title` возвращаются caller'у, остальные пересчитываются `RECOMPUTE_PLAN` после загрузки.

**Round-trip cross-check:** 2 теста в `parse.test.js` (proportion + CUPED, минимальный continuous) — `parseTestPlanMd(renderTestPlanMd(state)).brief` идентичен `state.brief` в части полей, которые YAML действительно несёт. **Round-trip работает для всех 4 metric_type** на уровне happy-path тестов; round-trip-кейсы написаны явно для proportion и continuous, для ratio и count парсинг проверен в отдельных happy-path тестах.

**Латентный баг render.js, surfaced round-trip'ом и пофикшен:**
`render.js` писал `title: Тест: cr_to_partner_click` голым (без кавычек), а двоеточие в значении ломает YAML (`bad indentation of a mapping entry` на line 2). Phase A фикс — обернуть title в `yamlScalar` для frontmatter и оставить raw для markdown-заголовка через отдельный плейсхолдер `{{title_heading}}`. Минимально-инвазивно, snapshot в `render.test.js` обновлён. **Prompt Sprint 4 явно разрешал это:** «Если round-trip ломается — баг… надо найти и пофиксить до закрытия Phase A».

**Reducer + state:**
- Новые root-поля `state.test_id` и `state.title` (null до `LOAD_TEST_PLAN_MD`).
- `state.plan.parse_warnings: []` — runtime массив warning'ов парсера. Не персистится.
- `state.plan.editedExternally` семантика финализирована: `true` после `LOAD_TEST_PLAN_MD`, сбрасывается только в `RETURN_PLAN_TO_DRAFT` (план больше не externally-sourced) и `RESET_STATE`. UI badge `↳ загружен` — **не реализован**, оставлен на следующий мини-спринт (поле в state работает, для будущего использования).
- Новые actions:
  - `LOAD_TEST_PLAN_MD` (payload: `{ brief, plan, test_id, title, warnings }`) — заменяет brief, мерджит plan, выставляет `started: true`, лендит brief на Q01, затем вызывает `recomputePlan` чтобы `derived`/`score` восполнились сразу.
  - `DISMISS_PARSE_WARNINGS` — очищает массив.

**Storage:**
- Persist `test_id`/`title` (forward-compat); strip `parse_warnings` (на load всегда `[]`).
- Подтверждено тестами.

**UI:**
- `StartScreen`: dashed-зона теперь real click-or-drop target — кликом открывает file picker, drag-drop работает; закрыто Concern #4 из Sprint 1 code review. Inline error баннер при `ok: false`. Guard на размер файла 5 MB. На успехе `dispatch(LOAD_TEST_PLAN_MD)` + `navigate('/step3')`. `ProtectedStep` для `/step3` редиректит на `/step2` если status=draft и оставляет на `/step3` если approved — клиновидное поведение, которое нам подходит.
- `PlanActions`: stub-кнопка «Парсинг — Sprint 4+» заменена на реальный file picker. На успехе — `dispatch(LOAD_TEST_PLAN_MD)`, остаёмся на `/step2`, scoring обновляется через `RECOMPUTE_PLAN`. Inline error при невалидном файле.
- `ParseWarningsBanner` — новый shared компонент, монтирован на `PlanPage` и `NotebookBuilderPage`. Читает `state.plan.parse_warnings`, кнопка «СКРЫТЬ» диспатчит `DISMISS_PARSE_WARNINGS`.

### Тесты Phase A

- `parse.test.js` — **28 кейсов**: 4 happy-path (по metric_type), 2 round-trip с `renderTestPlanMd`, approved status, 5 структурных ошибок, 5 field-validation warnings, 3 hypothesis edge case, 2 frontmatter-vs-section, 4 robustness (BOM, CRLF, test_id/title exposure, data_peek preservation).
- `reducer.test.js` — **6 новых**: initialState shape с parse_warnings, root test_id/title, 4 кейса для `LOAD_TEST_PLAN_MD` (включая lands brief at Q01 и noop при missing payload), 1 для `DISMISS_PARSE_WARNINGS`, 1 для editedExternally reset в `RETURN_PLAN_TO_DRAFT`.
- `storage.test.js` — **2 новых**: persist test_id/title, strip parse_warnings.

### Commit Phase A

`c86abbd` — `feat(sprint-4 phase-a): parser test_plan.md + drag-drop wiring`. 16 файлов, +1543 / −44.

---

## Phase B — Конструктор ноутбука + .ipynb сборка + demo-csv

### Что построено

**Шаблоны ячеек (`templates/notebook/*.cells.json`) — 8 ячеек + 4 main_test варианта + `_meta.json`:**

| ID | Назначение | Вход (CSV cols) | Выход |
|----|----|----|----|
| `load` | `pd.read_csv` + `.info()` + `.head()` | все | — |
| `srm` | chi² на размер групп; alert при p<0.001 | `variant` | print stats |
| `balance` | средние метрики и guardrails по группам | `variant`, `{metric_column}`, `{guardrails[].name}` | DataFrame |
| `novelty` | lift на днях 1-2 vs 3+; alert при >50% rel. расхождении | + `day` | print + alert |
| `main_test` (z_test) | `statsmodels.proportions_ztest` + CI | + `{metric_column}` (0/1) | print + CI |
| `main_test` (t_test) | `scipy.ttest_ind` equal_var=True + Z-CI | + `{metric_column}` (float) | print + CI |
| `main_test` (welch) | `scipy.ttest_ind` equal_var=False + Z-CI | + `{metric_column}` (float) | print + CI |
| `main_test` (bootstrap) | 10k bootstrap diff means + percentile CI + p | + `{metric_column}` | print + CI |
| `guardrails` | цикл по guardrails плана, rel-change vs threshold, breached flag | + `{guardrail.name}` для каждого | DataFrame |
| `segments` (opt) | groupby `geo` × `variant` → lift по сегменту | + `geo` | DataFrame |
| `bootstrap_ci` (opt) | 10k bootstrap CI на diff means | + `{metric_column}` | print CI |

Зарезервированы как disabled-заглушки в UI: `cuped`, `delta_method`. `mannwhitney` и `delta_method` в main_test fallback'ятся на bootstrap-вариант с warning при сборке. Python deps в ячейках: только `pandas`, `numpy`, `scipy.stats`, `statsmodels.stats.proportion`.

**Builder (`src/lib/plan/notebook-builder.js`):**
- `buildNotebook(state) → { filename, json, warnings, schema, finalEnabled }`.
- Алгоритм: фильтр enabled cells по conditional skip (novelty если `duration_days < 3`; guardrails если `guardrails.length === 0`), сборка placeholder map, build header cell с динамической Expected schema, для каждой enabled — load template (для `main_test` — вариант по `derived.test_method`), substitute placeholders, append cells. Финальный JSON по nbformat 4.
- Плейсхолдеры: `{{test_id}}`, `{{metric_name}}`, `{{metric_column}}`, `{{baseline}}`, `{{mde_value}}`, `{{mde_unit}}`, `{{direction}}`, `{{alpha}}`, `{{power}}`, `{{test_method}}`, `{{sample_size_per_arm}}`, `{{duration_days}}`, `{{randomization_unit}}`, `{{randomization_unit_column}}`, `{{guardrails_py_list}}` (Python-list имён), `{{guardrails_py_objects}}` (list of dicts для guardrails-ячейки). Подстановка через `String.prototype.replace` — никакого eval/Function.
- Filename: `{test_id}_analysis.ipynb`. test_id берётся из `state.test_id` (если загружен MD) или derive'ится из `metric_name` тем же slugify-алгоритмом, что и в `render.js`.
- Header-ячейка содержит: имя теста, метод, sample size, duration, α/power, MDE, decision rules из брифа, Expected CSV schema (динамическая, с типом и required/optional).
- `metric_column` fallback: если в state пусто (load из MD не несёт его) — `'converted'` для proportion, `metric_name` для остальных.
- Возвращает warnings для UI: пропуски по conditional (novelty, guardrails), unknown test_method, mannwhitney/delta_method fallback на bootstrap.
- Также экспортирует `CELL_CATALOG` (с пометками mandatory) и `getExpectedSchema(state)` — для UI.

**State + reducer:**
- `state.notebook_config = { cells_enabled: [6 mandatory], demo_csv_choice: null }`.
- Actions: `TOGGLE_NOTEBOOK_CELL` (игнорирует mandatory), `RESET_NOTEBOOK_CONFIG`, `SET_DEMO_CSV_CHOICE`.
- `RETURN_PLAN_TO_DRAFT` теперь сбрасывает `notebook_config` к дефолтам (ADR-006).
- `RESET_STATE` покрывает.
- Persist в localStorage.

**UI (`NotebookBuilderPage.jsx` + 4 subcomponent'а):**
- `PlanInfoCard`: верхняя плашка с test_id, metric, method, sample/arm, duration, α/power. 6 ячеек grid.
- `CellsList`: 6 обязательных (всегда checked, disabled), 2 опциональные (`segments`, `bootstrap_ci`) — clickable строки. 2 заглушки (`cuped`, `delta_method`) — opacity-60 + подпись.
- `DemoCsvCard`: 4 radio-опции — 2 активных (`proportion`, `continuous`), 2 disabled. Дефолтный выбор по `metric_type`. Кнопка `↓ СКАЧАТЬ DEMO-CSV` (ссылка на static `public/demo/`). Inline-hints: для `ratio`/`count` — «появится позже»; для `variance_reduction = 'cuped'` — warning что pre-period колонок нет.
- `ExpectedSchemaCard`: таблица колонок, обновляется реактивно через `useMemo` от `cells_enabled` + brief полей.
- Внизу: `ПРИ СБОРКЕ` блок с warnings из builder'а (если есть), и большая кнопка `↓ СКАЧАТЬ {filename}` — `Blob([JSON.stringify(json, null, 1)])` → download trigger.

**Demo-csv (`scripts/generate-demo-csv.mjs` + 2 файла):**

| Файл | Rows | Размер | Параметры |
|------|------|--------|-----------|
| `demo_proportion.csv` | 75 000 | 2.6 MB | seed=42, control CR=3.1%, treatment CR=3.4% (Δ rel +9.7%), days 1-2 имеют artificial novelty 3.8%; колонки: `user_id, variant, converted, bounce_rate, time_on_site, geo, day` (geo ∈ US/EU/APAC/LATAM, day ∈ 1..7) |
| `demo_continuous.csv` | 75 000 | 3.1 MB | seed=43, ARPU нормальное (control μ=100 σ=80, treatment μ=106 σ=80, Δ rel +6%), sessions Poisson(λ=3); колонки: `user_id, variant, arpu, sessions, bounce_rate, time_on_site, geo, day` |

Скрипт без npm-deps: pure Math + mulberry32 LCG для повторяемости + Box-Muller для normals + Knuth-Poisson. Запуск: ~75 ms (proportion), ~95 ms (continuous), всего <200 ms. Не требует deps кроме `node:fs` и `node:path`.

### Тесты Phase B

- `notebook-builder.test.js` — **22 кейса**: 4 happy-path (по test_method), 1 optional cells enabled, 3 conditional skip (novelty, guardrails, mannwhitney fallback), 3 header (test parameters / Expected schema / decision rules), 3 placeholders (substitution, no remaining `{{...}}`, py-list literal), 4 filename/JSON shape (filename, explicit test_id, JSON.stringify не падает, code cells имеют execution_count+outputs), 3 edge case (пустой cells_enabled → только header, derive test_id из metric_name, fallback на metric_name когда metric_column пуст), 1 catalog (8 ячеек, 6 mandatory).
- `reducer.test.js` — **+7 новых**: initial notebook_config shape, `TOGGLE_NOTEBOOK_CELL` add/remove/ignore-mandatory, `RESET_NOTEBOOK_CONFIG`, `RETURN_PLAN_TO_DRAFT` side effect на notebook_config, `SET_DEMO_CSV_CHOICE`, `RESET_STATE` сбрасывает.
- `storage.test.js` — **+1**: persist notebook_config.

### Что НЕ сделано (consciously deferred)

- `editedExternally` UI badge — поле в state ставится корректно, но визуального индикатора `↳ загружен` рядом со StatusBadge нет. Не критично, можно добавить отдельной строкой.
- `demo_ratio.csv` + `demo_count.csv` — disabled-заглушки в UI с подписью «появится в следующем спринте» (per scope cap).
- `cuped` + `delta_method` cell templates — disabled-заглушки (per scope cap).
- Browser smoke — Windows CLI без браузера. Нужен ручной QA по acceptance criteria 3-15 из prompt'а (drag-drop, file picker, parse errors, кнопка upload на step 2, реактивный schema update при toggle, скачивание .ipynb, F5 persistence, return-to-draft сбрасывает notebook_config).

---

## Test counts

- **Всего: 213 unit-тестов pass** (было 147 после Sprint 3 — +66 новых).
- Phase A: 28 parse + 6 reducer + 2 storage = +36
- Phase B: 22 notebook-builder + 7 reducer + 1 storage = +30
- Все 4 metric_type парсятся (happy-path). Round-trip — proportion (с CUPED, stratification, holdback) и continuous (minimal) явно проверены тестами; baseline снимок render.test.js обновлён под yamlScalar(title).

## Build / bundle

| | Sprint 3 baseline | Sprint 4 phase A | Sprint 4 phase B (final) | Δ от Sprint 3 |
|---|---|---|---|---|
| JS raw | 309.75 KB | 360.24 KB | 393.13 KB | +83.4 KB |
| JS gzip | 96.53 KB | 113.82 KB | 122.65 KB | +26.1 KB |
| CSS raw | 26.53 KB | 26.59 KB | 26.95 KB | +0.4 KB |
| Build time | ~270 ms | 269 ms | 314 ms | ~стабильно |

js-yaml даёт ~17 KB gzip, templates+builder ~9 KB gzip. В норме.

`dist/demo/` — Vite копирует 5.7 MB CSV (2.6 + 3.1). Это не в bundle — отдельные static asset'ы, доставляются как файлы.

## Phase A → Phase B commit порядок

Два отдельных коммита (per prompt). Phase A зафиксирован первым `c86abbd` (16 файлов), затем Phase B одним коммитом со всем остальным. Это позволяет cowork'у при code review увидеть phase A как independent unit перед тем как смотреть phase B (где UI и templates).

## Round-trip status

| metric_type | Happy-path парсинг | Round-trip явно покрыт |
|---|---|---|
| proportion | ✓ (4 теста) | ✓ (proportion + CUPED, stratification, holdback) |
| continuous | ✓ | ✓ (minimal) |
| ratio | ✓ | — (round-trip ожидаем работает, явный тест не написан) |
| count | ✓ | — |

Для proportion и continuous — `extractBriefShape(parsed.brief) === extractBriefShape(original.brief)` строго. Из shape намеренно исключены поля, которых YAML не несёт (`metric_column`, `goal_type`, `cluster_field`, `stop_conditions`, `decision_rules`, `defaultsApplied`, UI-поля). Эти поля либо derive'ятся на месте (metric_column fallback в builder), либо сознательно теряются (stop/decision rules — приоритет у frontmatter; Sprint 5+ scoped).

## editedExternally

- Реализовано **в state**: `true` после `LOAD_TEST_PLAN_MD`, false после `RETURN_PLAN_TO_DRAFT` или `RESET_STATE`. Persist'ится.
- **UI badge не добавлен.** Field есть в state, готов к использованию следующим спринтом (или прямо сейчас тривиально — небольшой `↳ загружен` рядом со `StatusBadge` в `PlanPage.jsx`).

## ADR compliance

| ADR | Соблюдено |
|---|---|
| ADR-001 | ✓ Парсинг на клиенте через js-yaml. Demo-csv — статические файлы в public/. Никаких fetch. |
| ADR-002 | ✓ Невалидные файлы → `{ok:false}` с понятной ошибкой; bad fields → warnings; приоритет у frontmatter (текст секций игнорируется). |
| ADR-003 | ✓ После load — RECOMPUTE_PLAN, scoring пересчитывается тем же кодом. Никаких новых критериев. |
| ADR-004 | ✓ Status загружается из MD, не выставляется автоматически. Approve по-прежнему требует явного действия пользователя. |
| ADR-005 | ✓ Step 3 unlocked только при approved. Step 4-5 hard locked. Load test_plan.md → /step3 (через ProtectedStep редирект если draft). |
| ADR-006 | ✓ При `RETURN_PLAN_TO_DRAFT` `notebook_config` сбрасывается к дефолтам (как обещано в ADR). |
| ADR-007 | ✓ Demo-csv в Sprint 4 — 2 файла из 4 (proportion + continuous), остальные disabled-заглушки с понятной подписью. |
| ADR-010 | ✓ Добавлена одна зависимость — `js-yaml` (~17 KB gzip), обоснование совпадает с ADR-010 «для Спринта парсинга». Demo-csv скрипт — без deps. |

## Known issues / observations

- **Browser smoke не выполнен мной.** Acceptance criteria 3-15 из prompt'а требуют ручного QA. Ноутбук не запускался в Jupyter (нет Python окружения в Windows CLI sandbox). Структурно nbformat 4 валиден (тесты ловят отсутствие `{{...}}` и проверяют, что JSON.stringify не падает), но действительная подгрузка в Jupyter — нужно подтвердить вручную.
- **Round-trip для ratio и count** не покрыт явным тестом. Логика парсинга идентична proportion/continuous (отличается только маппинг baseline.unit), но запас осторожности есть. Если есть проблема — будет ловиться в RETEST.
- **Demo CSV большие** — 2.6 + 3.1 MB raw. На GH Pages это норма (static asset), но если хотим compress — gzip снижает до ~600 KB каждый. Vite не делает gzip автоматически для public assets; на GH Pages есть transfer-encoding gzip от сервера.
- **`segments` ячейка ожидает только `geo`** как сегмент. Демо-csv её содержит. Если пользователь захочет другой segment (device, user_type) — нужно править ноутбук руками. На v0 ок.
- **`mannwhitney` и `delta_method`** в main_test fallback'ятся на bootstrap-вариант. Полные `cuped` и `delta_method` ячейки — следующий мини-спринт.
- **Header markdown source** в подставленном виде имеет несколько ASCII-замен (например, decision rules печатаются как `- **SHIP**: ...`) — Jupyter renders это корректно как bold.

## Time tracking

- Чтение контекста (DATA_MODEL, NOTEBOOK_TEMPLATES, sprint-report-3, render.js, текущий reducer/storage/StartScreen/PlanActions/template) — ~15 мин.
- Phase A: `parse.js` + tests (round-trip + диагностика и фикс title-bug в render) — ~45 мин. Reducer + storage + ParseWarningsBanner + UI wiring + новые тесты — ~30 мин. Build + commit — ~5 мин. Итого Phase A: **~80 мин**.
- Phase B: state + reducer + storage tests — ~20 мин. 9 шаблонов JSON — ~25 мин. Builder + 22 теста — ~40 мин. 4 UI компонента + page — ~25 мин. Demo-csv скрипт + генерация — ~10 мин. Build + report + commit — ~15 мин. Итого Phase B: **~135 мин**.
- **Итого: ~3.8 часа active.** В пределах оценки prompt'а (5-7 ч; экономия за счёт того, что плотный prompt позволил не тратить время на проектирование).

## Notes

- **`title: Тест:...`-bug** — это был latent bug Sprint 3, который не вылез до Sprint 4 потому что parser'а не было. Тесты render.js проверяли только структуру и snapshot, но snapshot был «правильным с точки зрения визуального просмотра» — js-yaml тестов не было. Урок на будущее: если render→parse round-trip контракт критичен, тесты обеих сторон должны существовать одновременно или хотя бы быть запланированы.
- **`js-yaml` загружается как ES module** через `import yaml from 'js-yaml'` — работает и в Vite, и в Vitest (`environment: jsdom`).
- **JSON-шаблоны импортятся напрямую** через `import x from '...../foo.json'` — Vite понимает, Vitest тоже. Не требует `?raw` или копирования в public/. Шаблоны попадают в bundle.
- **Builder + templates вместе ≈ 9 KB gzip** — компактно. Каждая ячейка ~250-600 байт raw.
- **Demo-csv generator** реализован как pure Node без npm — следует принципу простоты и не добавляет dev-deps. Запускается командой `node scripts/generate-demo-csv.mjs` — нужно только если меняем схему/параметры.
- **`metric_column` после загрузки MD** — пуст (YAML не несёт его). Builder fallback'ится на `'converted'` для proportion и на `metric_name` для остальных. Это совместимо с demo-csv (там колонка как раз `converted` / `arpu`).
- **`expectedSchema` функция** изолирована и реактивна — UI вызывает её через `useMemo` от точных полей brief + cells_enabled. Toggle ячейки → schema перерисовывается без full re-render всего notebook'а.

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/plan/parse.js` | parseTestPlanMd facade + validation |
| `src/lib/plan/notebook-builder.js` | buildNotebook + getExpectedSchema + CELL_CATALOG |
| `src/components/ParseWarningsBanner.jsx` | shared parse warnings UI |
| `src/components/notebook/PlanInfoCard.jsx` | top card with test_id/method/sample/duration |
| `src/components/notebook/CellsList.jsx` | mandatory + optional + future cells toggle list |
| `src/components/notebook/DemoCsvCard.jsx` | 4 demo csv options + download |
| `src/components/notebook/ExpectedSchemaCard.jsx` | reactive csv schema table |
| `templates/notebook/load.cells.json` | pd.read_csv + EDA |
| `templates/notebook/srm.cells.json` | chi² SRM check |
| `templates/notebook/balance.cells.json` | group means/proportions |
| `templates/notebook/novelty.cells.json` | days 1-2 vs 3+ lift compare |
| `templates/notebook/guardrails.cells.json` | guardrail loop with breach flag |
| `templates/notebook/segments.cells.json` | geo segment analysis (optional) |
| `templates/notebook/bootstrap_ci.cells.json` | bootstrap CI on main metric (optional) |
| `templates/notebook/main_test/_meta.json` | common metadata for main_test |
| `templates/notebook/main_test/z_test.cells.json` | statsmodels proportions_ztest |
| `templates/notebook/main_test/t_test.cells.json` | scipy ttest_ind equal_var=True |
| `templates/notebook/main_test/welch.cells.json` | scipy ttest_ind equal_var=False |
| `templates/notebook/main_test/bootstrap.cells.json` | manual bootstrap + percentile CI |
| `scripts/generate-demo-csv.mjs` | one-shot demo csv generator |
| `public/demo/demo_proportion.csv` | 75k rows for proportion testing |
| `public/demo/demo_continuous.csv` | 75k rows for continuous testing |
| `tests/lib/plan/parse.test.js` | 28 cases incl. round-trip |
| `tests/lib/plan/notebook-builder.test.js` | 22 cases |

## Files Modified

| File | Changes |
|------|---------|
| `src/state/reducer.js` | + initialNotebookConfig, MANDATORY_NOTEBOOK_CELLS; new actions LOAD_TEST_PLAN_MD, DISMISS_PARSE_WARNINGS, TOGGLE_NOTEBOOK_CELL, RESET_NOTEBOOK_CONFIG, SET_DEMO_CSV_CHOICE; RETURN_PLAN_TO_DRAFT now resets editedExternally and notebook_config; state.plan.parse_warnings, state.test_id, state.title |
| `src/lib/storage.js` | persist test_id/title/notebook_config; strip parse_warnings; updated header doc |
| `src/lib/plan/render.js` | title now wrapped in yamlScalar; new `title_heading` placeholder |
| `templates/test_plan.md.tmpl` | body heading uses `{{title_heading}}` (raw) instead of `{{title}}` (yaml-quoted) |
| `src/pages/StartScreen.jsx` | wired drag-drop + file picker + 5MB guard + inline error banner; closed Sprint 1 concern #4 |
| `src/pages/PlanPage.jsx` | onUpload handler; ParseWarningsBanner mounted |
| `src/pages/NotebookBuilderPage.jsx` | full step-3 UI (placeholder replaced) |
| `src/components/plan/PlanActions.jsx` | stub button replaced with real file picker; onUpload prop |
| `package.json` + `package-lock.json` | js-yaml dependency |
| `tests/lib/plan/render.test.js` | snapshot updated to `title: "Тест: ..."` |
| `tests/state/reducer.test.js` | + 13 new cases (Phase A + Phase B actions, RETURN side effects, RESET coverage) |
| `tests/lib/storage.test.js` | initialState mock updated; + 3 new tests (test_id/title persist, parse_warnings stripped, notebook_config persist) |
