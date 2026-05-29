# Sprint 7 — Шаг 4 «Валидация и отчёт» + ipynb upload primary flow + Stepper structural rewrite

**Type:** Code main sprint (большой, ~5-6 ч)
**Estimated:** ~5-6 ч active

---

## Overview

После Sprint 6 продукт впервые делает **полный flow брифа → плана → ноутбука → точного sample-size через Data Peek**. Остаётся последняя миля — **upload выполненного `.ipynb` и генерация красивого отчёта для презентации стейкхолдерам**.

**Главная продуктовая инновация Sprint 7 (родилась в PLAN 2026-05-29):** Шаг 4 принимает **выполненный пользователем `.ipynb`** через drag-drop как **primary flow** — парсит JSON, извлекает результаты из tagged cell `stat-plan-results`, забирает matplotlib PNG графики из outputs, генерирует self-contained `report.html` для презентации + markdown `readout.md` для wiki + JSZip пакет. См. ADR-015 для контракта формата.

Это уникальный value-loop — PM прогоняет тест в Jupyter → перетаскивает ноутбук в stat·plan → получает готовый HTML отчёт за 3 секунды. Никто из конкурентов так не делает.

**Параллельно Sprint 7 закрывает ADR-013 структурный долг** — Stepper.jsx переходит с 5 на 4 шага (убирается «05 Скачать артефакты», «04 Быстрая валидация» → «Валидация и отчёт»).

**Также** включён JTBD §6 ◆ — editable expected schema на Шаге 3 (rename column / type / add-remove optional) перед скачиванием ноутбука. Это малая правка, тематически связана с notebook-builder updates.

---

## Архитектурные решения этого спринта

| ADR | Что значит для Sprint 7 |
|---|---|
| **ADR-015** | Tagged cell `stat-plan-results` с JSON output — primary path. Old ipynb (без tag) → fallback на форму. PNG из ipynb → HTML отчёт. |
| ADR-013 | 4-шаговый флоу. Stepper.jsx structural rewrite. |
| ADR-004 | Decision_rules применение даёт «Recommended next step» в readout. Поле «Принятое решение» в readout — **пустое**, заполняется руками. |
| ADR-002 (round-trip) | `.ipynb` с outputs становится переносимым артефактом для Шага 4. JSZip пакет восстанавливаем reproducibility. |
| ADR-014 (recharts) | Recharts в Шаге 4 **НЕ используется** — переиспользуем PNG из ipynb. Lazy chunk recharts остаётся только в Шаге 1 Data Peek. |
| ADR-001 (no backend) | Парсер .ipynb на клиенте через нативный JSON.parse, никаких новых deps. |

---

## Scope (13 пунктов)

### S1. Парсер `.ipynb` (новый модуль)

**Файл:** `src/lib/results/ipynb.js` (новая директория `src/lib/results/` для всей логики Шага 4).

```js
parseIpynb(text) → {
  ok: bool,
  results: {                           // из tagged cell stat-plan-results
    control_n, treatment_n,
    delta_rel, p_value, ci_lower, ci_upper,
    srm_pvalue, novelty_flag,
    guardrails: [{ name, breached, value }],
  } | null,                            // null когда tagged cell не найдена
  images: Array<{ source_cell_index, base64_png }>,  // все image/png outputs
  raw_outputs: Array<...>,             // для debugging, опционально
  warnings: string[],
  error: { message } | null,
}
```

**Алгоритм:**
1. `JSON.parse(text)` — `.ipynb` это валидный JSON по nbformat 4.
2. Iterate `notebook.cells[]`, найти `cell.metadata.tags?.includes('stat-plan-results')`.
3. Если есть — взять `cell.outputs[]`, найти output с `text/plain` или `application/json`, `JSON.parse(text)` → `results`.
4. Iterate всех ячеек, собрать все `output.data['image/png']` (base64 string без префикса `data:image/png;base64,`).
5. Если tagged cell нет → `results: null`, warning `'Не найдена ячейка с тегом stat-plan-results. Заполни числа вручную.'`.
6. Edge cases:
   - File > 50MB → reject.
   - Невалидный JSON → reject с `error.message`.
   - Tagged cell есть, но output не парсится как JSON → warning, `results: null` (fallback на форму).
   - `images: []` пустой — для manual flow OK.

**Tests** (`tests/lib/results/ipynb.test.js`): минимум 10 кейсов:
- happy path с tagged cell + 2 PNG outputs → ok: true, results заполнены, images.length === 2.
- ipynb без tagged cell → ok: true, results: null, warning о fallback.
- ipynb с tagged cell, но output не JSON → ok: true, results: null, warning.
- ipynb с tagged cell, в JSON отсутствует delta_rel → warning «missing field», results частично заполнен.
- Невалидный JSON → ok: false.
- File > 50MB → ok: false.
- Пустой `.ipynb` → ok: false.
- Tagged cell с output_type=`stream` (print stdout) vs `execute_result` (Out[N]) — оба должны работать.
- Несколько PNG outputs в разных ячейках → все в images[].
- Image как `image/jpeg` вместо `image/png` — игнорируем (только PNG).

### S2. Sample size / SRM / sanity math

**Файл:** `src/lib/results/checks.js` (новый).

```js
// SRM chi² test (already used in Sprint 6 Data Peek context)
srmCheck({ control_n, treatment_n }) → { pvalue, pass: bool }

// Sanity vs plan
sanityCheck({ results, plan }) → {
  total_n_match: bool,         // (control_n + treatment_n) ≈ 2 × sample_size_per_arm ?
  direction_match: bool,       // sign(delta_rel) совпадает с plan.mde.direction ?
  warnings: string[],
}
```

**Tests** (`tests/lib/results/checks.test.js`): ~6-8 кейсов.

### S3. decision_rules гибридный парсер

**Файл:** `src/lib/results/decision-rules.js` (новый).

```js
// Parser for simple rules from brief
parseDecisionRule(text) → {
  parsed: bool,                                      // удалось распознать?
  variable: 'ci_lower' | 'ci_upper' | 'p_value' | 'delta_rel' | null,
  operator: '>' | '<' | '>=' | '<=' | '==' | null,
  threshold: number | null,
  action: 'SHIP' | 'ITERATE' | 'KILL' | null,
  raw: string,                                       // оригинальный текст для UI
}

// Apply parsed rule against results (null когда parsed=false)
evaluateRule(rule, results) → bool | null

// High-level facade — берёт brief.decision_rules (массив строк), возвращает массив с auto-eval и raw fallback
evaluateAllRules(brief.decision_rules, results) → Array<{
  raw: string,
  parsed: bool,
  auto_eval: bool | null,        // null если parsed=false; иначе результат evaluateRule
  user_check: bool | null,       // null до того как пользователь поставил галочку
}>
```

**Шаблоны парсера (regex-based, простые):**
- `/if\s+(ci_lower|ci_upper|p_value|delta_rel)\s*(>|<|>=|<=|==)\s*([-\d.]+)\s+then\s+(SHIP|ITERATE|KILL)/i`
- Toleration: пробелы, capitalization, синонимы (`then` или `→` или `=>`)

Если не матчит → `parsed: false`, пользователь в UI отмечает галочкой сработало/нет.

**Tests:** ~10 кейсов. Match для типичных формулировок + 3-4 не-распознаваемых fallback.

### S4. UI Шага 4 — `src/pages/ValidationReportPage.jsx` (NEW)

**Layout (top-down):**

1. **Header** — title «04 — Валидация и отчёт», breadcrumb с test_id.

2. **Upload-зона** — drag-drop + file picker для `.ipynb` (паттерн как `StartScreen` для test_plan.md).

3. **Resolved state (после upload)** — три варианта:
   - **(a) ipynb с tagged cell:** показать badge `✓ Результаты извлечены из ноутбука`. Раскрываемый блок «Извлечённые числа» с парсинг JSON.
   - **(b) ipynb без tagged cell:** warning `⚠ Этот ноутбук без stat-plan-results cell. Заполни числа вручную ниже.` → форма ручного ввода становится primary.
   - **(c) Manual flow without ipynb:** пользователь нажал «У меня нет ноутбука, ввести вручную» — форма ручного ввода целиком.

4. **Форма ручного ввода / редактирования** (всегда видна, поля либо pre-filled из ipynb, либо пустые):
   - `control_n` (int)
   - `treatment_n` (int)
   - `delta_rel` (float, % relative effect)
   - `p_value` (float)
   - `ci_lower`, `ci_upper` (float, доля или %)
   - `srm_pvalue` (float, opt)
   - `novelty_flag` (checkbox)
   - `guardrails[]` (per guardrail из плана: checkbox `breached`, optional value)

5. **Autocomputed checks block:**
   - **SRM check** — pass/suspect badge с chi² pvalue.
   - **Sanity vs план** — total_n match ✓/⚠, direction match ✓/⚠.

6. **Decision rules block** — список правил из плана. Для каждого:
   - Raw text (что было написано в брифе).
   - Если parsed → auto-eval badge `auto: сработало ✓` или `auto: не сработало ⚠` (можно override).
   - Если not parsed → чек-бокс пользователя «сработало».
   - Dropdown SHIP / ITERATE / KILL — пользователь выбирает.

7. **Recommended next step** — параграф предлагаемый тулом на основе сработавших правил + выбранного dropdown'а. Это **подсказка**, не финальное решение.

8. **Preview изображений из ноутбука** — если есть `images[]` из ipynb, показать grid (max 4-6 thumbnails, кликабельный full-size lightbox).

9. **Кнопки экспорта:**
   - `↓ Скачать report.html` (single file для email/Slack)
   - `↓ Скачать readout.md` (для wiki)
   - `↓ Скачать всё (.zip)` (test_plan.md + analysis.ipynb + report.html + readout.md + optional CSV)

10. **State management:** `state.results` (новая ветка state) с пред-заполнением из ipynb, оверрайды из формы, computed checks.

### S5. HTML one-pager `report.html` template

**Файл:** `src/lib/results/report-html.js` (NEW).

Функция:
```js
buildReportHtml(state) → string  // полный HTML файл
```

**Структура HTML (single self-contained file):**

```html
<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>{test_id} — A/B Test Report</title>
  <style>/* inline CSS — без зависимостей, тёмная тема, ~3KB */</style>
</head><body>
  <header>
    <h1>{test_id}</h1>
    <p>{title}, {created_date}</p>
  </header>

  <section id="tldr">
    <h2>TL;DR</h2>
    <p>{auto-generated paragraph: Δ = X%, CI [Y..Z], p = P, decision = SHIP/ITERATE/KILL/—}</p>
  </section>

  <section id="hypothesis">
    <h2>Гипотеза и дизайн</h2>
    <p>{hypothesis_text}</p>
    <table><tr><td>Метрика</td><td>{metric_name}</td></tr>...</table>
  </section>

  <section id="results">
    <h2>Результаты</h2>
    <ul>
      <li>Δ rel = {delta_rel}%, 95% CI [{ci_lower}..{ci_upper}]</li>
      <li>p-value = {p_value}</li>
      <li>n control = {control_n}, n treatment = {treatment_n}</li>
    </ul>
    <!-- Графики из ноутбука -->
    {images.map(img => `<img src="data:image/png;base64,${img.base64_png}" />`)}
  </section>

  <section id="sanity">
    <h2>Sanity checks</h2>
    <ul>
      <li>{srm_check.pass ? '✓' : '⚠'} SRM: p = {srm_pvalue}</li>
      <li>{sanity.total_n_match ? '✓' : '⚠'} Sample size vs план</li>
      <li>{sanity.direction_match ? '✓' : '⚠'} Направление эффекта vs MDE direction</li>
    </ul>
  </section>

  <section id="decision-rules">
    <h2>Применение decision rules</h2>
    {rules.map(r => `<li>${r.raw} → ${r.user_check ? 'сработало' : 'не сработало'}</li>`)}
    <p><strong>Recommended next step:</strong> {auto_recommendation}</p>
  </section>

  <section id="final-decision">
    <h2>Принятое решение</h2>
    <p style="color: gray; font-style: italic;">[Заполни вручную]</p>
  </section>

  <footer>Generated by stat·plan {date}</footer>
</body></html>
```

**Стилизация:** inline CSS, ~3-5 KB. Тёмная палитра под stat·plan (background `#0e1014`, accent `#a3e635`, text `#ededed`). Responsive — fits 800-1200px viewport.

**Tests** (`tests/lib/results/report-html.test.js`): ~5-7 кейсов.
- Snapshot test: HTML string содержит все секции, все числа подставлены, нет `{{undefined}}`.
- PNG inline embedding works (base64 без `data:` префикса прибавляется).
- Manual flow без images → секция «Результаты» без `<img>`, есть textual описание.
- Edge: пустой brief / отсутствующие поля → graceful (no crashes).

### S6. Markdown readout.md

**Файл:** `src/lib/results/readout-md.js` (NEW) + новый шаблон `templates/readout.md.tmpl`.

```js
buildReadoutMd(state) → string  // markdown с YAML frontmatter
```

YAML frontmatter:
```yaml
---
test_id: ...
created: ...
status: completed
results:
  delta_rel: ...
  p_value: ...
  # etc
decision: ""           # ВСЕГДА пустое, заполняется руками
---

# {title}

## TL;DR
...

## Results
...

## Sanity checks
...

## Decision rules application
...

## Recommended next step
...

## Decision
_To be filled manually._
```

**Tests**: ~3-5 кейсов.

### S7. JSZip bundle export

**Файл:** `src/lib/results/zip.js` (NEW).

```js
buildZip(state) → Promise<Blob>  // через JSZip
```

**Содержимое архива:**
- `test_plan.md` (re-render из state)
- `analysis.ipynb` (uploaded user file, raw — с outputs)
- `report.html` (generated via report-html.js)
- `readout.md` (generated via readout-md.js)
- (опционально) `experiment_results.csv` если был загружен как peek helper в Шаге 1

**Имя архива:** `{test_id}_{date}.zip`.

**Зависимость:** `npm install jszip` (~30 KB gzip, новая npm-deps — упомянуть в Sprint Report).

**Tests** (`tests/lib/results/zip.test.js`): ~3-4 кейса (содержимое архива, имя файла, опциональный CSV).

### S8. Reducer extensions

**Файл:** `src/state/reducer.js` — добавить:

- `state.results` (новая ветка):
  ```js
  {
    source: 'ipynb' | 'manual' | null,
    raw_results: {...},          // из ipynb parser
    user_overrides: {...},       // правки в форме
    images: [...],
    rules_eval: [...],           // array от evaluateAllRules
    user_decision: null,         // dropdown SHIP/ITERATE/KILL
    ipynb_filename: string | null,
    warnings: string[],
  }
  ```
- Actions:
  - `UPLOAD_IPYNB` payload `{ parsed, images, ipynb_filename }`.
  - `SET_RESULTS_FIELD` payload `{ field, value }`.
  - `TOGGLE_RULE_CHECK` payload `{ rule_index, checked }`.
  - `SET_USER_DECISION` payload `{ decision }`.
  - `RESET_RESULTS`.

**Tests** (`tests/state/reducer.test.js`): +5-6 case.

### S9. Stepper structural rewrite (ADR-013)

**Файл:** `src/components/Stepper.jsx`.

Изменения:
- `STEPS` array: убрать пункт `{ num: '05', label: 'Скачать артефакты' }`. 
- Переименовать `{ num: '04', label: 'Быстрая валидация' }` → `{ num: '04', label: 'Валидация и отчёт', route: '/step4' }`.
- `isStepUnlocked(4, ...)` — для Шага 4 проверить `planStatus === 'approved'` (после approve plan можно идти и в конструктор, и в Шаг 4).

**Files involved:**
- `Stepper.jsx`
- `App.jsx` — routes: убрать step5 route (если есть), step4 route → `ValidationReportPage`.
- Tests: обновить snapshot если есть.

### S10. Notebook-builder update (Sprint 6 carryover)

**Файл:** `src/lib/plan/notebook-builder.js`.

**Изменения:**

1. **Добавить финальную export-cell** с метатэгом `stat-plan-results`:
   ```js
   {
     cell_type: 'code',
     metadata: { tags: ['stat-plan-results'] },
     source: [/* python code с результатами export */],
     ...
   }
   ```
   Шаблон ячейки можно вынести в `templates/notebook/export.cells.json`.
   Python код: вычисляет dict с control_n, treatment_n, delta_rel, p_value, ci_lower, ci_upper, srm_pvalue, novelty_flag, guardrails[] (из переменных, заданных в предыдущих ячейках через placeholders) + `print(json.dumps(...))`.

2. **Добавить кастомные `plt.rcParams`** в шаблон ноутбука (например в load.cells.json или новой first-cell):
   ```python
   import matplotlib.pyplot as plt
   plt.rcParams.update({
       'figure.facecolor': '#0e1014',
       'axes.facecolor': '#1a1d23',
       'axes.edgecolor': '#3a3f47',
       'axes.labelcolor': '#ededed',
       'text.color': '#ededed',
       'xtick.color': '#a8a8a8',
       'ytick.color': '#a8a8a8',
       'grid.color': '#2a2d33',
       'axes.prop_cycle': plt.cycler('color', ['#a3e635', '#60a5fa', '#fbbf24', '#f87171']),
   })
   ```
   Это даёт matplotlib графикам тёмную палитру под stat·plan.

3. **Tests** (`tests/lib/plan/notebook-builder.test.js`): +2-3 case на наличие export-cell с tag, на наличие plt.rcParams в первой ячейке.

### S11. Editable expected schema на Шаге 3 (JTBD §6 ◆)

**Файл:** `src/components/notebook/ExpectedSchemaCard.jsx`.

UI расширение:
- Каждая строка таблицы — inputs для rename column / change type (dropdown с типами `int`, `int (0/1)`, `float`, `string`).
- Для optional колонок (day, geo): toggle включить/выключить.
- Edit-action: dispatch `SET_SCHEMA_OVERRIDE` reducer action → сохраняется в `state.notebook_config.schema_overrides`.
- При генерации `.ipynb` (notebook-builder.js): применяет overrides — переименовывает колонки в Python коде шаблонов через placeholder substitution.

**Files involved:**
- `ExpectedSchemaCard.jsx`
- `notebook-builder.js` — apply schema_overrides при substitute placeholders.
- `state/reducer.js` — new action `SET_SCHEMA_OVERRIDE`.
- `state/storage.js` — `notebook_config.schema_overrides` в persisted shape.

**Tests:** +3 case в `notebook-builder.test.js` + 1-2 в `reducer.test.js`.

### S12. ADR-015 update в DATA_MODEL.md

**Файл:** `docs/context/DATA_MODEL.md` (Cowork-зона — **НЕ Code**, делается в CLOSE!).

Это **Cowork-задача в CLOSE Sprint 7** — задокументировать схему `stat-plan-results` JSON output из ADR-015. Code в этом sprint ничего не делает в DATA_MODEL.md.

### S13. UI чек: маршрутизация после approve plan

**Файл:** `src/pages/PlanPage.jsx` (или эквивалент) + `src/components/Stepper.jsx`.

После approve plan — Шаг 3 (конструктор) и Шаг 4 (валидация и отчёт) **оба** разблокированы. UX подсказка пользователю: «План утверждён → можно идти в конструктор за ноутбуком ИЛИ сразу в валидацию (если ноутбук уже выполнен)».

Минимальный fix: оба шага в Stepper показывают active state после approve. На странице approve plan — две CTA: «↓ К конструктору ноутбука» (primary как сейчас) и «↑ У меня уже есть выполненный ноутбук →» (secondary).

---

## Что НЕ делаем (DO NOT)

- ❌ **Не пересчитываем** delta_rel / p_value / CI на стороне stat·plan. Числа берём из ipynb tagged cell или из формы. Это **circular validation** (ADR-012/ADR-013).
- ❌ **Не делаем** independent validation через CSV пересчёт. CSV в Шаге 4 не используется (только в Шаге 1 как peek helper).
- ❌ **Не пытаемся** перерисовать графики через recharts в HTML отчёте — используем PNG из ipynb. (Recharts остаётся только в Шаге 1.)
- ❌ **Не используем** ReactDOMServer.renderToString для SVG export — лишний bundle, потенциальные баги.
- ❌ **Не подключаем** новые charting libs.
- ❌ **Не парсим** stdout без tagged cell — фрагильно. Если ipynb без tag → fallback на форму с warning.
- ❌ **Не модифицируем** ADR-002 контракт test_plan.md — он остаётся как есть.
- ❌ **Не трогаем** Sprint 6 backend (`data-peek/*`) — Шаг 4 ортогонален Data Peek.
- ❌ **Не делаем** PDF export через html2pdf — пользователь может `Ctrl+P → Save as PDF` в браузере из `report.html`. Это бесплатно и достаточно.
- ❌ **Никаких** UI/RTL тестов — только Vitest unit-тесты (как и в Sprint 1-6).
- ❌ **Не трогаем** Cowork-зону (`docs/**`, `CLAUDE.md`, `README.md`).

---

## Files involved

**Создаём (новые):**
- `src/lib/results/ipynb.js` (S1)
- `src/lib/results/checks.js` (S2)
- `src/lib/results/decision-rules.js` (S3)
- `src/lib/results/report-html.js` (S5)
- `src/lib/results/readout-md.js` (S6)
- `src/lib/results/zip.js` (S7)
- `src/pages/ValidationReportPage.jsx` (S4)
- `src/components/results/IpynbUpload.jsx` (S4)
- `src/components/results/ResultsForm.jsx` (S4)
- `src/components/results/ChecksBlock.jsx` (S4)
- `src/components/results/DecisionRulesBlock.jsx` (S4)
- `src/components/results/ImagesGallery.jsx` (S4)
- `src/components/results/ExportButtons.jsx` (S4)
- `templates/notebook/export.cells.json` (S10)
- `templates/readout.md.tmpl` (S6)
- `tests/lib/results/{ipynb,checks,decision-rules,report-html,readout-md,zip}.test.js`

**Модифицируем:**
- `package.json` + `package-lock.json` — `+ jszip`
- `src/state/reducer.js` (S8 — state.results + actions)
- `src/components/Stepper.jsx` (S9 structural rewrite)
- `src/App.jsx` (S9 routes update)
- `src/lib/plan/notebook-builder.js` (S10 export-cell + plt.rcParams)
- `templates/notebook/load.cells.json` (S10 — plt.rcParams в первой ячейке)
- `src/components/notebook/ExpectedSchemaCard.jsx` (S11 editable schema)
- `src/lib/storage.js` (S11 schema_overrides в persisted shape)
- `src/pages/PlanPage.jsx` (S13 secondary CTA «у меня есть ноутбук»)
- `tests/state/reducer.test.js` (S8 + S11)
- `tests/lib/plan/notebook-builder.test.js` (S10 + S11)

**Не трогаем:**
- `src/lib/data-peek/*`, `src/lib/brief/*`, `src/lib/plan/{sample-size,scoring,parse,render}.js` — Sprint 6 контракты, не задеваем.
- `Stepper.jsx isStepUnlocked` — minimal change для S9.

---

## Technical Notes

### .ipynb структура (nbformat 4)

Quick reference. `.ipynb` — JSON c top-level keys:
```json
{
  "cells": [...],
  "metadata": {"kernelspec": {...}, "language_info": {...}},
  "nbformat": 4,
  "nbformat_minor": 5
}
```

Каждая cell:
```json
{
  "cell_type": "code" | "markdown",
  "source": "...",  // или ["line1\n", "line2\n"] для multi-line
  "metadata": {"tags": [...]},
  "execution_count": int | null,
  "outputs": [
    {
      "output_type": "execute_result" | "stream" | "display_data" | "error",
      "data": {
        "text/plain": "..." | [...],
        "text/html": "..." | [...],
        "image/png": "base64-string-without-data-prefix",
        "application/json": {...}
      },
      "metadata": {},
      "execution_count": int | null
    }
  ]
}
```

### Backward compat для Sprint 6 .ipynb

Old ноутбуки (Sprint 6 main + FIX iter 1/2) **не имеют** export-cell. Парсер находит `results: null` → UI показывает warning «Это ноутбук без stat-plan-results cell» + переходит на форму ручного ввода. **PNG графики** из ipynb всё равно извлекаются (если они есть) — embed в HTML отчёт работает даже без tagged cell.

### Bundle estimation

- `jszip` — ~30 KB gzip
- `src/lib/results/*` — ~10-15 KB gzip (parser + html + md + zip + decision-rules + checks)
- `src/components/results/*` — ~10-15 KB gzip
- ipynb parser работает с native JSON.parse — никаких deps.
- **Total expected:** initial bundle +25-30 KB gzip + lazy `jszip` chunk +30 KB gzip (загружается на клик «Скачать»).

Возможна оптимизация: jszip через `await import('jszip')` динамически (как papaparse в Sprint 6) → +0 KB initial.

### plt.rcParams в шаблоне ноутбука — детали

Применить **в первой ячейке** (load.cells.json) после `import matplotlib.pyplot as plt`. Это глобально для всего ноутбука. PM с custom стилем сможет override (просто игнорируем — мы не контролируем что пользователь делает в ноутбуке).

### Editable schema — backward compat

Existing `notebook_config.schema_overrides` отсутствует в old localStorage → reducer ставит `{}` дефолтом. notebook-builder при apply checks `schema_overrides[original_column_name] ?? original_column_name`. Backward compat безболезненный.

### ADR-015 контракт versioning

В JSON output от tagged cell можно добавить `schema_version: 1` для будущей миграции. **Минор**: пока пропускаем, добавим если будет вторая версия.

---

## Acceptance criteria

1. `npm test` зелёный. **+30-40 новых тестов** (S1 ~10, S2 ~6, S3 ~10, S5 ~5, S6 ~3, S7 ~3, S8 ~5, S10 ~3, S11 ~3). Total: **~370+**.
2. `npm run build` чистый. Initial bundle delta **≤ +30 KB gzip** (jszip optional lazy → +0; иначе +30 KB).
3. **Round-trip status:** Sprint 6 6/6 canonical case остаются зелёными — Шаг 4 ортогонален data_peek.
4. **Browser smoke (~15 минут):**
   - **ipynb upload primary:** прогнать тест на demo CSV, выполнить ноутбук в Jupyter, drag-drop `.ipynb` на /step4. Видим: badge `✓ Результаты извлечены`, форма pre-filled из tagged cell, PNG графики в gallery preview, sanity checks автозаполнены.
   - **Скачать `report.html`** → открыть в браузере → видим стилизованный one-pager со всеми секциями + matplotlib PNG inline.
   - **Скачать `readout.md`** → открыть → markdown с YAML frontmatter и секциями.
   - **Скачать `.zip`** → распаковать → 4 файла (test_plan.md, analysis.ipynb, report.html, readout.md).
   - **Fallback ручной ввод:** drag-drop old Sprint 6 ipynb (без tag) → warning, форма пустая, заполнить руками → HTML отчёт без PNG но с текстом.
   - **Editable schema (Шаг 3):** rename колонки `arpu` → `arpu_value` → скачать ipynb → код использует `df['arpu_value']`.
   - **Stepper 4 шага:** на любой странице — Stepper показывает только 4 шага. После approve plan — Шаг 4 разблокирован.

---

## Sprint Report — что ожидаем

В `docs/project/sprint-report-7.md` (по шаблону Sprint 6):

- **Trace-ability** для S1..S13: каждый → файлы/строки/тесты/коммиты.
- **Bundle delta** initial vs lazy chunks (jszip lazy?).
- **ipynb parser robustness** — какие edge cases обработал, какие выявил при разработке.
- **plt.rcParams design** — финальная палитра matplotlib (после согласования визуально).
- **HTML one-pager design** — структура секций, стилизация (скриншот или 5-10 строк CSS).
- **Decision rules parser coverage** — какие regex шаблоны поддерживаются, какие fallback'ы.
- **Stepper rewrite** — точные diffы STEPS + isStepUnlocked.
- **Editable schema sync с notebook-builder** — как именно schema_overrides применяются в placeholder substitution.
- **Backward compat verification** — старый Sprint 6 ipynb загружается без crash, fallback работает.
- **Round-trip 6/6 остаётся** — подтвердить.
- **Time tracking** — ожидаемый total ~5-6 ч.

---

## Related

- `docs/context/decisions-log.md` — **ADR-015 Accepted** (notebook results export format), ADR-013 (4-шаговый флоу), ADR-004 (тул не принимает решений).
- `docs/project/JTBD.md §7` — user stories для Шага 4 (10 stories — все реализуются в этом sprint).
- `docs/project/JTBD.md §6 ◆` — editable schema story (S11).
- `docs/project/PROJECT_STATUS.md` — обновится в CLOSE Sprint 7.
- `docs/context/FLOW.md §«Шаг 4»` — уже описывает новый flow (Sprint 5 CLOSE) — будет немного скорректирован в CLOSE Sprint 7 под ipynb upload primary.
- `docs/context/DATA_MODEL.md` — обновится в CLOSE Sprint 7 разделом «Notebook results export schema» (ADR-015).
- `docs/project/sprint-report-6.md` + Sprint 6 FIX reports — контекст backend hooks для Шага 4.
