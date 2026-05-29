# CONTEXT — история проекта `<project>`

> Журнал развития проекта. Обновляется Cowork в фазе CLOSE каждого спринта.
>
> **Назначение:** новый инстанс Cowork (или ты сам через месяц) сможет прочитать этот файл и понять историю проекта без перечитывания всех sprint-report.

---

## Development Timeline

> Записи в обратном хронологическом порядке (новые сверху).

### Sprint 6 — Data Peek (Шаг 1): CSV upload + ручной calculator + визуализация + ADR-014 (recharts) (2026-05-29)

**Type:** Code main + FIX iter 1 + FIX iter 2 (BUG-Q5 BLOCKER recharts) + RETEST + ADR-013 implementation start
**Status:** Complete (CLOSE 2026-05-29)
**Goal:** Закрыть приоритетный pain пользователя (sample-size с bootstrap fallback warning для ratio/continuous без исторических данных) через полный Data Peek — CSV upload + ручной calculator + skewness/kurtosis + stability CV + recharts histogram. Backend hooks (`data_peek.std_computed`, `ratio_variance`) уже были встроены в Sprint 4/5, Sprint 6 заполняет их через UI.

**Что построено в main (Code: `feat(sprint-6)` 313 тестов +46 vs Sprint 5 FIX iter 1):**

- **S1 backend schema extension** — `state.brief.data_peek` расширен с 5 до 15 полей: `source`, `ratio_variance`, `ratio_mean_*`, `ratio_cov_nd`, `stability_cv_under_threshold`, `cv_value`, `skewness`, `kurtosis`, `raw_values`. **Закрыты 2 pre-existing gap** (`ratio_variance` и `stability_cv_under_threshold` не были в parse mapping — Sprint 6 включил в round-trip через 6-й canonical case).
- **S2 CSV parser** — NEW `src/lib/data-peek/csv.js` (papaparse lazy). Per metric_type (proportion/continuous/count: `<metric_column>` column; ratio: `<numerator>`, `<denominator>` columns; опционально `day` для stability CV). 50MB cap, BOM strip, reservoir sampling raw_values до 1000.
- **S3 math** — NEW `src/lib/data-peek/stats.js`: skewness, kurtosis (excess), deltaMethodVariance для ratio (`Var(N)/μD² − 2·μN·Cov(N,D)/μD³ + μN²·Var(D)/μD⁴`), dailyCV, distributionLabel (`'ok' / 'skewed' / 'heavy_tailed' / 'skewed_heavy'`).
- **S4 manual calculator** — NEW `src/lib/data-peek/calculator.js`: per metric_type (proportion → no fields, continuous → σ, ratio → 5 полей μN/μD/var_n/var_d/cov_nd с auto-расчётом ratio_variance, count → σ default √baseline Poisson).
- **S5 UI (6 NEW components)** — `DataPeek{Block,Tabs,CsvUpload,ManualForm,Histogram,Stats}.jsx`. Collapsible block под SampleSizeDisplay на Q08. Tabs CSV / Manual. recharts histogram (lazy chunk).
- **S6 reducer** — `SET_DATA_PEEK` / `RESET_DATA_PEEK` actions с auto-recompute плана.
- **S7 integration** — DataPeekBlock в BriefPage Q08.
- **S8 QuestionMap** — динамический статус «Data peek» с ✓ и preview.

**Mid-flight architecture change Code'а:** прямой import recharts + papaparse давал +367 KB raw / +110 KB gzip — почти в 2× плана. Code сам сделал `React.lazy + Suspense` для DataPeekHistogram и `await import(...)` для parseDataPeekCsv. **Initial bundle delta +4.55 KB gzip** — в 13× ниже плана. Правильное продуктовое решение.

**FIX iter 1 (Code: `fix(sprint-6) iter 1`):** закрыл C-1 (live baselineMatch в DataPeekStats) + C-2 (3 малых histogram для ratio numerator/denominator/ratio с подписями из ratio_components) + первые QA bugs (BUG-Q1 recharts Attempt 1, BUG-Q4 baseline.unit, BUG-Q3 reactivity). Phase A (optimizeDeps.include) — production build чистый, но в dev не сработал → FIX iter 2.

**FIX iter 2 (Code):** BUG-Q5 (recharts реальный fix через Attempt 2+) + Phase F (Q05 для continuous без dropdown — только number input с placeholder «в единицах метрики (₽, сек, ARPU)») + BUG-Q6 (Q01 preselect ✓ в карте — regression от Sprint 4 FIX iter 1 BUG-5) + BUG-Q3 auto-закрылся после BUG-Q5.

**Архитектурные решения:**

- **ADR-014 Accepted 2026-05-28** — добавляем recharts (+~50KB gzip) и papaparse (+~7KB) как новые npm-зависимости. Уточняет ADR-010 пункт 6 (recharts из «кандидата» → принят). После lazy chunking initial bundle вырос только на +4.55 KB gzip — намного меньше прогноза.

**Tests:**

- Sprint 6 main: 267 → 313 (+46): +17 stats, +13 csv, +7 calculator, +4 reducer, +5 parse, +1 round-trip canonical.
- Sprint 6 FIX iter 1: 313 → 328 (+15).
- Sprint 6 FIX iter 2: 328 → ~333+ (Phase F + Q6 tests, точная цифра — в Code report iter 2).

**Bundle (после FIX iter 1):** initial `index.js` 420.31 KB raw / 129.48 KB gzip (+4.55 KB gzip vs Sprint 5). `DataPeekHistogram` lazy 325.18 KB raw / 96.19 KB gzip. `csv` lazy 24.31 KB raw / 9.09 KB gzip.

**Round-trip status:** 6/6 canonical case зелёные (5 из Sprint 5 + новый 6-й — ratio + полностью заполненный data_peek). FIX iter 1 расширил 6-й case на `raw_values_numerator/denominator`.

**Gap fixes pre-existing:**

| Gap | До Sprint 6 | После Sprint 6 |
|---|---|---|
| `data_peek.ratio_variance` | sample-size читал, parse не маппил → ratio peek через YAML round-trip терялся | round-trip 6/6 ✓ |
| `data_peek.stability_cv_under_threshold` | scoring читал, parse не маппил → штраф/бонус scoring через round-trip не симметричен | round-trip 6/6 ✓ |
| Q01 preselect ✓ в карте | regression от Sprint 4 FIX iter 1 BUG-5 (расширение applyEnterDefaults goal_type), сломалось в Sprint 5/6 | Sprint 6 FIX iter 2 BUG-Q6 закрыл |
| recharts crash в dev (`require_isUnsafeProperty`) | новый BLOCKER при подключении recharts через lazy import | Sprint 6 FIX iter 2 BUG-Q5 Attempt 2+ закрыл |

**Polish-pack кандидаты (3 ◆ stories, добавлены в JTBD по ходу Sprint 6 RETEST):**

1. **`fmtNum` precision** в DataPeekStats — `100,431813` (6 знаков для continuous) → 2 знака для значений ≥ 1, 4 для < 1.
2. **ScoringCard детальный checklist** — раскрываемые блоки с remarks под 4 группами (данные уже есть в `scorePlan() remarks`).
3. **MdPreview стилизованный scrollbar** — `::-webkit-scrollbar` под тёмную тему.

Также **JTBD §6 ◆ story** для будущего: ручная правка expected data schema перед скачиванием ноутбука (добавлена 2026-05-28 в обсуждении Sprint 6 PLAN).

**Metrics — длительность фаз:**

| Фаза | Δ |
|---|---|
| PLAN + ADR-014 finalization (Cowork ↔ пользователь) | ~30 мин |
| PROMPT (Cowork, `sprint-6-prompt.md` 8 секций S1-S8 + lazy decision) | ~20 мин |
| DEV main (Claude Code, по самозамеру) | ~2ч 45мин |
| CODE REVIEW (Cowork, `code-review-sprint-6.md` C-1/C-2) | ~25 мин |
| TEST PREP (Cowork, `test-cases-sprint-6.md` 14 кейсов + 6 CSV генерация) | ~30 мин |
| QA Sprint 6 main (пользователь, smoke + обнаружение BUG-Q1/Q4/Q3) | ~15 мин |
| FIX PROMPT iter 1 (Cowork) | ~20 мин |
| FIX DEV iter 1 (Claude Code, Phase A/B/D/E) | ~1.5 ч |
| RETEST iter 1 (пользователь — обнаружил BLOCKER recharts Attempt 1 + Phase F + BUG-Q6) | ~30 мин |
| FIX PROMPT iter 2 split (Cowork — `sprint-6-fix-iter2-prompt.md`) | ~25 мин |
| FIX DEV iter 2 (Claude Code, BUG-Q5 Attempt 2+ + Phase F + BUG-Q6) | ~1-1.5 ч (по плану) |
| RETEST iter 2 (пользователь, full smoke) | ~30-40 мин |
| CLOSE (Cowork: JTBD §4 закрыть + CONTEXT timeline + PROJECT_STATUS + 3 polish ◆) | ~30-40 мин |
| **Total active** | **~8-9 часов end-to-end** |

Sprint 6 — самый длинный спринт проекта на момент. Причины: (а) полный Data Peek scope (С) с гистограммой + skewness/kurtosis + stability CV + manual; (б) recharts BLOCKER потребовал 2 итераций FIX (Attempt 1 → 2+); (в) обнаружились pre-existing bugs (baseline.unit Phase F, Q01 preselect), которые проявились только через peek + smoke; (г) две итерации RETEST с pause на обсуждение продуктовых решений (Phase F UX, 3 histogram для ratio).

**Notes:**

- ✅ **Lazy chunking — критическая удача Code'а.** Без неё bundle вырос бы в 2× плана (initial +110 KB gzip). После lazy split — initial +4.55 KB gzip. Это важно для GitHub Pages (no CDN, no caching beyond browser).
- ✅ **Backend hooks работают предсказуемо.** Sample-size.js / scoring.js / parse.js / render.js не требовали изменений (кроме schema extension и mapping расширения). Цепочка `SET_DATA_PEEK → recomputePlan → sample-size` работает реактивно после BUG-Q5 fix.
- ✅ **Round-trip 6/6** включая raw_values_numerator/denominator для 3 histogram — гарантирует, что reload через test_plan.md полностью восстанавливает peek state.
- ✅ **Math корректность подтверждена canonical examples** — skewness нормального ~0, log-normal > 0.5; kurtosis Cauchy heavy-tail > 3; deltaMethodVariance (μN=10, μD=100, var_n=4, var_d=100, cov=5) = 0.0004 точно.
- 🟡 **Recharts BLOCKER — серьёзный урок.** ADR-014 был принят на основе оценки совместимости, не на основе тестирования. В будущем перед принятием новой UI-deps стоит делать spike в dev окружении пользователя. Vite optimizeDeps.include в Code production-build тесте сработал, в dev у пользователя — нет (cache invalidation эффект, либо специфика версии recharts/vite/node).
- 🟢 **Phase F — продуктовый шум.** В iter 1 Code сделал dropdown «абс.» для continuous (consistency с MDE), но при RETEST пользователь резонно заметил «а может быть какая-то другая величина типа не абсолютное значение?» — что для continuous unit семантически не нужен. Заметка: при дизайне dropdown'ов проверять единственность опции — если 1 опция, лучше нет dropdown.
- 🟢 **BUG-Q6 Q01 preselect regression** — напоминание что `applyEnterDefaults` тесты должны быть **обязательными** при любых правках reducer'а. Sprint 4 FIX iter 1 закрыл этот класс bug'ов, Sprint 5/6 их случайно вернули.
- 🟢 **3 polish ◆ stories** обнаружены прямо в процессе RETEST (fmtNum precision, ScoringCard checklist, MdPreview scrollbar) — это **здоровый знак**: пользователь видит детали UX по мере того как продукт становится полезным. Polish-sprint после Sprint 7 main будет ценным.

---

### Sprint 5 — Polish-pack + UX rename Шагов 04/05 + ADR-012 Accepted + FIX iter 1 (2026-05-28)

**Type:** Code mini-sprint + FIX iter 1. Wall-clock в один день.
**Status:** Complete (CLOSE 2026-05-28).
**Goal:** Закрыть 6 пунктов polish-pack (P-2..P-7), сделать UX rename Шагов 04/05 (label-only) как следствие принятого ADR-012, разгрузить будущий Sprint 6 main от накопленных хвостов.

**Что построено в main (один commit `feat(sprint-5): polish-pack P2-P7 + Stepper labels per ADR-012`):**

- **P-2 (BUG-7)** — `templates/notebook/load.cells.json` обновлён: `CSV_PATH` константа + markdown-инструкция про Colab/Drive. Покрывает 3 deploy-target'а (local Jupyter / Colab после upload / GitHub-raw URL).
- **P-3 (BUG-8)** — semantic split после ADR-011: `deriveTestId` (filename + `YAML.test_id`) теперь приоритезирует `metric_column` с fallback на `metric_name` → `goal_type`; `deriveTitle` (notebook header `# Analysis: …`) использует натуральный `metric_name`; subtitle переписан нейтрально («см. test_plan.md»).
- **P-4** — `ApproxInfoBlock` в `QuestionRenderer.jsx` (локальный компонент + `APPROX_INFO_TEXT` константа): inline approx-info на Q03 при выборе `ratio`/`continuous`, на Q07 — если ранее выбран один из этих типов. Нейтральный паттерн `bg-bg-elev-2 + border-soft + text-fg-faint` (без введения новых `info-*` токенов).
- **P-5** — удалена недостижимая ветка `baseline.unit === 'percent'` в `buildPlaceholderMap` (`notebook-builder.js`).
- **P-6** — `slugify` вынесен в `src/lib/util/slugify.js` (сохраняет «ё» по NB-BUG-3), импортируется в `render.js` и `notebook-builder.js`. Новый файл `tests/lib/util/slugify.test.js` (+10 case'ов).
- **P-7** — legacy YAML heuristic в `parse.js::mapFrontmatter`: regex `/[\sА-ЯЁа-яёA-Z]/` на `fm.metric_name` И отсутствие `fm.metric_label` → routing в `brief.metric_name` (label) + warning о legacy формате. +4 case в `parse.test.js`.
- **UX-RENAME** — `STEPS` в `Stepper.jsx`: «04 Анализ» → «04 Быстрая валидация», «05 Read-out» → «05 Скачать артефакты». `route: null` и `isStepUnlocked` не тронуты.

**FIX iter 1** (один commit `fix(sprint-5): close C-1..C-4 from code review`):

- **C-1** — Cowork нашёл, что dead-ветка `baseline.unit === 'percent'` есть в **трёх** местах, не двух (Code в Sprint 5 main missed `scoring.js`). FIX убрал все три (sample-size.js, scoring.js, render.js) + удалил zombie-тест из `sample-size.test.js`, который специально проверял dead path.
- **C-2** — асимметрия round-trip для fallback case: в `render.js` substitutions теперь `metric_label: yamlScalar(brief.metric_column ? brief.metric_name || null : null)`. Когда `metric_column` пуст — `metric_label` не пишется, parse при загрузке применит P-7 heuristic и восстановит то же состояние. Новый 5-й canonical case в `round-trip.test.js`.
- **C-3** — edge case `metric_label: ""`: в `parse.js` строка 224 добавлено `&& fm.metric_label !== ''` симметрично проверке `hasLabel`. +1 case в `parse.test.js`.
- **C-4** — продуктовое UX-решение пользователя: убрать английский prefix `Analysis: ` из header'а скачанного `.ipynb`, оставить только результат `deriveTitle` (`Тест: <name>`). Изменение только в `buildHeaderCell` строка 225; `deriveTitle` не тронут (иначе сломался бы round-trip YAML.title).

**Архитектурные решения:**

- **ADR-012 финализирован Accepted 2026-05-28** перед началом Sprint 5 в диалоге Cowork ↔ пользователь. До этого был Draft. Принятие переводит «Шаг 4 Анализ → independent validation CSV» на «Шаг 4 Быстрая валидация → ручной ввод + decision rules». Roadmap до v1 сократился с ~16-21 ч до ~10-13 ч active. UX-RENAME labels — частичная имплементация в Sprint 5; FLOW.md / concept.md / JTBD §7-§8 переписываются в Sprint 5 CLOSE (Cowork); полный redesign Шага 4 — Sprint 6 main.

**Tests:**

- Sprint 5 main: 249 → 266 (+17, +10 slugify, +4 parse P-7, +3 render P-3; 5 notebook-builder cases переписаны под новый контракт без изменения числа).
- Sprint 5 FIX iter 1: 266 → **267** (+2 новых C-2/C-3, −1 zombie из C-1).

**Bundle:** 399.80 → 401.24 → **401.17 KB raw** (gzip 124.32 → 124.94 → **124.93 KB**). Net +1.37 KB raw за весь Sprint 5 (под лимитом ≤ +2 KB из prompt'а). Никаких новых npm-зависимостей.

**Polish-pack деферрит:** UX-RENAME labels был не частью polish-pack — он стал возможным после accept ADR-012 и логично взят в один спринт.

**Метрики — длительность фаз:**

| Фаза | Старт | Конец | Δ |
|---|---|---|---|
| PLAN + ADR-012 finalization (Cowork ↔ пользователь) | 2026-05-28 | 2026-05-28 | ~15 мин |
| PROMPT (Cowork, `sprint-5-prompt.md` 6 P-пункта + UX rename) | 2026-05-28 | 2026-05-28 | ~15 мин |
| DEV main (Claude Code, по самозамеру) | 2026-05-28 | 2026-05-28 | ~1ч 35мин |
| CODE REVIEW (Cowork, `code-review-sprint-5.md` 4 concerns) | 2026-05-28 | 2026-05-28 | ~20 мин |
| TEST PREP (Cowork, `test-cases-sprint-5.md` 10 кейсов) | 2026-05-28 | 2026-05-28 | ~15 мин |
| QA Sprint 5 (пользователь, smoke 10/10 ok) | 2026-05-28 | 2026-05-28 | ~10-15 мин |
| FIX PROMPT (Cowork, `sprint-5-fix-prompt.md` C-1..C-4) | 2026-05-28 | 2026-05-28 | ~10 мин |
| FIX DEV (Claude Code, по самозамеру) | 2026-05-28 | 2026-05-28 | ~40 мин |
| FIX RETEST (пропущен по решению пользователя — 267/267 unit + round-trip 5/5 достаточно) | — | — | 0 |
| CLOSE (Cowork: FLOW.md / concept.md / JTBD §7-§8 rewrite, tech debt, CONTEXT timeline, PROJECT_STATUS) | 2026-05-28 | 2026-05-28 | ~40 мин |
| **Total active** | | | **~4-4.5 часа end-to-end** |

Сопоставимо со Sprint 2/3, при том что скоуп существенно меньше — но включена ADR-012 финализация и Cowork CLOSE с rewrite концептуальных доков под новый Шаг 4, что значимо тяжелее обычного CLOSE.

**Notes:**

- ✅ **ADR-012 финализирован за один диалог.** До Sprint 5 он был Draft и требовал отдельного Architecture sprint. Cowork презентовал краткий summary (consequences / alternatives / risk-flag по позиционированию), пользователь сделал явный accept. Architecture sprint оказался не нужен — accept в PLAN-фазе Sprint 5 + concept rewrite в CLOSE-фазе закрывает то же.
- ✅ **Code-flagged side-finding отработал чисто.** В Sprint 5 main Code обнаружил 2 dead-ветки за пределами P-5 scope и **не правил молча**, а явно эскалировал в отчёт (CLAUDE.md §3). Cowork в code review нашёл, что мест на самом деле **три** (Code missed `scoring.js`), включил все три в FIX iter 1 C-1. Двухэтапная сверка работает.
- ✅ **Round-trip контракт расширен.** Sprint 4 FIX iter 2 заложил 4 canonical case; Sprint 5 FIX iter 1 добавил 5-й (empty `metric_column` через P-7 heuristic). Симметрия render ↔ parse теперь покрывает и fallback-сценарий.
- ✅ **Zombie-тест найден и удалён прозрачно.** При закрытии C-1 в `sample-size.test.js` обнаружился тест `'supports baseline.unit=percent (value scaled by 100)'`, который специально подсовывал недостижимый `unit='percent'` через test-helper, чтобы пройти по удалённой ветке. Code обосновал удаление (Option A) vs guard (Option B) в отчёте, Cowork в code review одобрил. Тест-zombie не должен жить дольше кода, который он покрывает.
- 🟢 **UX-rename labels работает sync с concept rewrite.** Stepper показывает новые labels (Code-зона коммит main), а FLOW.md / concept.md / JTBD §7-§8 описывают новый Шаг 4 (Cowork-зона коммит CLOSE). Если бы rewrite доков сделали позже Sprint 6 — Stepper и доки рассинхронизировались бы на время. CLOSE-в-том-же-спринте этого избежал.

---

### Pre-MVP (2026-05-14)

Концептуальная и документационная работа. Прорабатывались:
- Концепция продукта (`docs/context/concept.md`)
- Пользовательский флоу (`docs/context/FLOW.md`) — 5 шагов + развилка на старте
- Архитектура (`docs/context/ARCHITECTURE.md`)
- Модель данных (`docs/context/DATA_MODEL.md`) — YAML frontmatter для всех артефактов
- Дерево вопросов брифа (`docs/context/BRIEF_TREE.md`) — 10 обязательных вопросов
- Скоринг (`docs/context/SCORING.md`), формулы sample size (`SAMPLE_SIZE_CALC.md`)
- 10 ADR (`docs/context/decisions-log.md`) — фиксируют ключевые архитектурные и продуктовые решения
- Мокап v4 в HTML (`mockups/ab_planner_mockup_v4.html`)

К моменту старта Sprint 1: документация плотная, код = 0, репозиторий не инициализирован.

---

### Sprint 1 — Foundation + Start Screen + Step 1 Skeleton (2026-05-14 / 2026-05-15)

**Type:** Code
**Status:** Complete
**Goal:** Поднять стек React 19 + Vite + Tailwind по ADR-010, настроить деплой через GitHub Actions на GitHub Pages, реализовать стартовый экран с развилкой, степпер на 5 шагов и skeleton шага 1 без бизнес-логики.

**Closed (полностью) — `[x]`:**

- Стартовый экран с понятным выбором (JTBD §1)
- Степпер с пятью шагами (JTBD §1)
- Будущие шаги заблокированы до выполнения предыдущих (JTBD §1)
- Тул работает в браузере без бэкенда (JTBD §9) — GitHub Pages, нулевой backend

**Closed (частично) — `[~]`:**

- Drag-and-drop загрузка `test_plan.md` (UI готов, парсер — Sprint 2/3)
- Тур-режим (toggle класса работает; плашек самих нет)
- Тур сквозной (state внутри сессии работает; плашек самих нет)
- Прогресс N/10 (полоска отрисована, 0/10 placeholder)
- Карта вопросов справа (UI shell с 10 пунктами без интерактива)

**Key decisions:**

- **ADR-010** — пересмотр стека до начала кода: vanilla JS → React 19 + Vite + Tailwind v4 + react-router-dom HashRouter + Vitest, деплой через GitHub Actions. ADR-001 уточнён, не суперседится (no backend остаётся в силе).
- `.gitattributes` с `* text=auto eol=lf` добавлен для предотвращения CRLF-проблем на Windows.
- @fontsource swap отложен как low-priority в JTBD §9 после QA (нет багов, фонты загружаются с CDN — пока приемлемо).

**Tech debt / deferred:**

- Inline rgba цвета (`bg-[rgba(...)]`) в `Header.jsx` и `StartScreen.jsx` — вынести в `@theme` при добавлении новых hover/state-цветов (вероятно Sprint 2). См. `CONTEXT.md` Tech Debt.
- Нет ErrorBoundary вокруг приложения — добавить когда появятся первые RTL-тесты.
- Mobile responsive протестирован поверхностно, A11y-аудит не проводился — кандидаты на отдельный спринт после появления реального контента.
- Click→file picker fallback для drag-and-drop карточки — новая user story в JTBD §1.

**Metrics — длительность фаз:**

| Фаза | Старт | Конец | Δ |
|---|---|---|---|
| DEV (Claude Code) | 2026-05-14 23:54 | 2026-05-15 00:07 | **13 минут** |
| CODE REVIEW + TEST PREP (Cowork) | 00:07 | ~00:20 | ~13 минут |
| QA (пользователь) | ~00:20 | ~00:40 | ~20 минут |
| CLOSE (Cowork) | ~00:40 | 00:45 | ~5 минут |
| **Total** | 23:54 | 00:45 | **~51 минута** |

⚠ Это **первый каркасный спринт на знакомом для пользователя стеке** (React+Vite+Tailwind, опыт с retention-calculator). Цифры показательны как baseline, но не репрезентативны для будущих фич-спринтов с реальной бизнес-логикой.

**Notes — что узнали полезного, что пошло не так:**

- ✅ **Двухинстансная схема работает.** Cowork разработал prompt → Code сделал DEV → Cowork сделал ревью → пользователь сделал QA → Cowork закрыл. Передачи через файлы прошли без потерь смысла. Промт Sprint 1 был достаточно детальным, чтобы Claude Code не задавал вопросов посередине.
- ✅ **Code справился со скоупом точно.** Никаких внеплановых рефакторингов, ни одной лишней зависимости. ADR соблюдены без исключений.
- ✅ **`.gitattributes` добавлен в нужный момент** — после первого инцидента с побочной коррупцией файлов. Это спасёт время в будущем.
- 🟡 **Был инцидент с обрезанием файлов** (`.gitignore`, `CLAUDE.md`, `README.md`) в working tree после первого `git add .` на Windows. Точная причина не диагностирована — возможно сочетание Git autocrlf и какого-то фонового процесса. Восстановлено через `git checkout HEAD`. Если повторится — расследовать. Добавлено в Recurring questions ниже.
- 🟡 **Pre-MVP документация была настолько плотной, что Sprint 1 prompt получился почти из готовых блоков.** Это сильная сторона, но в будущих спринтах с менее детально проработанными user stories надо будет внимательнее формулировать DO NOT-список.
- 🟢 **Метрика длительности зафиксирована.** Будем сравнивать с фич-спринтами Sprint 2+, где появится реальная логика.

---

### Sprint 2 — Brief Questions Q01-Q10 + Advanced + Interactive Map (2026-05-15 / 2026-05-16)

**Type:** Code (с FIX-итерацией)
**Status:** Complete
**Goal:** Полный бриф из 10 вопросов с реактивной картой, мягкой валидацией, парсером 4 слотов гипотезы, динамическими guardrails, advanced параметрами. Без sample size derive / data peek / localStorage / парсинга test_plan.md.

**Closed (полностью) — `[x]`:**

§2 «Бриф вопросы»:
- Один вопрос на экран
- Прогресс N/10 реактивный (закрытие [~] из Sprint 1)
- Гипотеза по шаблону «если/то/потому что»
- 4-slot парсер гипотезы (Unicode-aware boundaries + 16 unit-тестов)
- Тип метрики (proportion/continuous/ratio/count) + ratio sub-question
- Имя метрики + auto snake_case с touched override
- Baseline (с условными единицами от metric_type)
- Единица рандомизации + cluster sub-question
- MDE (3 типа единиц) с soft warnings
- Guardrails (динамический список + 2 карточки-предложения)
- Stop conditions + decision rules (defaults через applyEnterDefaults в reducer)
- Advanced параметры (collapsible 6 полей)

§3 «Карта вопросов» — полностью:
- Карта 10 пунктов с интерактивом, статусами, inline preview через ▸/▾

**Closed (частично) — `[~]`:**

- Keyboard navigation hints (§9) — Tab/Enter работает, видимой подсказки нет

**Still pending — `[ ]`:**

- Sample size + duration derive после Q07/Q08 (placeholder, Sprint 3)
- MDE direction в UI (захардкожено `increase`, Sprint 3 derive из глагола)
- Snake_case транслит кириллицы для metric_column (low-priority)
- Sensitivity helper Q07 (новая user story Sprint 2 brainstorm)
- Methodology раздел (§10 — новая секция в JTBD)
- «Начать сначала» в шапке (Sprint 3 с localStorage)

**Key decisions:**

- **P-1 в CLAUDE.md** — Зоны ответственности по коммитам (Code: src/, tests/, configs; Cowork: docs/, CLAUDE.md, .gitignore, .gitattributes). Появилось в FIX-фазе после путаницы с пересечением.
- **applyEnterDefaults в reducer** (вместо useEffect-defaults в компонентах) — defaults подставляются при `GOTO_QUESTION` через чистую функцию `src/lib/brief/defaults.js`. Унификация пути наполнения state перед будущим парсером test_plan.md.
- **Tailwind токены для state-цветов** — `--color-warn-soft`, `--color-warn-border`, `--color-tour-hover`, `--color-danger-soft` добавлены в `@theme` при закрытии Sprint 1 tech debt.
- **`vite.config.js` server.watch.ignored** — добавлено Cowork во время QA, чтобы Vite dev server не перезагружал приложение при редактировании test-cases-*.md. Документировано в CLAUDE.md P-1 как разрешённое исключение для Cowork.

**Tech debt / deferred (added in Sprint 2):**

- `defaultsApplied` флаг внутри `state.brief` — UI-state в данных. При сериализации в Sprint 5-6 (парсер test_plan.md) надо учить yaml-сериализатор игнорировать это поле.
- `extractMetricName` дёргается при каждом переходе на Q04 пока флаг false. Дешёво (regex по короткой строке), не оптимизировано.
- Mobile responsive — `GuardrailsList` 6-колоночный grid на узких экранах (<640px) может ломаться. Не тестировался.

**Metrics — длительность фаз:**

| Фаза | Δ |
|---|---|
| DEV (Claude Code, Sprint 2 main) | 28 мин |
| CODE REVIEW + TEST PREP (Cowork) | ~25 мин |
| QA (пользователь, full pass 68 кейсов) | ~60 мин |
| FIX prompt (Cowork) | ~10 мин |
| FIX DEV (Claude Code) | 20-30 мин (Code оценил в 30, пользователь — в 20) |
| FIX RETEST (пользователь) | ~5 мин |
| CLOSE (Cowork) | ~30 мин (включая инцидент с Edit-tool corruption) |
| **Total** | **~2.5 часа end-to-end** |

Длительность × 3 от Sprint 1 (51 мин). Скоуп — в 4-5× больше (11 UI компонентов, 47 unit-тестов, бизнес-логика парсера, FIX-итерация). Velocity растёт нелинейно — это первый «настоящий» спринт.

**Notes:**

- ✅ **FIX-фаза прошла как штатная часть цикла.** 3 бага из QA + 1 архитектурный concern — единый fix-prompt, ~25 минут Code, 1 итерация. Не превратилось в Sprint 2.5.
- ✅ **`src/lib/brief/` без React-импортов.** Чистая логика, тестируется отдельно, 47 unit-тестов. Это база, на которой Sprint 5-6 будут строить парсер test_plan.md.
- ✅ **P-1 правило родилось из боли.** Stale `.git/index.lock` и пересечение Code/Cowork модификаций. Зафиксировано как convention — сэкономит время в будущих спринтах.
- 🟡 **Edit-tool corruption на длинных Cyrillic replacements.** В CLOSE-фазе серия неудачных Edit'ов на CONTEXT.md, JTBD.md, CLAUDE.md, Dev-Cycle.md — файлы обрезались на UTF-8 boundary. Воспроизводилось упорно. Решение — делать только маленькие точечные Edit'ы или использовать Write для полной перезаписи. Подробно зафиксировано в Recurring questions.
- 🟡 **Pre-MVP документация перестала покрывать.** Sprint 2 prompt пришлось продумывать заметно дольше — `BRIEF_TREE.md` описывает вопросы, но не описывает UX advanced params (модалка vs collapsible), не описывает финальный экран Q10. В будущих спринтах PROMPT-фаза станет дольше относительно DEV.
- 🟢 **«Начать сначала», sensitivity helper, methodology раздел** — три product idea появились во время QA. Это паттерн: пользователь тестирует и думает про продукт. Записываем в JTBD сразу, обсуждаем в PLAN Sprint 3.

---

### Sprint 3 — Sample Size + Step 2 «Тест-план» + Persistence + Reset (2026-05-16 / 2026-05-28)

**Type:** Code (с FIX-итерацией). Wall-clock 12 дней из-за паузы между TEST PREP и QA, чистого активного времени ~3.5 часа.
**Status:** Complete
**Goal:** Закрыть полный value loop «бриф → расчёт sample size → тест-план → утверждение». Параллельно — localStorage persistence и явный reset, чтобы прогресс не терялся при reload, а пользователь мог начать заново явным действием.

**Closed (полностью) — `[x]`:**

§1 «Старт и навигация»:
- Сохранение прогресса в localStorage (ключ `stat-plan:v1:state`, версионированный)
- «↺ Начать сначала» в шапке с ConfirmDialog + RESET_STATE

§2 «Бриф»:
- Реактивный sample size + duration + test_method display под Q08 (useMemo на `calculateSampleSize`, warnings inline)

§5 «Шаг 2 — Тест-план» (полностью кроме парсера загружаемого MD):
- Preview сгенерированного test_plan.md с YAML frontmatter + markdown-секциями
- ScoringCard: общий скор + breakdown по 4 группам + конкретные remarks с severity (info/warn/critical)
- Скачивание test_plan.md через Blob URL
- «Утвердить план» → `APPROVE_PLAN`, `status=approved`, `approvedAt` ISO timestamp, шаг 3 unlocked
- «Вернуть в черновик» с ConfirmDialog → `RETURN_PLAN_TO_DRAFT`
- StatusBadge (draft / approved)
- Бриф в approved-режиме — readonly (включая AdvancedParams после FIX BUG-1), accent-баннер «План утверждён» с ссылкой на step 2

§9 «Кросс-функциональные» (продвинулись):
- Все Sprint 3 вычисления (sample size, scoring, render) — на клиенте без fetch (`[~]` целиком, CSV — Sprint 5)
- Inline warnings для приближённых расчётов (MW ×1.157, bootstrap, CV=1 fallback, edge cases `n>10M`/`n<30`/`duration>90`)

**Closed (частично) — `[~]`:**

- Загрузка отредактированного test_plan.md обратно (UI placeholder «Парсинг — Sprint 4+»; сам парсер запланирован на Sprint 7 по roadmap)
- «Все вычисления на клиенте» — sample size/scoring/render готово, CSV-валидация ждёт Sprint 5
- «Честные warning для приближений» — для sample size готово, для analyze-фазы — Sprint 5

**Still pending — `[ ]`:**

- Warning при невалидном загруженном md (зависит от Sprint 7 парсера)
- Q07 sensitivity helper (slider «MDE × duration») — в Sprint 3 scope не входил
- Methodology раздел — Sprint 8 по roadmap

**Key decisions:**

- **Самописные `normalInv` / `normalCdf`** (Beasley-Springer-Moro + Abramowitz-Stegun, ~15 строк каждая) — вместо подключения `simple-statistics` или Pyodide. Соответствует ADR-009/010, держит bundle малым.
- **`?raw` import шаблона `test_plan.md.tmpl`** через Vite — без отдельного fetch и без подключения tмплейт-движка. ~1KB к bundle.
- **YAML вручную** в `render.js` через `yamlScalar()` с JSON-style эскейпом (валидный YAML принимает JSON-style строки) — устойчивее, чем regex-escape. Inline snapshot тест защищает формат от регрессии. Когда в Sprint 7 появится парсер — будет cross-check.
- **`editedExternally: false` зарезервировано** в `state.plan` для Sprint 7 парсера (вариант A решения от пользователя). Поле включено в persisted shape для forward-compatibility, семантика будет определена в Sprint 7.
- **`SAMPLE_SIZE_CALC.md` Case 2 spec поправлен** с 7555 → 8149 (Fleiss non-pooled SE for H1). Обоснование: 7555 не воспроизводится никаким стандартным вариантом формулы (pooled, unpooled, Wald, one-sided, continuity correction); 6 из 7 cases матчатся exact / ±0.03% / 1.7%. Спор задокументирован в `code-review-sprint-3.md` (Concern #1) с ручной проверкой.
- **Stepper kliкабельность** — scope creep, но принято: после approve пользователь должен иметь возможность вернуться на бриф через шапку (не только ссылкой со step 2). ~10 строк, UX-обоснование принято на code review.

**Tech debt / deferred (added in Sprint 3):**

- `editedExternally` в `state.plan` — зарезервированное поле без активного использования. Семантика определится в Sprint 7 (парсер test_plan.md).
- Tolerance 5-10% для proportion sample-size тестов — задокументировано прямо в комментариях тестов. Чтобы будущий читатель не подумал «тесты слабые».
- Случай Case 2 в SAMPLE_SIZE_CALC.md — добавлено объяснение, но если в Sprint 5-6 (анализ) встретятся такие же неоднозначности — нужен унифицированный подход к источникам формул.

**Metrics — длительность фаз:**

| Фаза | Дата | Δ |
|---|---|---|
| PLAN + PROMPT (Cowork) | 2026-05-16 | ~70 мин |
| DEV (Claude Code, по самозамеру) | 2026-05-16 | 24 мин (wall ~3 ч) |
| CODE REVIEW (Cowork) | 2026-05-16 | ~30 мин |
| TEST PREP (Cowork) | 2026-05-16 | ~15 мин |
| ⏸ **Пауза** | 2026-05-16 → 2026-05-28 | **12 дней wall-clock** |
| QA (пользователь, smoke 15 кейсов) | 2026-05-28 | ~15 мин |
| FIX PROMPT (Cowork, BUG-1) | 2026-05-28 | ~10 мин |
| FIX DEV (Claude Code) | 2026-05-28 | 10 мин |
| FIX RETEST (пользователь) | 2026-05-28 | ~5 мин |
| CLOSE (Cowork) | 2026-05-28 | ~30 мин |
| **Active total (без паузы)** | | **~3.5 часа** |
| **Wall-clock total** | | **12 дней** |

Активное время сопоставимо со Sprint 2 (~2.5 ч), несмотря на ×2 объём кода (5 lib-модулей + 5 plan-компонентов + 2 страницы + расширение reducer/router/stepper, 100 новых unit-тестов). Pause из-за внешних причин — не паттерн процесса. Smoke-стратегия (15 кейсов вместо full 60+) оправдалась: BUG-1 был известен заранее, новых багов smoke не выявил.

**Notes:**

- ✅ **100 unit-тестов вместо запрошенных 25+.** Code over-delivered осознанно — все 7 канонических кейсов из SAMPLE_SIZE_CALC.md, snapshot test на формат test_plan.md (критично для Sprint 7 парсера), reducer-тесты на новые actions. Тестовое покрытие = база, на которой Sprint 7 будет верифицировать roundtrip.
- ✅ **Code сам поднял 3 пункта на ревью в Known Issues.** Все три обработаны: Case 2 (правка spec), AdvancedParams (FIX BUG-1), Stepper scope creep (accept с обоснованием). Прозрачность Code'а сокращает review-фазу.
- ✅ **FIX через 12 дней пройден без проблем.** Pause не сломала контекст благодаря тому, что `code-review-sprint-3.md` зафиксировал все open вопросы — пользователь и Cowork вернулись к ним без перечитывания всего sprint-report.
- ✅ **P-1 правило с FIX отрабатывает чисто.** Code запушил `fb51658` + `b8facb8` (свою зону), Cowork-зона (code-review/test-cases/fix-prompt/SAMPLE_SIZE_CALC + JTBD/CONTEXT/PROJECT_STATUS) уходит одним batch'ем в CLOSE.
- 🟡 **PROJECT_STATUS.md устаревает быстро.** Когда между фазами проходит 12 дней — статус показывает «в работе у Code», хотя по факту QA уже сделано. Стоит подумать, не делать ли PROJECT_STATUS более «statе-machine-like» (генерировать из git + reports), но это over-engineering для pet-проекта. Пока — просто помнить про refresh в CLOSE.
- 🟢 **Sprint 4 PLAN откладывается на свежее обсуждение** (по roadmap — конструктор ноутбука, ipynb-сборка, demo-csv). После CLOSE Sprint 3 пользователь выбирает scope.

---

### Sprint 4 — Парсер test_plan.md + Шаг 3 «Конструктор» + FIX iter 1 (Q01 other / Q04 semantic / preselect) + FIX iter 2 (round-trip repair) (2026-05-28)

**Type:** Code (large) + FIX iter 1 (3 phase) + FIX iter 2 + Architecture decisions (ADR-011, ADR-012 draft).
**Status:** Complete.
**Goal:** Закрыть два недостающих value loop — drag-drop загрузка test_plan.md (альтернативный вход) и реальный артефакт `analysis.ipynb` (конструктор ноутбука).

**Что построено в main:**

§1 «Старт и навигация»:
- ★ Drag-drop загрузка `test_plan.md` (закрыто `[~]` из Sprint 1, теперь `[x]`)
- ◆ Click→file picker fallback на dashed-зоне (закрытие Concern #4 из Sprint 1)

§5 «Шаг 2 — Тест-план»:
- ★ Кнопка «Загрузить отредактированный test_plan.md» (закрытие `[~]` из Sprint 3, file picker + parser)
- Warning при невалидном md (ParseWarningsBanner + inline error)

§6 «Шаг 3 — Конструктор ноутбука» — целиком:
- PlanInfoCard, CellsList (6 mandatory + 2 optional + 2 disabled-заглушки cuped/delta_method), DemoCsvCard (2 файла из 4), ExpectedSchemaCard реактивный, скачивание `.ipynb` с header + Expected CSV schema + warning blockquote для delta_method/mannwhitney fallback.

**FIX iter 1** (3 phases, 11 пунктов):
- Phase A: 11 cell templates de-numbered (NB-BUG-1), slugify сохраняет `ё` (NB-BUG-3), grammar `1 day/N days` (NB-BUG-4), decision rules без двойной точки (NB-BUG-5), warning blockquote для fallback test_method (NB-BUG-2 = Concern #3).
- Phase B: «Утвердить» → «Перейти к конструктору» CTA transformation на step 2 (BUG-1), sticky bottom download на step 3 (BUG-2), warn banner для delta_method/mannwhitney в PlanInfoCard (Concern #3 UI).
- Phase C: applyEnterDefaults расширен для goal_type/randomization_unit (BUG-5 preselect карта), **semantic shift YAML.metric_name = код, новый YAML.metric_label = текст** (BUG-3, см. ADR-011), Q01 «Другое» → conditional sub-question + state.brief.goal_description (BUG-4).

**FIX iter 2** (BUG-9 + audit):
- Полный round-trip repair: 7 ранее missing полей теперь сериализуются в YAML (`goal_type`, `goal_description`, `ratio_components` numerator/denominator, `cluster_field`, `two_sided`, `stop_conditions` object, `decision_rules` object).
- Новая структура шаблона: `# Context` блок + расширенный `# Test design` + отдельные `# Stop conditions` и `# Decision rules` объекты.
- `defaultsApplied.goal_type/randomization_unit = true` при load — защита от GOTO_QUESTION clobbering после LOAD_TEST_PLAN_MD.
- Новый файл `tests/lib/plan/round-trip.test.js` с 4 canonical case — гарантия от регрессий round-trip.
- BUG-9b (goal_description truncation) — расследован static audit, не воспроизводится в коде iter 1+2, скорее всего pre-iter-1 артефакт. Защищён canonical test'ом.
- **User-sanctioned side-scope:** unification sticky footer на step 1-3 (QuestionNav → StepFooter на page-level, sticky bottom backdrop-blur). AdvancedParams переехал внутрь карточки вопроса под sample-size блоком. Закрывает polish-pack P-1 (BUG-6).

**Архитектурные решения:**

- **ADR-011 Accepted** — semantic shift `YAML.metric_name = код колонки`, новое опциональное `YAML.metric_label = натуральный текст`. Round-trip между ними. Legacy compatibility — heuristic в polish-pack P-7.
- **ADR-012 Draft** — Шаг 4 redesign из «independent validation» в «Быстрая валидация» (circular validation у текущей концепции). UI rename Шагов 04/05. Требует accept в Architecture sprint перед Sprint 5 main.

**Tests:**

- Sprint 4 main: 147 → 213 (+66).
- FIX iter 1: 213 → 235 (+22).
- FIX iter 2: 235 → **249** (+14, включая 4 canonical round-trip).

**Bundle:** 309 KB → 399 KB raw (gzip 96 → 124 KB) — в основном js-yaml (~17 KB gzip) + templates + builder. js-yaml единственная новая npm-зависимость со Sprint 1.

**Polish-pack (отложено в отдельный mini-sprint):** 6 пунктов после iter 2 (BUG-6 закрыт side-scope). См. `docs/project/polish-pack.md`. Среди них — BUG-8 (filename/header источники), BUG-7 (Colab CSV_PATH), inline-warning Q03/Q07, dead code, slugify utility, legacy metric_name heuristic.

**Notes:**

- ✅ **Code эскалировал BUG-3 правильно.** В prompt'е Cowork описал симптом «UI заменяет _ на пробел» — Code грепнул кодовую базу, не нашёл такой конверсии, эскалировал. После обсуждения с пользователем стала ясна реальная root cause (semantic mismatch код vs натуральный текст) → semantic shift ADR-011.
- ✅ **Round-trip контракт усилен.** До iter 2 был частично декларативный (`extractBriefShape` намеренно исключал не-сериализуемые поля). Теперь canonical round-trip test покрывает все поля; новые поля должны добавляться туда.
- ✅ **FIX iter 2 в один cycle закрыл 7 полей + 1 расследование + 1 user-sanctioned UX-refactor.** Без iter 3.
- 🟢 **Concept Шага 4 поставлен под пересмотр.** Пользователь сам заметил circular validation. ADR-012 в драфте, ожидает Architecture sprint.

---

## Tech Debt

> Накопленный технический долг. Каждая запись — что и из какого спринта приехало.

- [x] ~~**Inline rgba цвета вместо токенов @theme.**~~ Закрыто в Sprint 2 FIX-фазе (`@theme` токены `--color-warn-soft`, `--color-warn-border`, `--color-tour-hover`, `--color-danger-soft`).
- [ ] **Нет ErrorBoundary вокруг приложения.** Приехало из Sprint 1 (code review concern #5). `useAppState` throw'ает без Provider'а — сейчас не воспроизводится, но при добавлении React Testing Library тестов рендера компонентов без обёртки сломается с непонятным сообщением. Добавить минимальный ErrorBoundary или тестовый Provider-wrapper когда появятся первые RTL-тесты.
- [ ] **`defaultsApplied` в `state.brief` — UI-state в доменной структуре.** Приехало из Sprint 2 FIX. При реализации yaml-сериализатора (Sprint 5-6) учить игнорировать это поле или вынести уровнем выше.
- [ ] **`extractMetricName` дёргается на каждый переход на Q04 пока флаг false.** Приехало из Sprint 2 FIX. Дешёво (regex по короткой строке), оптимизировать не нужно. Просто наблюдение.
- [ ] **Mobile responsive для `GuardrailsList`.** 6-колоночный grid на <640px может ломаться. Не тестировался. Кандидат на отдельный спринт mobile UX.
- [x] ~~**`editedExternally` в `state.plan` — зарезервированное поле.**~~ Закрыто в Sprint 4: семантика определена (true после LOAD_TEST_PLAN_MD, сбрасывается в RETURN_PLAN_TO_DRAFT / RESET_STATE), UI badge `LoadedBadge` реализован.
- [ ] **Case 2 в SAMPLE_SIZE_CALC.md (исправлено, но нужен унифицированный подход).** Приехало из Sprint 3. Если в Sprint 5-6 встретятся spec'и из разных источников — нужно явно фиксировать source формул и сверять.
- [x] ~~**Polish-pack 6 пунктов** (BUG-7 Colab CSV_PATH, BUG-8 filename/header источники, P-4 inline-warning Q03/Q07, P-5 dead code `baseline.unit === 'percent'`, P-6 slugify utility, P-7 legacy metric_name heuristic).~~ Закрыто в Sprint 5 main + FIX iter 1 (P-2..P-7). FIX iter 1 также убрал ещё 2 dead-ветки `baseline.unit === 'percent'` в `sample-size.js` и `scoring.js` (P-5 расширен через C-1 из code review).
- [ ] **DemoCsvCard: 2 из 4 файлов реализованы** (proportion + continuous). `demo_ratio.csv` и `demo_count.csv` — disabled-заглушки. Кандидат на mini-content sprint.
- [ ] **2 cell templates как disabled-заглушки** (cuped, delta_method). Mannwhitney и delta_method в main_test fallback'ятся на bootstrap-вариант с двух-уровневым warning (header ноутбука + PlanInfoCard UI). Полные ячейки — следующий mini-sprint.

---

## Recurring questions

> Вопросы, которые периодически всплывают и заслуживают зафиксированного ответа (или ADR'а если они архитектурные).

- **Q:** Файлы в working tree обрезались в Sprint 1 / Sprint 2. Что это было?
  **A:** Реальная причина — **git CRLF на Windows**. Зафиксировано 2 инцидента:
  - Sprint 1: после первого `git add .` на Windows — `.gitignore`, `CLAUDE.md`, `README.md` отображались обрезанными. Причина: Git autocrlf конверсия + неустановленные `.gitattributes`.
  - Sprint 2 FIX: после Code-коммитов — 5 файлов из `src/` показались `modified` с trailing whitespace + `\ No newline at end of file`. Та же CRLF-проблема.

  **Решение (Sprint 1):** `.gitattributes` с `* text=auto eol=lf` + `core.autocrlf=false`. Проблема больше не появлялась — все Sprint 3 / Sprint 4 / Sprint 4 FIX iter 1+2 прошли без рецидивов.

  **Историческое примечание:** в Sprint 2 CLOSE предыдущий инстанс Cowork атрибутировал отдельные case'ы к мифическому «Edit-bug на длинных Cyrillic replacements / UTF-8 boundary truncation». Это **гипотеза была неверной** — после `.gitattributes` фикса (Sprint 1) дальнейшие «обрезания» были артефактами sandbox bash stale view или интерпретации, не Edit инструментом. В Sprint 4 RETEST 2026-05-28 пользователь и Cowork явно проверили: Edit на длинных Cyrillic строках (включая 16KB переписываний DATA_MODEL.md / CONTEXT.md / Recurring questions) работает корректно. Миф развенчан, гипотеза удалена.

  **Восстановление при реальной CRLF-проблеме:** `git checkout HEAD -- <files>`.

- **Q:** PROJECT_STATUS.md устаревает между фазами при длинных паузах. Что делать?
  **A:** Sprint 3 пример — между TEST PREP (2026-05-16) и QA (2026-05-28) прошло 12 дней, PROJECT_STATUS всё это время показывал «Sprint 3 в работе у Code». Решение пока — просто обновлять его как часть CLOSE-фазы и не вкладывать в него точное «текущее место в цикле». Если станет реальной проблемой — рассмотреть генерацию из git log + последних reports автоматически, но это over-engineering для pet-проекта.
