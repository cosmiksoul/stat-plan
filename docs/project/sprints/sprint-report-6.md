# Sprint 6 — Code-отчёт

> Источник прицеливания: чат-prompt от Cowork «Sprint 6 — Data Peek (Шаг 1): CSV upload + ручной calculator + визуализация» от 2026-05-29. План — `~/.claude/plans/expressive-herding-swan.md` (после Phase 1+2 разведки, перезаписан с нуля под Sprint 6, одобрен через ExitPlanMode).

## Что закрыто

| ID | Что | Файлы / строки |
|---|---|---|
| **T1** | Backend schema extension: `data_peek` поля `source`, `ratio_variance`, `ratio_mean_*`, `ratio_cov_nd`, `stability_cv_under_threshold`, `cv_value`, `skewness`, `kurtosis`, `raw_values` парсятся + сериализуются + есть в initialBrief | `src/lib/plan/parse.js:442-490`, `src/lib/plan/render.js:53-86`, `src/state/reducer.js:46-48` |
| **T2** | Math primitives: `skewness`, `kurtosis`, `deltaMethodVariance`, `dailyCV`, `distributionLabel` | NEW `src/lib/data-peek/stats.js` |
| **T3** | CSV parser per metric_type (proportion / continuous / count / ratio) + edge cases (50MB cap, BOM strip, missing column, all-NaN, ratio с пустыми компонентами) + reservoir sampling raw_values до 1000 | NEW `src/lib/data-peek/csv.js` (papaparse, lazy-loaded) |
| **T4** | Manual calculator per metric_type | NEW `src/lib/data-peek/calculator.js` |
| **T5** | Reducer: `SET_DATA_PEEK` + `RESET_DATA_PEEK` — оба авто-recompute плана (per D1 = образец `LOAD_TEST_PLAN_MD`). `RESET_STATE` сбрасывает через initialBrief | `src/state/reducer.js:118-133, 320-330` |
| **T6** | UI компоненты (6 шт.): collapsible block, tabs, drag-drop CSV, manual form, recharts histogram (lazy), summary stats | NEW `src/components/brief/DataPeek{Block,Tabs,CsvUpload,ManualForm,Histogram,Stats}.jsx` |
| **T7** | Integration: `<DataPeekBlock/>` под `<SampleSizeDisplay/>` на Q08; QuestionMap данные peek line с динамическим статусом + preview toggle | `src/pages/BriefPage.jsx:190-195`, `src/components/brief/QuestionMap.jsx:101-167` |
| **T8** | +5 parse-tests (backward-compat 5-полевой YAML; чтение ratio_variance + остальных; rejection не-массива и не-чисел в raw_values), +1 canonical round-trip case (ratio + полностью заполненный data_peek) | `tests/lib/plan/parse.test.js`, `tests/lib/plan/round-trip.test.js` |
| **T9** | Full test run + production build | см. секции ниже |
| **T10** | Этот отчёт + commit | — |

### Decisions, принятые на этапе планирования

| # | Что | Зафиксировано в плане |
|---|---|---|
| D1 | `SET_DATA_PEEK` авто-recompute внутри reducer'а (DRY, callers не дублируют) | да |
| D2 | `data_peek: null` добавлен в `initialBrief` (раньше отсутствовало) | да |
| D3 | `raw_values` лимит 1000 точек (reservoir sample) + персистится + в YAML | да (пользователь подтвердил через AskUserQuestion) |
| D4 | localStorage key `stat-plan:v1:state` не бампается (spread-merge) | да |
| D5 | Action `SET_DATA_PEEK` / `RESET_DATA_PEEK` отдельные, не через `ANSWER_QUESTION` | да |

## Метрики

### Тесты
- **Baseline после Sprint 5 FIX iter 1:** 267 pass / 15 files.
- **После Sprint 6:** **313 pass / 17 files** (+46 net).
  - **+17** `tests/lib/data-peek/stats.test.js` (skewness/kurtosis/dM-variance/dailyCV/distributionLabel)
  - **+13** `tests/lib/data-peek/csv.test.js` (happy per metric_type + 6 errors + proportion warning)
  - **+7** `tests/lib/data-peek/calculator.test.js` (per metric_type + invalid input)
  - **+4** `tests/state/reducer.test.js` (SET_DATA_PEEK / RESET_DATA_PEEK / no-op malformed payload / RESET_STATE clears data_peek)
  - **+1** `tests/lib/plan/round-trip.test.js` (6-й canonical case — ratio + полностью заполненный data_peek)
  - **+4** `tests/lib/plan/parse.test.js` (backward-compat 5-полевой YAML; чтение ratio_variance; rejection non-array и non-number raw_values)
- **Обновлён** inline snapshot в `tests/lib/plan/render.test.js`: data_peek блок вырос с 5 полей до 15 (ожидаемое следствие T1). Diff чистый — только добавленные поля, остальной YAML без изменений.

### Round-trip 6/6 ✓
1. ratio + cluster + custom rules + advanced opts.
2. cyrillic + ё goal_description (BUG-9b sanity).
3. length_cap_days=14 recovery.
4. non-default decision_rules.
5. empty metric_column via P-7 legacy heuristic (Sprint 5 FIX C-2).
6. **NEW** ratio + полностью заполненный data_peek (ratio_variance, raw_values, stability_cv_under_threshold) — gap fix Sprint 6.

### Сборка

**До Sprint 6:** 401.17 KB raw / 124.93 KB gzip (single chunk).

**После Sprint 6 (с lazy chunks для recharts + papaparse):**
- `index.js` (initial): **419.53 KB raw / 129.48 KB gzip** → **+18.36 KB raw / +4.55 KB gzip** на initial bundle.
- `DataPeekHistogram` chunk (lazy, recharts): 324.48 KB raw / 96.19 KB gzip — загружается асинхронно при первой гистограмме.
- `csv` chunk (lazy, papaparse): 24.31 KB raw / 9.09 KB gzip — асинхронно при первом CSV upload.

**Объяснение:** прямой импорт recharts + papaparse в initial bundle давал **+367 KB raw / +110.76 KB gzip** (почти 2× от прогноза +60-65 KB gzip в плане). Сделал поэтому **mid-flight architecture change**:
- `DataPeekHistogram` загружается через `React.lazy(...) + Suspense` (показывается только при `dp.raw_values?.length > 0`, т.е. после CSV upload — manual peek не триггерит).
- `parseDataPeekCsv` импортируется динамически внутри `DataPeekCsvUpload.readAndDispatch` (`await import(...)` после file pick).

Итог: initial bundle delta **+4.55 KB gzip** — намного ниже коридора +60-65 KB. Cost — first interaction lag ~50-200ms при первом CSV upload (сетевой fetch chunk'а) + ~100ms при первой гистограмме. Для UI-opt-in flow это приемлемо.

## Math корректность

Verified в `tests/lib/data-peek/stats.test.js`:

- **skewness:** normal N(0,1) sample n=2000 → |skew| < 0.2; log-normal sample → skew > 0.5; mirrored log-normal → skew < -0.5.
- **kurtosis (excess):** normal → |kurt| < 0.4; Cauchy-like (ratio of normals) → kurt > 3 (heavy-tail flag triggers); uniform → kurt < -0.5 (light-tail, scoring.js не пенализирует).
- **deltaMethodVariance canonical example** (µN=10, µD=100, var_N=4, var_D=100, cov=5):
  ```
  4/10000 - 2·10·5/1_000_000 + 100·100/100_000_000 = 0.0004 - 0.0001 + 0.0001 = 0.0004
  ```
  Test `.toBeCloseTo(0.0004, 8)` ✓. Также упрощённый case с cov=0, var_d=0 → ratio_var = var_n/µD².
- **dailyCV:** stable mock (14 дней по 100 obs ~ 1.0) → cv < 0.3, stability=true; volatile mock (10 дней с means 1..10) → cv > 0.3, stability=false; нет колонки day → cv:null, stability:null (scoring.js не даёт бонус).

## distribution_check на реальных samples

Проверено в csv.test.js: ratio CSV с проектируемым μ ≈ 0.1 → `distribution_check === 'ok'`. (Расширенное тестирование log-normal как реального CSV — заложено в browser smoke; в unit-тестах генерируем через стат-функции в самом stats.test.js.)

## CSV edge cases — что проверено

В `tests/lib/data-peek/csv.test.js`:
- ✓ continuous: μ + σ + raw_values.
- ✓ proportion: μ + match user input.
- ✓ ratio: μN, μD, Cov(N,D), ratio_variance через delta-method, baseline = μN/μD.
- ✓ count: σ через распределение values.
- ✓ BOM strip.
- ✓ stability_cv_under_threshold по колонке day (стабильный паттерн → true).
- ✓ Reject empty file.
- ✓ Reject missing column (с message с именем колонки).
- ✓ Reject ratio когда ratio_components пусты (с подсказкой про Q03.1).
- ✓ Reject all-NaN column.
- ✓ Reject когда metric_type не задан.
- ✓ Reject > maxBytes (через injected option, чтобы не аллоцировать 50MB в test VM).
- ✓ Warning при mean > 1 для proportion (вероятно проценты вместо fraction).

Один нюанс реализации: papaparse выдаёт `UndetectableDelimiter` warning для single-column CSV — это benign. Фильтруется в csv.js (см. `realErrors = parsed.errors.filter(e => e.code !== 'UndetectableDelimiter')`).

## UX feedback (что увидит пользователь)

**DataPeekBlock collapsible** под SampleSizeDisplay на Q08:
- При `data_peek.uploaded === true` → collapsed + бэйдж `✓ Data Peek применён (csv|manual)` (text-ok). Открыв — DataPeekStats + (если raw_values) Histogram + кнопка «↺ Сбросить data peek».
- При `metric_type ∈ ['ratio','continuous']` и нет peek → **open by default**, виден гайд + tabs.
- При `metric_type === 'proportion'` → closed + подпись «Peek для proportion не нужен — baseline (CR) уже задан в Q05». Tabs не рендерятся.
- При `metric_type === 'count'` → closed + подпись «Peek опционален. По умолчанию σ = √baseline (Poisson)». Открыв — обычные tabs, в Manual placeholder σ предзаполнен `√baseline`.

**QuestionMap data peek row** (`src/components/brief/QuestionMap.jsx:101-167`):
- Иконка статуса: `✓` (text-ok) при uploaded, `·` (text-fg-faint) иначе.
- Лейбл `DP / Data peek (опционально)`.
- Preview через ▸/▾ (как Q-вопросы): `источник: csv, baseline: 0.0987, match: ✓, σ=80, Var(N/D)=0.0004` (поля показываются только если заполнены).

**DataPeekStats** показывает: source, baseline_computed vs userInput + Δ% + цветная метка ✓/⚠ + (если mismatch) кнопка «↳ ПОДСТАВИТЬ В Q05» (dispatch ANSWER_QUESTION). Для ratio — Var(N/D) + μN/μD/Cov. Distribution — label + skew/kurt в моноширнем. CV — value + threshold mark.

**DataPeekCsvUpload:** schema preview сверху (с кодами колонок для текущего metric_type), drag-drop area по образцу StartScreen.jsx:107-157, inline error для structural errors, inline warnings для нон-fatal (например proportion mean > 1).

## Gap fixes — round-trip симметрия

Подтверждено в `tests/lib/plan/round-trip.test.js` (6-й canonical case):
- **`ratio_variance`** теперь сериализуется в YAML и парсится обратно (раньше парсер игнорировал, хотя sample-size.js:258 читал его → bootstrap fallback вместо точного delta-method).
- **`stability_cv_under_threshold`** теперь round-trip-able (раньше парсер игнорировал, хотя scoring.js:322 давал +5 pts за него → штраф/бонус не симметричен).
- Также: `source`, `ratio_mean_*`, `ratio_cov_nd`, `skewness`, `kurtosis`, `cv_value`, `raw_values` — всё пишется и читается.

## Изменённые / новые файлы

**NEW (12 файлов):**
- `src/lib/data-peek/csv.js`
- `src/lib/data-peek/stats.js`
- `src/lib/data-peek/calculator.js`
- `src/components/brief/DataPeekBlock.jsx`
- `src/components/brief/DataPeekTabs.jsx`
- `src/components/brief/DataPeekCsvUpload.jsx`
- `src/components/brief/DataPeekManualForm.jsx`
- `src/components/brief/DataPeekHistogram.jsx`
- `src/components/brief/DataPeekStats.jsx`
- `tests/lib/data-peek/stats.test.js`
- `tests/lib/data-peek/csv.test.js`
- `tests/lib/data-peek/calculator.test.js`

**MODIFY:**
- `package.json` + `package-lock.json` (papaparse + recharts)
- `src/lib/plan/parse.js` — data_peek mapping расширен с 5 до 15 полей
- `src/lib/plan/render.js` — renderDataPeekYaml расширен + multi-line raw_values
- `src/state/reducer.js` — initialBrief.data_peek + SET/RESET_DATA_PEEK actions
- `src/pages/BriefPage.jsx` — DataPeekBlock под SampleSizeDisplay
- `src/components/brief/QuestionMap.jsx` — динамическая Data Peek row
- `tests/lib/plan/parse.test.js` — +4 case
- `tests/lib/plan/round-trip.test.js` — +1 canonical
- `tests/state/reducer.test.js` — +4 case
- `tests/lib/plan/render.test.js` — inline snapshot обновлён

**Не тронуто:** `src/lib/plan/sample-size.js`, `scoring.js` (hooks готовы, поведение не меняется); `templates/`, `public/`, `.github/workflows/`, `Stepper.jsx`; `docs/**` (кроме этого отчёта — Code-зона).

## Time tracking

- Разведка (3 Explore-agents параллельно) + планирование: ~25 мин
- T1 backend schema: ~10 мин
- T2 stats.js + 17 тестов: ~15 мин
- T3 csv.js + 13 тестов: ~20 мин (5 мин ушло на debugging Papa UndetectableDelimiter + size-cap injection)
- T4 calculator + 7 тестов: ~10 мин
- T5 reducer + 4 теста: ~10 мин
- T6 UI (6 компонентов): ~30 мин
- T7 BriefPage + QuestionMap integration: ~10 мин (1 мелкая ошибка с дубликатом хвоста при Edit — быстро fix)
- T8 round-trip + parse тесты: ~10 мин
- T9 full test + build + lazy-load mid-flight: ~15 мин (lazy refactor сам по себе 5-7 мин)
- T10 отчёт + commit: ~10 мин

**Total active:** ~165 мин ≈ 2 ч 45 мин. В коридоре ожидания (4-5 ч).

## Open questions / known issues

- **Lazy-loaded histogram fallback UX**: при первом открытии loaded peek после `LOAD_TEST_PLAN_MD` пользователь увидит `Загружаю гистограмму…` на 50-200ms перед рендером recharts. Это OK для current page reload, но если будет жалоба — можно prefetch chunk при наведении на DataPeekBlock header.
- **proportion CSV value range warning** срабатывает при mean > 1 (намёк «похоже на проценты»). Не превращаю в error — пользователь может сознательно загружать что-то нестандартное. Если будет confusion — обсудим.
- **distribution_label на realних CSV (Sprint 6 step 2)**: для browser smoke рекомендую тестовый log-normal CSV (хотел бы получить от Cowork / QA пример). Unit-тесты покрывают функции, но real-world threshold tuning может потребовать корректировок (текущие |skew| > 1 и kurt > 3 — стандартные значения).
- **Sprint 5 FIX side-finding** (sample-size.js dead unit='percent' branch удалён в C-1) — никаких изменений в Sprint 6 не делал.
