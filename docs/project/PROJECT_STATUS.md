# Project Status — stat·plan

**Обновлено:** 2026-05-31 (Sprint 7 ЗАКРЫТ полностью — main + FIX iter 1 + FIX iter 2 + RETEST на сценариях A+B + Cowork CLOSE; ADR-015 Accepted + amended — notebook results export через tagged cell + tri-state novelty + significant)
**Назначение:** оперативный снимок проекта. Для пользователя или следующего инстанса Cowork — быстро войти в контекст.

---

## Где мы сейчас

**Sprint 7 ЗАКРЫТ полностью** (main + FIX iter 1 + FIX iter 2 + RETEST + Cowork CLOSE). Шаг 4 «Валидация и отчёт» полностью реализован: drag-drop выполненного `.ipynb` → парсинг tagged cell `stat-plan-results` → авто-заполнение формы + 4-6 PNG графиков inline + SRM/sanity checks + decision rules auto-eval + HTML отчёт self-contained + Markdown readout + ZIP пакет. **448 тестов зелёных** (335 → 422 main → 431 FIX iter 1 → 448 FIX iter 2). Bundle initial **+1.86 KB gzip** за весь Sprint 7. Round-trip **6/6 canonical case** не задет (YAML test_plan.md не менялся).

**Закрыт главный value loop проекта** — пользователь теперь проходит полный цикл от брифа до презентационного HTML отчёта без ручного ввода чисел. Архитектурный pivot mid-PLAN на ipynb upload primary flow (ADR-015) убрал дублирование труда vs первоначальная idea «ввести 8 полей вручную».

**Также закрыт** структурный переход Stepper'а на 4 шага (ADR-013 финализация). Labels Sprint 5 (`04 Быстрая валидация` / `05 Скачать артефакты`) заменены на `04 Валидация и отчёт`.

**ADR-015 Accepted 2026-05-29, amended 2026-05-31** — `stat-plan-results` tagged cell контракт между Jupyter/Colab и stat·plan parser. Amendment: `significant` optional field (FIX iter 1 F-5), `novelty_flag` tri-state `True/False/None` (FIX iter 2 G-1).

**Следующий спринт — Sprint 8 «Methodology + tutorial + NotebookLM integration + a11y/mobile audit»** или **Polish-pack v2 mini-sprint**. Скоуп polish-pack v2 — см. `docs/project/polish-pack-v2.md` (CR concerns + ◆ stories из Sprint 6+7 RETEST + G-4 unit conversion + NotebookLM integration).

| Sprint | Type | Status | Active time |
|---|---|---|---|
| 1 | Code | Closed | 51 мин |
| 2 | Code + FIX | Closed | ~2.5 ч |
| 3 | Code + FIX | Closed | ~3.5 ч |
| 4 main | Code (Phase A + B) | Closed | ~3.8 ч |
| 4 FIX iter 1 | Code (Phase A + B + C) | Closed | ~2.5 ч |
| 4 FIX iter 2 | Code | Closed | ~1.5 ч |
| 4 CLOSE | Cowork | Closed | ~40 мин |
| 5 main | Code mini (polish P-2..P-7 + UX-RENAME) | Closed | ~1ч 35мин |
| 5 FIX iter 1 | Code (C-1..C-4 + zombie test removal) | Closed | ~40 мин |
| 5 CLOSE | Cowork (FLOW / concept / JTBD §7-§8 rewrite, tech debt) | Closed | ~40 мин |
| 6 main | Code (Data Peek S1-S8 + lazy chunking mid-flight) | Closed | ~2ч 45мин |
| 6 FIX iter 1 | Code (C-1 + C-2 + Phase A/B/D/E + initial QA bugs Q1/Q3/Q4) | Closed | ~1.5 ч |
| 6 FIX iter 2 | Code (BUG-Q5 recharts Attempt 2+, Phase F, BUG-Q6) | Closed | ~1-1.5 ч |
| 6 CLOSE | Cowork (CONTEXT timeline + PROJECT_STATUS + JTBD §4 closure + 3 polish ◆) | Closed | ~40 мин |
| 7 main | Code (S1-S13: ipynb parser + drag-drop UI + checks + decision rules + HTML/MD generators + ZIP + Stepper rewrite + editable schema) | Closed | ~4.5 ч |
| 7 FIX iter 1 | Code (F-1..F-9: matplotlib графики в шаблонах + significant flag + novelty visible badge) | Closed | ~1.5 ч |
| 7 FIX iter 2 | Code (G-1..G-4: novelty tri-state + TL;DR honest unit labels + Step 3→4 nav + decision-rules parser improvements) | Closed | ~1.25 ч |
| 7 CLOSE | Cowork (ADR-015 amendment + DATA_MODEL + JTBD §6+§7 + CONTEXT timeline + PROJECT_STATUS + polish-pack-v2) | Closed | ~50 мин |
| **8** | **Code — Methodology + tutorial + NotebookLM «CRO эксперт» integration + a11y/mobile audit** | **Planned под JTBD §9** | ~4-5 ч (план) |
| Polish-pack v2 mini-sprint | Code (см. `docs/project/polish-pack-v2.md` — 4 CR concerns + 5 ◆ stories из Sprint 6+7 RETEST) | Optional, можно совмещать со Sprint 8 | ~2-3 ч (план) |

---

## Что реально работает в продукте (после Sprint 7 CLOSE 2026-05-31)

**Полный value loop:** бриф → план → конструктор → ноутбук → выполнить в Colab → drag-drop → HTML отчёт + readout.md + ZIP. End-to-end без ручного ввода чисел.

**Стартовый экран:** drag-drop + file picker fallback для `test_plan.md`. Парсер с js-yaml. Inline error при битом YAML.

**Степпер на 4 шага** (после Sprint 7 S8 structural rewrite): реактивный, ADR-013 contract. Labels: «01 Бриф», «02 Тест-план», «03 Конструктор», «04 Валидация и отчёт».

**Шаг 1 «Бриф»:**
- 10 вопросов с soft-валидацией
- Парсер 4 слотов гипотезы
- Q01 «Другое» → conditional sub-question text input для `goal_description`
- Q04 разделение: «Название» (натуральный текст) и «Колонка в CSV» (snake_case)
- Q06 preselect (Пользователь) принимается как ответ без клика
- Реактивный sample size display под Q08 с inline warnings
- Карта вопросов с правильными ✓ для preselect'ов (Sprint 6 FIX iter 2 BUG-Q6 — Q01 goal_type восстановлен после regression)
- Advanced (alpha, power, two_sided, variance_reduction, stratification_by, holdback_percent) — readonly в approved
- **Inline approx-info на Q03/Q07** для ratio/continuous (Sprint 5 P-4) — раннее предупреждение о приближённости расчёта без data peek
- **Q05 baseline** (Sprint 6 FIX iter 2 Phase F): для continuous — только number input + подсказка «в единицах метрики (₽, сек, ARPU)»; для proportion/ratio/count — dropdown с правильными единицами
- **Data Peek (Q08)** (Sprint 6 main + FIX iter 1/2): collapsible под SampleSizeDisplay; tabs **CSV** / **Ручной ввод**; CSV upload (papaparse lazy) → per metric_type парсер + skewness/kurtosis + stability CV; Manual → калькулятор полей per metric_type (proportion: no fields, continuous: σ, ratio: 5 полей μN/μD/var_n/var_d/cov_nd → ratio_variance, count: σ default √baseline Poisson); DataPeekStats с BASELINE_computed vs твой + Δ% + ✓/⚠ + кнопка «↳ ПОДСТАВИТЬ В Q05» (live refresh после клика — FIX iter 1 C-1); DataPeekHistogram (recharts lazy) — 1 для continuous/count, 3 малых для ratio с подписями `clicks` / `sessions` / `clicks/sessions` (FIX iter 1 C-2). После peek — sample-size БЕЗ bootstrap fallback warning, метод t_test (continuous) или delta_method (ratio)

**Шаг 2 «Тест-план»:**
- Preview test_plan.md + ScoringCard
- Download / Upload (file picker для отредактированного MD)
- Approve / Return-to-draft + ConfirmDialog
- **CTA transformation: «Утвердить» → «Перейти к конструктору →» после approve**
- LoadedBadge `↳ ЗАГРУЖЕН` если editedExternally=true

**Шаг 3 «Конструктор»:**
- PlanInfoCard с warning banner для delta_method/mannwhitney
- 6 mandatory + 2 optional ячейки (segments, bootstrap_ci); 2 disabled-заглушки (cuped, delta_method)
- DemoCsvCard — 2 файла активны (proportion, continuous), 2 заглушки
- **ExpectedSchemaCard editable** (Sprint 7 S10): inline rename column / type toggle / add-remove optional, sync с placeholders в notebook-builder.js
- **Sticky bottom bar** для кнопки скачивания .ipynb
- **Footer:** «← К ПЛАНУ» / «К ВАЛИДАЦИИ →» (secondary, Sprint 7 FIX iter 2 G-3) / «↓ СКАЧАТЬ ...ipynb» (primary)
- Скачивание .ipynb: header без `## N.` номеров, duration grammar `1 day/N days`, decision rules с одной точкой, warning blockquote для delta_method, slugify с «ё» в test_id
- **Sprint 5 split:** filename + `YAML.test_id` из `metric_column` (snake_case), header `# Тест: <metric_name>` (натуральный), subtitle нейтральный «см. test_plan.md». `CSV_PATH` константа + Colab-инструкция в load-ячейке.
- **Sprint 7: matplotlib графики в шаблонах** (FIX iter 1 F-1..F-4 + F-9a): balance (2 субплота counts+means), srm (observed vs expected 50/50), 4× main_test (errorbar Δ с CI vs 0 с label `CI95 (абс. разность)`), guardrails (barh breached/ok), novelty (bar early vs later). plt.rcParams dark palette preset в load-cell.

**Шаг 4 «Валидация и отчёт»** (Sprint 7 main + FIX iter 1 + iter 2):
- **Primary flow: drag-drop выполненного `.ipynb`** → парсер `ipynb.js` ищет cell с tag `stat-plan-results` → JSON.parse output → авто-заполнение формы + extract PNG (base64) для gallery + HTML embed
- **Fallback: manual flow** — ручной ввод 7 полей в форму (если ipynb без export-cell)
- **ResultsForm:** 7 input полей (control_n, treatment_n, delta_rel, p_value, ci_lower, ci_upper, srm_pvalue) + 2 readonly badges (significant зелёный/жёлтый, novelty тernary green/yellow/grey) + spread override на любом поле через `user_overrides`
- **3. Sanity checks:** SRM (chi² через Lanczos gammaLn без scipy) + total_n_match vs plan + direction_match vs MDE direction
- **4. Decision rules:** auto-eval через расширенный парсер (Sprint 7 FIX iter 2 G-4: unicode/CI aliases/рус. границы/semantic mapping) + manual checkbox fallback для unparseable + recommendation «Recommended next step» (SHIP→ITERATE→KILL priority)
- **5. Графики:** 4-6 PNG inline из ipynb outputs (balance/srm/main_test/guardrails/novelty)
- **6. Export:** `report.html` self-contained (inline CSS + PNG base64), `readout.md` с YAML frontmatter + TL;DR badges + decision: "" пустое (ADR-004), `analysis.zip` через JSZip lazy chunk

**Persistence:** localStorage с `stat-plan:v1:state`. Restart кнопка.

**Тестов:** **448/448** зелёных (после Sprint 7 FIX iter 2). Round-trip **6/6** canonical case не задет.

---

## Архитектурные решения (для следующего инстанса критично понять)

### ADR-011 — Accepted 2026-05-28: Semantic shift metric_name / metric_label

**До:** `YAML.metric_name` = натуральный текст из brief.metric_name (например, «конверсия в первый депозит»). В CSV колонка обычно snake_case латиница → mismatch.

**После:** `YAML.metric_name` = код колонки (snake_case из brief.metric_column). Новое опциональное `YAML.metric_label` = натуральный текст из brief.metric_name.

**Legacy:** старые test_plan.md из Sprint 3/Sprint 4 main → после load маппятся через P-7 heuristic (Sprint 5): натуральный текст идёт в `brief.metric_name`, `brief.metric_column` пуст, warning о legacy формате показан в ParseWarningsBanner.

**Filename / header source разделение реализовано в Sprint 5 (P-3):** filename `.ipynb` и `YAML.test_id` — slug из `metric_column`; header `# Тест: <metric_name>` (натуральный, после C-4 убран английский prefix `Analysis: `); `YAML.metric_label` пишется только если `metric_column` заполнен (C-2 fix — round-trip симметрия для fallback case).

### ADR-012 — Superseded 2026-05-28 by ADR-013

**Был:** Шаг 4 «Быстрая валидация» (отдельный от Шага 5 «Скачать артефакты»). UX-rename labels Шагов 04/05 реализован в Sprint 5 main.

**Стало (после ADR-013):** Шаг 4 и Шаг 5 объединены в один **Шаг 4 «Валидация и отчёт»**. Концептуальный вклад ADR-012 («не делаем independent validation» — это circular validation) **сохранён** в ADR-013. Полная история — в `decisions-log.md`.

### ADR-013 — Accepted 2026-05-28: Объединение Шагов 4 и 5 в Шаг 4 «Валидация и отчёт», 4-шаговый флоу

**Контекст:** при обсуждении перед Sprint 6 пользователь сформулировал — test_plan.md это документ **до** теста (для команды/Confluence), ноутбук это пост-анализ (пользователь смотрит Δ/p/CI/SRM/guardrails сам), а Шаг 4 «Быстрая валидация» из ADR-012 как отдельная фаза дублирует работу ноутбука и теряет смысл. Логичное переосмысление — объединить с Шагом 5 в один шаг «Валидация и отчёт» (ввод результатов + SRM/sanity + генерация красивого readout.md с decision_rules-подсказкой + JSZip пакет).

**Решение:**
- 5-шаговый флоу → **4 шага**. ADR-005 (часть про 5 шагов) superseded; развилка на старте сохранена.
- **Шаг 4 «Валидация и отчёт»** (объединённый): структурированный ввод результатов из ноутбука + SRM/sanity + CSV upload helper (без пересчёта Δ/p/CI) + генерация readout.md с decision_rules-подсказкой + JSZip пакет финальных артефактов.
- **ADR-004 в силе** — decision_rules в readout это применение **пользовательских** правил для подсказки в тексте, не суждение тула. Поле «Принятое решение» остаётся пустым.
- **Stepper.jsx** структурный переход на 4 шага — Sprint 7 (Code-зона). Временный рассинхрон до этого момента.

**Status:** Accepted. FLOW.md / concept.md / JTBD §7 переписаны в Sprint 5 CLOSE batch'е. Полная реализация Шага 4 — Sprint 7. Открытый вопрос про DSL для decision_rules в readout (детерминированный парсер vs чек-боксы пользователя) — решается в Sprint 7 PLAN.

---

## Polish-pack v1 (ЗАКРЫТ в Sprint 5 main + FIX iter 1)

Все 6 пунктов + UX-RENAME + 4 concerns из code review (C-1..C-4) закрыты:

| # | Что | Реализация |
|---|---|---|
| P-2 | BUG-7: Colab-friendly `CSV_PATH` в load template + инструкция | Sprint 5 main: `templates/notebook/load.cells.json` |
| P-3 | BUG-8: filename/test_id ← metric_column, header ← metric_name + переписать подзаголовок | Sprint 5 main: `notebook-builder.js::deriveTestId/deriveTitle/buildHeaderCell` + `render.js::deriveTestId` |
| P-4 | inline-warning на Q03/Q07 о приближённости без data peek | Sprint 5 main: `QuestionRenderer.jsx::ApproxInfoBlock` |
| P-5 | dead code `baseline.unit === 'percent'` в notebook-builder + (FIX C-1) sample-size.js + scoring.js + render.js | Sprint 5 main + FIX iter 1 (×3 места) |
| P-6 | slugify utility | Sprint 5 main: `src/lib/util/slugify.js` |
| P-7 | legacy YAML heuristic для metric_name | Sprint 5 main: `parse.js::mapFrontmatter` + (FIX C-3) edge case `metric_label: ""` |
| UX-RENAME | Stepper.jsx labels Шагов 04/05 (ADR-012, superseded by ADR-013 — Stepper structural rewrite в Sprint 7) | Sprint 5 main: `Stepper.jsx STEPS` |
| C-2 | Round-trip asymmetry для empty `metric_column` | Sprint 5 FIX iter 1: `render.js` substitutions + 5-й round-trip case |
| C-4 | Header `.ipynb` без английского prefix «Analysis:» | Sprint 5 FIX iter 1: `notebook-builder.js::buildHeaderCell` |

## Polish-pack v2 (КАНДИДАТЫ для будущего mini-sprint)

Полный backlog с приоритизацией — см. `docs/project/polish-pack-v2.md`. Кратко:

- **4 CR concerns** из Sprint 7 code reviews (D-2 midpoint refinement, parser aliases lift/Эффект/Δ, G-4 unit conversion % rel ↔ абс через baseline)
- **5 ◆ stories** из Sprint 6+7 RETEST (restart button на финале, fmtNum precision, ScoringCard checklist, MdPreview scrollbar, NotebookLM «CRO эксперт» integration)
- ~~Pv2-4 editable schema~~ — **закрыто в Sprint 7 S10**

Можно сгруппировать как отдельный Sprint Pv2 (~2-3 ч) или совместить со Sprint 8 (Methodology — большая content phase).

---

## Стек

React 19 + Vite 8 + Tailwind v4 + react-router-dom v7 HashRouter + Vitest 4 + js-yaml (Sprint 4) + recharts + papaparse (Sprint 6, ADR-014, оба lazy-chunked). Деплой: GitHub Pages через GitHub Actions из `main`. ADR-010 + ADR-011 + ADR-014.

---

## Roadmap до v1 (актуализирован 2026-05-31 после Sprint 7 CLOSE)

1. **Sprint 8 — Methodology + tutorial + NotebookLM «CRO эксперт» integration + a11y/mobile audit.** ~4-5 ч. Скоуп в `docs/project/JTBD.md §9`. Главные блоки:
   - `/#/methodology` страница со sticky TOC (выбор test_method, MDE, sample size, SRM, novelty, guardrails)
   - `?` tooltip с deep-link в methodology рядом с каждым ключевым понятием в брифе
   - Disclaimer-блок «Что мы НЕ делаем»
   - **NEW:** интеграция NotebookLM `CRO эксперт` notebook как primary external reference resource (footer-link + tooltips в methodology)
   - a11y audit + mobile read-only режим
2. **Polish-pack v2 mini-sprint** — см. `docs/project/polish-pack-v2.md`. Можно отдельным ~2-3 ч или совместить со Sprint 8.

**Закрытые блоки до v1:**
- ✅ Бриф (Sprint 2 + 5 polish)
- ✅ Sample size + scoring + test plan (Sprint 3)
- ✅ Парсер test_plan.md + round-trip (Sprint 4 + 5 FIX + 6 FIX)
- ✅ Конструктор ноутбука (Sprint 4 + 5)
- ✅ Data Peek (Sprint 6)
- ✅ Шаг 4 Валидация и отчёт + 4-шаговый Stepper (Sprint 7)

**Итого осталось до v1:** ~4-5 ч active (Sprint 8 без polish) или ~7-8 ч (Sprint 8 + polish-pack v2). За 1 фокус-день реалистично.

---

## Принятые решения, важные для будущего

См. полные ADR в `docs/context/decisions-log.md`. Ключевые:

1. **CLAUDE.md правило P-1** — зоны коммитов Code vs Cowork.
2. **ADR-002** — артефакты как переносимое состояние. Sprint 4 FIX iter 2 закрывает оставшиеся дыры round-trip.
3. **ADR-006** — approved заморожен. `RETURN_PLAN_TO_DRAFT` сбрасывает notebook_config.
4. **ADR-011** — semantic shift metric_name/metric_label. После Sprint 5 P-3/P-6/P-7 + FIX C-2/C-3 — round-trip полностью симметричен (включая fallback case с пустым metric_column).
5. **ADR-012** — Superseded by ADR-013 (2026-05-28). Концептуальный вклад «не делаем independent validation» сохранён в ADR-013.
6. **ADR-013** — Accepted 2026-05-28. Объединение Шагов 4 и 5 в Шаг 4 «Валидация и отчёт». 4-шаговый флоу. ADR-005 superseded. **Реализован в Sprint 7** (Code: Шаг 4 + Stepper structural rewrite).
7. **ADR-014** — Accepted 2026-05-28. recharts + papaparse как новые npm-deps, lazy-chunked. Уточняет ADR-010 пункт 6. После Sprint 6 — DataPeekHistogram + parseDataPeekCsv в lazy chunks (initial bundle +4.55 KB gzip).
8. **ADR-015** — Accepted 2026-05-29, amended 2026-05-31. Notebook results export через tagged cell `stat-plan-results` с JSON. Amendment Sprint 7 FIX: `significant` optional field + `novelty_flag` tri-state (`True`/`False`/`None`). **CI хранится в АБСОЛЮТНЫХ единицах метрики** (доли для proportion, ед. метрики для continuous, ratio diff для ratio) — UI/HTML/MD добавляют label `(абс. разность, ед. <metric_name>)` для disambig. Конверсия `% rel ↔ абс` через baseline отложена в Sprint 8 (требует canonical `control_mean` binding).
8. **`editedExternally`** — `true` после `LOAD_TEST_PLAN_MD`, сбрасывается в `RETURN_PLAN_TO_DRAFT` / `RESET_STATE`. UI badge LoadedBadge.
9. **localStorage** — `stat-plan:v1:state`, версионированный ключ.
10. **`applyEnterDefaults`** — единый путь подстановки дефолтов, расширен в Sprint 4 FIX iter 1 для goal_type/randomization_unit (BUG-5). Sprint 6 FIX iter 2 BUG-Q6 закрыл regression для Q01 goal_type preselect.
11. **`metric_column`** = код CSV-колонки (snake_case, обычно латиница); `metric_name` = натуральный текст. После Sprint 4 FIX iter 1.
12. **`baseline.unit`** — для proportion/ratio/count dropdown с правильными units; для continuous **нет unit-поля** (только number input с placeholder «в единицах метрики»). Sprint 6 FIX iter 2 Phase F. `parse.js coerceBaseline` ставит unit=null для не-proportion, unit для continuous не используется ни в sample-size, ни в scoring, ни в YAML.
13. **`state.brief.data_peek`** — 15 полей schema (Sprint 6 main S1). round-trip-able через YAML. Hooks в `sample-size.js resolveSigma` (для continuous) и `:258` (для ratio delta_method). После peek warning «bootstrap fallback» исчезает.

---

## Где искать что

| Хочешь узнать | Где смотри |
|---|---|
| Концепция, для кого делаем | `docs/context/concept.md` |
| Стек, структура папок | `docs/context/ARCHITECTURE.md` |
| Все ADR | `docs/context/decisions-log.md` (включая ADR-011/012/013/014 Accepted; ADR-005/012 superseded by ADR-013) |
| Схема YAML test_plan.md | `docs/context/DATA_MODEL.md` |
| Backlog с чекбоксами | `docs/project/JTBD.md` (§4 Data Peek закрыт после Sprint 6; §7 = объединённый Шаг 4 «Валидация и отчёт» после ADR-013; §8 = кросс-функциональные; §9 = Methodology) |
| История проекта по спринтам | `docs/project/CONTEXT.md` (Development Timeline — Sprint 6 запись добавлена) |
| Процесс (фазы спринта) | `docs/project/Dev-Cycle.md` |
| Правила поведения обоих инстансов | `CLAUDE.md` |
| Последний завершённый sprint phase | `docs/project/sprint-report-6.md` + `sprint-6-fix-report.md` + (Sprint 6 FIX iter 2 report TBD от Code) |
| Code review Sprint 6 | `docs/project/code-review-sprint-6.md` |
| Тест-кейсы Sprint 6 | `docs/project/test-cases-sprint-6.md` (14 кейсов основной smoke) + `docs/project/test-cases-sprint-6-fix-retest.md` (7 runnable retest кейсов после FIX iter 1/2) |
| Sprint 6 FIX prompts | `docs/project/sprint-6-fix-prompt.md` (iter 1) + `docs/project/sprint-6-fix-iter2-prompt.md` (BUG-Q5 + Phase F + BUG-Q6) |
| Polish-pack v1 (закрыт в Sprint 5) + v2 кандидаты | `docs/project/polish-pack.md` + JTBD §4/§5/§6 ◆ stories |

---

## Что делать дальше (для следующего инстанса)

**Прямо сейчас (Sprint 7 CLOSE commit):**

1. Commit Cowork-зоны batch'ем — Sprint 7 артефакты + CLOSE правки:
   - **Cowork-зона:** `decisions-log.md` (ADR-015 Accepted + amendment Sprint 7 FIX) / `sprint-7-prompt.md` / `code-review-sprint-7.md` / `test-cases-sprint-7.md` / `e2e-scenarios-sprint-7.md` / `sprint-7-fix-prompt.md` (iter 1) / `code-review-sprint-7-fix.md` / `test-cases-sprint-7-fix-retest.md` / `sprint-7-fix-iter2-prompt.md` (iter 2) / `code-review-sprint-7-fix-iter2.md` / `test-cases-sprint-7-fix-iter2-retest.md` / `JTBD.md` (§6+§7 закрытие + Sprint 8 ◆ stories) / `CONTEXT.md` (Sprint 7 timeline) / `PROJECT_STATUS.md` (этот файл) / `DATA_MODEL.md` (ipynb export + readout + report sections) / `polish-pack-v2.md` (новый файл).
   - **Code-зона:** Sprint 7 main + FIX iter 1 + FIX iter 2 уже в main (отдельными commit'ами Code'а) + Code report `sprint-report-7.md` / `sprint-7-fix-report.md` / `sprint-7-fix-iter2-report.md`.

2. Push main → GitHub Actions деплоит на GitHub Pages. **Шаг 4 «Валидация и отчёт» теперь на проде**, Stepper 4-шаговый.

**Затем — выбор:**

- **Вариант A: Sprint 8 (Methodology + NotebookLM integration + a11y/mobile)** — основной content sprint до v1. Скоуп в `JTBD.md §9`. ~4-5 ч.
- **Вариант B: Polish-pack v2 mini-sprint** — см. `docs/project/polish-pack-v2.md`. ~2-3 ч.
- **Вариант C: совместить** — Sprint 8 + polish-pack v2 в один большой блок. ~7-8 ч.

Решает пользователь после CLOSE commit'а на основе приоритета (content vs UX polish).

---

## Открытые продуктовые вопросы

Зафиксированы в обсуждении, требуют решения:

1. **DSL для decision_rules в Шаге 4 (Sprint 7).** Пользователь в брифе пишет правила свободным текстом (например, `«если CI нижняя > 0 → SHIP»`). Для генерации параграфа «Recommended next step» в readout.md нужен либо детерминированный мини-парсер этих строк (фрагильно), либо чек-боксы пользователя «правило сработало» (проще, надёжнее, требует ручного клика). Решаем в Sprint 7 PLAN.
2. **Methodology + tutorial структура.** Три уровня (тур / demo / methodology reference) + явный tutorial «как использовать decision_rules в ноутбуке для пост-анализа» (новый акцент после ADR-013). JTBD §9. Sprint 8.
3. **`editedExternally` UI badge (LoadedBadge)** — реализован, поведение зафиксировано в ADR-006 consequences. Может быть переосмыслен по обратной связи реальных пользователей.
4. **distribution_check threshold tuning** — текущие `|skew| > 1` и `excess kurt > 3` стандартные, проверены на log-normal CSV (skew=7.6, kurt=93.8 → `'skewed_heavy'` ✓). Реальные данные могут потребовать tuning. Замечать при использовании.
