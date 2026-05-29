# Project Status — stat·plan

**Обновлено:** 2026-05-29 (Sprint 6 ЗАКРЫТ полностью — main + FIX iter 1 + FIX iter 2 + RETEST + Cowork CLOSE; ADR-014 Accepted — recharts + papaparse через lazy chunking)
**Назначение:** оперативный снимок проекта. Для пользователя или следующего инстанса Cowork — быстро войти в контекст.

---

## Где мы сейчас

**Sprint 6 ЗАКРЫТ полностью** (main + FIX iter 1 + FIX iter 2 + RETEST + Cowork CLOSE). Data Peek (Шаг 1) полностью реализован: CSV upload + manual calculator + recharts histogram (3 малых для ratio) + skewness/kurtosis distribution_check + stability CV по дням + delta-method ratio_variance. **~333+ тестов зелёных** (267 → 313 в main → 328 после FIX iter 1 → ~333+ после FIX iter 2). Bundle initial **+4.55 KB gzip** (lazy chunking сэкономило ~110 KB vs прямой импорт recharts). Round-trip **6/6 canonical case** включая ratio + полностью заполненный data_peek (raw_values_numerator/denominator).

**Закрыт ключевой pain пользователя** — на Q08 для ratio/continuous без исторических данных больше не показывается «bootstrap fallback / приближённое» warning. После Data Peek (CSV или manual) sample-size считается точно через t_test (continuous) или delta_method (ratio).

**ADR-014 Accepted 2026-05-28** — recharts + papaparse подключены как новые npm-зависимости. Уточняет ADR-010 пункт 6 (recharts из «кандидата» → принят). Lazy chunking сохраняет ADR-001 spirit «minimum deps» — пользователь без peek не платит за recharts.

**ADR-013 (Accepted 2026-05-28)** — 4-шаговый флоу, объединение Шагов 4 и 5 в **Шаг 4 «Валидация и отчёт»**. **Stepper.jsx временно остаётся 5-шаговым** (с labels Sprint 5) — структурный переход на 4 шага в Code-зоне в Sprint 7.

**Следующий спринт — Sprint 7 main «Шаг 4 Валидация и отчёт»** (объединённый бывшие 4+5): структурированный ввод результатов из ноутбука + SRM/sanity vs план + generation readout.md с подсказкой по decision_rules + JSZip пакет финальных артефактов. Также — структурный переход Stepper на 4 шага. Скоуп в JTBD §7. ~3-4 ч.

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
| **7** | **Code main — Шаг 4 «Валидация и отчёт» (объединённый) + Stepper structural rewrite** | **Planned под ADR-013** | ~3-4 ч (план) |
| 8 | Code — Methodology + tutorial (decision_rules в ноутбуке) + a11y/mobile audit | Planned под JTBD §9 | ~4-5 ч (план) |
| Polish mini-sprint | Code (3 ◆ из Sprint 6 RETEST + editable schema + другие) | Optional, можно совмещать со Sprint 8 | ~1-2 ч (план) |

---

## Что реально работает в продукте (после Sprint 6 CLOSE 2026-05-29)

**Стартовый экран:** drag-drop + file picker fallback для `test_plan.md`. Парсер с js-yaml. Inline error при битом YAML.

**Степпер на 5 шагов:** реактивный. Шаги 4-5 hard locked. Labels: «04 Быстрая валидация», «05 Скачать артефакты» (UX-RENAME Sprint 5 по ADR-012).

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
- ExpectedSchemaCard — реактивный
- **Sticky bottom bar** для кнопки скачивания .ipynb
- Скачивание .ipynb: header без `## N.` номеров, duration grammar `1 day/N days`, decision rules с одной точкой, warning blockquote для delta_method, slugify с «ё» в test_id
- **Sprint 5 split:** filename + `YAML.test_id` из `metric_column` (snake_case), header `# Тест: <metric_name>` (натуральный), subtitle нейтральный «см. test_plan.md». `CSV_PATH` константа + Colab-инструкция в load-ячейке.

**Persistence:** localStorage с `stat-plan:v1:state`. Restart кнопка.

**Тестов:** **~333+/333+** зелёных (после Sprint 6 FIX iter 2). Round-trip **6/6** canonical case (5 из Sprint 5 + 1 новый Sprint 6 ratio+полный data_peek, расширен в FIX iter 1 на raw_values_numerator/denominator).

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

## Polish-pack v2 (КАНДИДАТЫ для будущего mini-sprint — пока в JTBD как ◆)

Обнаружены по ходу Sprint 6 RETEST 2026-05-29. Все — UX micro-polish, тривиальные правки, не блокеры.

| # | Что | JTBD ссылка | Файл правки |
|---|---|---|---|
| Pv2-1 | `fmtNum` precision в DataPeekStats: 2 знака для значений ≥ 1, 4 для < 1 (вместо 6 для всех — избегаем `100,431813`) | JTBD §4 | `src/components/brief/DataPeekStats.jsx::fmtNum` |
| Pv2-2 | ScoringCard детальный checklist — раскрываемые блоки с remarks под 4 группами (данные уже в `scorePlan() remarks`) | JTBD §5 | `src/components/plan/ScoringCard.jsx` |
| Pv2-3 | MdPreview стилизованный scrollbar (тёмная тема, узкий, accent-thumb) — вместо дефолтного браузерного | JTBD §5 | `src/components/plan/MdPreview.jsx` (или эквивалент) + CSS `::-webkit-scrollbar` |
| Pv2-4 | Manual editing ожидаемой схемы данных перед скачиванием ноутбука (rename column / type / add-remove optional) | JTBD §6 | `src/components/notebook/ExpectedSchemaCard.jsx` + sync с placeholders в `notebook-builder.js` |

Можно сгруппировать как отдельный Sprint Pv2 (~1-2 ч) или совместить со Sprint 8 (Methodology — большая content phase).

---

## Стек

React 19 + Vite 8 + Tailwind v4 + react-router-dom v7 HashRouter + Vitest 4 + js-yaml (Sprint 4) + recharts + papaparse (Sprint 6, ADR-014, оба lazy-chunked). Деплой: GitHub Pages через GitHub Actions из `main`. ADR-010 + ADR-011 + ADR-014.

---

## Roadmap до v1 (актуализирован 2026-05-29 после Sprint 6 CLOSE)

1. **Sprint 7 — Шаг 4 «Валидация и отчёт» (объединённый бывшие 4+5) + Stepper structural rewrite:** структурированный ввод результатов из ноутбука + SRM/sanity + decision_rules в readout + JSZip пакет финальных артефактов + переход Stepper с 5 на 4 шага по ADR-013. ~3-4 ч. Скоуп в `docs/project/JTBD.md §7`.
2. **Sprint 8 — Methodology + tutorial (как применять decision_rules в ноутбуке) + a11y/mobile audit.** ~4-5 ч. Скоуп в `docs/project/JTBD.md §9`.
3. **Polish-pack v2 (опционально)** — 4 ◆ stories из Sprint 6 RETEST (см. таблицу Polish-pack v2 выше). Можно отдельным mini-sprint ~1-2 ч или совместить со Sprint 8.

Data Peek **сделан в Sprint 6** (CSV + manual + recharts histogram + skewness/kurtosis + stability CV + delta-method ratio_variance). Pain «bootstrap fallback warning» закрыт.

Парсер test_plan.md **сделан в Sprint 4** (Phase A) + round-trip восстановлен в Sprint 4 FIX iter 2 + расширен в Sprint 5 FIX iter 1 (5-й canonical case) + расширен в Sprint 6 FIX iter 1 (6-й case + raw_values_numerator/denominator).

**Итого осталось до v1:** ~7-10 ч active (без polish) или ~8-12 ч (с polish-pack v2). За 1.5-2 фокус-дня реалистично.

---

## Принятые решения, важные для будущего

См. полные ADR в `docs/context/decisions-log.md`. Ключевые:

1. **CLAUDE.md правило P-1** — зоны коммитов Code vs Cowork.
2. **ADR-002** — артефакты как переносимое состояние. Sprint 4 FIX iter 2 закрывает оставшиеся дыры round-trip.
3. **ADR-006** — approved заморожен. `RETURN_PLAN_TO_DRAFT` сбрасывает notebook_config.
4. **ADR-011** — semantic shift metric_name/metric_label. После Sprint 5 P-3/P-6/P-7 + FIX C-2/C-3 — round-trip полностью симметричен (включая fallback case с пустым metric_column).
5. **ADR-012** — Superseded by ADR-013 (2026-05-28). Концептуальный вклад «не делаем independent validation» сохранён в ADR-013.
6. **ADR-013** — Accepted 2026-05-28. Объединение Шагов 4 и 5 в Шаг 4 «Валидация и отчёт». 4-шаговый флоу. ADR-005 superseded. Реализация — Sprint 7 (Code: Шаг 4 + Stepper structural rewrite).
7. **ADR-014** — Accepted 2026-05-28. recharts + papaparse как новые npm-deps, lazy-chunked. Уточняет ADR-010 пункт 6. После Sprint 6 — DataPeekHistogram + parseDataPeekCsv в lazy chunks (initial bundle +4.55 KB gzip).
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

**Прямо сейчас (Sprint 6 CLOSE commit):**

1. Commit Cowork-зоны batch'ем — Sprint 6 артефакты + CLOSE правки:
   - Cowork-зона: `decisions-log.md` (ADR-014 Accepted) / `sprint-6-prompt.md` / `code-review-sprint-6.md` / `test-cases-sprint-6.md` / `test-cases-sprint-6-fix-retest.md` / `sprint-6-fix-prompt.md` (iter 1, откатанный) / `sprint-6-fix-iter2-prompt.md` (новый) / `JTBD.md` (§4 [x] + 4 ◆ polish stories) / `CONTEXT.md` (Sprint 6 timeline) / `PROJECT_STATUS.md` (этот файл — Sprint 6 closed + roadmap).
   - Code-зона Sprint 6 main + FIX iter 1 + FIX iter 2 уже в main (отдельными commit'ами Code'а).

2. Push main → GitHub Actions деплоит на GitHub Pages. Data Peek будет на проде. Stepper labels Sprint 5 («04 Быстрая валидация», «05 Скачать артефакты») остаются — структурный переход на 4 шага в Sprint 7.

**Затем — Sprint 7 PLAN (Шаг 4 «Валидация и отчёт» + Stepper structural rewrite):**

3. **PLAN-фаза Sprint 7 совместно с пользователем** — обсудить детали скоупа объединённого Шага 4 (см. `JTBD.md §7`):
   - **DSL для decision_rules** (главный open question, см. ниже). Варианты: (а) минимальный детерминированный парсер text-правил из брифа → авто-flagging «правило сработало» → параграф «Recommended next step» в readout.md; (б) копируем правила как текст + пользователь сам отмечает галочкой + dropdown SHIP/ITERATE/KILL. Решение в Sprint 7 PLAN.
   - **Форма ручного ввода результатов** — какие поля обязательные (control_n, treatment_n, delta_rel, p_value, ci_lower, ci_upper, guardrail_breached)? Какая валидация? Дефолты?
   - **CSV helper** — глубина: только counts для SRM или ещё CR/mean preview по variant?
   - **Простые визуализации** — точка Δ с CI vs 0, столбики counts; через recharts (lazy уже подключён).
   - **`readout.md` шаблон** — YAML frontmatter поля; markdown разделы (TL;DR, что знаем, что не знаем, follow-up, Recommended next step, Принятое решение — пустое).
   - **Stepper structural rewrite** — 5 → 4 шага. STEPS array обновить, удалить пункт 05, переименовать 04 в «Валидация и отчёт». isStepUnlocked для последнего шага = approved.
   - **JSZip bundle** — что включаем: test_plan.md + analysis.ipynb + readout.md + опционально experiment_results.csv (если был загружен).

4. **Sprint 7 PROMPT** (Cowork → `sprint-7-prompt.md`) после согласования скоупа.

5. **Sprint 7 main DEV** (Code).

**Sprint 8 — Methodology + tutorial:**

6. После Sprint 7 main + CLOSE — Sprint 8 (methodology раздел с явным «что мы НЕ делаем» + tutorial «как применять decision_rules в ноутбуке для пост-анализа» + a11y/mobile audit). Скоуп в `JTBD.md §9`.

**Polish-pack v2 (опционально, в любой момент):**

7. 4 ◆ stories из таблицы Polish-pack v2 выше — можно отдельным mini-sprint или совместить со Sprint 8.

---

## Открытые продуктовые вопросы

Зафиксированы в обсуждении, требуют решения:

1. **DSL для decision_rules в Шаге 4 (Sprint 7).** Пользователь в брифе пишет правила свободным текстом (например, `«если CI нижняя > 0 → SHIP»`). Для генерации параграфа «Recommended next step» в readout.md нужен либо детерминированный мини-парсер этих строк (фрагильно), либо чек-боксы пользователя «правило сработало» (проще, надёжнее, требует ручного клика). Решаем в Sprint 7 PLAN.
2. **Methodology + tutorial структура.** Три уровня (тур / demo / methodology reference) + явный tutorial «как использовать decision_rules в ноутбуке для пост-анализа» (новый акцент после ADR-013). JTBD §9. Sprint 8.
3. **`editedExternally` UI badge (LoadedBadge)** — реализован, поведение зафиксировано в ADR-006 consequences. Может быть переосмыслен по обратной связи реальных пользователей.
4. **distribution_check threshold tuning** — текущие `|skew| > 1` и `excess kurt > 3` стандартные, проверены на log-normal CSV (skew=7.6, kurt=93.8 → `'skewed_heavy'` ✓). Реальные данные могут потребовать tuning. Замечать при использовании.
