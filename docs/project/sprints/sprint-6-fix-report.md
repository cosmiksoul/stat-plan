# Sprint 6 FIX iter 1 — Code-отчёт

> Источник прицеливания: `docs/project/sprints/sprint-6-fix-prompt.md` + уточнения пользователя 2026-05-29 в чате (BUG-Q4 переформулирован как UI-унификация baseline ↔ MDE; baseline НЕ сбрасывается при смене metric_type — preserve like MDE).
> План: `~/.claude/plans/breezy-petting-clover.md` (одобрен через ExitPlanMode).

## Что закрыто

| Phase | ID | Что | Файлы / строки |
|---|---|---|---|
| A | BUG-Q1 | `optimizeDeps.include: ['recharts']` — esbuild pre-bundles recharts, чинит `require_isUnsafeProperty is not a function` при lazy import | `vite.config.js:11-13` |
| B | UX | `baselineUnitOptionsFor('continuous')` теперь возвращает `[{value: 'absolute', label: 'абс.'}]` вместо `null` — Q05 показывает dropdown во всех metric_type (как Q07 MDE) | `src/lib/brief/questions.js:82-90` |
| D | C-1 | `baselineMatch(computed, userInput)` вынесен в shared util; `DataPeekStats` пересчитывает live на каждом рендере; кнопка «↳ ПОДСТАВИТЬ В Q05» теперь исчезает мгновенно | NEW `src/lib/data-peek/baselineMatch.js`; `src/components/brief/DataPeekStats.jsx:3, 31-36, 56-72`; `src/lib/data-peek/csv.js:19, 311-316` (старый inline `compareBaselines` удалён) |
| E | C-2 | `raw_values_numerator/denominator` добавлены в ratio peek (синхронизированный reservoir sampling); явные null для non-ratio; round-trip через render → parse; `DataPeekHistogram` рендерит 3 малых histogram для ratio (numerator \| denominator \| ratio) с подписями из `ratio_components` | `src/lib/data-peek/csv.js:239-244, 308-310`; `src/lib/data-peek/calculator.js:39-41`; `src/lib/plan/parse.js:480-490`; `src/lib/plan/render.js:75-77`; NEW `src/components/brief/DataPeekHistogram.jsx` (полный rewrite — внутренний `SingleHistogram` + условный рендер); `src/components/brief/DataPeekBlock.jsx:79-95` |

## BUG-Q1 attempts log

| # | Подход | Результат |
|---|---|---|
| 1 | `vite.config.js` → `optimizeDeps: { include: ['recharts'] }` | ✅ Build clean (`npm run build` чисто, 652 modules transformed, 342 ms). Browser smoke за пользователем (см. ниже). Attempt 2 и 3 не понадобились. |
| 2 | Upgrade recharts | Skip — Attempt 1 сработал |
| 3 | `optimizeDeps.exclude: ['recharts']` | Skip — Attempt 1 сработал |

## BUG-Q4 (697M sample-size) — repro check после Phase A

Пользователь подтвердил в чате 2026-05-29: **bug не воспроизводится в текущей сборке**. Гипотеза — был артефактом BUG-Q1 (recharts crash через Error Boundary роняла re-render Q08 SampleSizeDisplay; на reload state поднимался корректно, sample-size казался "правильным после reset URL"). После фикса recharts через `optimizeDeps.include` Error Boundary не триггерится, Q08 ре-рендерится сразу после `SET_DATA_PEEK`.

**Дополнительно (не требовалось, но сделано в рамках уточнения от пользователя):** Phase B убирает источник UX-путаницы — раньше Q05 для continuous показывал free-text-инпут, в который можно было напечатать слово «fraction» (выглядело как тот же dropdown с прошлого proportion-шага). Теперь dropdown с единственной опцией «абс.» — никаких текстовых единиц с прилипшими буквами.

## BUG-Q3 (Q08 не реактивен на SET_DATA_PEEK) — repro check

Ожидаемое поведение после Phase A: bug закрывается автоматически, потому что `SET_DATA_PEEK` reducer (`src/state/reducer.js:316-321`) уже вызывает `recomputePlan(next)`. Если recharts не падает (Phase A), React commit проходит, и Q08 ре-рендерится через `useAppState`. Browser smoke — за пользователем (test-case 3 из `test-cases-sprint-6.md`).

## C-1 trace-ability

**Новый файл** `src/lib/data-peek/baselineMatch.js` — pure util с relative tolerance 10% (тот же критерий, что был inline в csv.js). Возвращает `true`/`false`/`null` (null когда хотя бы один вход не finite).

**DRY confirmation:** `csv.js` теперь импортирует `baselineMatch as compareBaselines` — старый inline `compareBaselines` удалён (`src/lib/data-peek/csv.js:19, 311-316`). Поведение `dp.baseline_match_user_input` (frozen snapshot для scoring +5 pts) идентично — все 13 тестов в `csv.test.js` прежние зелёные.

**Компонент:** `DataPeekStats.jsx` теперь вычисляет `liveMatch = baselineMatch(dp.baseline_computed, userBaseline)` каждый рендер; JSX заменён в 3 местах (className, icon, button visibility — строки 56-72). Поле `dp.baseline_match_user_input` остаётся в state для scoring.

**Тесты:** NEW `tests/lib/data-peek/baselineMatch.test.js` — 5 cases (match, outside tolerance, boundary, null inputs, userInput=0).

## C-2 trace-ability + дизайн-решения

**Решение по labels для 3 histogram:** читаются из `state.brief.ratio_components`. UI: «Числитель (clicks)», «Знаменатель (sessions)», «Ratio (clicks/sessions)». Если ratio_components пуст — fallback на generic «Числитель», «Знаменатель», «Ratio (N/D)». Передаются в DataPeekHistogram через проп `labels={{numerator, denominator}}`.

**Синхронизированный reservoir sampling подтверждён:** все три вызова `reservoirSample(nums | dens | ratios, RAW_VALUES_LIMIT)` используют seed по умолчанию (1). Это даёт три выборки, где i-я точка numerator соответствует i-й denominator и i-й ratio. Сейчас визуально не используется (3 независимых histogram), но логически правильно для будущего scatter plot N vs D.

**Lazy chunk integrity:** `DataPeekHistogram.jsx` остаётся `React.lazy()` через `DataPeekBlock.jsx:9` — никаких eager-импортов recharts. Условный рендер (3 vs 1 histogram) внутри уже-lazy компонента.

**Манипуляции с recharts ResponsiveContainer:** при размере < ~150px по ширине ResponsiveContainer ведёт себя корректно. На мобильных (md:grid-cols-3 → fallback grid-cols-1) рендерится одной колонкой — три histogram вертикально, full-width.

**Manual peek без raw_values:** `calculator.js baseShape` явно возвращает `raw_values_numerator: null, raw_values_denominator: null` — schema parity с csv.js. На UI это автоматически означает: manual peek → DataPeekHistogram не получает массивы → не рендерится (текущее поведение для manual).

## Round-trip status

- **`tests/lib/plan/round-trip.test.js`** — 5/5 зелёные. 5-й case (ratio + полностью заполненный data_peek) расширен на `raw_values_numerator: [10, 11, 9, 10, 12]` и `raw_values_denominator: [100, 105, 95, 100, 110]`. Assertions для обоих массивов добавлены.
- **`tests/lib/plan/parse.test.js`** — +2 case'а: чтение валидных raw_values_n/d, fallback на null для legacy YAML без этих полей.
- **`tests/lib/plan/render.test.js`** — inline snapshot обновлён (2 новые строки в data_peek-блоке).
- **`tests/lib/data-peek/csv.test.js`** — +3 case'а: ratio даёт массивы, continuous и count явно null.

## Bundle delta

| Артефакт | Sprint 6 main | После FIX iter 1 | Δ |
|---|---|---|---|
| `dist/assets/index-*.js` (initial chunk) | ~419 KB | 420.31 KB | +0.78 KB (DataPeekBlock новые пропсы + строки) |
| `dist/assets/DataPeekHistogram-*.js` (lazy chunk) | ~324 KB | 325.18 KB | +0.70 KB (SingleHistogram внутренний + 3-histogram логика) |
| `dist/assets/csv-*.js` (lazy chunk) | ~24 KB | 24.34 KB | +0.03 KB (raw_values_n/d поля) |

Initial chunk: gzip 129.63 KB (was ~129.5 KB). Delta < 1%, в пределах "≈ 0".

## Полный тест-прогон

```
Test Files  19 passed (19)
     Tests  328 passed (328)
  Duration  4.07s
```

Прирост vs Sprint 6 main: **+15 тестов** (Sprint 6 main: 313 → FIX iter 1: 328).
- +5 (`questions.test.js` — новый файл, options shape для всех metric_type)
- +5 (`baselineMatch.test.js` — новый файл)
- +3 (`csv.test.js` — raw_values_n/d для ratio + continuous + count)
- +2 (`parse.test.js` — round-trip raw_values_n/d + legacy null)
- 5-й round-trip case расширен (не +1, расширен)
- inline snapshot обновлён (не +1)

## Browser smoke — за пользователем

Не выполнено в Code-зоне (dev server требует ручной верификации в браузере). Чек-лист для пользователя:

1. **Phase A (test-case 3):** `npm run dev`, Q03=continuous → загрузить `public/samples/peek_continuous.csv` → histogram рендерится без console errors, Q08 SampleSizeDisplay обновляется немедленно.
2. **Phase B:** Q03=continuous → Q05 видит dropdown «абс.» (не free-text). Q03=proportion → Q05 dropdown «%/доля (0-1)» (как было). Q03=ratio → Q05 dropdown «%/доля/число» (как было).
3. **Phase B session-preserve:** Q03=continuous, Q05 baseline=100 unit=«абс.», Q07 MDE=5%. Закрыть вкладку, открыть заново → оба поля восстанавливают введённое (через localStorage).
4. **Phase D (test-case 7):** Q03=continuous + CSV с baseline_computed≈93.12 → Q05 baseline=54 → ⚠ Δ=+72.4% + кнопка → клик → Q05 становится 93.12 → ✓ Δ≈0%, кнопка исчезает мгновенно.
5. **Phase E (test-case 4/6):** Q03=ratio + Q03.1 numerator=`clicks` denominator=`sessions` → загрузить `public/samples/peek_ratio.csv` → DataPeekBlock → 3 малых histogram в одну строку с подписями «Числитель (clicks)», «Знаменатель (sessions)», «Ratio (clicks/sessions)».
6. **Regression sanity:** continuous CSV без baseline mismatch → 1 большой histogram (как было). Manual peek → histogram отсутствует.
7. **Round-trip (test-case 14):** ratio CSV → step 4 download test_plan.md → reset state → upload test_plan.md → DataPeekBlock open → 3 histogram восстановлены.

## Time tracking

- Phase A (vite.config + build verify): ~5 мин
- Phase B (questions.js + test): ~10 мин
- Phase D (baselineMatch util + csv refactor + DataPeekStats + tests): ~20 мин
- Phase E (csv ratio branch + parse + render + Histogram rewrite + Block props + 4 tests): ~40 мин
- Test+build+report: ~15 мин

**Total active: ~1.5 ч** (in lower half of planned 1.5-2.5 ч range; BUG-Q1 решился с первой попытки).

## Trace-ability summary

Все правки в Code-зоне per CLAUDE.md §P-1:
- `src/**` — application code
- `tests/**` — unit-тесты
- `vite.config.js` — build config (для BUG-Q1 esbuild pre-bundle)
- `docs/project/sprints/sprint-6-fix-report.md` — этот файл (исключение Code-зоны по §P-1)

Файлы Cowork-зоны (`docs/**` кроме отчёта, `CLAUDE.md`) не трогались.
