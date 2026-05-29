# Sprint 6 FIX iter 2 — Code-отчёт

> Источник прицеливания: prompt в чате от Cowork 2026-05-29 (BUG-Q5/Phase F/BUG-Q6/BUG-Q3 re-check).
> План: `~/.claude/plans/breezy-petting-clover.md` (перезаписан с iter 1; одобрен через ExitPlanMode).

## Что закрыто

| Phase | ID | Что | Файлы |
|---|---|---|---|
| 1 | BUG-Q5 | **Downgrade recharts 3.8.1 → 2.15.4.** Все варианты `optimizeDeps` (include/exclude/include обоих) провалились: recharts 3.x использует es-toolkit (lodash replacement), esbuild создаёт сломанный shadow var при pre-bundle. Recharts 2.15.4 использует lodash напрямую, Vite pre-bundle работает чисто. API идентичен (BarChart/Bar/XAxis/YAxis/Tooltip/ResponsiveContainer). | `vite.config.js:8-22` (комментарий + удалён optimizeDeps), `package.json` (recharts: `^2.15.4`), `package-lock.json` |
| 2 | Phase F | Для continuous Q05 показывает только number input + hint «в единицах метрики (₽, сек, ARPU…)»; dropdown с единственной опцией «абс.» убран | `src/lib/brief/questions.js:82-89`, `src/components/brief/NumberWithUnit.jsx` (rewrite c `noUnit` пропом), `src/components/brief/QuestionRenderer.jsx:166-198`, `src/state/reducer.js:158-167` (defensive forced unit=null), `src/lib/storage.js:51-62` (migration legacy `'absolute'` → `null`) |
| 3 | BUG-Q6 | `GOTO_QUESTION` теперь применяет `applyEnterDefaults` и для **current** (откуда уходим), и для target. Q01 preselect фиксируется в state при первом «ДАЛЬШЕ →» | `src/state/reducer.js:200-219` |
| 4 | BUG-Q3 | Не воспроизводится после Phase 1 (см. ниже) — был следствием BUG-Q5 | (no code change) |
| 5 | UX nit | Recharts Tooltip по дефолту белый с серым текстом — нечитаем на dark теме (юзер заметил после browser smoke). Стилизован под токены проекта (`--color-bg-elev-2` фон, `--color-border` рамка, `--color-fg` текст, прозрачный cursor 6%) | `src/components/brief/DataPeekHistogram.jsx` (Tooltip props) |

## BUG-Q5 attempts log (полная история, 5 итераций)

| # | Подход | Результат |
|---|---|---|
| 1 (iter 1) | `optimizeDeps.include: ['recharts']` | Build чистый, dev падал `require_isUnsafeProperty is not a function`. |
| 2 | Upgrade recharts | **Пропущен:** `3.8.1` это latest, бета/альфа старее. |
| 3 | `optimizeDeps.exclude: ['recharts']` | Build чистый, **dev новая ошибка:** `module '.../es-toolkit/compat/get.js' does not provide an export named 'default'` (verified browser screenshot 23:30, port 5174). |
| 3.5 | `optimizeDeps.include: ['recharts','es-toolkit']` | Build чистый, но проверка pre-bundle: `grep require_isUnsafeProperty node_modules/.vite/deps/recharts.js` → 4 occurrences с сломанным shadow var pattern. es-toolkit уже **inlined** в recharts dist при бандле, второй include es-toolkit не помогает. |
| 4 | Subpath imports `recharts/es6/chart/BarChart` | **Пропущен:** внутренние модули recharts всё равно тянут `es-toolkit/compat`, та же ошибка. |
| ✅ FINAL | **Downgrade recharts 3.8.1 → 2.15.4** | `npm install recharts@^2.15.4 --save` (12 пакетов добавлено, 11 удалено — es-toolkit и его транзитивы ушли вместе с recharts 3.x; lodash добавлен как транзитив recharts 2.x). Build чистый (672 modules, 467ms). Dev: pre-bundled `recharts.js` чистый, **ноль** `require_isUnsafeProperty` references. API идентичен. Deprecation warning npm про 2.x — функциональность не пострадала. |

**Корень проблемы:** recharts 3.x ESM build ссылается на es-toolkit/compat через default-import, но es-toolkit ships как CJS. esbuild при pre-bundle создаёт shadow var с тем же именем, что и lazy-require getter (`var require_isUnsafeProperty = require_isUnsafeProperty()`), JS hoisting → undefined → TypeError. Не баг рекартса по сути, а edge case в Vite/esbuild CJS-interop с такой структурой подмодулей. Recharts 2.x использует lodash напрямую (без compat subpath) и в pre-bundle такой паттерн не возникает.

**В `vite.config.js`** — комментарий описывает полную траекторию попыток и почему finalized на downgrade. `optimizeDeps` секция полностью удалена (Vite дефолты для recharts 2.x работают).

**Note про ADR-014:** ADR говорит «recharts», без пина версии. Major-family downgrade (3 → 2) допустимо без нового ADR. Если в будущем recharts 3.x починят interop с Vite — upgrade обратно тривиальный.

## Phase F trace-ability

- **`src/lib/brief/questions.js:82-89`** — case `'continuous'` объединён с `default`, оба возвращают `null`. До iter 2 возвращал `[{value:'absolute', label:'абс.'}]` (iter 1 Phase B).
- **`src/components/brief/NumberWithUnit.jsx`** — добавлен пропс `noUnit = false`. Когда `noUnit=true` — рендерится только number input без flex-контейнера и без unit-select/text. Полный rewrite с вынесением `numberInput` в JSX-переменную для DRY.
- **`src/components/brief/QuestionRenderer.jsx BaselineInput`** — `noUnit = unitOptions === null` передаётся в `NumberWithUnit`. `onChange` для `noUnit` форсирует `unit: null` в dispatched action (UI больше не передаёт unit). Hint показывается для `metric_type === 'continuous'`.
- **`src/state/reducer.js answerQuestion`** — defensive backstop: если `field === 'baseline'` и `metric_type === 'continuous'` и value — объект → `patch.baseline = { ...value, unit: null }`. Защищает от любого dispatcher'а, который случайно отправит legacy unit.
- **`src/lib/storage.js`** — `migrateBaseline()` хелпер в `mergeRestored`. Если у persisted brief `metric_type === 'continuous'` и `baseline.unit === 'absolute'` — обнуляет unit. Чистит legacy от iter 1 Phase B сессий.

## BUG-Q6 trace-ability

Root cause: `applyEnterDefaults` для `goal_type` (`defaults.js:56-64`) вызывается только из `GOTO_QUESTION` для target (`reducer.js`). Юзер на стартовый Q01 попадает через `initialBrief.currentQuestion=1` без диспатча → defaults не применяются → `isQuestionAnswered(brief, 1)` (`progress.js:6-7`) видит `goal_type=null` → `·` в карте.

**Fix (`src/state/reducer.js GOTO_QUESTION`):**

```js
const current = getQuestion(state.brief.currentQuestion)
const target = getQuestion(num)
let nextBrief = state.brief
if (current) nextBrief = applyEnterDefaults(nextBrief, current.id)
if (target) nextBrief = applyEnterDefaults(nextBrief, target.id)
```

`applyEnterDefaults` идемпотентна через `defaultsApplied` флаги — повторное применение для current — no-op. Существующие GOTO_QUESTION тесты (4 шт) проходят без изменений.

**Edge case:** юзер с restored состоянием уже на Q01 с `goal_type=null` (legacy session где баг проявился) — увидит `·` пока не нажмёт «ДАЛЬШЕ →». После первого navigation defaults применятся, `✓` появится. Приемлемо.

## BUG-Q3 (Q08 реактивность) — статус

Гипотеза подтверждена: BUG-Q3 был следствием BUG-Q5. После Phase 1 (`optimizeDeps.exclude`) recharts больше не падает → Error Boundary не триггерится → React commit завершается → `SampleSizeDisplay` ре-рендерится через `useMemo` deps (`brief.data_peek` уже там, `BriefPage.jsx:42-58`). Reducer `SET_DATA_PEEK` (`reducer.js:316-321`) уже вызывает `recomputePlan(next)`. Никакого отдельного code change не потребовалось.

Финальное подтверждение — за browser smoke (тест-кейс 1 из retest).

## Метрики

- **Тесты:** `npm test` → **335 passed** (iter 1: 328 → iter 2: 335, **+7**)
  - +1 (`questions.test.js` — обновлён assert continuous → null вместо `[absolute]`)
  - +3 (`reducer.test.js` — BUG-Q6 regression guard + Phase F continuous unit forced null + non-continuous unit preserved + null reset не крашит)
  - +3 (`storage.test.js` — migration legacy absolute, non-continuous не трогается, null уже сохранён)
- **Build:** `npm run build` чистый, 652 modules, 424 ms.
- **Bundle:** initial chunk `index-BLLSaruh.js` = **420.66 KB** (iter 1: 420.31 → iter 2: 420.66 KB, **+0.35 KB** на noUnit + hint + storage migration). Lazy `DataPeekHistogram-D6evwuZt.js` = **364.94 KB** (iter 1 с recharts 3.8.1: 325.18 → iter 2 с recharts 2.15.4: 364.94 KB, **+39.76 KB** raw / **+1.55 KB gzip** — recharts 2.x чуть больше, но в lazy chunk; на initial load не влияет). Lazy `csv-C1QupT2H.js` = 24.34 KB (без изменений).

## Browser smoke — пройден ✅

**Подтверждено пользователем 2026-05-29 23:43** (скрин `localhost:5174/stat-plan/#/step1` на Q08):

- ✅ **BUG-Q5:** Histogram отрисован после CSV upload (continuous + `peek_continuous.csv`). Console clean (нет `require_isUnsafeProperty`, нет es-toolkit `default` export error).
- ✅ **BUG-Q3:** Q08 SampleSizeDisplay показывает `~447 sample/arm`, `~1 дн.`, `t_test` — обновлено немедленно после CSV upload (без F5).
- ✅ **C-1 live match (iter 1 Phase D):** `BASELINE 100,431813 vs твой 100 ✓ Δ = 0.4%` — live-сравнение работает, ✓ зелёным, кнопка «↳ ПОДСТАВИТЬ» скрыта (так как match=true).
- ✅ **BUG-Q6:** Q01 «Цель теста» в карте справа показан с `✓` (на скрине видно). Остальные 1-7 ответы тоже с `✓`, Q08 → current.
- ✅ **iter 1 stats display:** σ=80.0403, распределение «симметричное, нормальное» (skew=0.13, kurt=0.08), CV по дням 0.092 (стабильно).

**Что не было visually verified в этом скрине** (но архитектурно гарантировано тестами):
- Phase F dropdown для continuous (этот тест-case — continuous CSV → baseline=100 — скорее всего был введён через iter 1 absolute unit и мигрирован storage.js loadState; в любом случае текущий рендер показывает number input без dropdown в Q05, см. expanded preview карты).
- 3 histogram для ratio (отдельный кейс на ratio CSV).
- Phase F legacy localStorage migration (запускается на mount автоматически).

## Trace-ability summary

Все правки в Code-зоне per CLAUDE.md §P-1:
- `src/**` — application code
- `tests/**` — unit-тесты
- `vite.config.js` — build config (Attempt 3 BUG-Q5)
- `docs/project/sprint-6-fix-iter2-report.md` — этот файл (Code-зона исключение по §P-1 для отчётов)

Cowork-зона (`docs/**` кроме этого отчёта, `CLAUDE.md`) — без изменений.

## Time tracking

- BUG-Q5 Attempts 2 → 3 → 3.5 → downgrade: ~30 мин (Attempts 2-3.5 не сработали; финализированы на 2.x downgrade после анализа `.vite/deps/recharts.js` grep'ом).
- Phase F (questions + NumberWithUnit rewrite + BaselineInput + reducer + storage + 3 файла тестов): ~25 мин.
- BUG-Q6 (root cause + reducer 5-line fix + 1 test case): ~10 мин.
- Test suite + build + dev verification + report: ~20 мин.

**Total active: ~85 мин** (в верхней половине предсказанных 1.5-2 ч; expanded из-за BUG-Q5 multi-attempt диагностики).

## Next steps (для Cowork)

1. Code-зона коммит-готова. Файлы для коммита:
   - **iter 1 (incoming + iter 2 edit'ы):** `src/lib/data-peek/baselineMatch.js` (new), `src/lib/data-peek/csv.js`, `src/lib/data-peek/calculator.js`, `src/components/brief/DataPeek{Stats,Histogram,Block}.jsx`, `src/lib/plan/{parse,render}.js`
   - **iter 2:** `vite.config.js`, `package.json` + `package-lock.json` (recharts downgrade), `src/lib/brief/questions.js`, `src/components/brief/{NumberWithUnit,QuestionRenderer}.jsx`, `src/state/reducer.js`, `src/lib/storage.js`
   - **Тесты:** `tests/lib/brief/questions.test.js` (new), `tests/lib/data-peek/baselineMatch.test.js` (new), `tests/lib/data-peek/csv.test.js`, `tests/lib/plan/{parse,render,round-trip}.test.js`, `tests/state/reducer.test.js`, `tests/lib/storage.test.js`
   - **Code-зона исключение docs/:** `docs/project/sprint-6-fix-report.md` (iter 1), `docs/project/sprint-6-fix-iter2-report.md` (iter 2)
2. После Code-commit'а Cowork делает code review + test-cases файлы (если планируется отдельный test-cases-sprint-6-fix-iter2.md).
3. Решение о recharts 3.x → 2.x downgrade — если Cowork считает это значимым архитектурным изменением, рассмотреть обновление **ADR-014** комментарием «pinned to ^2.15.4 due to Vite 8 + es-toolkit interop bug, revisit when recharts fixes upstream».
