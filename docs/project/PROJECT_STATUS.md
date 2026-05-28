# Project Status — stat·plan

**Обновлено:** 2026-05-28 (Sprint 5 ЗАКРЫТ полностью — main + FIX iter 1 + Cowork CLOSE)
**Назначение:** оперативный снимок проекта. Для пользователя или следующего инстанса Cowork — быстро войти в контекст.

---

## Где мы сейчас

**Sprint 5 ЗАКРЫТ полностью** (main + FIX iter 1 + Cowork CLOSE). 6 пунктов polish-pack (P-2..P-7) + UX-RENAME labels Шагов 04/05 + 4 concerns из code review (C-1..C-4) — всё закрыто. **267 тестов зелёных** (249 → 266 в main → 267 после FIX iter 1: +2 новых, −1 zombie). Bundle **401.17 KB raw / 124.93 KB gzip** (net +1.37 KB vs Sprint 4 FIX iter 2). Round-trip контракт ADR-002 — **5/5 canonical case** (4 из Sprint 4 + 1 новый C-2 для empty `metric_column` через P-7 heuristic).

**ADR-012 финализирован Accepted 2026-05-28** перед началом Sprint 5 в диалоге Cowork ↔ пользователь. Architecture sprint не понадобился — accept в PLAN + concept rewrite в CLOSE Sprint 5 закрывает то же. UX-RENAME labels уже в Stepper.jsx (Code-зона); FLOW.md / concept.md / JTBD §7-§8 переписаны под новый Шаг 4 «Быстрая валидация» в Sprint 5 CLOSE (Cowork-зона).

**Следующий спринт — Sprint 6 main: Шаг 4 «Быстрая валидация»** (ручной ввод результатов + SRM/sanity checks + применение decision rules → SHIP/ITERATE/KILL + validation.md; CSV upload — опциональный helper). Скоуп описан в JTBD §7 (переписан в CLOSE Sprint 5).

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
| **6** | **Code main — Шаг 4 «Быстрая валидация»** | **Planned под ADR-012** | ~2-3 ч (план, было 4-5 ч) |
| 7 | Code — Шаг 5 «Скачать артефакты» (JSZip + readout.md) | Planned | ~2-3 ч (план) |
| 8 | Code — Methodology + demo/how-to + a11y/mobile audit | Planned | ~4-5 ч (план) |

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

### ADR-012 — Accepted 2026-05-28: Шаг 4 как «Быстрая валидация» + UX rename

**Контекст:** обсуждение в Sprint 4 RETEST показало, что concept «Шаг 4 = independent validation» — это **circular validation**. Мы пересчитываем теми же формулами, что заложили в ноутбук. Защита от наших ошибок отсутствует.

**Решение:**
- Шаг 4 redesign из «independent validation» в «Быстрая валидация»: SRM check, sanity check, **ручной ввод результатов** (Δ, p, CI, n) + применение decision rules → SHIP/ITERATE/KILL + простые визуализации + validation.md. CSV upload — опциональный helper для автозаполнения полей, **не валидатор**.
- UI rename: 04 «Анализ» → «Быстрая валидация»; 05 «Read-out» → «Скачать артефакты».
- Methodology раздел (Sprint 8) усиливается явным «что мы НЕ делаем».
- Sprint 6 (бывший Sprint 5 main) scope сокращён с ~4-5 ч до ~2-3 ч.
- Roadmap до v1 — с ~16-21 ч до ~10-13 ч active.

**Status:** Accepted и **частично реализован в Sprint 5** — UX-RENAME labels в `Stepper.jsx` (Code) + rewrite `FLOW.md` / `concept.md` / `JTBD §7-§8` (Cowork CLOSE). Полный redesign Шага 4 — Sprint 6 main по новому скоупу JTBD §7.

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

## Roadmap до v1 (актуализирован 2026-05-28 после CLOSE Sprint 5)

1. **Sprint 6 — Шаг 4 «Быстрая валидация»** — ручной ввод результатов (Δ, p, CI, n) + SRM/sanity checks + применение decision rules → SHIP/ITERATE/KILL + простые визуализации + validation.md. CSV upload как опциональный helper для автозаполнения counts по variant. ~2-3 ч. Скоуп описан в `docs/project/JTBD.md §7`.
2. **Sprint 7 — Шаг 5 «Скачать артефакты»** — JSZip bundle (test_plan.md + analysis.ipynb + validation.md + readout.md + опционально CSV) + readout.md generation. ~2-3 ч. Скоуп описан в `docs/project/JTBD.md §8`.
3. **Sprint 8 — Methodology + demo/how-to + a11y/mobile audit.** ~4-5 ч. Скоуп описан в `docs/project/JTBD.md §10`.

Парсер test_plan.md **сделан в Sprint 4** (Phase A) + round-trip восстановлен в Sprint 4 FIX iter 2 + расширен в Sprint 5 FIX iter 1 (5-й canonical case).

**Итого осталось до v1:** ~8-11 ч active. За 1.5-2 фокус-дня реалистично.

---

## Принятые решения, важные для будущего

См. полные ADR в `docs/context/decisions-log.md`. Ключевые:

1. **CLAUDE.md правило P-1** — зоны коммитов Code vs Cowork.
2. **ADR-002** — артефакты как переносимое состояние. Sprint 4 FIX iter 2 закрывает оставшиеся дыры round-trip.
3. **ADR-006** — approved заморожен. `RETURN_PLAN_TO_DRAFT` сбрасывает notebook_config.
4. **ADR-011** — semantic shift metric_name/metric_label. См. выше. После Sprint 5 P-3/P-6/P-7 + FIX C-2/C-3 — round-trip полностью симметричен (включая fallback case с пустым metric_column).
5. **ADR-012** — Accepted 2026-05-28. Шаг 4 «Быстрая валидация» (без independent CSV validation). UX rename labels уже в Stepper.jsx. Полный redesign Шага 4 — Sprint 6.
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
| Все ADR | `docs/context/decisions-log.md` (включая ADR-011 и ADR-012 Accepted 2026-05-28) |
| Схема YAML test_plan.md | `docs/context/DATA_MODEL.md` |
| Backlog с чекбоксами | `docs/project/JTBD.md` (§7-§8 переписаны в Sprint 5 CLOSE под ADR-012) |
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

1. Commit Cowork-зоны Sprint 5 CLOSE batch'ем (FLOW.md / concept.md / JTBD §7-§8 / CONTEXT.md / PROJECT_STATUS.md / decisions-log.md / sprint-5-prompt.md / sprint-5-fix-prompt.md / code-review-sprint-5.md / test-cases-sprint-5.md / polish-pack.md если правлен). Code-зона коммиты уже в main (Sprint 5 main `8c345fd` + FIX iter 1).

2. Push main → GitHub Actions деплоит на GitHub Pages.

**Затем — Sprint 6 PLAN:**

3. **PLAN-фаза Sprint 6 совместно с пользователем** — обсудить детали скоупа Шага 4 «Быстрая валидация» (см. `JTBD.md §7`):
   - UX-форма ручного ввода (какие поля обязательные, какая валидация, дефолты)
   - DSL для decision_rules (если в брифе пользователь пишет `CI > 0 → SHIP`, как это парсить детерминированно?)
   - Объём CSV helper'а (только counts по variant, или ещё базовый CR/mean preview?)
   - Дизайн `validation.md` шаблона (YAML frontmatter поля; markdown разделы)
   - Простые визуализации — какие именно (точка Δ с CI vs 0; столбики counts; что-то ещё?)

4. **Sprint 6 PROMPT** (Cowork → `sprint-6-prompt.md`) после согласования скоупа.

5. **Sprint 6 main DEV** (Code).

---

## Открытые продуктовые вопросы

Зафиксированы в обсуждении, требуют решения:

1. **DSL для decision_rules в Шаге 4 (Sprint 6).** Пользователь в брифе пишет правила свободным текстом (например, `«если CI нижняя > 0 → SHIP»`). Для применения в Шаге 4 нужен либо детерминированный мини-парсер этих строк, либо переход на структурированный ввод правил в брифе (несовместимо с simplicity ADR-005). Open для обсуждения в Sprint 6 PLAN.
2. **CSV upload helper на Шаге 4 — глубина.** После ADR-012 CSV не валидатор. Минимум — counts по variant для SRM. Открытый вопрос: добавлять ли preview CR/mean по variant (без независимого пересчёта Δ/p/CI)? Решим в Sprint 6 PLAN.
3. **Methodology + demo/how-to структура** — три уровня глубины (тур / demo / methodology reference). JTBD §10 — 6 stories. Sprint 8.
4. **Data peek calculator** для ручного ввода σ/cov (alternative to CSV upload). JTBD §4 ◆ user story. Кандидат на отдельный мини-спринт после Sprint 8.
5. **`editedExternally` UI badge (LoadedBadge)** — реализован, поведение зафиксировано в ADR-006 consequences. Может быть переосмыслен по обратной связи реальных пользователей.
