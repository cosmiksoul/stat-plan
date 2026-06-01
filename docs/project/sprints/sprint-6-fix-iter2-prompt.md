# Sprint 6 FIX iter 2 — BUG-Q5 (recharts Attempts 2+) + Phase F + BUG-Q6 + re-check Q3

**Type:** Code FIX (one focused iter)
**Estimated:** ~1.5-2 ч active
**Источник:** RETEST 2026-05-29 — после iter 1 (Phase A/B/D/E готовы Code'ом, но не закоммичены) обнаружено:
- **BUG-Q5 (BLOCKER):** Phase A `optimizeDeps.include: ['recharts']` не помог в dev — recharts всё ещё падает с `require_isUnsafeProperty is not a function`. Cache invalidation тоже не спасает.
- **Phase F (UX продолжение Phase B):** для continuous Q05 dropdown с единственной опцией «абс.» странный и семантически бессмысленный — убираем dropdown совсем.
- **BUG-Q6 (regression):** Q01 «Цель теста» preselect не отмечается ✓ в карте после подтверждения кликом. Известный паттерн (Sprint 4 FIX iter 1 BUG-5 для goal_type/randomization_unit), регрессировал.
- **BUG-Q3 re-check:** Q08 sample-size не реактивен на SET_DATA_PEEK — скорее всего был следствием BUG-Q1/Q5. Перепроверить после BUG-Q5 fix.

**Контекст iter 1:** см. `docs/project/sprints/sprint-6-fix-prompt.md` для истории C-1, C-2, BUG-Q1/Q3/Q4 + первоначальных Phase A/B/D/E. **Iter 2 фокусируется только на новых пунктах** — не переписывает уже сделанное.

**Порядок приоритета:**
1. **BUG-Q5 (BLOCKER)** — без этого UI не пригоден для smoke.
2. **Phase F** — UX continuous, лёгкая правка.
3. **BUG-Q6** — minor regression, тривиальный фикс по аналогии с Sprint 4 FIX iter 1 BUG-5.
4. **BUG-Q3 re-check** — после Q5; если auto-закрылось — закрыть отчётом, если нет — отдельная задача.

---

## 🔴 BUG-Q5 — recharts Attempts 2+

### Что было в iter 1 (Phase A) и почему не сработало

В iter 1 Code применил **Attempt 1**: `optimizeDeps.include: ['recharts']` в `vite.config.js`. Production `npm run build` — чистый. Но в **dev server** при `npm run dev` после загрузки CSV всё равно падает:

```
Uncaught TypeError: require_isUnsafeProperty is not a function
    at recharts.js?v=7dbb8d9a:1584:33
    at chunk-CYJPkc-J.js?v=7dbb8d9a:8:49
    at recharts.js?v=7dbb8d9a:1651:19
```

Пользователь попробовал: `Remove-Item -Recurse -Force node_modules\.vite` + `npm run dev -- --force` + hard reload (Cmd+Shift+R) — не помогает.

Значит проблема не в кэше Vite, а в том, что **esbuild при pre-bundle recharts** не транспилирует CommonJS-helper `is-unsafe-property` (lodash-style) корректно для dev runtime.

### Attempts (выполнять последовательно, останавливаться когда заработает)

#### Attempt 2 — upgrade recharts (рекомендуется первым)

```bash
npm ls recharts                # узнать текущую версию
npm install recharts@latest    # поставить актуальную
```

Проверить [release notes recharts](https://github.com/recharts/recharts/releases) на breaking changes (особенно если major bump). Часто в новых релизах фикс ESM-export и удалена зависимость от внутренних CommonJS-helpers.

После upgrade:
```bash
rm -rf node_modules/.vite       # или Remove-Item -Recurse -Force node_modules\.vite на Windows
npm run dev -- --force
```

Hard reload в браузере → загрузка CSV → проверить console.

#### Attempt 3 (если Attempt 2 не помог) — optimizeDeps.exclude

Замени `optimizeDeps.include` на `exclude` в `vite.config.js`:

```js
// Sprint 6 FIX iter 2 BUG-Q5: include не помог, recharts ломается в dev
// pre-bundle. Excluding pushes through native ESM resolution at runtime —
// первый chunk load чуть медленнее, но crash проходит.
optimizeDeps: {
  exclude: ['recharts'],
},
```

#### Attempt 4 (если оба не помогли) — explicit subpath import

recharts поддерживает modular imports. В `src/components/brief/DataPeekHistogram.jsx` заменить:
```js
import { BarChart, Bar, XAxis, YAxis, ... } from 'recharts'
```
на:
```js
import BarChart from 'recharts/es6/chart/BarChart'
import Bar from 'recharts/es6/cartesian/Bar'
import XAxis from 'recharts/es6/cartesian/XAxis'
// и т.д.
```

(Или через `recharts/lib/...` если es6 пути не работают — проверить структуру `node_modules/recharts/`.)

Это обходит full-module pre-bundle, грузя только нужные подмодули.

#### Attempt 5 — STOP AND REPLAN

Если Attempts 2, 3, 4 все падают:
- **Остановись.** Не меняй chart library самостоятельно (это требует переписать ADR-014).
- В `sprint-6-fix-iter2-report.md` опиши:
  - Все Attempts, какие версии (recharts, vite, react, node) пробовал.
  - Точное console error для каждой попытки.
  - `npm ls vite react`, `node -v` output.
- Cowork обсудит с пользователем варианты: (а) ждать релиз recharts, (б) откатить на custom SVG (новый ADR-015), (в) другая chart библиотека.

### Acceptance для BUG-Q5

- ✅ Browser smoke RETEST кейс 1 (continuous + CSV `peek_continuous.csv`) — histogram отрисован, console чистый, `Uncaught TypeError` исчез.
- ✅ `npm run dev` стартует чисто, `npm run build` чистый.
- ✅ В `vite.config.js` комментарием зафиксировать какой Attempt сработал (для будущих разработчиков).
- ✅ В отчёте — таблица Attempts с результатом каждой попытки.

---

## 🟢 Phase F — Убрать dropdown для continuous в Q05

### Контекст

В iter 1 Phase B `baselineUnitOptionsFor('continuous')` возвращает `[{value: 'absolute', label: 'абс.'}]` — dropdown с **единственной опцией**. Это:
- UX-странно (dropdown в котором нечего выбрать).
- Семантически бессмысленно: unit для continuous не используется в `sample-size.js` (после Sprint 5 FIX C-1 dead branch удалён), в `scoring.js` (то же), в YAML (`parse.js coerceBaseline` ставит `unit: null` для не-proportion).
- Пользователь спросил «может быть какая-то другая величина типа не абсолютное значение?» — справедливо: continuous может быть в ₽, сек, $, мс, KB, items. Угадать все единицы нереально, фиксированный dropdown — over-engineering.

### Цель

Для continuous Q05 показывает **только number input** + placeholder/hint. Никакого unit dropdown или free-text-инпута.

### Что делать

1. **`src/lib/brief/questions.js baselineUnitOptionsFor`** для `continuous`: вернуть `null` (как было до iter 1 Phase B).
2. **`src/components/brief/QuestionRenderer.jsx BaselineInput`**: когда `unitOptions === null` для continuous — **не рендерить unit-поле**. Если `NumberWithUnit` не умеет «без unit» — отрендерить чистый `<input type="number" />` напрямую с тем же `onChange → ANSWER_QUESTION`. Под полем или в placeholder — текст: «в единицах метрики (₽, сек, ARPU и т.д.)».
3. **Reducer ANSWER_QUESTION для baseline** при `metric_type='continuous'`: при записи — `unit: null` (не `'absolute'`).
4. **Session migration:** в загрузке state из localStorage (`stat-plan:v1:state`), если `metric_type === 'continuous'` и `baseline.unit === 'absolute'` (legacy от iter 1 Phase B сессии) → принудительно `baseline.unit = null`.
5. **`baselineUnitOptionsFor` для proportion/ratio/count** — без изменений (там dropdown оправдан семантически).

### DO NOT

- ❌ Не возвращайся к free-text-инпуту для unit (re-открывает риск ввода «fraction» вручную — BUG-Q4 root cause).
- ❌ Не сбрасывай `baseline.value` при смене на continuous — preserve value (решение iter 1 Phase B остаётся в силе).
- ❌ Не трогай `sample-size.js`, `scoring.js` — unit для continuous уже игнорируется в формулах.

### Тесты

- `tests/lib/brief/questions.test.js` (создан в iter 1 Phase B) — обновить assertion: `baselineUnitOptionsFor('continuous')` → `null`.
- `tests/state/reducer.test.js` — +1 case: `ANSWER_QUESTION` для `baseline.value=100` при `metric_type='continuous'` → state.brief.baseline = `{value: 100, unit: null}`.
- (опционально) +1 case session migration: initial state с baseline `{value: 100, unit: 'absolute'}` + `metric_type='continuous'` → после load `unit` стал `null`.

### Acceptance

- ✅ Q05 для continuous: только number input + подсказка, **без dropdown**.
- ✅ State `brief.baseline.unit = null` для continuous (новый ввод).
- ✅ Session migration: legacy `unit='absolute'` после load → `null`.
- ✅ Round-trip остаётся зелёным.

---

## 🟢 BUG-Q6 — Q01 preselect не отмечается ✓ в карте

### Симптом

На Q01 «Цель теста» первый option «Изменение продукта (фича, UX)» selected by default (preselect). Пользователь подтверждает его кликом (или просто нажимает «Дальше →» без изменения). При переходе на Q02 в карте вопросов справа **Q01 показан как `·` (не отвечен)**, не `✓ ответ`.

Скриншоты пользователя 2026-05-29:
- На Q01: «Изменение продукта» — зелёная обводка «ВЫБРАНО».
- На Q02 в карте справа: Q01 = `·` (точка, не галочка).

### История паттерна

В Sprint 4 FIX iter 1 Phase C закрыт **аналогичный bug (BUG-5)** для `goal_type` и `randomization_unit`. Тогда расширили `applyEnterDefaults` в reducer. Сейчас — **regression** для `goal_type` (Q01).

Что-то в Sprint 5 / Sprint 6 правках задело либо `applyEnterDefaults`, либо критерий «вопрос отвечен» в `QuestionMap.jsx`.

### Что делать

1. Открой `src/lib/brief/defaults.js` (или эквивалент `applyEnterDefaults`). Проверь, что для `goal_type` логика выставления `defaultsApplied.goal_type = true` присутствует и срабатывает **при первом enter в Q01** (или при `GOTO_QUESTION` с preselect).
2. Reducer `ANSWER_QUESTION` / `GOTO_QUESTION` для `goal_type` — посмотри симметрично ли с `randomization_unit` (Q06 работает корректно по словам пользователя — взять как референс).
3. `QuestionMap.jsx` — посмотри критерий «вопрос отвечен» для Q01. Скорее всего читает `state.brief.defaultsApplied.goal_type` или `state.brief.goal_type !== null`. Если критерий ожидает defaultsApplied флаг, а флаг не выставляется — карта не показывает ✓.
4. Воспроизвести локально: новый бриф → Q01 принять preselect (клик или «Дальше») → Q02 → посмотреть карту.

### Тесты

- `tests/state/reducer.test.js` или `tests/lib/brief/defaults.test.js` — case: для нового state с `goal_type=null` после `GOTO_QUESTION(2)` (или `ANSWER_QUESTION(goal_type, 'product_change')`) → `state.brief.defaultsApplied.goal_type = true` и `state.brief.goal_type = 'product_change'`.
- Если такого теста уже не было после Sprint 4 FIX iter 1 — добавить (regression guard).

### Acceptance

- ✅ Q01 preselect подтверждение (клик или «Дальше» без изменения) → в карте вопросов Q01 показан с ✓.
- ✅ Симметрично с Q06 (randomization_unit).
- ✅ Sprint 4 FIX iter 1 BUG-5 не регрессит для других preselect'ов (Q06 продолжает работать).

---

## 🟢 BUG-Q3 re-check — Q08 реактивен после BUG-Q5 fix?

### Симптом из iter 1 QA

Пользователь говорил «плашки предупреждения показываются если руками сбросить URL — т.е. сам расчёт происходит». То есть на CSV upload Q08 SampleSizeDisplay не обновлялся **сразу** — нужен был reload, чтобы увидеть новый sample size + warnings.

### Гипотеза

Это было **следствием BUG-Q1** (recharts crash через Error Boundary роняла re-render Q08). После BUG-Q5 фикса — должно auto-закрыться.

### Что делать

После Attempt 2 (или 3/4) Sprint 6 FIX iter 2:

1. Воспроизведи браузерный smoke кейс 1 из `test-cases-sprint-6-fix-retest.md` (continuous + drag-drop CSV).
2. Посмотри: **Q08 SampleSizeDisplay обновляется немедленно** (без reload), показывая новый sample size + warnings (если они применимы).
3. Если **обновляется** — закрываем BUG-Q3 в отчёте, никаких действий.
4. Если **не обновляется** — отдельная задача: проверить что `SET_DATA_PEEK` reducer вызывает `recomputePlan()` (Sprint 6 main D1 решение) и React commit действительно завершается. Возможно ещё какой-то Error Boundary ловит. Тогда:
   - Открой DevTools React Profiler.
   - Загрузи CSV → посмотри какие компоненты ре-рендерятся (или не ре-рендерятся).
   - Если SampleSizeDisplay не ре-рендерится — проблема в `useAppState` dispatch или в memoization (например `useMemo(() => calculateSampleSize, [brief.baseline, brief.mde, ...])` забывает `brief.data_peek` в deps).
   - Fix через добавление `brief.data_peek` в deps или dispatch RECOMPUTE_PLAN после SET_DATA_PEEK явно.

### Acceptance

- ✅ Q08 SampleSizeDisplay обновляется немедленно после CSV upload (без reload).
- ✅ В отчёте — чёткое «BUG-Q3 закрылся автоматически после BUG-Q5» или «потребовался дополнительный fix» с описанием.

---

## Что НЕ делаем (DO NOT) в iter 2

- ❌ Не пересматриваем Phase D (C-1 live baselineMatch) — готово в iter 1.
- ❌ Не пересматриваем Phase E (C-2 3 histogram для ratio) — готово в iter 1.
- ❌ Не пересматриваем Phase B для proportion/ratio/count — только Phase F правит для continuous.
- ❌ Не сбрасываем `baseline.value` при смене metric_type — preserve value (решение iter 1).
- ❌ Не меняем chart library без эскалации (Attempt 5 — STOP).
- ❌ Не трогаем Cowork-зону (`docs/**`, `CLAUDE.md`, etc).

---

## Files involved

**Модифицируем:**
- `vite.config.js` — BUG-Q5 (Attempts 2/3/4 — какая-то сработает)
- `package.json` + `package-lock.json` — если Attempt 2 (upgrade recharts)
- `src/lib/brief/questions.js` — Phase F (continuous → null)
- `src/components/brief/QuestionRenderer.jsx` — Phase F (BaselineInput conditional рендер)
- `src/state/reducer.js` — Phase F (baseline.unit=null для continuous) + Q6 (defaultsApplied.goal_type)
- (возможно) `src/lib/brief/defaults.js` — BUG-Q6 fix applyEnterDefaults для goal_type
- (возможно) `src/components/brief/QuestionMap.jsx` — BUG-Q6 если критерий «вопрос отвечен» не учитывает defaultsApplied
- `src/components/brief/DataPeekHistogram.jsx` — BUG-Q5 Attempt 4 (subpath imports, если до этого дойдёт)
- `tests/lib/brief/questions.test.js` — Phase F assertion update
- `tests/state/reducer.test.js` — Phase F + BUG-Q6 cases
- (возможно) `tests/lib/brief/defaults.test.js` — BUG-Q6 case

**Не трогаем:**
- `src/lib/data-peek/*`, `src/lib/plan/*` — iter 1 закрыл, ничего не задеваем.
- `src/components/brief/DataPeek*.jsx` (кроме DataPeekHistogram при Attempt 4) — iter 1 закрыл.
- `Stepper.jsx`, `BriefPage.jsx` — без изменений.

---

## Acceptance criteria iter 2

1. `npm test` зелёный. Прирост ~+2-4 тестов (Phase F + BUG-Q6).
2. `npm run build` чистый. Bundle delta зависит от Attempt 2/3/4 (если upgrade recharts — может вырасти/уменьшиться).
3. Browser smoke по `docs/project/sprints/test-cases-sprint-6-fix-retest.md` — все 7 кейсов проходят (кейс 2 учитывает Phase F new behavior).
4. Q01 preselect → ✓ в карте (BUG-Q6).
5. В `sprint-6-fix-iter2-report.md` явная таблица Attempts BUG-Q5 + статус Phase F + BUG-Q6 + Q3.

---

## Related

- `docs/project/sprints/sprint-6-fix-prompt.md` — iter 1 prompt (исторический контекст: C-1, C-2, BUG-Q1/Q3/Q4 + Phase A/B/D/E).
- `docs/project/sprints/sprint-6-fix-report.md` — iter 1 отчёт Code.
- `docs/project/sprints/test-cases-sprint-6-fix-retest.md` — runnable smoke (7 кейсов, кейс 2 обновлён под Phase F).
- `docs/project/sprints/sprint-report-4.md` + `sprint-4-fix-report.md` — история Sprint 4 BUG-5 (аналог BUG-Q6).
- `docs/context/decisions-log.md` — ADR-014 (recharts + papaparse).
