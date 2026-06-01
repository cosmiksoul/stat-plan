# Sprint 7 — Code-отчёт

> Источник прицеливания: чат-prompt от Cowork «Sprint 7 — Шаг 4 «Валидация и отчёт» + ipynb upload primary flow + Stepper structural rewrite» от 2026-05-30. План — `~/.claude/plans/breezy-petting-clover.md` (после Phase 1+2 разведки, перезаписан с нуля под Sprint 7, одобрен через ExitPlanMode).

## Scope (13 пунктов спека) → traceability

| Spec | Что закрыто | Файлы / строки |
|---|---|---|
| **S1** | `parseIpynb(text)` → `{ ok, results, images, warnings, error }`. Tagged cell `stat-plan-results` (stream / execute_result / application/json), backward-compat fallback, MAX_BYTES 50 MB, validation REQUIRED_FIELDS, native JSON.parse — без новых deps | NEW `src/lib/results/ipynb.js` |
| **S2** | `srmCheck` (chi² df=1 через lower incomplete gamma + Lanczos gammaLn) и `sanityCheck` (total_n match 10% tolerance, direction sign vs MDE) | NEW `src/lib/results/checks.js` |
| **S3** | `parseDecisionRule` / `evaluateRule` / `evaluateAllRules` / `recommendNextStep`. Regex tolerates `if X op Y then ACTION`, синонимы операторов, case-insensitive, negative thresholds | NEW `src/lib/results/decision-rules.js` |
| **S4** | ValidationReportPage (8-секционный layout) + 6 sub-components | NEW `src/pages/ValidationReportPage.jsx`, `src/components/results/{IpynbUpload,ResultsForm,ChecksBlock,DecisionRulesBlock,ImagesGallery,ExportButtons}.jsx` |
| **S5** | `buildReportHtml(state)` — self-contained HTML5 с inline CSS (тёмная палитра под stat·plan), embed PNG как `data:image/png;base64,...`, HTML escape всех user inputs | NEW `src/lib/results/report-html.js` |
| **S6** | `buildReadoutMd(state)` — markdown с YAML frontmatter (`decision: ""` всегда пустое — ADR-004) | NEW `src/lib/results/readout-md.js` |
| **S7** | `buildZip(state)` через **динамический** `await import('jszip')`. `buildFileMap` экспонирована для тестируемости без jszip | NEW `src/lib/results/zip.js` |
| **S8** | `state.results` top-level branch + 7 actions (UPLOAD_IPYNB, SET_RESULTS_SOURCE_MANUAL, SET_RESULTS_FIELD, TOGGLE_RULE_CHECK, SET_USER_DECISION, RESET_RESULTS, SET_SCHEMA_OVERRIDE) + полный persist в localStorage (включая base64 PNG — по согласованию с пользователем) | `src/state/reducer.js:108-200, 363-451`, `src/lib/storage.js:30-117` |
| **S9** | Stepper 5→4 шага, `grid-cols-5` → `grid-cols-4`, `isStepUnlocked` case 4 = `planStatus === 'approved'`. Step 5 «Скачать артефакты» удалён | `src/components/Stepper.jsx:3-25`, `src/App.jsx:11-22, 60-75` |
| **S10** | Шаблон `export.cells.json` (всегда-on tagged `stat-plan-results`), `plt.rcParams` в load-cell (тёмная палитра под HTML отчёт), canonical bindings (`control_n`/`treatment_n`/`p_value`/`ci_lower`/`ci_upper`/`delta_rel`/`srm_pvalue`/`novelty_flag`/`guardrail_results`) во всех затронутых cell-шаблонах | NEW `templates/notebook/export.cells.json`, edits в `templates/notebook/{load,srm,novelty,segments,guardrails}.cells.json` + 4 main_test variants |
| **S11** | Editable expected schema на Шаге 3: per-row rename input + type select + reset button. State `notebook_config.schema_overrides`, shape `{ [origColName]: { rename?, type? } }`. Apply в `notebook-builder.js`: deriveMetricColumn / randomization_unit_column / guardrails / day_column / geo_column через `resolveCol` | `src/components/notebook/ExpectedSchemaCard.jsx` (rewrite), `src/lib/plan/notebook-builder.js:65-179` |
| **S12** | DATA_MODEL.md — **не трогаем** в Code-фазе, Cowork делает в CLOSE | — |
| **S13** | Secondary CTA «У меня есть выполненный ноутбук →» в approved-баннере PlanPage | `src/pages/PlanPage.jsx:78-95` |

### Decisions, принятые на этапе планирования (через AskUserQuestion)

| # | Что | Решение |
|---|---|---|
| D1 | `state.results` — top-level branch или внутри brief? | **Top-level** (per спека S8, логически результаты ≠ часть планирования) |
| D2 | Persist images (base64 PNG) в localStorage? | **Да, всё**. Один ноутбук ≈ 200-500 KB ≈ 5-11% от лимита 5 MB. RESET_RESULTS / кнопка «Начать сначала» для очистки |
| D3 | Lazy-load /step4 vs eager? | **Lazy** (`React.lazy` + `Suspense`). Паттерн уже в проекте после Sprint 6 (DataPeekHistogram) |
| D4 | jszip — initial bundle или динамический import? | **Динамический** `await import('jszip')` при клике «Скачать zip» (как `papaparse` в Sprint 6) |
| D5 | schema_overrides shape — flat map или per-column object? | **Per-column** `{ [origName]: { rename?, type? } }`. Компактнее чем 3 параллельные мапы. `enabled` toggle skipped — уже покрыт `cells_enabled` |
| D6 | Декорация cell-шаблонов — defensive `globals().get(...)` в export-cell или explicit canonical bindings в каждом cell-templates? | **Гибрид**: explicit canonical bindings в каждом cell-шаблоне (load/srm/novelty/guardrails/4 main_test) + export-cell всё равно использует `globals().get(...)` как safety net. Discoverable + tolerant |
| D7 | brief.decision_rules shape — array of strings (как в спеке S3) или `{ship, iterate, kill}` labelled trio? | **Trio** — это уже существующий контракт в `initialBrief`. evaluateAllRules адаптирован: action = field.toUpperCase(), value = условие |

## Метрики

### Тесты
- **Baseline после Sprint 6 FIX iter 2:** 335 pass / 21 file.
- **После Sprint 7:** **422 pass / 25 file** (+87 net).
  - **+10** `tests/lib/results/ipynb.test.js` (happy paths × 4: tagged stream/execute_result/application_json/array source; fallback × 3; errors × 4; image edge cases × 1)
  - **+9** `tests/lib/results/checks.test.js` (srmCheck × 5: balanced/mild/severe/zero/missing; sanityCheck × 6: total_n match/mismatch, direction match/mismatch, direction=any, missing)
  - **+17** `tests/lib/results/decision-rules.test.js` (parseDecisionRule × 8 синтаксов, evaluateRule × 5 случаев, evaluateAllRules × 2, recommendNextStep × 3)
  - **+7** `tests/lib/results/report-html.test.js` (sections, PNG embed, user_decision, manual flow, overrides supersede raw, HTML escape)
  - **+5** `tests/lib/results/readout-md.test.js` (frontmatter, sections, rules non-empty, rules empty, override priority)
  - **+7** `tests/lib/results/zip.test.js` (buildFileMap × 5, buildZipFileName × 2)
  - **+10** `tests/state/reducer.test.js` (initialState.results, 6 actions, SET_SCHEMA_OVERRIDE merge / no-op / default)
  - **+3** `tests/lib/storage.test.js` (results round-trip, schema_overrides round-trip, legacy session)
  - **+13** `tests/lib/plan/notebook-builder.test.js` (export-cell tagged × 2, main_test canonical bindings × 1, srm_pvalue rename × 1, guardrail_results rename × 1, novelty_flag × 1, plt.rcParams × 2, schema_overrides × 6)
  - **+1** обновлён existing test «no enabled cells» — теперь `3 cells` (header + export markdown + export code) вместо `1` (export-cell всегда-on per ADR-015)

### Round-trip 6/6 ✓
Sprint 6 canonical cases без изменений — Шаг 4 ортогонален `data_peek`. Round-trip парсер/рендер не задеты.

### Сборка

**До Sprint 7 (Sprint 6 FIX iter 2 baseline):**
- `index.js` (initial): 420.66 KB raw / **~131 KB gzip**
- `DataPeekHistogram` (lazy): 365.13 KB / 98 KB gzip
- `csv` (lazy): 24.34 KB / 9.07 KB gzip

**После Sprint 7:**
- `index.js` (initial): **430.08 KB raw / 132.54 KB gzip** → **+9.42 KB raw / +1.4 KB gzip**
- `ValidationReportPage` (lazy, /step4): **16.88 KB / 5.55 KB gzip**
- `ipynb` parser (lazy, на drag-drop ipynb): 2.58 KB / 1.16 KB gzip
- `zip` wrapper (lazy, на клик «Скачать zip»): 1.04 KB / 0.60 KB gzip
- `readout-md` chunk (lazy, sub-deps от zip): 11.60 KB / 4.42 KB gzip
- `jszip.min` (lazy, при первом «Скачать zip»): 95.87 KB / **28.45 KB gzip**

**Объяснение initial-delta:** 9 KB raw / 1.4 KB gzip ушли на eager-куски Sprint 7:
- editable ExpectedSchemaCard (на /step3 NotebookBuilderPage, который eager)
- state.results actions + storage migrations
- Stepper 4-step layout + App.jsx Suspense wiring

Все Sprint 7 backend libs (`src/lib/results/*`) попали в lazy chunks через цепочку `ValidationReportPage → IpynbUpload → ipynb.js / ExportButtons → zip.js → jszip`.

Initial bundle delta **под планом ≤ +5 KB gzip** ✓.

## Архитектурные точки

### S1 — парсер ipynb backward-compat
- Old Sprint 6 `.ipynb` без tagged cell `stat-plan-results` → `results: null` + warning «Не найдена ячейка…». UI показывает `⚠`-badge, форма пустая, юзер заполняет вручную. PNG-графики всё равно извлекаются (если они в outputs) и попадают в HTML отчёт через ImagesGallery.
- Tagged cell может быть `stream` (print stdout), `execute_result` (Out[N]), `display_data` (`application/json` или `text/plain`). Парсер пробует в этом порядке.
- Validation `REQUIRED_FIELDS = [control_n, treatment_n, delta_rel, p_value, ci_lower, ci_upper]` — если что-то отсутствует, warning «отсутствуют поля: X, Y», но results возвращается частично-заполненный (UI показывает что есть, остальное юзер дополняет).

### S2 — chi² без deps
SRM chi² df=1 нужен в браузере без `scipy`. Реализован через:
- `lowerIncompleteGamma(s, x)` — series expansion (Numerical Recipes 6.2), точность ~10⁻¹² для df=1 / s=0.5.
- `gammaLn(z)` — Lanczos approximation с reflection formula.
- `chi2SfDf1(x) = 1 - regularizedLowerGamma(0.5, x/2)`.
- Threshold `0.001` — индустриальная конвенция (Microsoft / Booking publications).

Тесты проверяют известные точки: balanced 5000/5000 → p=1, mild 5050/4950 → p≈0.32, severe 5500/4500 → p<<0.001.

### S3 — decision_rules adapter для `{ship, iterate, kill}` trio
Спека S3 говорила про `brief.decision_rules` как array of strings. Фактический shape в `initialBrief` — labelled trio `{ ship: '', iterate: '', kill: '' }`. Adapter:
- `evaluateAllRules` итерирует FIELDS = `['ship', 'iterate', 'kill']`, для каждого: `action = field.toUpperCase()`, raw = текст из брифа, парсит условие через COND_REGEX, возвращает `{ field, action, raw, parsed, auto_eval, empty }`.
- `recommendNextStep` приоритизирует SHIP → ITERATE → KILL, фильтрует empty, учитывает user_check override над auto_eval.

### S5/S6 — рендер HTML/MD
Оба читают «effective results» = `{ ...raw_results, ...user_overrides }` (пустые / null / undefined overrides игнорируются — это позволяет очистить поле в форме, не затирая значение из ipynb). HTML inline CSS ≈ 1.6 KB, тёмная палитра подобрана под stat·plan main app (background `#0e1014`, accent `#a3e635`, fg `#ededed`). PNG embed через `data:image/png;base64,...` URI.

### S7 — JSZip lazy chunk
`buildZip` — async function, jszip импортируется динамически. `buildFileMap` — pure sync helper для тестов (без касания jszip), возвращает `{filename → content}` map. Это позволило написать 5 тестов на zip-логику без instantiating JSZip в тестовой среде.

### S8 — state shape + reducer
`state.results` — отдельный top-level branch (не `state.brief.results`). Reasoning: результаты не часть брифа, не пересчитывают `plan.derived` / `plan.score`. 7 actions с явными semantics:
- `UPLOAD_IPYNB` — устанавливает source='ipynb', raw_results, images, warnings, ipynb_filename, ipynb_raw_text **поверх initialResults** (полный reset предыдущих overrides — новый ноутбук = новый сеанс).
- `SET_RESULTS_SOURCE_MANUAL` — full reset + source='manual'.
- `SET_RESULTS_FIELD` — patch в `user_overrides`. Side-effect: если source был null, выставляется 'manual'.
- `TOGGLE_RULE_CHECK` / `SET_USER_DECISION` — точечные патчи.
- `RESET_RESULTS` — возврат к initialResults.
- `SET_SCHEMA_OVERRIDE` — `notebook_config.schema_overrides[col] = {...prev, ...patch}`. No-op если column не string или patch не object.

`storage.js`: добавлен `results` в whitelist `pickForStorage`, миграция в `mergeRestored` с дефолтом `initialResults` для legacy сессий, аналогично `schema_overrides` через спред в `notebook_config`.

### S9 — Stepper 4-step + параллельный unlock /step3 и /step4
После approve plan **оба** шага 3 и 4 разблокированы. Это намеренное UX-решение: PM может прийти на /step4 напрямую (deep link, secondary CTA с /step2) если ноутбук уже выполнен. Sprint 6 локальная навигация через Stepper кликом — работает на оба шага.

### S10 — canonical bindings vs defensive globals().get
Гибрид:
1. Cell-шаблоны (load/srm/novelty/guardrails/4 main_test) явно биндят canonical имена в **конце** своего code-cell — пользователь видит discoverable Python.
2. Export-cell использует `globals().get('name', default)` — defensive read, переживает кастомизацию пользователя в любом из cell-шаблонов.

Renames для устранения коллизий:
- `srm.cells.json`: `chi2, p = chisquare(...)` → `chi2_srm, srm_pvalue = ...` (старый `p` коллидировал с main_test `p` — последний бы перетёр).
- `guardrails.cells.json`: внутренняя `results = []` → `guardrail_results = []` (наш export-cell использует `results` как dict, нужна изоляция).

### S11 — schema_overrides resolution
`resolveCol(orig, overrides)` возвращает override.rename || orig (с trim/non-empty guard). `resolveType(orig, defaultType, overrides)` — то же для type. Apply в:
- `buildPlaceholderMap`: metric_column / randomization_unit_column / day_column / geo_column / каждое имя guardrail внутри `guardrails_py_list` и `guardrails_py_objects`.
- `expectedSchema`: каждая row — `{ original, column, type, ... }`. `original` использует ExpectedSchemaCard как ключ для SET_SCHEMA_OVERRIDE, `column` — для отображения в input.

Backward-compat: `state.notebook_config.schema_overrides ?? {}` — старые сессии без поля корректно дефолтятся.

## ADR соответствие

| ADR | Проверка |
|---|---|
| ADR-015 (notebook results export) | Export-cell `metadata.tags=['stat-plan-results']` + `print(json.dumps(results))` — контракт ✓. Парсер ищет tag + парсит stream/execute_result/application_json. Fallback на форму при absence ✓ |
| ADR-013 (4-step flow) | Stepper 5→4, Step 4 = «Валидация и отчёт» объединённый ✓ |
| ADR-014 (recharts) | Recharts в Шаге 4 **НЕ используем**, embed PNG из ipynb через `<img>` data URL. Recharts остаётся только в Шаге 1 ✓ |
| ADR-004 (тул не решает) | Decision rules применяются для «Recommended next step» параграфа в readout/HTML, поле «Принятое решение» в readout = `_To be filled manually._`, dropdown в UI у пользователя ✓ |
| ADR-002 (round-trip) | YAML test_plan.md schema не меняется. Sprint 6 round-trip 6/6 без regression ✓ |
| ADR-001 (no backend) | Парсер ipynb на клиенте через native JSON.parse, jszip — клиентский, никаких новых backend deps ✓ |

## Files touched

**Создано (15 файлов):**
- `src/lib/results/{ipynb,checks,decision-rules,report-html,readout-md,zip,effective}.js` (7)
- `src/pages/ValidationReportPage.jsx`
- `src/components/results/{IpynbUpload,ResultsForm,ChecksBlock,DecisionRulesBlock,ImagesGallery,ExportButtons}.jsx` (6)
- `templates/notebook/export.cells.json`
- `tests/lib/results/{ipynb,checks,decision-rules,report-html,readout-md,zip}.test.js` (6)

**Модифицировано (13 файлов):**
- `package.json` + `package-lock.json` — `+jszip ^3.x`
- `src/state/reducer.js` (initialResults + 7 actions + cases)
- `src/lib/storage.js` (pickForStorage + mergeRestored для results + schema_overrides)
- `src/components/Stepper.jsx` (4-step structural rewrite)
- `src/App.jsx` (/step4 route + React.lazy + Suspense)
- `src/pages/PlanPage.jsx` (secondary CTA)
- `src/lib/plan/notebook-builder.js` (export-cell import + always-on insert + resolveCol/resolveType / schema_overrides apply)
- `src/components/notebook/ExpectedSchemaCard.jsx` (полный rewrite на editable)
- `templates/notebook/load.cells.json` (matplotlib + plt.rcParams + control_n/treatment_n bindings)
- `templates/notebook/srm.cells.json` (srm_pvalue rename)
- `templates/notebook/novelty.cells.json` (day_column placeholder + novelty_flag bool)
- `templates/notebook/segments.cells.json` (geo_column placeholder)
- `templates/notebook/guardrails.cells.json` (guardrail_results rename + name/breached/value fields для ADR-015 contract)
- `templates/notebook/main_test/{z_test,t_test,welch,bootstrap}.cells.json` (4 файла — canonical bindings)
- `tests/state/reducer.test.js` (+10 case)
- `tests/lib/storage.test.js` (+3 case)
- `tests/lib/plan/notebook-builder.test.js` (+13 case + 1 updated)

**Не трогалось (Sprint 6 контракты):**
- `src/lib/data-peek/*`, `src/lib/brief/*`, `src/lib/plan/{sample-size,scoring,parse,render,direction}.js`
- Cowork-зона: `docs/**` кроме этого `sprint-report-7.md` (Code-зона exception per P-1), `CLAUDE.md`, `README.md`

## Backward compat verification

1. **Legacy localStorage без state.results / schema_overrides** → `mergeRestored` применяет дефолты `initialResults` и `{}`. Verified тестом `tests/lib/storage.test.js > legacy session without results field`.
2. **Old Sprint 6 .ipynb без tagged cell** → парсер возвращает `results: null` + warning, UI fallback на форму, PNG-графики извлекаются. Verified тестом `tests/lib/results/ipynb.test.js > no tagged cell → results:null`.
3. **Шаг 3 без overrides** → старое поведение `getExpectedSchema` (только теперь rows имеют `original` поле — не ломает существующих consumer'ов).

## Что осталось (CLOSE для Cowork)

- `docs/context/DATA_MODEL.md` — раздел «Notebook results export schema» (ADR-015 контракт).
- `docs/project/PROJECT_STATUS.md` — обновить под Sprint 7 close.
- `docs/context/FLOW.md` — лёгкая корректировка §«Шаг 4» под ipynb upload primary (примечание о tagged cell, drag-drop).
- Code-review + test-cases файлы для смок-теста пользователя.
- ADR-015 пометить как Implemented (если ещё Proposed).

## Time tracking

| Фаза | Plan | Actual |
|---|---|---|
| Phase 1 — 6 backend libs + tests | 1.5 ч | ~1.2 ч |
| Phase 2 — state.results + storage | 30 мин | ~25 мин |
| Phase 3 — Stepper + App.jsx + PlanPage CTA | 30 мин | ~20 мин |
| Phase 4 — UI Шага 4 (7 файлов) | 1.5 ч | ~1 ч |
| Phase 5 — notebook-builder + schema_overrides + tests | 1.5 ч | ~1.3 ч |
| Final — build + sprint-report-7 | 30 мин | ~30 мин |
| **Total** | ~5.5 ч | **~4.5 ч active** |

Под план благодаря разведке Phase 1+2 (вся архитектура была видна до первого Write), отсутствию переделок и одному failing-test'у на Phase 5 (`runs with no enabled cells` — обновлён под always-on export-cell).
