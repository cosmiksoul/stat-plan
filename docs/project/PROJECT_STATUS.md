# Project Status — stat·plan

**Обновлено:** 2026-05-28 (после Sprint 4 RETEST FIX iter 1, перед FIX iter 2)
**Назначение:** оперативный снимок проекта. Для пользователя или следующего инстанса Cowork — быстро войти в контекст.

---

## Где мы сейчас

**Sprint 4 ЗАКРЫТ полностью** (main + FIX iter 1 + FIX iter 2 + Cowork CLOSE). Round-trip контракт ADR-002 восстановлен в полном объёме. RETEST iter 2 — pass (legacy compat + edit-resave + approve flow проверены пользователем на трёх файлах).

**Что лежит в working tree (ждёт коммита + push):**
- Code-зона уже закоммичена (Sprint 4 main 4 коммита + FIX iter 1 3 коммита + LoadedBadge + iter 2 2 коммита = ~10 локальных коммитов).
- Cowork-зона за две сессии: prev batch уже закоммичен, текущий CLOSE-batch (DATA_MODEL обновлён под новые YAML поля + CONTEXT Sprint 4 timeline + tech debt + dispel Edit-bug миф + Dev-Cycle таблица + это PROJECT_STATUS) — modified, ждёт нового коммита.

Перед Sprint 5 main — **Architecture sprint** для accept/reject ADR-012 (Шаг 4 redesign + UX rename) и переписывания FLOW.md/concept.md/JTBD §7/§8. После — **Polish-sprint** (6 пунктов, mini Code DEV).

| Sprint | Type | Status | Active time |
|---|---|---|---|
| 1 | Code | Closed | 51 мин |
| 2 | Code + FIX | Closed | ~2.5 ч |
| 3 | Code + FIX | Closed | ~3.5 ч |
| 4 main | Code (Phase A + B) | Closed | ~3.8 ч |
| 4 FIX iter 1 | Code (Phase A + B + C) | Closed | ~2.5 ч |
| 4 FIX iter 2 | Code | **In flight** | ~1-1.5 ч (план) |
| 4 CLOSE | Cowork | Pending после iter 2 RETEST | ~30-40 мин (план) |
| Polish-sprint | Code mini | Planned после CLOSE Sprint 4 | ~1.5-2 ч (план) |
| Architecture sprint | Cowork + light Code | Planned перед Sprint 5 main | ~1-2 ч (план) |
| 5 main | Code | Re-scoped под ADR-012 | ~2-3 ч (план, было 4-5 ч) |
| 6-8 | — | Roadmap до v1 | ~6-9 ч (план) |

---

## Что реально работает в продукте (после Sprint 4 main + FIX iter 1, перед push iter 2)

**Стартовый экран:** drag-drop + file picker fallback для `test_plan.md`. Парсер с js-yaml. Inline error при битом YAML.

**Степпер на 5 шагов:** реактивный. Шаги 4-5 hard locked.

**Шаг 1 «Бриф»:**
- 10 вопросов с soft-валидацией
- Парсер 4 слотов гипотезы
- Q01 «Другое» → conditional sub-question text input для `goal_description`
- Q04 разделение: «Название» (натуральный текст) и «Колонка в CSV» (snake_case)
- Q06 preselect (Пользователь) принимается как ответ без клика
- Реактивный sample size display под Q08 с inline warnings
- Карта вопросов с правильными ✓ для preselect'ов
- Advanced (alpha, power, two_sided, variance_reduction, stratification_by, holdback_percent) — readonly в approved

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

**Persistence:** localStorage с `stat-plan:v1:state`. Restart кнопка.

**Тестов:** 235/235 зелёных (после FIX iter 1). После iter 2 будет ~245-255.

---

## Текущее состояние Sprint 4 FIX iter 2

**Цель iter 2:** закрыть критический round-trip bug, чтобы test_plan.md действительно был переносимым состоянием (ADR-002).

**Audit — 7 дыр в YAML serialization (в `docs/project/sprint-4-fix-iter2-prompt.md`):**

| Поле | Severity | Что не работает |
|---|---|---|
| `stop_conditions` | HIGH (BUG-9) | Только в markdown, не в YAML |
| `decision_rules` | HIGH (BUG-9) | Только в markdown, не в YAML |
| `ratio_components` | HIGH | Совсем нет в YAML — critical для ratio |
| `cluster_field` | HIGH | Совсем нет — critical для cluster randomization |
| `advanced.two_sided` | Medium | Нет в YAML |
| `goal_type` | HIGH | Нет в YAML; ломает Q01=other восстановление |
| `goal_description` | BUG-9b Medium | Обрезается на ~27 символах |

**Симптом для пользователя:** скачал план со score 80 → загрузил обратно → score 77 (штраф за «Decision rules неполные»). Контракт «test_plan.md = переносимое состояние» нарушен.

**После iter 2 RETEST:** короткий round-trip test (повтор Run 1+2) → если score одинаковый — закрываем Sprint 4.

---

## Архитектурные решения (для следующего инстанса критично понять)

### ADR-011 — Accepted 2026-05-28: Semantic shift metric_name / metric_label

**До:** `YAML.metric_name` = натуральный текст из brief.metric_name (например, «конверсия в первый депозит»). В CSV колонка обычно snake_case латиница → mismatch.

**После:** `YAML.metric_name` = код колонки (snake_case из brief.metric_column). Новое опциональное `YAML.metric_label` = натуральный текст из brief.metric_name.

**Legacy:** старые test_plan.md из Sprint 3/Sprint 4 main → после load полу-сломаны (натуральный текст уходит в `brief.metric_column`, label пуст). Heuristic для legacy — в polish-pack P-7.

**Связано с filename и header (см. polish-pack BUG-8):** в polish-pack будет переключение filename/test_id на metric_column (slug), а header в .ipynb — на metric_name (натуральный).

### ADR-012 — Draft 2026-05-28: Шаг 4 как «Быстрая валидация» + UX rename

**Контекст:** обсуждение в Sprint 4 RETEST показало, что concept «Шаг 4 = independent validation» — это **circular validation**. Мы пересчитываем теми же формулами, что заложили в ноутбук. Защита от наших ошибок отсутствует.

**Решение (proposed):**
- Шаг 4 redesign из «independent validation» в «Быстрая валидация»: SRM check, sanity check, **ручной ввод результатов** (Δ, p, CI, n) + применение decision rules + простые визуализации + validation.md. Без полного CSV-парсинга.
- UI rename: 04 «Анализ» → «Быстрая валидация»; 05 «Read-out» → «Скачать артефакты»
- Methodology раздел (Sprint 8) усиливается явным «что мы НЕ делаем»
- Sprint 5 scope сокращается с ~4-5 ч до ~2-3 ч
- Roadmap до v1 — с ~16-21 ч до ~10-13 ч active

**Status:** не Accepted. Требует обсуждения в Architecture sprint перед Sprint 5 main.

---

## Polish-pack (для отдельного mini-sprint, см. `docs/project/polish-pack.md`)

7 non-critical fixes (~1.5-2 ч Code DEV):

| # | Что | Severity |
|---|---|---|
| P-1 | BUG-6: sticky bottom step 2 controls (mirror step 3) | Medium UX |
| P-2 | BUG-7: Colab-friendly `CSV_PATH` в load template + инструкция | Low/Medium |
| P-3 | BUG-8: filename ← metric_column, header ← metric_name + переписать подзаголовок | Low/Medium UX |
| P-4 | inline-warning на Q03/Q07 о приближённости без data peek | Low UX |
| P-5 | dead code `baseline.unit === 'percent'` в notebook-builder | Low |
| P-6 | slugify utility (вынести из duplication в render.js + notebook-builder.js) | Low |
| P-7 | legacy YAML heuristic для metric_name (для backward compat ADR-011) | Low |

UX-RENAME (Шагов 04/05) — **не часть polish-pack**, требует accept ADR-012 в Architecture sprint.

---

## Стек

React 19 + Vite 8 + Tailwind v4 + react-router-dom v7 HashRouter + Vitest 4 + js-yaml (Sprint 4). Деплой: GitHub Pages через GitHub Actions из `main`. ADR-010 + ADR-011.

---

## Roadmap до v1 (актуализирован 2026-05-28)

1. **Sprint 4 FIX iter 2** (in flight) — round-trip repair. ~1-1.5 ч.
2. **Sprint 4 RETEST iter 2** — короткий браузерный smoke + round-trip Run 1+2. ~10 мин.
3. **Sprint 4 CLOSE** — обновить DATA_MODEL.md (metric_label, goal_description, ratio_*, cluster_field, two_sided, stop/decision YAML), JTBD финализировать, CONTEXT.md Sprint 4 timeline + dispel Edit-bug миф, Dev-Cycle.md таблица. Коммит Cowork-зоны + push.
4. **Polish-sprint** (отдельный mini Code sprint) — 7 пунктов из polish-pack. ~1.5-2 ч.
5. **Architecture sprint** (Cowork + light Code) — accept/reject ADR-012, переписать FLOW.md/concept.md/JTBD §7-§8, UX rename Stepper.jsx. ~1-2 ч.
6. **Sprint 5 main** под новый scope ADR-012 — Шаг 4 «Быстрая валидация» (ручной ввод + decision rules применение + простые визуализации + validation.md). ~2-3 ч (было 4-5 ч).
7. **Sprint 6** — Шаг 5 «Скачать артефакты» (JSZip bundle + readout.md). ~2-3 ч.
8. **Sprint 8** — Methodology раздел + demo/how-to + a11y/mobile audit. ~4-5 ч.

Sprint 7 (парсер test_plan.md) **уже сделан в Sprint 4** — отдельный спринт не нужен. После FIX iter 2 — round-trip полный.

**Итого осталось до v1:** ~10-13 ч active. За 2 фокус-дня реалистично.

---

## Принятые решения, важные для будущего

См. полные ADR в `docs/context/decisions-log.md`. Ключевые:

1. **CLAUDE.md правило P-1** — зоны коммитов Code vs Cowork.
2. **ADR-002** — артефакты как переносимое состояние. Sprint 4 FIX iter 2 закрывает оставшиеся дыры round-trip.
3. **ADR-006** — approved заморожен. `RETURN_PLAN_TO_DRAFT` сбрасывает notebook_config.
4. **ADR-011** — semantic shift metric_name/metric_label. См. выше.
5. **ADR-012 draft** — Шаг 4 redesign. См. выше.
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
| Все ADR | `docs/context/decisions-log.md` (включая ADR-011 Accepted и ADR-012 Draft 2026-05-28) |
| Схема YAML test_plan.md | `docs/context/DATA_MODEL.md` (требует обновления в CLOSE Sprint 4 под новые поля) |
| Backlog с чекбоксами | `docs/project/JTBD.md` |
| История проекта по спринтам | `docs/project/CONTEXT.md` (Development Timeline) — обновится в CLOSE Sprint 4 |
| Процесс (фазы спринта) | `docs/project/Dev-Cycle.md` |
| Правила поведения обоих инстансов | `CLAUDE.md` |
| Последний завершённый sprint phase | `docs/project/sprint-report-4.md` + `sprint-4-fix-report.md` |
| Sprint 4 FIX iter 2 prompt | `docs/project/sprint-4-fix-iter2-prompt.md` ← **передать в Claude Code** |
| Polish-pack (mini-sprint после CLOSE) | `docs/project/polish-pack.md` |
| Тест-кейсы Sprint 4 (BUG-1..BUG-9 + UX-RENAME) | `docs/project/test-cases-sprint-4.md` |

---

## Что делать дальше (для следующего инстанса)

**Прямо сейчас:**

1. Передать `docs/project/sprint-4-fix-iter2-prompt.md` в Claude Code командой:
   > Прочитай `docs/project/sprint-4-fix-iter2-prompt.md` и выполни все tasks. Особо аккуратно с BUG-9b — расследуй root cause goal_description truncation.

2. Дождаться отчёта `docs/project/sprint-4-fix-iter2-report.md`.

3. **Cowork верификация** — прочитать изменения в `render.js`, `parse.js`, `templates/test_plan.md.tmpl`, новые тесты. Особенно `round-trip.test.js` (новый).

4. **Передать пользователю на RETEST iter 2:**
   - Run 1: fresh бриф (сценарий «S4+S5 mix» из `docs/project/notebook-scenarios-sprint-4.md` или похожий, главное — кастомные decision_rules, ratio + numerator/denominator, cluster, goal_type=other с длинным описанием).
   - Run 2: drag-drop того же файла.
   - **Ожидание:** score одинаковый, decision_rules восстановлены, goal_description полностью.

5. **CLOSE Sprint 4** — обновить DATA_MODEL.md, JTBD финализировать (после восстановления replace_all катастрофы — см. inline пометки в JTBD), CONTEXT.md (Sprint 4 timeline + dispel Edit-bug миф из Recurring questions), Dev-Cycle.md таблица.

6. **Cowork-коммит batch'ем** + push.

7. **После push:** обсудить с пользователем Architecture sprint — ADR-012 accept или reject?

**Затем (по приоритету):**

8. **Architecture sprint** (если ADR-012 accepted) — переписать FLOW.md/concept.md/JTBD §7-§8 под новый Шаг 4 «Быстрая валидация», UX rename Stepper.jsx.
9. **Polish-sprint** (отдельный mini Code) — 7 пунктов polish-pack.
10. **Sprint 5 main** — Шаг 4 redesigned.

---

## Открытые продуктовые вопросы

Зафиксированы в обсуждении, требуют решения:

1. **Methodology + demo/how-to структура** — три уровня глубины (тур / demo / methodology reference). JTBD §10 — 6 stories + 1 новая для demo. Sprint 8.
2. **Data peek calculator** для ручного ввода σ/cov (alternative to CSV upload). JTBD §4. Sprint 3+.
3. **Inline-warning на Q03/Q07** про приближённость без data peek. JTBD §2. Polish-pack P-4.
4. **`editedExternally` UI badge** — реализован LoadedBadge. Может быть переосмыслен после polish-pack.
5. **Legacy `metric_name` heuristic** — polish-pack P-7. Если не делать — legacy файлы из Sprint 3 «полу-сломаны».
