# Sprint 4 — Парсер test_plan.md + Шаг 3 «Конструктор ноутбука»

**Type:** Code sprint (большой, разбит на 2 phases внутри спринта)
**Estimated:** ~5-7 ч active (Phase A ~2-3 ч, Phase B ~3-4 ч)

---

## Overview

После Sprint 3 у пользователя есть полная цепочка «бриф → план → утверждение». Sprint 4 даёт **два недостающих value loop**:

1. **Альтернативный вход в продукт** — пользователь, у которого уже есть `test_plan.md` (от коллеги, из git, из прошлой сессии), загружает его на стартовом экране и попадает прямо в конструктор. Бриф восстанавливается автоматически, проходить заново не нужно. Это закрывает развилку «У меня есть план», которая с Sprint 1 показывает заглушку.
2. **Реальный артефакт для запуска теста** — пользователь скачивает `analysis.ipynb`, который запустится в Jupyter под его утверждённую конфигурацию. До этого спринта продукт «не доходит до результата» — был план, не было ноутбука.

После Sprint 4 продукт впервые становится **полезным в работе:** можно либо начать с брифа и довести до ноутбука, либо прийти с готовым планом и сразу получить ноутбук.

**Спринт большой, поэтому внутри разбиваем на 2 phase с отдельными коммитами Code:** сначала Phase A (парсер + drag-drop), Code коммитит и кратко самопроверяет. Потом Phase B (конструктор + ipynb). Это снижает риск, что весь спринт уйдёт в multi-FIX, и облегчает code review.

---

## Scope (user stories из JTBD.md)

### Из § 1 «Старт и навигация» (Phase A)

- ★ ◆ Как возвращающийся пользователь я хочу загрузить test_plan.md перетаскиванием на стартовом экране, чтобы продолжить с того места, где остановился, не проходя бриф заново (закрытие `[~]` из Sprint 1, теперь полностью `[x]`)

### Из § 5 «Шаг 2 — Тест-план» (Phase A)

- ★ ◆ Как пользователь я хочу загрузить отредактированный test_plan.md обратно, чтобы оценка пересчиталась и я мог продолжить с обновлённой версии (закрытие `[~]` из Sprint 3)
- Как пользователь я хочу видеть warning, если загруженный md не парсится (сломан YAML, не хватает полей), чтобы понять, что исправить

### Из § 6 «Шаг 3 — Конструктор ноутбука» (Phase B)

- ★ Как пользователь я хочу видеть информацию об утверждённом плане сверху страницы (test_id, метод, sample size), чтобы понимать, под что собирается ноутбук
- ★ Как пользователь я хочу видеть список обязательных ячеек, включённых и заблокированных, чтобы понимать минимально необходимый набор анализа
- ★ Как пользователь я хочу видеть список опциональных ячеек с переключателями, чтобы добавлять их при необходимости
- Как пользователь я хочу видеть короткое описание каждой ячейки, чтобы понимать, что она делает, без чтения кода
- ★ Как пользователь я хочу скачать сгенерированный analysis.ipynb, чтобы запустить его в Jupyter на своих данных
- ★ Как пользователь я хочу, чтобы ipynb содержал header-ячейку с описанием теста и ожидаемой схемой данных, чтобы можно было запустить без обращения к тулу
- ★ Как пользователь я хочу, чтобы все плейсхолдеры в коде ноутбука были подставлены корректно (имя метрики, имена колонок, числа из плана), чтобы код запускался без правок
- ★ ◆ Как пользователь я хочу видеть схему данных (таблицу колонок), которую ожидает ноутбук, чтобы подготовить свой csv заранее
- ◆ Как пользователь я хочу, чтобы схема данных обновлялась реактивно при включении/выключении опциональных ячеек
- Как пользователь я хочу скачать demo-csv под тип метрики, чтобы проверить, что ноутбук работает, без подключения продакшен-данных
- Как пользователь я хочу видеть, что demo-csv выбран автоматически на основе моего metric_type, чтобы не выбирать вручную
- Как пользователь я хочу видеть warning, если выбрана продвинутая опция (CUPED), не поддерживаемая в demo-csv, чтобы понимать ограничения

---

## Что НЕ закрываем в этом спринте

Зафиксировано, чтобы не было scope creep:

- **Конструктор: всё 10 ячеек из каталога.** В Sprint 4 делаем **8 ячеек** (6 обязательных + 2 опциональные: `segments`, `bootstrap_ci`). Опциональные `cuped` и `delta_method` — на отдельный мини-спринт после получения первого фидбэка. Это сознательное урезание, чтобы спринт не растёкся.
- **Demo-csv: все 4 файла.** В Sprint 4 делаем **2 файла** — `demo_proportion.csv` и `demo_continuous.csv` (самые частые `metric_type`). `demo_ratio.csv` и `demo_count.csv` — на отдельный мини-спринт. В UI для отсутствующих типов показываем `disabled` опцию с подписью «появится в следующем спринте».
- **Шаг 4 «Анализ» и Шаг 5 «Read-out»** — отдельные спринты.
- **PDF/PNG экспорт, JSZip** — не нужны для Sprint 4.
- **Methodology раздел** — Sprint 8.
- **Mobile responsive аудит** — отдельный спринт.
- **`html-to-image`, `html2pdf`, `JSZip`, `papaparse`, `recharts`** — не подключаем. **Подключаем только `js-yaml`** (см. Technical Notes).

---

## Phase A — Парсер test_plan.md + drag-drop wiring

**Цель:** загрузка `test_plan.md` через drag-drop на стартовом экране или через кнопку на step 2 восстанавливает `state.brief` + `state.plan`. Невалидные файлы отклоняются с понятной ошибкой. Заглушка из Sprint 1 (drag-drop, который ничего не делает) и из Sprint 3 (кнопка «Загрузить отредактированный» с placeholder'ом) — заменяются на рабочую логику.

### Tasks A

#### A.1. `src/lib/plan/parse.js` — парсер test_plan.md

Функция-фасад:
```js
parseTestPlanMd(mdString) → {
  ok: boolean,
  brief: BriefSchema | null,        // как в state.brief
  plan: { status, approvedAt, editedExternally, briefSubmitted }, // partial state.plan
  warnings: string[],
  error: { message, line?, field? } | null,  // когда ok === false
}
```

Реализация:
1. **Разделение frontmatter и body** — найти границы `---` на первой и следующей одиночной строке. Если границ нет — `error: { message: 'Не найден YAML frontmatter (ожидаются строки --- в начале и после метаданных)' }`.
2. **YAML parse** через `js-yaml` `load()` (safe-режим по умолчанию в v4). Catch исключения, возвращаем `error` с line/column из исключения если доступно.
3. **Валидация полей** по схеме из `docs/context/DATA_MODEL.md` (раздел test_plan.md):
   - Required: `test_id`, `status`, `metric_type`, `metric_name`, `baseline`, `test_method`, `randomization_unit`, `alpha`, `power`, `mde`, `direction`, `daily_traffic_available`, `guardrails`.
   - Optional: `approved_at`, `sample_size_per_arm`, `duration_days`, `variance_reduction`, `stratification_by`, `holdback_percent`, `data_peek`, `score`.
   - Enum-проверки: `metric_type ∈ {proportion, continuous, ratio, count}`, `status ∈ {draft, approved}`, `test_method ∈ {z_test_proportions, t_test, mannwhitney, bootstrap, delta_method, welch_t_test}`, `randomization_unit ∈ {user, session, cluster}`, `mde.unit ∈ {relative_percent, absolute_percentage_points, absolute_value}`, `direction ∈ {increase, decrease, any}`.
   - Type-проверки: `alpha`, `power`, `baseline` — числа; `guardrails` — массив объектов с `name`/`direction`/`threshold`/`unit`.
   - Невалидные поля **не блокируют парсинг полностью** — добавляются в `warnings`, поле в результирующем `brief` заполняется дефолтом из `initialState` или ставится `null`.
4. **Mapping в state.brief** — frontmatter поля кладутся в `brief` по той же структуре, что собирает `render.js` (round-trip). Поля, которых нет в state.brief (например, `score` — это derived из Sprint 3), игнорируются.
5. **Гипотеза** — секция `## Hypothesis` из markdown body. Текст до следующего `## `. Если секции нет — `brief.hypothesis.text = ''`, warning «Секция ## Hypothesis не найдена, гипотеза будет пустой».
6. **Парсинг секций `## Guardrails`, `## Stop conditions`, `## Decision rules`** — **не нужен**. Приоритет у frontmatter (по ADR-002 пункт 3 + DATA_MODEL.md). Текст секций игнорируется при парсинге (используется только для human-readability при просмотре).
7. **`plan.status`** — берём из frontmatter (`draft` или `approved`). `approvedAt` — из `approved_at`, если есть.
8. **`plan.editedExternally = true` всегда** при успешном parse (informational marker, см. Technical Notes).
9. **`plan.briefSubmitted = true`** при успешном parse (бриф восстановлен).

#### A.2. `tests/lib/plan/parse.test.js` — unit-тесты парсера

Минимум **20 кейсов**:
- 4 happy-path: каждый `metric_type` (proportion / continuous / ratio / count), полный валидный план → `ok: true`, brief совпадает с ожидаемым.
- 2 round-trip: `parseTestPlanMd(renderTestPlanMd(state)) === восстановленный state.brief` (для 2 разных state — proportion с CUPED и continuous минимальный). Это критический cross-check Sprint 3 snapshot'а.
- 1 approved: status: approved, approved_at — корректно мапится в `plan.status` + `plan.approvedAt`.
- 4 граничных: пустая строка / только frontmatter без body / только body без frontmatter / битый YAML (unclosed bracket) → каждый возвращает `ok: false` с осмысленным `error.message`.
- 5 валидация: невалидный `metric_type`, `mde.unit` не из enum, `alpha` не число, отсутствует required `test_id`, пустые `guardrails` → каждый даёт warning, парсинг продолжается с дефолтами.
- 2 секции: hypothesis-секция отсутствует → warning + пустая гипотеза; секция есть с многострочным текстом → весь текст в `brief.hypothesis.text`.
- 2 mismatch: frontmatter `guardrails` имеет 2 элемента, секция `## Guardrails` показывает 3 → берётся frontmatter, секция игнорируется (никакого warning не нужно, это by-design).

#### A.3. Reducer-расширение

В `src/state/reducer.js`:
- Новый action `LOAD_TEST_PLAN_MD` с payload `{ brief, plan }` → заменяет `state.brief` и мерджит указанные поля в `state.plan`, выставляет `state.started = true`.
- Не сбрасывает `state.tour`, `state.brief.currentQuestion` (стартует с Q01 — пользователь не на брифе).

#### A.4. Старт скрин — wiring drag-drop

В `src/pages/StartScreen.jsx`:
- Существующая drag-drop карточка «У меня уже есть план» — связать с реальным парсером. На drop:
  1. Читаем файл через `FileReader.readAsText`.
  2. Вызываем `parseTestPlanMd(text)`.
  3. Если `ok: true` → `dispatch({ type: LOAD_TEST_PLAN_MD, payload: { brief, plan } })` → `navigate('/step3')`.
  4. Если `ok: false` → показываем inline-баннер с `error.message`. Не переходим, не меняем state.
  5. Warnings (при `ok: true`) — показываем как toast/баннер на step 3 после перехода (можно через `state.plan.parse_warnings`, тогда добавить в state.plan; либо проще — через локальный sessionStorage / URL state).
- Поддерживаем альтернативу drag-drop: добавить «или выберите файл» — `<input type="file" accept=".md,text/markdown">`. **Это закрывает Concern #4 из Sprint 1 code review** (click→file picker fallback) — JTBD §1.

#### A.5. Step 2 — рабочая кнопка «Загрузить отредактированный»

В `src/components/plan/PlanActions.jsx`:
- Заменить placeholder «Парсинг — Sprint 4+» на реальный file picker.
- На load: тот же flow что A.4 (parseTestPlanMd → dispatch). После успешного load остаёмся на step 2, скоринг и preview обновляются автоматически (через RECOMPUTE_PLAN).
- Если status в загруженном MD = `approved` — переключаем `plan.status = approved` (бриф становится readonly), плюс показываем info-баннер «Загружен утверждённый план».

#### A.6. UI для parse warnings

Создать `src/components/ParseWarningsBanner.jsx` — компонент, который показывает массив warnings'ов из `state.plan.parse_warnings` (новое поле в state.plan, добавляется в Phase A). Виден только если массив непустой. Кнопка «Скрыть» очищает массив.

---

## Phase B — Шаг 3 «Конструктор ноутбука» + .ipynb сборка + demo-csv

**Цель:** после Phase A пользователь может попасть на step 3 двумя путями (approved через step 2 или загрузка test_plan.md). На step 3 — конструктор с toggle-ями ячеек, реактивная схема данных, скачивание `.ipynb` и `demo_{type}.csv`.

### Tasks B

#### B.1. `templates/notebook/` — шаблоны ячеек в JSON

8 шаблонов в формате nbformat 4 (см. `docs/context/NOTEBOOK_TEMPLATES.md` для структуры):

```
templates/notebook/
├── load.cells.json          # обязательная: pandas import + pd.read_csv + .head() + .info()
├── srm.cells.json           # обязательная: chi² test на размеры групп
├── balance.cells.json       # обязательная: средние/доли по группам, проверка сходимости
├── novelty.cells.json       # обязательная (если duration ≥ 3): эффект дни 1-2 vs 3+
├── main_test/               # обязательная: вариативная под test_method
│   ├── _meta.json           # общие метаданные (id, name, description, requires=['load'])
│   ├── z_test.cells.json    # для z_test_proportions
│   ├── t_test.cells.json    # для t_test
│   ├── welch.cells.json     # для welch_t_test
│   └── bootstrap.cells.json # для bootstrap / mannwhitney / delta_method (упрощённо)
├── guardrails.cells.json    # обязательная: проверка каждого guardrail из плана
├── segments.cells.json      # опциональная: сегментный анализ по `geo`
└── bootstrap_ci.cells.json  # опциональная: bootstrap CI для main metric
```

Каждая ячейка следует структуре из `NOTEBOOK_TEMPLATES.md`:
```json
{
  "id": "srm_check",
  "name": "Sample Ratio Mismatch",
  "description": "Проверка...",
  "default_enabled": true,
  "requires": ["load"],
  "cells": [
    { "cell_type": "markdown", "source": ["## SRM Check\n", "..."] },
    { "cell_type": "code", "source": ["from scipy.stats import chisquare\n", "..."] }
  ]
}
```

**Плейсхолдеры в коде ячеек:** `{{metric_column}}`, `{{randomization_unit}}_id`, `{{guardrail_columns}}` (массив через js.repeat), `{{alpha}}`, `{{power}}`. См. таблицу плейсхолдеров в NOTEBOOK_TEMPLATES.md.

Code должен следовать **минимуму зависимостей** в Python-коде ячеек: только `pandas`, `numpy`, `scipy.stats`, `statsmodels.stats.proportion`, `matplotlib.pyplot`. Никакого `statsmodels.formula`, `seaborn` и т.д.

#### B.2. `src/lib/plan/notebook-builder.js` — сборка .ipynb

Функция:
```js
buildNotebook(state) → {
  filename: string,            // например 'bm-main-cta-v2_analysis.ipynb'
  json: object,                // полный nbformat 4 JSON
  warnings: string[],          // если ячейка пропущена из-за условий
}
```

Алгоритм (по `NOTEBOOK_TEMPLATES.md` секция «Сборка финального .ipynb»):
1. Берём `state.notebook_config.cells_enabled` (массив id ячеек).
2. Для каждой включённой — `loadTemplate(id)`. Для `main_test` — выбираем вариант по `state.plan.derived.test_method`.
3. Валидация зависимостей: если `srm.requires = ['load']` и `load` не в enabled → error (но для обязательных это не должно случаться — load всегда обязательная).
4. Условные ячейки: `novelty` пропускается если `duration_days < 3` (warning «novelty не добавлена, тест меньше 3 дней»). `guardrails` пропускается если `guardrails.length === 0` (warning).
5. Header-ячейка собирается из `buildHeaderCell(state)` — markdown с шапкой теста + Expected CSV schema (динамическая таблица колонок).
6. Подстановка плейсхолдеров — `substitutePlaceholders(cell, state)` через `String.prototype.replace(/\{\{(\w+)\}\}/g, ...)`. Если плейсхолдер не найден в state — оставляем как `{{unknown_var}}` и добавляем в warnings.
7. Сборка финального JSON по схеме nbformat 4 (см. NOTEBOOK_TEMPLATES.md).
8. Проверка валидности: `JSON.stringify(json)` не падает + нет `{{...}}` в финальном тексте (regex check).
9. Возврат имени файла `{test_id}_analysis.ipynb`.

#### B.3. `tests/lib/plan/notebook-builder.test.js` — unit-тесты

Минимум **15 кейсов**:
- 4 happy-path: каждый `test_method` (z_test, t_test, welch, bootstrap) с базовым набором ячеек → возвращает валидный JSON, все плейсхолдеры подставлены.
- 1 опциональные ячейки: enabled `segments` + `bootstrap_ci` → они в финальном JSON, в нужном порядке.
- 1 conditional skip: `duration_days = 2` → novelty пропущена, warning «duration < 3 days».
- 1 conditional skip: `guardrails.length === 0` → guardrails ячейка пропущена, warning.
- 1 header validation: header-ячейка содержит все required поля (test_id, metric_name, sample_size, duration, alpha, power, MDE, decision_rules) и таблицу Expected schema с правильными колонками.
- 1 placeholder substitution: проверка что `{{metric_column}}` заменён на реальное имя, и в финальном тексте нет `{{...}}`.
- 1 filename: `state.test_id = 'foo-bar'` → `filename === 'foo-bar_analysis.ipynb'`.
- 5 edge cases: пустой brief (без metric_name) → возвращает warning; main_test с unknown test_method → error; cells_enabled пуст → только header в JSON; etc.

#### B.4. `src/pages/NotebookBuilderPage.jsx` — UI шага 3

Заменить placeholder из Sprint 3 на полную реализацию.

Layout (по `docs/context/FLOW.md` Step 3 + mockup из `mockups/ab_planner_mockup_v4.html`):
- **Сверху** — `PlanInfoCard`: `test_id`, `metric_type`, `metric_name`, `test_method`, `sample_size_per_arm`, `duration_days`. Просто читаем из `state.brief` + `state.plan.derived`.
- **Слева (1.4fr)** — `CellsList`:
  - Заголовок «ОБЯЗАТЕЛЬНЫЕ ЯЧЕЙКИ» + 6 строк с галочками, disabled (всегда включены). Каждая строка: чекбокс ☑, название (`load`, `srm`, `balance`, `novelty`, `main_test`, `guardrails`), короткое описание из `_meta.json`.
  - Заголовок «ОПЦИОНАЛЬНЫЕ ЯЧЕЙКИ» + 2 строки с tggle: `segments`, `bootstrap_ci`. Включение → dispatch `TOGGLE_NOTEBOOK_CELL` action.
  - Заглушки для будущих ячеек (`cuped`, `delta_method`) — disabled с подписью «появится в следующем спринте».
- **Справа (1fr)** — `DemoCsvCard`:
  - Заголовок «DEMO CSV».
  - Радио-кнопки: `demo_proportion.csv`, `demo_continuous.csv` (активные), `demo_ratio.csv`, `demo_count.csv` (disabled с подписью «появится в следующем спринте»).
  - По дефолту выбран файл под `state.brief.metric_type` (если он один из proportion/continuous; для ratio/count — proportion с info-banner «для твоего metric_type demo появится позже»).
  - Кнопка «↓ Скачать demo-csv».
  - Inline-warning если включены продвинутые ячейки, не поддерживаемые demo (например CUPED).
- **Внизу слева** — `ExpectedSchemaCard`:
  - Таблица колонок которые ноутбук ожидает в CSV. Динамическая — обновляется реактивно при toggle ячеек (через `useMemo` от `notebook_config.cells_enabled`).
  - Колонки: `Column`, `Type`, `Required`, `Description`.
  - Базовая схема (всегда): `{randomization_unit}_id`, `variant`, `{metric_column}`, плюс guardrail columns из плана.
  - Условно: `day` (если novelty включён), `{segment_field}` (если segments включён).
- **Внизу по центру** — большая кнопка «↓ Скачать analysis.ipynb». На клик: `buildNotebook(state)` → Blob URL → trigger download.

#### B.5. State и reducer для notebook_config

В `src/state/reducer.js`:
- `state.notebook_config = { cells_enabled: [array of cell IDs], cells_optional: [...]}`.
- Дефолты: `cells_enabled = ['load', 'srm', 'balance', 'novelty', 'main_test', 'guardrails']` (6 обязательных). Если `duration < 3` — `novelty` остаётся в enabled, но конструктор покажет, что она будет пропущена при сборке.
- Actions:
  - `TOGGLE_NOTEBOOK_CELL` с payload `{ id }` — toggle опциональной ячейки в `cells_enabled`. Обязательные нельзя toggleнуть (action игнорирует попытку).
  - `RESET_NOTEBOOK_CONFIG` — сбрасывает к дефолтам. Вызывается в `RETURN_PLAN_TO_DRAFT` (по ADR-006 — «текущая конфигурация ноутбука будет сброшена»).
- При `RESET_STATE` — `notebook_config` тоже сбрасывается.
- Персист в localStorage — `notebook_config` добавляется в persisted shape (в `src/lib/storage.js`).

#### B.6. Demo-csv генерация

Создать `scripts/generate-demo-csv.mjs` — однократный node-скрипт, генерирует 2 файла в `public/demo/`:
- `demo_proportion.csv` — ~75k строк, колонки `user_id`, `variant` (control/treatment 50/50), `converted` (0/1, control с CR=0.031, treatment с CR=0.034 — что даёт Δ rel. +9.3%), `bounce_rate` (число 0-1), `time_on_site` (секунды), `geo` (US/EU/APAC), `day` (1-7). Novelty effect: первые 2 дня treatment имеет CR=0.038 (искусственно завышен), стабилизируется к day 3.
- `demo_continuous.csv` — ~75k строк, колонки `user_id`, `variant`, `arpu` (нормальное распределение, control μ=100 σ=80, treatment μ=106 σ=80 — Δ rel. +6%), `sessions` (Poisson λ=3), `geo`, `day`.

Скрипт использует `Math.random()` + `seedrandom` (если нужна повторяемость) или просто `Math.random()` без seed. Не зависит от npm пакетов кроме `node:fs`.

Скрипт коммитится в `scripts/`, csv-файлы коммитятся в `public/demo/`. Скрипт можно перезапустить вручную при необходимости.

#### B.7. Tests для Phase B

В дополнение к B.3:
- `tests/state/reducer.test.js` — добавить 4 кейса для `TOGGLE_NOTEBOOK_CELL`, `RESET_NOTEBOOK_CONFIG`, `LOAD_TEST_PLAN_MD`, и что `RESET_STATE` сбрасывает `notebook_config`.

---

## Technical Notes

### Зависимости (изменение ADR-010 контекста)

**Подключаем одну новую npm-зависимость: `js-yaml`** (последняя стабильная, ~25KB gzipped).

Обоснование:
- ADR-010 / ARCHITECTURE.md явно предусматривают `js-yaml` для «Спринта парсинга test_plan.md» — это и есть этот спринт.
- Самописный YAML-парсер с валидацией enum/типов = ~200-300 строк кода + риск багов на edge cases (multi-line strings, escape sequences, nested objects). js-yaml — индустриальный стандарт, ~25KB к bundle.
- Установка: `npm install js-yaml` в Code-зоне коммита (по P-1 — `package.json` правит Code).

**Не подключаем (остаётся для следующих спринтов):** `papaparse`, `recharts`, `html2pdf`, `html-to-image`, `JSZip`, `seedrandom`. Demo-csv generate-скрипт — без deps (Math.random).

### `editedExternally` семантика (закрытие открытого вопроса из Sprint 3)

В Sprint 3 поле `state.plan.editedExternally` было зарезервировано без активной семантики. В Sprint 4 фиксируем:

**Поведение:** ставится в `true` при любом успешном `LOAD_TEST_PLAN_MD` (informational marker — «этот план пришёл из файла, не сгенерирован in-place»). **Никогда не сбрасывается автоматически** — даже если пользователь после load редактирует ответы в брифе через UI. Сбрасывается только при `RESET_STATE` (новый тест с нуля) или `RETURN_PLAN_TO_DRAFT` (тогда логически план снова локальный).

**Использование:** в UI step 2 опционально показать маленький badge `↳ загружен` рядом со StatusBadge. **Не критично** — можно не реализовывать в этом спринте если экономим время, но в state сохранение поведения обязательно (для будущего).

### Round-trip контракт (критично!)

Sprint 3 заложил **inline snapshot test** в `tests/lib/plan/render.test.js` для формата `test_plan.md`. В Phase A unit-тесте `parse.test.js` — обязательно тест:

```js
const original = { /* фикстура state */ };
const rendered = renderTestPlanMd(original);
const parsed = parseTestPlanMd(rendered);
expect(parsed.ok).toBe(true);
expect(parsed.brief).toEqual(extractBriefShape(original.brief));
```

Это **критический cross-check** контракта между Sprint 3 render и Sprint 4 parse. Если round-trip ломается — баг либо в одной, либо в другой стороне, и его надо найти и пофиксить **до закрытия Phase A**, иначе пользователь скачает план, поправит, загрузит — и часть полей потеряется.

### Edge cases парсера

- Файлы > 5MB — отклонить с ошибкой «test_plan.md слишком большой, ожидается до 5MB».
- Файлы с BOM (`﻿` в начале) — strip BOM перед парсингом.
- LF vs CRLF в загруженном файле — js-yaml безразличен, наш парсер секций должен работать с обоими.
- Пустой `## Hypothesis` (только заголовок без текста) — warning, `brief.hypothesis.text = ''`.

### Notebook builder edge cases

- `state.plan.derived.test_method = 'welch_t_test'` — используем `welch.cells.json`.
- `state.plan.derived.test_method = 'mannwhitney' | 'delta_method'` — используем `bootstrap.cells.json` (универсальный fallback). Warning в UI «для {test_method} используется bootstrap-вариант ячейки» (в первом приближении).
- `state.brief.guardrails.length === 0` — `guardrails.cells.json` пропускается, в header schema не появляются guardrail колонки.
- `state.brief.duration_days < 3` — `novelty.cells.json` пропускается, в header schema колонка `day` остаётся (на случай если включён segments).

### Структура папок (новое в Sprint 4)

```
src/
├── lib/
│   └── plan/
│       ├── parse.js              # Sprint 4
│       ├── notebook-builder.js   # Sprint 4
│       └── ...                   # Sprint 3 (sample-size, scoring, render, etc.)
├── pages/
│   └── NotebookBuilderPage.jsx   # Sprint 4 (replace Sprint 3 placeholder)
├── components/
│   ├── ParseWarningsBanner.jsx   # Sprint 4
│   └── notebook/                 # Sprint 4
│       ├── PlanInfoCard.jsx
│       ├── CellsList.jsx
│       ├── DemoCsvCard.jsx
│       └── ExpectedSchemaCard.jsx
templates/
└── notebook/                     # Sprint 4 (см. B.1)
    ├── load.cells.json
    ├── srm.cells.json
    ├── balance.cells.json
    ├── novelty.cells.json
    ├── guardrails.cells.json
    ├── segments.cells.json
    ├── bootstrap_ci.cells.json
    └── main_test/
        ├── _meta.json
        ├── z_test.cells.json
        ├── t_test.cells.json
        ├── welch.cells.json
        └── bootstrap.cells.json
scripts/
└── generate-demo-csv.mjs         # Sprint 4
public/
└── demo/                         # Sprint 4
    ├── demo_proportion.csv
    └── demo_continuous.csv
tests/
└── lib/
    └── plan/
        ├── parse.test.js          # Sprint 4
        └── notebook-builder.test.js  # Sprint 4
```

---

## ADR Constraints

| ADR | Что значит для этого спринта |
|---|---|
| ADR-001 (no backend) | Парсинг — на клиенте через js-yaml. Demo-csv — статические файлы в public/. |
| ADR-002 (артефакты как переносимое состояние, строгий парсинг) | **Главное ADR этого спринта.** Невалидные файлы отклоняются с понятной ошибкой, путь A. Hypothesis-секция, guardrails-секция и т.д. — приоритет у frontmatter. |
| ADR-003 (структурная оценка) | После load — `RECOMPUTE_PLAN`, scoring пересчитывается. Никаких новых критериев. |
| ADR-004 (тул не принимает решений) | Approve по load: если в загруженном MD `status: approved`, бриф readonly, **но никакого автоматического подтверждения** — статус приходит от пользователя, который загрузил уже утверждённый план. |
| ADR-005 (5-шаговый флоу) | Load test_plan.md → step 3 (по diagram'е в FLOW.md). Step 2 при load кнопкой остаётся текущим. |
| ADR-006 (approved/draft + readonly) | При load с `status: approved` — бриф readonly как сейчас. `RESET_NOTEBOOK_CONFIG` вызывается в `RETURN_PLAN_TO_DRAFT` (новое). |
| ADR-007 (demo-csv как static, 4 файла под metric_type) | **В Sprint 4 — 2 файла из 4** (proportion + continuous). Остальные — отдельный мини-спринт. UI показывает все 4 опции, недоступные — disabled. |
| ADR-008 (тур без overlay) | Тур не трогаем. |
| ADR-009 (точные формулы) | Sample size не трогаем — Sprint 3. |
| ADR-010 (стек) | **+`js-yaml`** новая зависимость, обоснована выше. `src/lib/plan/parse.js` и `notebook-builder.js` — без React-импортов. |

---

## Files involved (общий список)

**Создаём:**
- `src/lib/plan/parse.js`
- `src/lib/plan/notebook-builder.js`
- `src/pages/NotebookBuilderPage.jsx` (replace Sprint 3 placeholder)
- `src/components/ParseWarningsBanner.jsx`
- `src/components/notebook/{PlanInfoCard,CellsList,DemoCsvCard,ExpectedSchemaCard}.jsx`
- `templates/notebook/{load,srm,balance,novelty,guardrails,segments,bootstrap_ci}.cells.json`
- `templates/notebook/main_test/{_meta,z_test,t_test,welch,bootstrap}.{json,cells.json}`
- `scripts/generate-demo-csv.mjs`
- `public/demo/{demo_proportion,demo_continuous}.csv`
- `tests/lib/plan/parse.test.js`
- `tests/lib/plan/notebook-builder.test.js`

**Модифицируем:**
- `src/state/reducer.js` — new actions `LOAD_TEST_PLAN_MD`, `TOGGLE_NOTEBOOK_CELL`, `RESET_NOTEBOOK_CONFIG`; state.notebook_config; integration в RETURN_PLAN_TO_DRAFT и RESET_STATE.
- `src/state/AppStateContext.jsx` — без изменений API, но storage.js обновится → persist пересчитается автоматически.
- `src/lib/storage.js` — добавить `notebook_config` в persisted shape.
- `src/pages/StartScreen.jsx` — wiring drag-drop + file picker + parseTestPlanMd.
- `src/components/plan/PlanActions.jsx` — рабочая кнопка «Загрузить отредактированный» (file picker).
- `src/App.jsx` — без структурных изменений (routes уже есть с Sprint 3); может потребоваться `ProtectedStep` логика для step 3 — там приходит как `approved`, что и так разблокирует.
- `package.json` + `package-lock.json` — `js-yaml` зависимость.
- `tests/state/reducer.test.js` — добавить 4 кейса.

**Не трогаем:**
- `docs/`, `mockups/`, `CLAUDE.md`, `README.md` — Cowork-зона.
- `src/lib/brief/` — без изменений.
- `src/lib/plan/{sample-size,scoring,render,direction,test-method-selector}.js` — Sprint 3 контракт, не трогаем.
- `src/styles/index.css` — кроме новых @theme токенов если потребуются (например для кнопок шага 3).

---

## Acceptance criteria

**Phase A (commit и проверка перед началом Phase B):**

1. `npm test` зелёный, включая **20+ новых тестов в `parse.test.js`** и round-trip тесты.
2. `npm run build` чистый.
3. Стартовый экран: drag `test_plan.md` в карточку → попадаем на step 3, бриф восстановлен. Альтернативно: клик «выбрать файл» → file picker → тот же результат.
4. Битый md (например, без `---`) → inline-баннер с осмысленной ошибкой, state не меняется.
5. Step 2: кнопка «Загрузить отредактированный» открывает file picker, загруженный валидный md обновляет state.brief и пересчитывает scoring.
6. Round-trip: `bдля любого state — renderTestPlanMd → parseTestPlanMd → state восстанавливается экв.`

**Phase B (commit перед запросом review):**

7. Step 3: `PlanInfoCard` показывает корректные данные из плана.
8. `CellsList`: 6 обязательных ячеек заблокированы и отмечены, 2 опциональные (segments, bootstrap_ci) — toggleable. 2 заглушки (cuped, delta_method) — disabled с подписью.
9. `ExpectedSchemaCard` обновляется реактивно при toggle опциональных ячеек.
10. `DemoCsvCard`: proportion и continuous — кликабельные, остальные disabled. Кнопка скачивает корректный csv.
11. Большая кнопка «Скачать analysis.ipynb» — скачивает валидный nbformat 4 JSON. Открывается в Jupyter без ошибок.
12. Все плейсхолдеры подставлены — в финальном json нет `{{...}}`.
13. Header-ячейка содержит шапку теста + Expected schema таблицу.
14. F5 на step 3: notebook_config сохранён и восстановлен.
15. На step 2 «Вернуть в черновик» → notebook_config сбрасывается к дефолтам (можно вернуться на step 3, посмотреть).
16. `npm test` зелёный, включая **15+ новых тестов в `notebook-builder.test.js`**.
17. **Total tests:** ~180+ (147 после Sprint 3 + 35+ новых).
18. `npm run build` чистый, bundle вырос на ~25-30KB (js-yaml).

---

## DO NOT

- ❌ **Не подключать** `papaparse`, `recharts`, `html2pdf`, `html-to-image`, `JSZip` — следующие спринты.
- ❌ **Не реализовывать** все 10 ячеек из каталога — только 8 (6 обязательных + 2 опциональные segments/bootstrap_ci). `cuped`, `delta_method` — disabled-заглушки в UI.
- ❌ **Не генерировать** все 4 demo-csv — только 2 (proportion + continuous). Остальные — disabled-заглушки.
- ❌ **Не парсить** содержимое markdown-секций `## Guardrails`, `## Stop conditions`, `## Decision rules` — приоритет у frontmatter (ADR-002 + DATA_MODEL.md).
- ❌ **Не использовать** `eval`, `new Function` или другие dynamic-code мерзости в подстановке плейсхолдеров — только `String.prototype.replace`.
- ❌ **Не пытаться валидировать** Python-код в ячейках на клиенте (синтаксис, импорты) — это вне scope, пользователь увидит ошибку в Jupyter если что.
- ❌ **Не разблокировывать** шаги 4-5 — они locked до своих спринтов.
- ❌ **Не делать** UI/RTL тесты — только Vitest unit-тесты (как в Sprint 3).
- ❌ **Не «заодно» рефакторить** `src/lib/plan/render.js`, `scoring.js`, `sample-size.js` — Sprint 3 контракт, surgical changes.
- ❌ **Не добавлять** скоринговые правила для загруженных планов — после load просто RECOMPUTE_PLAN с существующими.
- ❌ **Не пытаться вычислять Python-зависимости** автоматически (например «если включён CUPED — добавить statsmodels.formula») — статический список pandas/numpy/scipy/statsmodels/matplotlib достаточен.

---

## Sprint Report — что ожидаем

В `docs/project/sprints/sprint-report-4.md` по шаблону (как Sprint 3). Особое внимание:

- **Round-trip status** — работает идеально для всех 4 metric_type? Если нет — какие поля теряются и почему.
- **Реальные числа** — размер bundle до/после js-yaml. Время сборки `.ipynb` для типичного state (~10-50ms ожидается).
- **Какие ячейки получились** — короткое описание каждой из 8: входы/выходы, edge cases.
- **Demo-csv параметры** — что заложено (Δ, novelty, distribution) для каждого из 2 файлов. Время генерации скрипта.
- **`editedExternally`** — реализовано в state + UI badge, или только в state? (зависит от того, успел ли Code).
- Phase A → Phase B порядок коммитов — отдельные `sprint-4-phase-a-*` и `sprint-4-phase-b-*` коммиты, или один большой `sprint-4-*`.
- Time tracking по фазам: PROMPT-чтение, Phase A DEV, Phase B DEV, self-test (parse + build + RUN demo notebook в Jupyter если есть возможность).

---

## Related

- `docs/context/concept.md` — основной сценарий, развилка на старте
- `docs/context/FLOW.md` — Step 2/3 поведение, demo-csv
- `docs/context/DATA_MODEL.md` — схема test_plan.md, enum-ы
- `docs/context/NOTEBOOK_TEMPLATES.md` — структура шаблонов ячеек, builder алгоритм, схема данных
- `docs/context/decisions-log.md` — ADR-001, 002, 005, 006, 007, 010
- `docs/project/sprints/sprint-report-3.md` — Sprint 3 контракт render.js (snapshot для round-trip)
- `docs/project/PROJECT_STATUS.md` — текущее состояние (Sprint 3 closed, Sprint 4 next)
