# Sprint 7 FIX iter 2 — Novelty N/A + TL;DR units + Step 3 nav + Decision rules parser

**Type:** Code FIX iter 2 (фокусная зачистка)
**Estimated:** ~1-1.5 ч active
**Источник:** QA сценариев A + B после FIX iter 1 (см. screenshots + материалы в чате). 4 P1/P2-issue найдены при ручной проверке.

---

## Overview

FIX iter 1 закрыл 3 функциональных gap'а (графики, significant, novelty visible). При real-data smoke на e2e_a (`cr_first_deposit-v1`, duration=2 days, n=4500/4500) обнаружились 3 minor UX-issue:

**BUG-7F1 — Novelty False-positive «✓ not detected».** Когда novelty cell skipped (guard `duration_days < 3` в `notebook-builder.js`) — её просто нет в ноутбуке. Но export-cell сейчас делает `_safe(globals().get('novelty_flag'), False)` → пишет `novelty_flag: false`. /step4, HTML, MD рисуют **зелёный badge «✓ Novelty: not detected»**. Это **misleading**: проверки не было, но юзер видит «всё ок». Корректное поведение — показывать «N/A — нет данных» (uneutral badge), как мы уже умеем для null.

**BUG-7F2 — TL;DR unlabeled units.** В readout.md и report.html TL;DR-строка вида `Δ rel = 28.06%, 95% CI [0.0011…0.0163], p = 0.0257` (Scenario A) или `Δ rel = 1.64%, 95% CI [-1.1353…4.5771]` (Scenario B). Без явных labels пользователь не понимает что значит `ci_lower/upper`:

| metric_type | `ci_lower/upper` семантика | Пример |
|---|---|---|
| proportion | абс. разность долей | 0.001 = +0.1 pp |
| continuous | абс. разность means в ед. метрики | 1.13 ₽ |
| ratio | абс. разность ratio | 0.05 |

**НЕ** конвертируем `* 100` (это работало бы только для proportion — для continuous даст бессмыслицу `-1.1353 * 100 = -113.53%`). Просто **добавляем explicit label** что это — абсолютная разность в единицах метрики.

**BUG-7F3 — Нет явной кнопки перехода на /step4 со /step3.** В `NotebookBuilderPage.jsx` footer: только `← К ПЛАНУ` (back) и `↓ СКАЧАТЬ ...ipynb` (primary). После скачивания пользователь не знает что делать дальше — нужно либо клик в Stepper в шапке, либо угадать. По логике flow: скачал → пошёл прогонять (часы/дни) → вернулся в тул → должна быть навигация. Сейчас навигации нет.

**BUG-7F4 — Decision rules parser слишком узкий.** Текущий regex `(ci_lower|ci_upper|p_value|delta_rel)\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)` НЕ ловит реальные user-форматировки:
- `Guardrail breach или CI ≤ −5% rel.` — `CI` без `_lower/_upper`, unicode `≤`, unicode `−` (minus sign U+2212, не ASCII), суффикс `%` и `rel.` — **не парсится → rule «не оценено».**
- `CI не пересекает 0 и нижняя граница ≥ +5% rel.` — `нижняя граница` русским языком вместо `ci_lower`, `≥` — **не парсится.**

В обоих сценариях A + B все 3 правила (SHIP/ITERATE/KILL) показаны как «не оценено» — auto-eval не работает. User видит «recommendation» только если **вручную** ставит галки. Это лишает auto-evaluation смысла.

**Цель iter 2:** четыре фикса — поднять автоматизацию decision-rules + закрыть UX-tail.

---

## Scope (G-1..G-4)

### G-1. Novelty `_safe` default → `None` + UI/HTML/MD корректно показывают N/A

#### G-1a. `templates/notebook/export.cells.json`

Заменить:
```python
'novelty_flag': _safe(globals().get('novelty_flag'), False),
```
на:
```python
'novelty_flag': _safe(globals().get('novelty_flag'), None),
```

(Если novelty cell выполнилась — `novelty_flag` будет `True`/`False`, попадёт корректно. Если skipped — `None`.)

Также добавить **в начале novelty.cells.json code-ячейки** explicit `novelty_flag = None` initialization, на случай если novelty cell включена, но `lift_early`/`lift_later` оба None (нет данных для дней early или later) — тогда условие `bool(lift_early is not None and lift_later is not None and ...)` даст False, что **тоже misleading** (не «no novelty», а «нет данных»). Точнее:

```python
# novelty.cells.json — изменить логику:
novelty_flag = None  # default: проверки не было
if lift_early is not None and lift_later is not None:
    novelty_flag = bool(abs(lift_early - lift_later) > 0.5 * abs(lift_later or 1))
    if novelty_flag:
        print('NOVELTY suspected — early lift differs by >50% relative from later days')
```

Тогда `novelty_flag` строго трёхзначен: `True` / `False` / `None`.

#### G-1b. UI/HTML/MD — никаких правок

`ResultsForm.jsx:98-127` уже корректно различает `true` / `false` / `null` (`bg-bg-elev-2 text-fg-dim` для null = «N/A — нет данных»). 
`report-html.js:117-124` уже скрывает badge при `novelty_flag != true && != false`.
`readout-md.js:83-87` — то же.

То есть достаточно G-1a — UI станет корректным автоматически.

#### G-1c. Tests

- `tests/lib/results/report-html.test.js` — добавить case: `novelty_flag: null` → нет `<div class="novelty-badge"` в выходе. (Уже есть подобный case по отчёту iter 1 — проверить и/или дополнить.)
- `tests/lib/results/readout-md.test.js` — case: `novelty_flag: null` → нет bold line в TL;DR.
- `tests/lib/plan/notebook-builder.test.js` — case: export-cell содержит `'novelty_flag': _safe(globals().get('novelty_flag'), None)` (с `None`, не `False`).

### G-2. TL;DR units honest labels (без конверсии)

**Принцип:** ничего НЕ умножаем. CI выводим в raw decimal как есть (это абсолютная разность в единицах метрики). Добавляем явный label что это абсолютная разность и в каких единицах. Берём имя метрики из `brief.metric_label` или fallback `brief.metric_name`.

#### G-2a. `src/lib/results/report-html.js` — TL;DR-строка

**Current** (`buildTldr` функция):
```js
return `Δ rel = ${delta}, 95% CI [${ciLow}…${ciHigh}], p = ${p}. Решение: <strong>${esc(decisionStr)}</strong>.`
```

**New:**
```js
const metricLabel = state?.brief?.metric_label || state?.brief?.metric_name || 'ед. метрики'
const metricType = state?.brief?.metric_type
const ciNote =
  metricType === 'proportion'
    ? 'абс. разность долей'
    : metricType === 'continuous'
      ? `абс. разность, ед. ${metricLabel}`
      : metricType === 'ratio'
        ? 'абс. разность ratio'
        : 'абс. разность'
return `Δ rel = <strong>${delta}</strong>, 95% CI [${ciLow}…${ciHigh}] <em>(${ciNote})</em>, p = ${p}. Решение: <strong>${esc(decisionStr)}</strong>.`
```

**Примеры результата:**
- Scenario A (proportion, cr_first_deposit):
  `Δ rel = 28.06%, 95% CI [0.0011…0.0163] (абс. разность долей), p = 0.0257. Решение: SHIP.`
- Scenario B (continuous, ARPU):
  `Δ rel = 1.64%, 95% CI [-1.1353…4.5771] (абс. разность, ед. ARPU), p = 0.2377. Решение: KILL.`

**Никакого `* 100`** — это сломало бы continuous metrics.

#### G-2b. `src/lib/results/readout-md.js` — TL;DR-строка

Аналогично:
```js
const metricLabel = state?.brief?.metric_label || state?.brief?.metric_name || 'ед. метрики'
const metricType = state?.brief?.metric_type
const ciNote =
  metricType === 'proportion'
    ? 'абс. разность долей'
    : metricType === 'continuous'
      ? `абс. разность, ед. ${metricLabel}`
      : metricType === 'ratio'
        ? 'абс. разность ratio'
        : 'абс. разность'
lines.push(
  `Δ rel = **${fmtNum(eff.delta_rel, 2)}%**, 95% CI [${fmtNum(eff.ci_lower, 4)}…${fmtNum(eff.ci_upper, 4)}] _(${ciNote})_, p = ${fmtNum(eff.p_value, 4)}.`,
)
```

#### G-2c. `templates/notebook/main_test/{z_test,t_test,welch,bootstrap}.cells.json` — title графика

**Current** (4 файла, идентичный блок):
```python
ax.set_title(f'Δrel = {delta_rel:+.2f}%   CI95 [{ci_lower:+.4f}, {ci_upper:+.4f}]   p = {p_value:.4f}')
```

**New** (без `* 100`, но с явной labels):
```python
ax.set_title(f'Δrel = {delta_rel:+.2f}%   CI95 (абс. разность) [{ci_lower:+.4f}, {ci_upper:+.4f}]   p = {p_value:.4f}')
```

Не различаем metric_type в Python (нет contextа). Просто общий label `(абс. разность)` — pretty clear что это **разность**, не %.

#### G-2d. Tests

- `tests/lib/results/report-html.test.js` — +2 case:
  - `metric_type: 'proportion'` → TL;DR содержит `(абс. разность долей)`.
  - `metric_type: 'continuous', metric_label: 'ARPU'` → TL;DR содержит `(абс. разность, ед. ARPU)`.
- `tests/lib/results/readout-md.test.js` — +1 case (continuous + ARPU label).
- `tests/lib/plan/notebook-builder.test.js` — +1 case: title z_test содержит подстроку `CI95 (абс. разность)`.

**НЕ хочу:** проверять что `ci_lower` умножен на 100 — этого больше НЕТ.

### G-3. Step 3 → Step 4 навигация

#### G-3a. `src/pages/NotebookBuilderPage.jsx` — добавить secondary кнопку «К валидации →»

**Current** (`src/pages/NotebookBuilderPage.jsx:79-98`):
```jsx
<StepFooter
  back={
    <button ... onClick={() => navigate('/step2')}>
      ← К ПЛАНУ
    </button>
  }
  primary={
    <button ... onClick={handleDownload}>
      ↓ СКАЧАТЬ {built.filename.toUpperCase()}
    </button>
  }
/>
```

**Нужно:** добавить secondary action «К валидации и отчёту →». Два варианта реализации в зависимости от того, поддерживает ли `StepFooter` `secondary` slot:

**Вариант A — StepFooter поддерживает `secondary` slot** (предпочтительный):

```jsx
<StepFooter
  back={...}
  secondary={
    <button
      type="button"
      onClick={() => navigate('/step4')}
      className="mono-label text-fg border border-border rounded-md px-4 py-3 hover:bg-bg-elev-2 transition-colors cursor-pointer text-sm"
    >
      К ВАЛИДАЦИИ →
    </button>
  }
  primary={...}
/>
```

**Вариант B — StepFooter НЕ поддерживает secondary** (если single slot для right side):
- Либо расширить `StepFooter.jsx` чтобы принимал массив или secondary prop (минимальная правка)
- Либо вкомпоновать secondary рядом с primary через flex inline: завернуть текущий `primary` в `<div className="flex items-center gap-3"> {secondary} {primary} </div>`

Code сам решает в зависимости от того, как сейчас устроен `StepFooter`. Главное — **secondary визуально менее prominent** чем primary download (нужно явно отделить «main next action» = скачать от «навигация дальше»).

**Tailwind palette для secondary:**
- border: `border border-border`
- text: `text-fg` (не accent — не должен «конкурировать» с primary)
- hover: `hover:bg-bg-elev-2`
- size: `px-4 py-3 text-sm` (немного меньше primary `px-6 py-3 text-base`)

#### G-3b. UX-логика

- Кнопка **всегда видна** (даже если пользователь ещё не скачал ipynb) — некоторые users захотят посмотреть как Step 4 выглядит до прогона. Это не «destructive» — просто навигация.
- НЕ блокируется состоянием `built` — если ipynb ещё не построен, кнопка всё равно работает (показывает пустой /step4, который и сам умеет обработать «нет результатов»).
- На /step4 пользователь увидит upload-зону «Перетащи .ipynb сюда» — это естественный CTA.

#### G-3c. (Опционально) Аналогичный pattern на других страницах

Не в скоупе iter 2, но **для отметки в backlog**: проверить что /step1 (BriefPage) и /step2 (PlanPage) тоже имеют чёткие «вперёд» кнопки. На /step1 финальная кнопка — «Готово» (запустит /step2). На /step2 — «Утвердить план / К конструктору». **Не трогать сейчас.**

#### G-3d. Tests

UI без unit-tests (конвенция). Smoke-проверка вручную в browser smoke (см. Acceptance criteria).

### G-4. Decision rules parser — расширить для реальных user-форматов

**Цель:** парсить правила в стиле PM, не только узкие `ci_lower >= 5`.

#### G-4a. `src/lib/results/decision-rules.js` — `parseDecisionRule`

**Текущий regex** (`src/lib/results/decision-rules.js:12`):
```js
const COND_REGEX = /(ci_lower|ci_upper|p_value|delta_rel)\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)/i
```

**Что добавить:**

**1. Unicode normalization preprocessing.** Перед matching заменить:
```js
const normalized = raw
  .replace(/[≤]/g, '<=')   // ≤ U+2264 → <=
  .replace(/[≥]/g, '>=')   // ≥ U+2265 → >=
  .replace(/[−–—]/g, '-')  // − U+2212, – U+2013, — U+2014 → -
  .replace(/\s+/g, ' ')         // collapse whitespace
```

**2. Расширенный regex с CI aliases.** Перечислить альтернативные варианты variable:
```js
const VARIABLE_GROUP = '(ci_lower|ci_upper|p_value|delta_rel|ci\\s+lower|ci\\s+upper|нижняя\\s+граница|верхняя\\s+граница|ci)'
const COND_REGEX = new RegExp(
  VARIABLE_GROUP +
  '\\s*(>=|<=|==|>|<)\\s*' +
  '([+-]?\\d+(?:\\.\\d+)?)' +     // допускаем +5, -2.5 и т.п.
  '\\s*%?\\s*(?:rel|rel\\.|relative|%)?',  // допускаем % rel, % relative, % после числа
  'i'
)
```

(Опционально: чтобы не тащить `RegExp` constructor, можно собрать literal — но constructor читабельнее.)

**3. Variable mapping с semantic CI logic.**

```js
function normalizeVariable(rawVar, operator) {
  const v = rawVar.toLowerCase().replace(/\s+/g, '_')  // 'ci lower' → 'ci_lower'
  // Прямые совпадения
  if (['ci_lower', 'ci_upper', 'p_value', 'delta_rel'].includes(v)) return v
  // Русские
  if (v === 'нижняя_граница') return 'ci_lower'
  if (v === 'верхняя_граница') return 'ci_upper'
  // Bare 'ci' — semantic mapping по оператору
  if (v === 'ci') {
    // CI ≤ X = «весь CI ниже X» = ci_upper ≤ X (strong negative для KILL)
    // CI ≥ X = «весь CI выше X» = ci_lower ≥ X (strong positive для SHIP)
    if (operator === '<=' || operator === '<') return 'ci_upper'
    if (operator === '>=' || operator === '>') return 'ci_lower'
    // == и прочее — неоднозначно, fallback на ci_lower
    return 'ci_lower'
  }
  return null
}
```

**4. Финальный `parseDecisionRule`:**
```js
export function parseDecisionRule(text) {
  const raw = (text ?? '').toString()
  const result = { parsed: false, variable: null, operator: null, threshold: null, raw }
  if (!raw.trim()) return result
  const normalized = raw
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, ' ')
  const m = normalized.match(COND_REGEX)
  if (!m) return result
  const variable = normalizeVariable(m[1], m[2])
  if (!variable) return result
  const operator = m[2]
  const threshold = Number(m[3])
  if (!Number.isFinite(threshold)) return result
  return { parsed: true, variable, operator, threshold, raw }
}
```

**`evaluateRule` и `evaluateAllRules` НЕ трогаем** — они работают на нормализованных variable/operator/threshold, всё уже в правильном формате.

#### G-4b. Acceptance — какие правила теперь должны парситься

Минимальный список (cover-all для QA):

| Правило (raw) | Должно парситься как |
|---|---|
| `ci_lower >= 5` | `ci_lower >= 5` |
| `CI ≥ +5% rel.` | `ci_lower >= 5` (`≥` → `>=`, bare CI с `>=` → ci_lower) |
| `Нижняя граница ≥ +5% rel.` | `ci_lower >= 5` |
| `CI ≤ −2.5% rel.` | `ci_upper <= -2.5` (`≤` → `<=`, `−` → `-`, bare CI с `<=` → ci_upper) |
| `Верхняя граница <= -2.5%` | `ci_upper <= -2.5` |
| `p_value < 0.05` | `p_value < 0.05` |
| `delta_rel > 5%` | `delta_rel > 5` |
| `Статистически незначимо, но направление positive в 2+ сегментах — итерируем.` | НЕ парсится → manual (это semantic, не комп. условие) |
| `Guardrail breach или CI ≤ −5% rel.` | `ci_upper <= -5` (regex берёт первое сопоставление CI; condition `Guardrail breach` остаётся в `raw` для display, но не парсится — это OK для MVP) |

#### G-4c. Известное ограничение (documented в коде + UI hint)

**Mismatch единиц.** Правило `CI ≤ −2.5% rel.` в state хранит сравнение `ci_upper <= -2.5`. Но `ci_upper` хранится **в абсолютных единицах** (доли для proportion, валюта для continuous). Сравнение работает корректно **только если** user пишет threshold в той же единице (для proportion `-0.025` = −2.5%, для continuous — абсолютная разность в ед. метрики).

**Что делать в этом iter:** добавить подсказку в `ResultsForm.jsx` рядом с decision rules секцией: маленький текст `ⓘ threshold сравнивается с ci_lower/ci_upper в абс. единицах метрики. Для % rel правил конвертация на стороне пользователя` (или эквивалент).

**Что НЕ делаем** в этом iter (Sprint 8 / polish v2): автоматическая конверсия `% rel ↔ абс` по baseline. Это требует canonical binding `control_mean` во всех main_test cells + derived fields в effective.js + UI exposure of conversion. Отдельный concern.

#### G-4d. Tests

`tests/lib/results/decision-rules.test.js` (+5-7 cases):
- `parseDecisionRule('CI ≥ +5% rel.')` → `{parsed: true, variable: 'ci_lower', operator: '>=', threshold: 5}`
- `parseDecisionRule('Нижняя граница ≥ +5% rel.')` → то же
- `parseDecisionRule('CI ≤ −2.5% rel.')` → `{parsed: true, variable: 'ci_upper', operator: '<=', threshold: -2.5}`
- `parseDecisionRule('Верхняя граница <= -2.5%')` → то же
- `parseDecisionRule('Guardrail breach или CI ≤ −5% rel.')` → парсится condition CI, остальное в raw
- `parseDecisionRule('Статистически незначимо, но направление positive')` → `{parsed: false, ...}`
- `evaluateRule({variable:'ci_upper', operator:'<=', threshold:-2.5}, {ci_upper:-3})` → `true`
- `evaluateRule({variable:'ci_lower', operator:'>=', threshold:5}, {ci_lower:7})` → `true`

---

## Что НЕ делаем (DO NOT)

- ❌ Не меняем canonical bindings (`ci_lower`/`ci_upper` остаются в absolute fraction).
- ❌ Не трогаем `effective.js` (passthrough как есть).
- ❌ Не меняем чип в ResultsForm (там показывается только significant + novelty badges, нет CI).
- ❌ Не трогаем секцию «Результаты» в HTML — там оставляем `fmtNum(ci_lower, 4)` (raw decimal) для analyst-eye. Меняем **только TL;DR**.
- ❌ Не вводим новых deps.
- ❌ Не трогаем data_peek / round-trip / Stepper / decision_rules.

---

## Files involved

**Модифицируем:**
- `templates/notebook/export.cells.json` (G-1a)
- `templates/notebook/novelty.cells.json` (G-1a — explicit `None` default)
- `templates/notebook/main_test/z_test.cells.json` (G-2c)
- `templates/notebook/main_test/t_test.cells.json` (G-2c)
- `templates/notebook/main_test/welch.cells.json` (G-2c)
- `templates/notebook/main_test/bootstrap.cells.json` (G-2c)
- `src/lib/results/report-html.js` (G-2a)
- `src/lib/results/readout-md.js` (G-2b)
- `src/pages/NotebookBuilderPage.jsx` (G-3a) — добавить secondary `К ВАЛИДАЦИИ →` через `navigate('/step4')`
- (если нужно) `src/components/StepFooter.jsx` (G-3a, вариант B) — расширить slots
- `src/lib/results/decision-rules.js` (G-4a) — extended regex + unicode normalize + variable aliasing
- `src/components/results/ResultsForm.jsx` или `DecisionRulesSection.jsx` (G-4c) — small hint про units mismatch
- `tests/lib/plan/notebook-builder.test.js` (G-1c + G-2d)
- `tests/lib/results/report-html.test.js` (G-1c + G-2d)
- `tests/lib/results/readout-md.test.js` (G-1c + G-2d)
- `tests/lib/results/decision-rules.test.js` (G-4d, +5-7 cases)

**Не создаём** новых файлов. Bundle delta ≈ 0 (только text-changes).

---

## Edge cases

- **novelty_flag=False legitimately** (cell отработала, посчитала что нет novelty) — корректно покажется зелёный «✓ Novelty: not detected». Это правильный сценарий (duration ≥ 3, есть данные и в early и в later).
- **manual user_overrides.novelty_flag=true** — override остаётся как был, поведение не меняется.
- **CI lower и/или upper отсутствуют** (manual flow без всех чисел) — UI/HTML/MD оставляют `—`. `fmtPct` уже это умеет.
- **delta_rel хранится как % уже** (`rel_lift * 100`) — НЕ умножаем повторно. Только `ci_lower`/`ci_upper` нужно `* 100`.

---

## Acceptance criteria

1. `npm test` зелёный, **+10-14 новых тестов** (G-1c + G-2d + G-4d). Total: ~441+.
2. `npm run build` чистый. Bundle delta ≈ 0.
3. Browser smoke (~5-7 мин на сценариях A + B):
   - **Regenerate** ноутбук (бриф → конструктор → скачать) — открыть z_test cell → title графика содержит `CI95 (абс. разность)`.
   - **На /step3**: footer теперь содержит `← К ПЛАНУ`, `К ВАЛИДАЦИИ →` (secondary), `↓ СКАЧАТЬ ...ipynb` (primary). Клик «К валидации» → переход на /step4.
   - **Drag-drop Scenario A** `cr_first_deposit_v1_analysis_new_ready.ipynb` (proportion, без novelty cell, duration=2) на /step4:
     - NOVELTY-badge **серый** «N/A — нет данных» (вместо зелёного «not detected»).
     - В TL;DR report.html: `Δ rel = 28.06%, 95% CI [0.0011…0.0163] (абс. разность долей), p = 0.0257`.
     - В readout.md: то же с bold + italics на CI label.
   - **Drag-drop Scenario B** `arpu_v1_analysis-ready.ipynb` (continuous ARPU, novelty есть, duration=7):
     - NOVELTY-badge **жёлтый** «⚠ Novelty: suspected» (был correctly посчитан).
     - В TL;DR report.html: `Δ rel = 1.64%, 95% CI [-1.1353…4.5771] (абс. разность, ед. ARPU), p = 0.2377`.
     - **Ключевая проверка:** CI **НЕ умножен на 100** — числа `[-1.1353…4.5771]` ровно как в ноутбуке.
   - **G-4 decision rules** (на любом сценарии с этими правилами в брифе):
     - SHIP `CI не пересекает 0 и нижняя граница ≥ +5% rel.` — `parsed: true, variable: 'ci_lower', operator: '>=', threshold: 5`.
     - KILL `Guardrail breach или CI ≤ −5% rel.` — `parsed: true, variable: 'ci_upper', operator: '<=', threshold: -5`.
     - В readout: вместо «не оценено» теперь auto-eval с честным `сработало` / `не сработало` на основе real ci_lower/upper.
     - В UI Decision rules секция: маленький hint про «threshold в абс. единицах».

---

## Sprint Fix Report — что ожидаем в `sprint-7-fix-iter2-report.md`

- Trace-ability G-1..G-4 → файл + diff.
- Какой default явно поставили в `_safe`/`novelty.cells.json` (с цитатой).
- Как именно реализован metric-type → ciNote mapping (G-2).
- StepFooter: расширил ли slots (вариант B) или использовал существующий secondary (вариант A).
- G-4 unicode preprocessing: какие точно символы заменил, в каком порядке.
- G-4 semantic mapping `CI ≤ X` → `ci_upper`: подтверждение что это применяется только для bare `ci`, не для явных `ci_lower`/`ci_upper`.
- Tests count delta.
- Time tracking (~1-1.5 ч).

---

## Related

- `docs/project/sprints/sprint-7-fix-prompt.md` — iter 1 spec
- `docs/project/sprints/sprint-7-fix-report.md` — iter 1 отчёт Code
- `docs/project/sprints/code-review-sprint-7-fix.md` — review iter 1
- `docs/project/sprints/test-cases-sprint-7-fix-retest.md` — runnable smoke iter 1 (QA найдено BUG-7F1, BUG-7F2)
- `docs/context/decisions-log.md` — ADR-015 контракт; novelty_flag теперь tri-state (True/False/None)
