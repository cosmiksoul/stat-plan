# Sprint 6 — Data Peek (Шаг 1): CSV upload + ручной calculator + визуализация

**Type:** Code main sprint
**Estimated:** ~4-5 ч active (можно условно разбить на checkpoint после backend, перед UI — на усмотрение Code)

---

## Overview

Решает наблюдаемую боль (см. скриншот пользователя 2026-05-28): на Q08 для ratio/continuous без исторических параметров sample-size показывается с warning «Для ratio-метрик нужен data peek с числителем и знаменателем. Расчёт через bootstrap fallback — приближение» (`~1 091 / 1 дн / delta_method / bootstrap fallback`). После Sprint 6 пользователь сможет получить **точную** цифру двумя путями: загрузить CSV с историческими данными или ввести параметры вручную через мини-калькулятор.

**Хорошая новость:** backend под Data Peek уже встроен в прошлых спринтах:
- `state.brief.data_peek` schema есть в `parse.js:80` (под-поля `uploaded`, `baseline_computed`, `std_computed`, `baseline_match_user_input`, `distribution_check`).
- `src/lib/plan/sample-size.js:176` уже читает `data_peek.std_computed` для continuous; `:258` читает `data_peek.ratio_variance` для ratio (delta_method).
- `src/lib/plan/scoring.js:308` имеет группу `dataPeek` с весом 20 (штраф «без peek скор ограничен 80»), читает `uploaded`, `baseline_match_user_input`, `distribution_check === 'ok'`, `stability_cv_under_threshold === true`.
- `QuestionMap.jsx:107` уже показывает пункт «Data peek (опционально)» в карте вопросов (UI заглушка).

**Sprint 6 = чистый UI спринт + расширение schema + math + парсер CSV.** Hooks готовы — заполнить data_peek, и sample-size + scoring сразу заработают точно.

**Gap pre-existing (фиксируем в Sprint 6):**
- `ratio_variance` (используется в sample-size.js:258) **не в parse.js mapping** → ratio peek через YAML round-trip терялся бы. Включаем в Sprint 6 schema extension.
- `stability_cv_under_threshold` (используется в scoring.js:322) **не в parse.js mapping** → штраф/бонус scoring через round-trip не восстанавливается. То же.

---

## Архитектурные решения этого спринта

| ADR | Что значит для Sprint 6 |
|---|---|
| **ADR-014** | Добавляем `recharts` (новая npm-зависимость) для гистограммы. Bundle delta ~+50KB gzip + ~+7KB papaparse — допустимо. |
| ADR-001 (no backend) | Парсинг CSV — на клиенте через papaparse. Никаких uploads на сервер. |
| ADR-002 (артефакты как переносимое состояние) | Round-trip data_peek должен работать (см. Round-trip Acceptance §4). |
| ADR-009 (точные формулы / приближения с warning) | После Sprint 6 для continuous + σ из peek — точный t-test. Для ratio + Var/Cov из peek — точный delta_method (вместо bootstrap fallback). |
| ADR-010 (стек) | Уточняется ADR-014: recharts из «кандидата» → принят. |

---

## Scope

### S1. Расширение state.brief.data_peek schema

Текущая структура (в `parse.js emptyBriefShape` и mapping):
```js
data_peek: {
  uploaded: bool,
  baseline_computed: number | null,
  std_computed: number | null,
  baseline_match_user_input: bool | null,
  distribution_check: 'ok' | 'skewed' | 'heavy_tailed' | 'skewed_heavy' | null,
}
```

**Добавить:**
```js
data_peek: {
  // ... existing
  source: 'csv' | 'manual' | null,           // какой tab пользователь использовал
  ratio_variance: number | null,             // для ratio (delta-method), fixes gap
  ratio_mean_numerator: number | null,       // μN для отображения
  ratio_mean_denominator: number | null,     // μD для отображения
  ratio_cov_nd: number | null,               // Cov(N,D) для отображения
  stability_cv_under_threshold: bool | null, // для scoring (fixes gap)
  cv_value: number | null,                   // CV по дням для visual feedback
  skewness: number | null,                   // для distribution_check + display
  kurtosis: number | null,                   // excess kurtosis (распределение — kurtosis - 3)
}
```

**Файлы:**
- `src/lib/plan/parse.js`:
  - `emptyBriefShape()` (строка 80): расширить дефолты `data_peek` всеми новыми полями (или оставить `data_peek: null` как сейчас + расширить mapping).
  - `mapFrontmatter` (строки 442-465): добавить mapping новых полей с type-checks (`isNum`, `isStr`, `isBool`).
- `src/lib/plan/render.js`:
  - `renderDataPeekYaml` (около строки 202): сериализовать все новые поля как `key: value` строки в YAML peek-блоке.

### S2. CSV parser

**Зависимость:** `npm install papaparse` (~7KB gzip).

**Файл:** `src/lib/data-peek/csv.js`.

Функция:
```js
parseDataPeekCsv(text, brief) → {
  ok: bool,
  source: 'csv',
  baseline_computed: number,
  std_computed: number | null,        // для continuous, count
  ratio_variance: number | null,      // для ratio (computed через delta-method из μN, μD, Var, Cov)
  ratio_mean_numerator, ratio_mean_denominator, ratio_cov_nd: number | null,
  skewness: number | null,
  kurtosis: number | null,
  distribution_check: string | null,
  cv_value: number | null,            // если есть колонка 'day'
  stability_cv_under_threshold: bool | null,
  raw_values: number[],               // для histogram (limit ~1000 для производительности)
  day_buckets: Array<{day, mean}> | null,  // для CV line-chart
  warnings: string[],
  error: { message } | null,          // когда ok: false
}
```

**Expected колонки CSV (определяются по `brief.metric_type` и `brief.metric_column`):**

| metric_type | Required колонки | Optional |
|---|---|---|
| proportion | `<brief.metric_column>` (0/1 или fraction values) | `day` |
| continuous | `<brief.metric_column>` (float) | `day` |
| ratio | `<brief.ratio_components.numerator>`, `<brief.ratio_components.denominator>` | `day` |
| count | `<brief.metric_column>` (integer ≥ 0) | `day` |

Если требуемой колонки нет — `ok: false`, осмысленный error.

**Edge cases:**
- File > 50MB → reject `{ ok: false, error: 'CSV слишком большой (>50MB)' }` (ADR-001 джентльменское соглашение).
- BOM в начале → strip.
- CRLF / LF — papaparse безразличен.
- Пустой файл / только header → `error`.
- Колонка существует, но все значения NaN/null → `error`.

### S3. Math: skewness, kurtosis, ratio_variance, CV

**Файл:** `src/lib/data-peek/stats.js`.

```js
// Sample skewness (biased estimator)
skewness(values: number[]) → number

// Sample excess kurtosis (kurtosis - 3, biased)
kurtosis(values: number[]) → number

// Delta-method variance for ratio = N/D
// Formula: var(N/D) ≈ var(N)/μD² - 2·μN·cov(N,D)/μD³ + μN²·var(D)/μD⁴
deltaMethodVariance({ mean_n, mean_d, var_n, var_d, cov_nd }) → number

// CV (coefficient of variation) of daily means
dailyCV(rows: Array<{day, value}>) → { cv: number, n_days: number }
```

**distribution_check logic:**
```js
const sk = skewness(values)
const ku = kurtosis(values)   // excess kurtosis
const isSkewed = Math.abs(sk) > 1
const isHeavyTailed = ku > 3
if (isSkewed && isHeavyTailed) return 'skewed_heavy'
if (isSkewed) return 'skewed'
if (isHeavyTailed) return 'heavy_tailed'
return 'ok'
```

**stability_cv_under_threshold:** `cv_value < 0.3` → `true`. Если в CSV нет колонки `day` — оба поля `null` (+0 pts в scoring).

**Tests** (`tests/lib/data-peek/stats.test.js`):
- Минимум 12 кейсов:
  - 3 для skewness: normal sample → ~0; log-normal → positive (~1+); negatively skewed → negative.
  - 3 для kurtosis: normal → ~0 excess; t-distribution heavy tail → positive; uniform → negative.
  - 3 для deltaMethodVariance: ratio с известными μN/μD/var/cov → expected variance (см. canonical example ниже).
  - 3 для dailyCV: стабильная метрика по дням → CV < 0.3; волатильная → CV > 0.3; пустой массив → cv: null.

**Canonical example для deltaMethodVariance:** μN = 10, μD = 100, var_n = 4, var_d = 100, cov_nd = 5. Result ≈ `4/10000 - 2·10·5/1_000_000 + 100·100/100_000_000` = `0.0004 - 0.0001 + 0.0001` = `0.0004`. (Это пример, верификация на чистой математике, не ML-эвристика.)

### S4. Manual calculator

**Файл:** `src/lib/data-peek/calculator.js`.

Чистая логика валидации + конструирование data_peek объекта из ручного ввода:
```js
buildManualDataPeek({ metric_type, fields }) → {
  ok: bool,
  source: 'manual',
  baseline_computed: number | null,   // обычно = brief.baseline.value (manual peek не пересчитывает)
  std_computed: number | null,
  ratio_variance: number | null,
  ratio_mean_numerator, ratio_mean_denominator, ratio_cov_nd: number | null,
  warnings: string[],
  errors: { [field]: message } | null,
}
```

**Поля per metric_type:**

| metric_type | Calculator поля | Computed |
|---|---|---|
| **proportion** | — (calculator не показывается; UI: «Peek для proportion не нужен — baseline уже задан в Q05») | — |
| **continuous** | 1 поле: `σ` (number > 0) | `std_computed = σ` |
| **ratio** | 5 полей: `μN`, `μD`, `Var(N)`, `Var(D)`, `Cov(N,D)` (все numbers; var ≥ 0) | `ratio_variance` через `deltaMethodVariance` |
| **count** | 1 поле: `σ` (placeholder: `√baseline` через Poisson assumption — пользователь видит дефолт и может override) | `std_computed = σ` |

**Manual peek даёт partial scoring:** `+5 pts` за `uploaded: true`. distribution_check / stability_cv остаются `null` (calculator не имеет raw values). UI явно говорит: «Для distribution check загрузи CSV».

**Tests** (`tests/lib/data-peek/calculator.test.js`):
- 4-6 кейсов: каждый metric_type с валидным input → ожидаемый output; невалидный input (σ ≤ 0, Var < 0) → error.

### S5. UI components

#### S5.1. `src/components/brief/DataPeekBlock.jsx`

Collapsible inline блок, вешается под `SampleSizeDisplay` на Q08.

**Поведение:**
- Если `brief.data_peek?.uploaded === true` → блок closed by default, header показывает badge `✓ Data Peek применён (source: csv|manual)`.
- Если `brief.data_peek?.uploaded !== true` и `brief.metric_type ∈ ['ratio', 'continuous']` → блок **open by default** (UX: пользователь видит warning sample-size и сразу invite на peek).
- Если `brief.metric_type === 'proportion'` → блок closed, header: «Peek для proportion не нужен — baseline уже задан». Tabs/calculator не рендерятся.
- Если `brief.metric_type === 'count'` → блок closed by default, header: «Peek опционален (default σ = √baseline через Poisson)».

**Стилизация:** существующие токены `bg-bg-elev-2 + border-soft` (как `SampleSizeDisplay` placeholder); без новых @theme.

#### S5.2. `src/components/brief/DataPeekTabs.jsx`

Два таба: `CSV` | `Ручной ввод`. Управляются локальным state. По дефолту — `CSV` для всех metric_type.

#### S5.3. `src/components/brief/DataPeekCsvUpload.jsx`

Drag-drop карточка + «или выбери файл» (паттерн как `StartScreen.jsx` для test_plan.md).

**Expected schema preview** (важно — пользователь должен знать что положить в CSV):
- Для metric_type ratio: «Ожидаем колонки: `<numerator>`, `<denominator>` + опционально `day`».
- Для остальных: «Ожидаем колонку `<brief.metric_column>` + опционально `day`».

При drop / file pick → читать через `FileReader.readAsText` → `parseDataPeekCsv(text, brief)` → dispatch `SET_DATA_PEEK` с результатом.

#### S5.4. `src/components/brief/DataPeekManualForm.jsx`

Форма per metric_type (S4 spec). На submit → `buildManualDataPeek(...)` → dispatch `SET_DATA_PEEK`.

Для count: placeholder σ в инпуте = `Math.sqrt(brief.baseline.value).toFixed(2)`, текстовая подсказка «по Poisson assumption σ = √λ; можешь переопределить».

#### S5.5. `src/components/brief/DataPeekHistogram.jsx`

**Зависимость:** `recharts` (ADR-014).

Bar chart из `data_peek.raw_values` (если есть, т.е. source === 'csv'):
- Bin'инг: `Math.min(30, Math.ceil(Math.sqrt(n)))` бинов (rule of thumb).
- Tooltip: «bin range, count».
- Стилизация: цвет из существующих токенов.
- Для **ratio** показываем 3 малых histogram: numerator, denominator, ratio = N/D.
- Для proportion histogram не показываем (значения 0/1 — бессмысленно).

#### S5.6. `src/components/brief/DataPeekStats.jsx`

Summary card после CSV upload:
- **Baseline real vs user input:** `baseline_computed` vs `brief.baseline.value`, дельта в %. Если |Δ| < 10% → `✓ Совпадает` (`baseline_match_user_input = true`); иначе → `⚠ Не совпадает (Δ = X%)` с кнопкой «Подставить из CSV в Q05» (опциональный action, dispatch SET_BASELINE).
- **Distribution:** skewness, kurtosis, метка из `distribution_check` (`'ok' / 'skewed' / 'heavy_tailed' / 'skewed_heavy'`).
- **Stability:** CV value, threshold-метка (✓ если < 0.3, ⚠ иначе).

### S6. Reducer extensions

**Файл:** `src/state/reducer.js`.

**Actions:**
- `SET_DATA_PEEK` payload `{ data_peek }` → merges в `state.brief.data_peek`. Триггерит recompute sample-size + scoring (через существующий `RECOMPUTE_PLAN` или эквивалент — посмотри как `SET_BRIEF_FIELD` это делает сейчас).
- `RESET_DATA_PEEK` → `state.brief.data_peek = emptyDataPeek()`. Триггерит recompute.
- `RESET_STATE` (уже существует) — расширить чтобы сбрасывал data_peek.

**Tests** (`tests/state/reducer.test.js`): +3 кейса (SET, RESET, RESET_STATE).

### S7. Integration в BriefPage Q08

В `src/pages/BriefPage.jsx`:
- После `<SampleSizeDisplay/>` (или эквивалентный компонент) на Q08 — добавить `<DataPeekBlock/>`.
- DataPeekBlock сам управляет своим open/closed состоянием на основе `brief.data_peek` и `brief.metric_type`.

### S8. QuestionMap update

`src/components/brief/QuestionMap.jsx:107` уже показывает пункт «Data peek (опционально)». Когда `data_peek.uploaded === true` — показать ✓ статус (как для отвеченных Q). Также добавить inline preview (через `▸/▾` toggle): `source: csv, baseline: 0.031 (match: ✓)` или подобное.

---

## Что НЕ делаем (DO NOT)

- ❌ **Не реализовываем** bimodality detection в `distribution_check`. Только skewness + kurtosis (см. S3). Сложные mixture models — отложено.
- ❌ **Не делаем** generic CSV viewer / data explorer. Парсер строго под `brief.metric_type` (см. S2 таблица).
- ❌ **Не пересчитываем** scoring или sample-size — backend hooks уже работают, надо только заполнить `state.brief.data_peek`.
- ❌ **Не разблокируем** Шаги 4-5 — это Sprint 7. Stepper.jsx остаётся 5-шаговым (структурный rewrite — Sprint 7).
- ❌ **Не модифицируем** существующие тесты / снапшоты в `parse.test.js` / `render.test.js` / `notebook-builder.test.js` иначе, чем для добавления новых data_peek полей в round-trip.
- ❌ **Не вводим** новых @theme токенов. Переиспользуем `bg-bg-elev-2`, `border-soft`, `text-fg-faint`, существующие info/warn/accent.
- ❌ **Не подключаем** другие новые npm-зависимости кроме `recharts` + `papaparse` (ADR-014 покрывает только эти две).
- ❌ **Не трогаем** Cowork-зону (`docs/**`, `CLAUDE.md`, `README.md`, `.gitignore`, `.gitattributes`).
- ❌ **Не делаем** ML-эвристики «угадать metric_column из CSV» — пользователь сам обеспечивает правильное имя колонки = `brief.metric_column`.
- ❌ **Не делаем** ipynb-генерацию data_peek-блока в Sprint 6 — пока только UI/state. Если data peek доступен — sample-size в плане уже точный, этого достаточно.

---

## Files involved

**Создаём:**
- `src/lib/data-peek/csv.js` (S2)
- `src/lib/data-peek/stats.js` (S3)
- `src/lib/data-peek/calculator.js` (S4)
- `src/components/brief/DataPeekBlock.jsx` (S5.1)
- `src/components/brief/DataPeekTabs.jsx` (S5.2)
- `src/components/brief/DataPeekCsvUpload.jsx` (S5.3)
- `src/components/brief/DataPeekManualForm.jsx` (S5.4)
- `src/components/brief/DataPeekHistogram.jsx` (S5.5)
- `src/components/brief/DataPeekStats.jsx` (S5.6)
- `tests/lib/data-peek/stats.test.js` (+12 case)
- `tests/lib/data-peek/calculator.test.js` (+4-6 case)
- `tests/lib/data-peek/csv.test.js` (+8-10 case на 4 metric_type × happy/error)

**Модифицируем:**
- `package.json` + `package-lock.json` — `+ recharts`, `+ papaparse`
- `src/lib/plan/parse.js` — S1 schema extension + mapping
- `src/lib/plan/render.js` — S1 YAML serialization
- `src/state/reducer.js` — S6 actions
- `src/pages/BriefPage.jsx` — S7 integration
- `src/components/brief/QuestionMap.jsx` — S8 status + preview
- `tests/lib/plan/parse.test.js` — +5-6 round-trip case для новых data_peek полей
- `tests/lib/plan/round-trip.test.js` — +1 canonical case с заполненным data_peek (например ratio + CSV)
- `tests/state/reducer.test.js` — +3 case (SET_DATA_PEEK, RESET_DATA_PEEK, RESET_STATE сбрасывает)

**Не трогаем:**
- `src/lib/plan/sample-size.js` — hooks готовы, поведение не меняется.
- `src/lib/plan/scoring.js` — hooks готовы.
- `templates/`, `public/`, `.github/workflows/`, `src/components/Stepper.jsx`, прочие.
- `docs/**` — Cowork-зона.

---

## Technical Notes

### Performance для больших CSV
- File > 50MB → reject (S2).
- Для гистограммы (S5.5): храним в `raw_values` максимум первые ~1000 точек (через random sample если файл больше). Иначе bar chart на 100K точек подтормозит React rendering. Sampling не влияет на baseline / std / skewness / kurtosis — те считаются на полной выборке в `csv.js`, в state кладётся только subset для отображения.

### YAML round-trip для data_peek
Текущая `render.js renderDataPeekYaml` пишет nested object. После S1 расширения — следить, чтобы все 8 новых полей сериализовались/парсились симметрично. Canonical round-trip case в `round-trip.test.js` (6-й) явно покрывает.

### CSV column resolution для ratio
`brief.ratio_components.numerator` / `.denominator` — это **названия колонок** в CSV (например `'clicks'` и `'sessions'`). Их пользователь записал на Q03.1. Если они пустые — CSV для ratio не парсится, error «Заполни числитель и знаменатель в Q03.1 перед загрузкой CSV».

### Manual для proportion / count
**Proportion:** calculator вообще не показывается. UI: «Peek для proportion не нужен — baseline (CR) уже задан в Q05; точный z-test без peek». Tab CSV — оставляем для опционального distribution_check (baseline уже подтверждается через `baseline_match_user_input`).

**Count:** σ через Poisson default = `√baseline`. Этот σ уже автоматически используется в `tTestSampleSize` (используется как fallback в mannwhitney). Manual override полезен для overdispersed counts (negative binomial). UI это явно объясняет.

### Distribution check для ratio
Считаем на ratio values (N/D по строкам), не на N/D по отдельности. Гистограмма по S5.5 — 3 малых: N, D, N/D.

### Reactive sample-size после peek
После `SET_DATA_PEEK` — `state.brief.data_peek.std_computed` (или `ratio_variance`) заполнено → `sample-size.js resolveSigma` берёт из peek → `calculateSampleSize` возвращает точную цифру без warning «загрузи csv в Data Peek». **Никаких изменений в sample-size.js не нужно** — hooks уже работают. Это критично проверить в browser smoke.

### Bundle estimation
- recharts ~50KB gzip
- papaparse ~7KB gzip
- Свой код ~4-6KB gzip (компоненты + math + parser)
- **Total expected: 124.93 → ~190 KB gzip (+60-65 KB).** Если значительно больше — флагнуть в отчёт.

---

## Acceptance criteria

1. `npm test` зелёный. **Прирост ~+30 тестов** (stats ~12, calculator ~5, csv ~9, reducer ~3, parse round-trip ~5, round-trip canonical +1). Total: **~297**.
2. `npm run build` чистый. Bundle: **в коридоре +60-65 KB gzip**. Если выше — объяснение.
3. Round-trip `tests/lib/plan/round-trip.test.js` — **6/6** canonical case зелёные (5 старых + 1 новый с data_peek).
4. **Browser smoke (~10-15 минут):**
   - **Continuous + manual:** Q08 → DataPeekBlock open → tab «Ручной ввод» → σ = X → sample size в Q08 пересчитан без bootstrap warning. QuestionMap показывает ✓ на «Data peek».
   - **Continuous + CSV:** Q08 → DataPeekBlock open → tab CSV → drag-drop CSV с колонкой `<brief.metric_column>` → видим histogram + skewness/kurtosis/CV + baseline match indicator → sample size без warning.
   - **Ratio + CSV:** Q08 → DataPeekBlock open → tab CSV → drag-drop CSV с колонками `<numerator>` и `<denominator>` → видим 3 малых histogram + ratio_variance в Stats card → sample size без warning «delta_method bootstrap fallback».
   - **Proportion:** Q08 → DataPeekBlock closed by default с подписью «Peek для proportion не нужен». Открыв → нет calculator-tab (только CSV для distribution check опционально).
   - **Count + default Poisson:** Q08 → DataPeekBlock closed by default с подписью «Peek опционален». Открыв → tab Ручной ввод → σ заполнено как `√baseline` placeholder.
   - **CSV с пропавшей колонкой:** валидный CSV без колонки `<metric_column>` → inline error «Ожидаем колонку X, не найдена». State не меняется.
   - **CSV > 50MB:** inline error.
   - **Round-trip через UI:** заполнить бриф с data_peek (любой metric_type) → утвердить → скачать test_plan.md → reset → загрузить обратно → DataPeekBlock показывает `✓ применён`, sample-size точный, баннер «Загружен» виден.

---

## Sprint Report — что ожидаем

В `docs/project/sprint-report-6.md` (по шаблону Sprint 5):

- **Trace-ability** для S1..S8: каждый → файлы/строки/тесты/коммиты.
- **Bundle delta** — точный размер до/после (recharts + papaparse + свой код). Если > +75 KB gzip — объяснение.
- **Round-trip status** — 6/6? Если новый case (data_peek) сломался — что починили.
- **Math корректность** — для skewness/kurtosis/deltaMethodVariance — какие canonical examples проверили (numerical values). Это **критично** — это первые статистические функции в `data-peek/`, не sample-size.
- **distribution_check** — какие реальные CSV проверили (например, log-normal sample → должен дать `skewed`). Если флаги срабатывают неожиданно — флагнуть.
- **CSV edge cases** — какие конкретно проверили (BOM, CRLF, missing columns, empty file, all-NaN values, etc).
- **UX feedback** — какие badges/иконки реализовал в QuestionMap и DataPeekBlock header (краткое описание состояний open/closed/applied).
- **gap fixes** — подтвердить что `ratio_variance` round-trip работает (этого не было до Sprint 6).
- **Time tracking** — ожидаемый total ~4-5 ч; если > 6 ч — что съело время.
- **Open questions / known issues** — если есть.

---

## Related

- `docs/project/JTBD.md §4` — user stories для Data Peek (6 пунктов + 1 ◆ manual calculator).
- `docs/context/decisions-log.md` — **ADR-014** (recharts + papaparse Accepted), ADR-009 (точные формулы / приближения с warning).
- `docs/context/SAMPLE_SIZE_CALC.md` — формулы под методы; delta-method для ratio.
- `docs/project/PROJECT_STATUS.md` — roadmap (Sprint 6 = это, Sprint 7 = Шаг 4 объединённый).
- Скриншот пользователя (2026-05-28, диалог Sprint 6 PLAN): `~1 091 / 1 дн / delta_method / bootstrap fallback` — observed pain, которую Sprint 6 решает.
