# Sprint 6 FIX iter 1 — C-1 + C-2 + QA bugs (BUG-Q1 BLOCKER recharts, BUG-Q4 baseline.unit corruption, BUG-Q3)

**Type:** Code FIX (одна фаза)
**Estimated:** ~1.5-2.5 ч active
**Источник:** `docs/project/code-review-sprint-6.md` (concerns C-1, C-2) + QA smoke 2026-05-29 (BUG-Q1 recharts blocker, BUG-Q4 baseline.unit='fraction' для continuous → mega-sample, BUG-Q3 Q08 не реактивен).

**Порядок приоритета:**
1. **BUG-Q1 (BLOCKER recharts)** — без этого ничего не работает в браузере.
2. **BUG-Q4 (HIGH baseline.unit corruption)** — Pre-existing bug (не Sprint 6 introduced), но **проявился** через Data Peek.
3. **BUG-Q3** — скорее всего следствие BUG-Q1, перепроверить после фикса.
4. **C-1 + C-2** — non-blocker, но логично сделать в этом же iter.

**Статус iter 1 (2026-05-29):** Code выполнил Phase A (BUG-Q1 Attempt 1 optimizeDeps.include) + Phase B (Q05 dropdown) + Phase D (C-1) + Phase E (C-2). После RETEST обнаружено: Phase A не сработал в dev (см. iter 2 BUG-Q5); найдены Phase F (Q05 без dropdown) и BUG-Q6 (Q01 preselect regression). **Эти follow-ups вынесены в `sprint-6-fix-iter2-prompt.md`** — этот файл остаётся как историческая запись iter 1.

---

## Overview

Sprint 6 main закрылся качественно (313 тестов, round-trip 6/6, bundle initial +4.55KB через lazy chunks). Два concern'а из code review требуют исправления:

- **C-1 (minor UX bug):** в `DataPeekStats` после клика «↳ ПОДСТАВИТЬ В Q05» visual `⚠ Δ = X%` и кнопка не освежаются, потому что компонент полагается на `dp.baseline_match_user_input` (frozen в момент CSV upload), а не на live-сравнение с актуальным `state.brief.baseline.value`. Пользователь думает, что клик не сработал.
- **C-2 (продуктовый, пользователь решил «полный scope»):** для ratio показывается **один** histogram (по N/D ratios). Spec в Sprint 6 prompt §S5.5 ожидал **три** малых histogram (numerator + denominator + ratio). Пользователь подтвердил — делаем 3 (полная информация о структуре variance).

Цель iter 1 — закрыть оба concern'а, не задеть round-trip контракт (`tests/lib/plan/round-trip.test.js` 6/6 canonical должны остаться зелёными), сохранить lazy chunking для recharts (новый код Histogram не должен импортироваться eagerly).

---

## Scope

### C-1 — Live baseline match calculation в DataPeekStats

**Симптом:** после CSV upload `dp.baseline_match_user_input = false` (например baseline_computed=93.12, user=100 → Δ=-6.88%, |Δ|<10% → должно быть `true`; но если user=54 → Δ=72%, `false`). Пользователь видит ⚠ + кнопку «↳ ПОДСТАВИТЬ В Q05». Клик → `ANSWER_QUESTION` dispatch с `baseline.value = dp.baseline_computed`. State.brief.baseline обновляется, но `dp.baseline_match_user_input` (frozen) остаётся `false`. UI продолжает показывать ⚠ Δ% и кнопку.

**Fix — option (б) из code review:** в `DataPeekStats` сравнивать `dp.baseline_computed` с **актуальным** `state.brief.baseline?.value` через локальный compute, а не через `dp.baseline_match_user_input`.

**Реализация:**

1. **Shared utility.** В `src/lib/data-peek/csv.js` функция `compareBaselines(computed, userInput)` (строка ~311) уже реализована (relative tolerance 0.1). Вынеси её в новый файл `src/lib/data-peek/baselineMatch.js`:

```js
// src/lib/data-peek/baselineMatch.js
// Returns true | false | null (null when either input is not finite).
export function baselineMatch(computed, userInput) {
  if (
    typeof computed !== 'number' ||
    !Number.isFinite(computed) ||
    typeof userInput !== 'number' ||
    !Number.isFinite(userInput)
  ) {
    return null
  }
  if (userInput === 0) return Math.abs(computed) < 1e-9
  return Math.abs(computed - userInput) / Math.abs(userInput) < 0.1
}
```

Импортировать в `csv.js` (заменить inline `compareBaselines` на этот импорт) — поведение идентично, тесты `csv.test.js` остаются зелёные.

2. **`src/components/brief/DataPeekStats.jsx`:**

```js
import { baselineMatch } from '../../lib/data-peek/baselineMatch.js'

// Внутри компонента, перед рендером:
const dp = state.brief.data_peek
const userBaseline = state.brief.baseline?.value
const liveMatch = baselineMatch(dp?.baseline_computed, userBaseline)
const delta =
  userBaseline != null && dp?.baseline_computed != null && userBaseline !== 0
    ? ((dp.baseline_computed - userBaseline) / Math.abs(userBaseline)) * 100
    : null

// В JSX — заменить все упоминания dp.baseline_match_user_input на liveMatch:
//   className: liveMatch ? 'text-ok ml-2' : 'text-warn ml-2'
//   icon: liveMatch ? '✓' : '⚠'
//   button: liveMatch === false показывается, true/null — скрывается
```

3. **`dp.baseline_match_user_input` оставляем в state schema** (для round-trip, scoring читает его как +5 pts). Просто **компонент перестаёт от него зависеть** при рендере.

**Тесты UI** — нет (по конвенции проекта без RTL). Browser RETEST в кейсе 7 теста-кейсов Sprint 6.

### C-2 — 3 малых histogram для ratio (numerator + denominator + ratio)

**Текущее поведение:** для ratio в `parseDataPeekCsv` (csv.js строка 239) только `raw_values: reservoirSample(ratios, RAW_VALUES_LIMIT)` сохраняется. `DataPeekHistogram` рендерит один histogram по `raw_values`.

**Цель:** для ratio сохранить также numerator и denominator values, рендерить 3 малых histogram в одну строку.

**Реализация:**

1. **`src/lib/data-peek/csv.js` ratio branch (~строка 165-244):**

После расчётов `nums`, `dens`, `ratios` — расширить return:

```js
return {
  // ... existing fields
  raw_values: reservoirSample(ratios, RAW_VALUES_LIMIT),
  raw_values_numerator: reservoirSample(nums, RAW_VALUES_LIMIT),
  raw_values_denominator: reservoirSample(dens, RAW_VALUES_LIMIT),
  // ...
}
```

Для non-ratio branch (continuous, proportion, count) — добавить `raw_values_numerator: null, raw_values_denominator: null` (явные null для consistency, помогают round-trip).

**Reservoir sampling.** Используй тот же `reservoirSample` с тем же seed что и для `ratios` — это даёт **синхронизированные** выборки (i-я точка в `raw_values_numerator` соответствует i-й в `raw_values_denominator`, что **может быть полезно** если в будущем захотим scatter plot N vs D). Сейчас не используется, но логически правильно.

2. **Schema extensions:**

   - **`src/state/reducer.js` initialBrief** (строка 46-48): добавить `raw_values_numerator: null, raw_values_denominator: null` в `data_peek` defaults.
   - **`src/lib/plan/parse.js` mapping** (строки 442-490): добавить mapping (только для arrays of numbers, по аналогии с `raw_values` — проверка `Array.isArray` + каждый элемент `isNum`).
   - **`src/lib/plan/render.js` `renderDataPeekYaml`** (строки 53-86): добавить multi-line YAML serialization (как для `raw_values`).

3. **`src/components/brief/DataPeekHistogram.jsx`:**

   Принимает дополнительные пропсы `{ valuesNumerator, valuesDenominator }` (или читает напрямую из state — на усмотрение, но props чище для тестируемости).

   **Логика рендера:**
   - Если `valuesNumerator && valuesDenominator` (т.е. ratio CSV) → рендерить **3 малых histogram** в `<div className="grid grid-cols-3 gap-3">`, каждый с подписью «numerator (N)», «denominator (D)», «ratio (N/D)». Каждый histogram использует уменьшенный размер (~150px высоты вместо текущего).
   - Иначе (continuous, count) → рендерить **один большой histogram** (текущее поведение).
   - **Lazy chunk не должен ломаться** — оба варианта рендеринга внутри одного компонента, который lazy-loaded. Bundle delta остаётся ~0 (один additional component с условным рендером).

4. **`src/components/brief/DataPeekBlock.jsx`** (строка 80-89): передать `valuesNumerator` и `valuesDenominator` в `<DataPeekHistogram />`:

```js
<DataPeekHistogram
  values={dp.raw_values}
  valuesNumerator={dp.raw_values_numerator}
  valuesDenominator={dp.raw_values_denominator}
/>
```

5. **Опционально (поощряется):** label для каждого малого histogram должен включать имя колонки CSV — `Numerator: clicks`, `Denominator: sessions`, `Ratio: clicks/sessions`. Это улучшает UX (пользователь видит реальные имена своих колонок). Если просто — читать из `state.brief.ratio_components`.

---

## Что НЕ делаем (DO NOT)

- ❌ **Не пересчитываем** `ratio_variance` / `ratio_mean_*` / `ratio_cov_nd` — math уже корректный.
- ❌ **Не трогаем** `src/lib/data-peek/calculator.js` — manual ratio peek не имеет raw values (calculator принимает уже агрегированные μN/μD/var/cov), поэтому для manual всегда **один** histogram отсутствует (no raw_values). Это OK.
- ❌ **Не делаем** eager import recharts в `DataPeekBlock.jsx` или где-то ещё — lazy chunking из Sprint 6 main сохраняем.
- ❌ **Не трогаем** `sample-size.js`, `scoring.js` — поведение не меняется.
- ❌ **Не модифицируем** `Stepper.jsx` — structural rewrite остаётся в Sprint 7.
- ❌ **Не добавляем** новых npm-зависимостей.
- ❌ **Не вводим** новых CSS токенов — переиспользуем существующие.
- ❌ **Не трогаем** Cowork-зону (`docs/**`, `CLAUDE.md`, etc).
- ❌ **Не правим** `dp.baseline_match_user_input` логику в `csv.js` — поле остаётся в state и сохраняет своё значение для scoring (frozen в момент peek). Только `DataPeekStats` перестаёт от него зависеть **при рендере**.
- ❌ **Не вводим** dispatch SET_DATA_PEEK после applyBaseline в `DataPeekStats` — это альтернативный вариант (а) из code review, отклонён в пользу варианта (б).

---

## Files involved

**Создаём:**
- `src/lib/data-peek/baselineMatch.js` — shared utility (C-1)

**Модифицируем:**
- `src/lib/data-peek/csv.js` — заменить inline `compareBaselines` на импорт + добавить `raw_values_numerator/denominator` в ratio branch + явные null для non-ratio (C-1 утилита + C-2 schema)
- `src/state/reducer.js` — initialBrief.data_peek дефолты для новых полей (C-2)
- `src/lib/plan/parse.js` — mapping для `raw_values_numerator/denominator` (C-2)
- `src/lib/plan/render.js` — YAML serialization для новых полей (C-2)
- `src/components/brief/DataPeekStats.jsx` — live match через `baselineMatch` (C-1)
- `src/components/brief/DataPeekHistogram.jsx` — conditional рендер: 3 малых для ratio, 1 для остальных (C-2)
- `src/components/brief/DataPeekBlock.jsx` — пропсы для Histogram (C-2)
- `tests/lib/data-peek/csv.test.js` — добавить assertion что для ratio есть `raw_values_numerator` и `raw_values_denominator` с правильной длиной и числовыми значениями; для non-ratio — null (C-2)
- `tests/lib/plan/parse.test.js` — добавить ~1 case на round-trip `raw_values_numerator/denominator` (C-2)
- `tests/lib/plan/round-trip.test.js` — расширить 6-й canonical case (ratio + full data_peek) — добавить assertions для новых полей (C-2)
- `tests/lib/plan/render.test.js` — inline snapshot обновится (новые поля в YAML; diff чистый)

**Не трогаем:**
- `src/lib/plan/sample-size.js`, `scoring.js` — поведение не меняется.
- `src/lib/data-peek/stats.js`, `calculator.js` — без изменений.
- `DataPeekTabs.jsx`, `DataPeekCsvUpload.jsx`, `DataPeekManualForm.jsx` — без изменений.
- `BriefPage.jsx`, `QuestionMap.jsx` — без изменений.
- `templates/`, `public/`, `.github/workflows/`, `Stepper.jsx`.

---

## Technical Notes

### Round-trip контракт — критическая проверка после C-2

После расширения schema `raw_values_numerator/denominator` — обязательно перепрогнать `tests/lib/plan/round-trip.test.js`. 6-й canonical case (ratio + полностью заполненный data_peek) **должен** содержать non-null `raw_values_numerator` и `raw_values_denominator` после round-trip render → parse. Если хоть один canonical case сломался — стоп, **не пушим, не fix-fix'им** — описываем в отчёт и эскалируем (CLAUDE.md §5 stop and replan).

### YAML размер для 3 raw_values

3 × 1000 точек = ~3000 чисел в YAML peek-блоке. Если каждое число занимает в среднем 8-10 байт (`- 1234.5678\n`) → ~24-30 KB на один test_plan.md. Это **в 3 раза больше** чем сейчас. Для сценария «download test_plan.md → переслать коллеге» это OK, но **визуально файл станет менее читаемым**. Альтернатива — оставить в YAML только `raw_values` (для histogram fallback), а `raw_values_numerator/denominator` помечать как «session-only» (не сериализуются в YAML). Минус — после reload только 1 histogram восстанавливается.

**Решение:** сериализуем все три в YAML (consistency с round-trip принципом ADR-002 + 6-й canonical case покрывает). Если в будущем размер test_plan.md станет проблемой — отдельный refactor.

### Lazy chunk integrity
После C-2 изменений `DataPeekHistogram.jsx` остаётся lazy-loaded. Bundle initial **не должен вырасти** — все условия (3 vs 1 histogram) внутри уже-lazy компонента.

### Reservoir sampling synchronicity для ratio
Использование одного seed в `reservoirSample` для `ratios`, `nums`, `dens` даёт три **синхронизированные** выборки (i-я точка в nums соответствует i-й в dens и i-й в ratios). Это пока не используется, но логически правильно — если когда-то добавим scatter plot N vs D, точки будут согласованы.

### C-1: `dp.baseline_match_user_input` остаётся в state
Поле **не удаляем** — оно используется в `scoring.js scoreDataPeek` (+5 pts если true). Frozen-семантика в scoring правильна: peek снэпшотит baseline-сравнение в момент upload, scoring пользуется этим снэпшотом. Только UI (`DataPeekStats`) переходит на live-сравнение для visual feedback.

---

## ADR Constraints

| ADR | Что значит для этого FIX |
|---|---|
| ADR-002 (round-trip) | 6-й canonical case должен покрыть новые поля. |
| ADR-009 (приближения с warning) | Без изменений (math не трогаем). |
| ADR-010 (стек) | Без новых deps. |
| ADR-014 (recharts + papaparse) | Лимит lazy chunking сохраняется. |

---

## Acceptance criteria

1. `npm test` зелёный. **Прирост ~+2-3 теста** (csv assertions для raw_values_n/d, parse round-trip case, round-trip canonical extension). Total: **~315-316**.
2. `npm run build` чистый. Bundle initial: **delta ≈ 0** (новый baselineMatch util ~50 байт; DataPeekHistogram остаётся в lazy chunk; raw_values_n/d не impact initial bundle).
3. `tests/lib/plan/round-trip.test.js` — **6/6** canonical case зелёные (6-й case теперь покрывает `raw_values_numerator/denominator`).
4. **Browser smoke (~3-5 мин):**
   - **C-2 проверка (кейс 4 / 6 из test-cases-sprint-6):** ratio + CSV (`peek_ratio.csv`) → DataPeekBlock open → Histogram показывает **3 малых** (Numerator | Denominator | Ratio) с подписями `clicks`, `sessions`, `clicks/sessions`. Каждый ~150px высоты.
   - **C-1 проверка (кейс 7 из test-cases-sprint-6):** Continuous + CSV (`peek_continuous_skewed.csv` log-normal), baseline в Q05 = `54` → видим ⚠ Δ = +72.4% + кнопка «↳ ПОДСТАВИТЬ В Q05». Клик → baseline в Q05 становится `93.12`. **DataPeekStats должен немедленно показать ✓ Δ ≈ +0%, кнопка исчезла.** Если ⚠ остался — bug не закрыт.
   - **Regression sanity (кейс 3):** Continuous CSV (без mismatch) → 1 histogram (как было). Manual peek → нет histogram (raw_values пуст).
   - **Round-trip (кейс 14):** скачать test_plan.md после ratio CSV → загрузить обратно → 3 histogram восстановлены.

---

## Sprint FIX Report — что ожидаем

В `docs/project/sprint-6-fix-report.md`:

- **Trace-ability** C-1 + C-2: каждый → файл/строка/коммит.
- **Round-trip status:** 6/6 зелёные? Если 6-й case ломается из-за extra полей — что починили.
- **Bundle delta** initial chunk (ожидание ≈ 0).
- **C-2 design decision:** какие подписи у 3 histogram для ratio (`clicks`, `sessions`, `clicks/sessions` или другие). Подтвердить что синхронизированный reservoir sampling работает (один seed для трёх).
- **C-1 решение:** где живёт `baselineMatch` util (новый файл vs inline в DataPeekStats vs внутри stats.js); подтвердить что `csv.js compareBaselines` теперь использует тот же util (DRY).
- **Если был bonus refactor** — флагнуть отдельной секцией.
- **Time tracking** — ожидаемый total ~30-45 мин.

---

## QA bugs (обнаружены при первом smoke 2026-05-29)

### 🔴 BUG-Q1 (BLOCKER): recharts падает в браузере — `require_isUnsafeProperty is not a function`

**Severity:** HIGH (blocker для Sprint 6 — пока не исправлен, пользователь не может использовать Data Peek с CSV).

**Симптом (по скриншоту пользователя):** после CSV upload (на любом metric_type) — chunk recharts падает с console error:
```
Uncaught TypeError: require_isUnsafeProperty is not a function
    at recharts.js?v=2bd3a40d:1584:33
    at chunk-CYJPkc-J.js?v=2bd3a40d:8:49
    at recharts.js?v=2bd3a40d:1651:19
    ...
An error occurred in one of your React components.
```

Страница после этого становится белой (весь дерево компонентов под Error Boundary roняется). Reload возвращает state, но при попытке открыть DataPeekBlock с peek снова падает.

**Причина (гипотеза):** recharts использует CommonJS-стиль `require()` для `is-unsafe-property` (lodash-style helper), а Vite 8 + React 19 не транспилируют это корректно при lazy chunking через `React.lazy + import()`. Это известная проблема recharts при некоторых конфигурациях Vite — обычно фиксится одним из:
1. `vite.config.js` → `optimizeDeps.include: ['recharts']` — заставляет Vite pre-bundle recharts через esbuild (превращает CommonJS в ESM на этапе оптимизации).
2. `vite.config.js` → `optimizeDeps.exclude: ['recharts']` — иногда наоборот нужно (если pre-bundle ломает что-то ещё).
3. Установить актуальную версию recharts (`npm install recharts@latest`) — в новых релизах может быть фикс ESM exports.
4. Если ничего не помогает — заменить recharts на альтернативу (custom SVG, chart.js, victory). **Это требует обсуждения с Cowork и обновления ADR-014** — не делай это самостоятельно, эскалируй.

**Что делать (Code, последовательно):**

1. Попробуй (1) — `optimizeDeps.include: ['recharts']` + `vite build` + `vite dev`. Проверь в браузере что histogram рендерится.
2. Если (1) не помогло — попробуй (3) — обновить recharts. Проверь breaking changes в release notes.
3. Если (3) не помогло — попробуй (2) — `optimizeDeps.exclude: ['recharts']`.
4. Если **ничего не помогло** — **stop and replan**: открой `sprint-6-fix-report.md` с детальным описанием что пробовал и каким error падает каждая попытка. Не пытайся самостоятельно менять chart library — это требует обсуждения ADR-014.

**Acceptance для BUG-Q1:**
- Histogram рендерится в браузере для continuous + CSV (кейс 3 из test-cases-sprint-6.md).
- Console clean — никаких `require_isUnsafeProperty` errors.
- Browser smoke кейс 3 + 4 проходит без падений.

### 🟡 BUG-Q4 (HIGH): baseline.unit='fraction' сохраняется для continuous metric_type (pre-existing, проявился через peek)

**Severity:** HIGH — pre-existing bug (не Sprint 6 introduced), но **раскрывается** через Data Peek. Симптом для пользователя — sample-size в сотнях миллионов.

**Симптом (точные значения от пользователя 2026-05-29):**

| Поле | Значение | Что не так |
|---|---|---|
| Q03 metric_type | `continuous` (Средняя величина — ARPU) | ✓ ok |
| Q04 name/column | `arpu` / `arpu` | ✓ ok |
| Q05 baseline | **`0.1` + unit `fraction`** | ❌ `fraction` для continuous — невалидно. ARPU должен быть в абсолютных единицах (например 100₽, $250). |
| Q06 randomization_unit | `user` | ✓ ok |
| Q07 MDE | `12%` относительный | ✓ ok |
| Q08 daily_traffic | `5000` | ✓ ok |
| CSV peek | `peek_continuous.csv` (σ=80, μ=100) | ✓ ok |

**Math chain показывающая что sample-size прав, а вход мусорный:**
- `baselineNorm` (после `normalizeBaseline` в sample-size.js) = `0.1`.
- `mdeAbsolute(mde, baselineNorm)` для `relative_percent`: `delta = baselineNorm × 0.12 = 0.012`.
- `sigma` из peek = `80` (read из `data_peek.std_computed`).
- `n = 2 × ((z_α + z_β) × σ / delta)²` = `2 × (2.8 × 80 / 0.012)²` ≈ **697 M per arm**. Совпадает с тем, что показывается пользователю.

То есть **sample-size работает корректно**. Корень — в `state.brief.baseline.unit` который для continuous metric_type не должен быть `'fraction'`.

**Пользователь подсказал воспроизведение:** «Если сохранить, утвердить и вернуться, поле ввода преобразовывает натуральное число 10% в 0.1 fraction». То есть **regression в approve/return-to-draft цикле** или **в обработчике Q03 metric_type switch** или **при load из localStorage/YAML**.

**Гипотезы (Code, проверяй последовательно):**

1. **Q05 BaselineInput для continuous показывает dropdown с unit `'fraction'`** (см. скриншот пользователя — справа от input «0.1» dropdown «fraction»). Проверь `src/lib/brief/baselineUnitOptionsFor(metric_type)` — для `continuous` он должен возвращать `null` (free unit, без dropdown) или массив абсолютных единиц (`['₽', '$', 'мин', '%']`), но **не** `[{ value: 'fraction', label: 'fraction' }]`. Если возвращает что-то с `fraction` — это явный bug.

2. **При смене Q03 metric_type pre-existing baseline.unit не сбрасывается.** Сценарий: пользователь сначала выбрал `proportion`, ввёл baseline=0.1 fraction (10% CR). Потом сменил на `continuous`. Baseline value=0.1 остался, unit='fraction' остался. Для continuous это абсурд. Проверь reducer ANSWER_QUESTION для `metric_type` field — он должен либо сбрасывать `state.brief.baseline = { value: null, unit: null }`, либо `coerceBaseline()`-ить unit под новый metric_type.

3. **`coerceBaseline` в `parse.js:164-170` для metric_type='continuous' возвращает `{ value, unit: null }`.** То есть **при load из YAML** baseline.unit для continuous сбрасывается в null. **Но если пользователь не reload-ил** (т.е. работал в одной сессии после смены metric_type) — coerceBaseline не вызывается, unit остаётся frozen.

4. **При approve + return-to-draft** — что происходит с baseline.unit? Проверь reducer для `APPROVE_PLAN` и `RETURN_PLAN_TO_DRAFT`. Возможно где-то сериализуется/десериализуется через render → parse path, который трогает unit.

**Что делать (Code):**

1. **Воспроизведи** локально (последовательность из жалобы): 
   - Q03=proportion → Q05 baseline=0.1 fraction → пройди до Q10 → step2 утвердить → return-to-draft → Q03 сменить на continuous → Q05 — посмотреть какое value/unit.
   - И альтернативный путь: Q03=continuous сразу → Q05 baseline=100 → утвердить → return → Q05 — посмотреть.
   - И третий: Q03=continuous → Q05 ввести 10 → проверить какой unit dropdown.

2. **Fix:**
   - В `baselineUnitOptionsFor` для continuous: вернуть `null` (свободное поле без dropdown). Альтернатива — массив абсолютных единиц без `fraction`. **Выбери опцию (а) — null/без dropdown** как простейшую (UI компонент `<input type="number" />` без unit, под подписью «в единицах метрики»).
   - В reducer `ANSWER_QUESTION` для `metric_type` field: при смене metric_type на не-proportion **обнулить `state.brief.baseline = { value: null, unit: null }`** + флаг чтобы пользователь явно ввёл новое значение. Это **breaking** для пользователя (теряет введённое), но **правильнее** чем оставлять кашу. Альтернатива (б) — оставить value, но обнулить unit. Code решает.
   - В `coerceBaseline` для continuous/ratio/count: подтвердить unit=null всегда.

3. **Round-trip test:** добавить case в `tests/lib/plan/round-trip.test.js` или `parse.test.js`: render → parse где `brief.metric_type='continuous'` и `brief.baseline={value: 100, unit: null}` — должно работать симметрично, никакой `'fraction'` после round-trip.

4. **Если за время диагностики обнаружится больше unit corruption случаев** (например для ratio тоже) — флагнуть отдельно.

**Acceptance для BUG-Q4:**
- Q05 для continuous не показывает dropdown с 'fraction'. Либо без dropdown, либо с абсолютными единицами.
- После смены Q03 proportion → continuous: baseline сбрасывается (UI явно говорит «введи новое значение в единицах метрики»).
- При воспроизведении пользователя (baseline 0.1 fraction → continuous + CSV σ=80 + MDE 12%) sample-size в норме (~порядок 4-5K per arm, не 698M).
- Round-trip тест расширен для continuous baseline.

### Закрытие BUG-Q3 (Q08 не реактивен) после BUG-Q1

После фикса BUG-Q1 + BUG-Q4 перепроверь BUG-Q3 (Q08 sample-size не обновляется без reload). Скорее всего исчезнет — крах recharts повреждал re-render. Если **остаётся** — отдельная задача в SET_DATA_PEEK reducer dispatch (проверить что `RECOMPUTE_PLAN` или эквивалент действительно дёргается после SET_DATA_PEEK; D1 решение из Sprint 6 main).

---
