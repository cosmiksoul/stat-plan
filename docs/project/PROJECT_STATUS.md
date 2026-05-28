# Project Status — stat·plan

**Обновлено:** 2026-05-28 (Sprint 5 ЗАКРЫТ + ADR-013 Accepted 2026-05-28 — объединение Шагов 4 и 5 в Шаг 4 «Валидация и отчёт», 4-шаговый флоу)
**Назначение:** оперативный снимок проекта. Для пользователя или следующего инстанса Cowork — быстро войти в контекст.

---

## Где мы сейчас

**Sprint 5 ЗАКРЫТ полностью** (main + FIX iter 1 + Cowork CLOSE). 6 пунктов polish-pack (P-2..P-7) + UX-RENAME labels Шагов 04/05 + 4 concerns из code review (C-1..C-4) — всё закрыто. **267 тестов зелёных** (249 → 266 в main → 267 после FIX iter 1: +2 новых, −1 zombie). Bundle **401.17 KB raw / 124.93 KB gzip** (net +1.37 KB vs Sprint 4 FIX iter 2). Round-trip контракт ADR-002 — **5/5 canonical case** (4 из Sprint 4 + 1 новый C-2 для empty `metric_column` через P-7 heuristic).

**ADR-013 Accepted 2026-05-28** (после Sprint 5 CLOSE, до Sprint 6 PLAN): объединение Шагов 4 и 5 в **Шаг 4 «Валидация и отчёт»**, 4-шаговый флоу. ADR-005 (5-шаговый) и ADR-012 (Шаг 4 «Быстрая валидация» как отдельный) — superseded. Ключевой концептуальный вклад ADR-012 («не делаем independent validation») сохранён. Подробности — в `docs/context/decisions-log.md` ADR-013. FLOW.md / concept.md / JTBD §7 переписаны в этом же CLOSE-batch'е. **Stepper.jsx временно остаётся 5-шаговым** (с labels Sprint 5) — структурный переход на 4 шага в Code-зоне в Sprint 7.

**Следующие спринты переориентированы:**

- **Sprint 6 main — Data Peek (Шаг 1):** CSV upload (автосчёт σ/cov/μ из реальных данных) + ручной calculator для известных параметров. Решает наблюдаемую боль — на Q08 для ratio/continuous без peek показывается приближённый sample size с warning «bootstrap fallback» (например, `~1 091 / 1 дн / delta_method / bootstrap fallback`). После реализации Data Peek — точный расчёт без warning. Скоуп описан в JTBD §4. ~3-4 ч.
- **Sprint 7 main — Шаг 4 «Валидация и отчёт» (объединённый):** структурированный ввод результатов из ноутбука + SRM/sanity vs план + generation readout.md с подсказкой по decision_rules + JSZip пакет финальных артефактов. Также — структурный переход Stepper на 4 шага. Скоуп в JTBD §7. ~3-4 ч.

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
| **6** | **Code — Data Peek (Шаг 1): CSV upload + ручной calculator** | **Planned под ADR-009 + JTBD §4** | ~3-4 ч (план) |
| 7 | Code — Шаг 4 «Валидация и отчёт» (бывшие 4+5 объединённые) + Stepper structural rewrite | Planned под ADR-013 | ~3-4 ч (план) |
| 8 | Code — Methodology + tutorial (decision_rules в ноутбуке) + a11y/mobile audit | Planned под JTBD §9 | ~4-5 ч (план) |

---

## Что реально работает в продукте (после Sprint 4 main + FIX iter 1, перед push iter 2)

**Стартовый экран:** drag-drop + file picker fallback для `test_plan.md`. Парсер с js-yaml. Inline error при битом YAML.

**Степпер на 5 шагов:** реактивный. Шаги 4-5 hard locked. Labels: «04 Быстрая валидация», «05 Скачать артефакты» (UX-RENAME Sprint 5 по ADR-012).

**Шаг 1 «Бриф»:**
- 10 вопросов с soft-валидацией
- Парсер 4 слотов гипотезы
- Q01 «Другое» → conditional sub-question text input для `goal_description`
- Q04 разделение: «Название» (натуральный текст) и «Колонка в CSV» (snake_case)
- Q06 preselect (Пользователь) принимается как ответ без клика
- Реактивный sample size display под Q08 с inline warnings
- Карта вопросов с правильными ✓ для preselect'ов
- Advanced (alpha, power, two_sided, variance_reduction, stratification_by, holdback_percent) — readonly в approved
- **Inline approx-info на Q03/Q07** для ratio/continuous (Sprint 5 P-4) — раннее предупреждение о приближённости расчёта без data peek

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

**Тестов:** **267/267** зелёных (после Sprint 5 FIX iter 1). Round-trip 5/5 canonical case.

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

## Polish-pack (ЗАКРЫТ в Sprint 5 main + FIX iter 1)

Все 6 пунктов + UX-RENAME + 4 concerns из code review (C-1..C-4) закрыты:

| # | Что | Реализация |
|---|---|---|
| P-2 | BUG-7: Colab-friendly `CSV_PATH` в load template + инструкция | Sprint 5 main: `templates/notebook/load.cells.json` |
| P-3 | BUG-8: filename/test_id ← metric_column, header ← metric_name + переписать подзаголовок | Sprint 5 main: `notebook-builder.js::deriveTestId/deriveTitle/buildHeaderCell` + `render.js::deriveTestId` |
| P-4 | inline-warning на Q03/Q07 о приближённости без data peek | Sprint 5 main: `QuestionRenderer.jsx::ApproxInfoBlock` |
| P-5 | dead code `baseline.unit === 'percent'` в notebook-builder + (FIX C-1) sample-size.js + scoring.js + render.js | Sprint 5 main + FIX iter 1 (×3 места) |
| P-6 | slugify utility | Sprint 5 main: `src/lib/util/slugify.js` |
| P-7 | legacy YAML heuristic для metric_name | Sprint 5 main: `parse.js::mapFrontmatter` + (FIX C-3) edge case `metric_label: ""` |
| UX-RENAME | Stepper.jsx labels Шагов 04/05 (ADR-012) | Sprint 5 main: `Stepper.jsx STEPS` |
| C-2 | Round-trip asymmetry для empty `metric_column` | Sprint 5 FIX iter 1: `render.js` substitutions + 5-й round-trip case |
| C-4 | Header `.ipynb` без английского prefix «Analysis:» | Sprint 5 FIX iter 1: `notebook-builder.js::buildHeaderCell` |

---

## Стек

React 19 + Vite 8 + Tailwind v4 + react-router-dom v7 HashRouter + Vitest 4 + js-yaml (Sprint 4). Деплой: GitHub Pages через GitHub Actions из `main`. ADR-010 + ADR-011.

---

## Roadmap до v1 (актуализирован 2026-05-28 после ADR-013)

1. **Sprint 6 — Data Peek (Шаг 1):** CSV upload (автосчёт σ/cov/μ из реальных данных) + ручной calculator (для известных параметров из отчёта аналитика / прошлого теста). Решает боль с приближённым sample size для ratio/continuous (bootstrap fallback warning). ~3-4 ч. Скоуп в `docs/project/JTBD.md §4`.
2. **Sprint 7 — Шаг 4 «Валидация и отчёт» (объединённый бывшие 4+5):** структурированный ввод результатов + SRM/sanity + decision_rules в readout + JSZip пакет + Stepper.jsx структурный переход на 4 шага. ~3-4 ч. Скоуп в `docs/project/JTBD.md §7`.
3. **Sprint 8 — Methodology + tutorial (как применять decision_rules в ноутбуке) + a11y/mobile audit.** ~4-5 ч. Скоуп в `docs/project/JTBD.md §9` (после перенумерации в Sprint 5 CLOSE).

Парсер test_plan.md **сделан в Sprint 4** (Phase A) + round-trip восстановлен в Sprint 4 FIX iter 2 + расширен в Sprint 5 FIX iter 1 (5-й canonical case).

**Итого осталось до v1:** ~10-13 ч active. За 1.5-2 фокус-дня реалистично.

---

## Принятые решения, важные для будущего

См. полные ADR в `docs/context/decisions-log.md`. Ключевые:

1. **CLAUDE.md правило P-1** — зоны коммитов Code vs Cowork.
2. **ADR-002** — артефакты как переносимое состояние. Sprint 4 FIX iter 2 закрывает оставшиеся дыры round-trip.
3. **ADR-006** — approved заморожен. `RETURN_PLAN_TO_DRAFT` сбрасывает notebook_config.
4. **ADR-011** — semantic shift metric_name/metric_label. После Sprint 5 P-3/P-6/P-7 + FIX C-2/C-3 — round-trip полностью симметричен (включая fallback case с пустым metric_column).
5. **ADR-012** — Superseded by ADR-013 (2026-05-28). Концептуальный вклад «не делаем independent validation» сохранён в ADR-013.
6. **ADR-013** — Accepted 2026-05-28. Объединение Шагов 4 и 5 в Шаг 4 «Валидация и отчёт». 4-шаговый флоу. ADR-005 superseded. Реализация — Sprint 7 (Code: Шаг 4 + Stepper structural rewrite).
6. **`editedExternally`** — `true` после `LOAD_TEST_PLAN_MD`, сбрасывается в `RETURN_PLAN_TO_DRAFT` / `RESET_STATE`. UI badge LoadedBadge.
7. **localStorage** — `stat-plan:v1:state`, версионированный ключ.
8. **`applyEnterDefaults`** — единый путь подстановки дефолтов, расширен в Sprint 4 FIX iter 1 для goal_type/randomization_unit (BUG-5).
9. **`metric_column`** = код CSV-колонки (snake_case, обычно латиница); `metric_name` = натуральный текст. После Sprint 4 FIX iter 1.

---

## Где искать что

| Хочешь узнать | Где смотри |
|---|---|
| Концепция, для кого делаем | `docs/context/concept.md` |
| Стек, структура папок | `docs/context/ARCHITECTURE.md` |
| Все ADR | `docs/context/decisions-log.md` (включая ADR-011/012/013 Accepted 2026-05-28; ADR-005/012 superseded by ADR-013) |
| Схема YAML test_plan.md | `docs/context/DATA_MODEL.md` |
| Backlog с чекбоксами | `docs/project/JTBD.md` (§7 = объединённый Шаг 4 «Валидация и отчёт» после ADR-013; §8 = кросс-функциональные; §9 = Methodology) |
| История проекта по спринтам | `docs/project/CONTEXT.md` (Development Timeline — Sprint 5 запись добавлена) |
| Процесс (фазы спринта) | `docs/project/Dev-Cycle.md` |
| Правила поведения обоих инстансов | `CLAUDE.md` |
| Последний завершённый sprint phase | `docs/project/sprint-report-5.md` + `sprint-5-fix-report.md` |
| Code review Sprint 5 | `docs/project/code-review-sprint-5.md` |
| Тест-кейсы Sprint 5 (P-2..P-7 + UX-RENAME + round-trip) | `docs/project/test-cases-sprint-5.md` |
| Polish-pack (закрыт в Sprint 5) | `docs/project/polish-pack.md` |

---

## Что делать дальше (для следующего инстанса)

**Прямо сейчас:**

1. Commit Cowork-зоны batch'ем — два логических батча или один:
   - Sprint 5 CLOSE: FLOW.md / concept.md / JTBD / CONTEXT.md / PROJECT_STATUS.md / decisions-log.md (ADR-012 Accepted) / sprint-5-prompt.md / sprint-5-fix-prompt.md / code-review-sprint-5.md / test-cases-sprint-5.md.
   - ADR-013 batch (этот): decisions-log.md (ADR-013 Accepted + ADR-005/012 superseded) / FLOW.md (4 шага) / concept.md / JTBD §7 (объединённый) + §9 перенумерация / PROJECT_STATUS.md (новый roadmap).
   - Удобнее в один — один commit message с двумя секциями.

2. Push main → GitHub Actions деплоит на GitHub Pages (Stepper labels Sprint 5 уже на проде — структурный переход на 4 шага в Sprint 7).

**Затем — Sprint 6 PLAN (Data Peek):**

3. **PLAN-фаза Sprint 6 совместно с пользователем** — обсудить детали скоупа Data Peek (см. `JTBD.md §4`):
   - **Где** в флоу Data Peek? После Q08 (sample size display) как опциональный шаг, или как сабшаг внутри Q05/Q07?
   - **CSV upload:** какие колонки ожидаем? `variant`, `<metric_column>` обязательно; для ratio — `numerator`/`denominator` опционально. Парсинг через papaparse.
   - **Calculator:** для proportion — baseline уже в Q05, calculator не нужен. Для continuous — поле σ. Для ratio — μN, μD, Var(N), Var(D), Cov(N,D). Для count — λ (Poisson). UI — отдельная карточка под Q07/Q08?
   - **Какие выходы:** запись обратно в state.brief (новые поля σ/cov/μ для каждого metric_type)? Или отдельная структура state.brief.data_peek?
   - **Sample size display после Data Peek:** убирается warning «bootstrap fallback», показывается точная цифра. Какой UI feedback пользователю, что Data Peek был применён?

4. **Sprint 6 PROMPT** (Cowork → `sprint-6-prompt.md`) после согласования скоупа.

5. **Sprint 6 main DEV** (Code).

**Sprint 7 PLAN — отдельный разговор позже:**

6. **Open question Sprint 7:** DSL для decision_rules в Шаге 4. Варианты: (а) минимальный детерминированный парсер text-правил из брифа → автоматически отмечает «правило сработало» на основе введённых чисел → генерирует параграф в readout.md; (б) копируем правила как текст + пользователь сам отмечает галочкой какие сработали + dropdown SHIP/ITERATE/KILL. Не блокирует Sprint 6.

---

## Открытые продуктовые вопросы

Зафиксированы в обсуждении, требуют решения:

1. **DSL для decision_rules в Шаге 4 (Sprint 7, не Sprint 6).** Пользователь в брифе пишет правила свободным текстом (например, `«если CI нижняя > 0 → SHIP»`). Для генерации параграфа «Recommended next step» в readout.md нужен либо детерминированный мини-парсер этих строк (фрагильно), либо чек-боксы пользователя «правило сработало» (проще, надёжнее, требует ручного клика). Решаем в Sprint 7 PLAN.
2. **Data Peek scope (Sprint 6).** CSV upload + ручной calculator — оба пути (подтверждено в обсуждении 2026-05-28). Детали (где в флоу, формат calculator-поля по metric_type, обратная запись в state) — в Sprint 6 PLAN.
3. **Methodology + tutorial структура.** Три уровня (тур / demo / methodology reference) + явный tutorial «как использовать decision_rules в ноутбуке для пост-анализа» (новый акцент после ADR-013). JTBD §9. Sprint 8.
4. **`editedExternally` UI badge (LoadedBadge)** — реализован, поведение зафиксировано в ADR-006 consequences. Может быть переосмыслен по обратной связи реальных пользователей.
