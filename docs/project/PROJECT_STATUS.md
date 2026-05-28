# Project Status — stat·plan

**Обновлено:** 2026-05-28 (Sprint 5 prompt написан, ADR-012 Accepted, ждём передачу в Code)
**Назначение:** оперативный снимок проекта. Для пользователя или следующего инстанса Cowork — быстро войти в контекст.

---

## Где мы сейчас

**Sprint 4 ЗАКРЫТ полностью** (main + FIX iter 1 + FIX iter 2 + Cowork CLOSE). Round-trip контракт ADR-002 восстановлен в полном объёме. 249 тестов зелёных.

**Sprint 5 — Polish-pack + UX rename Шагов 04/05** (Code mini-sprint). Prompt написан (`docs/project/sprint-5-prompt.md`), готов к передаче в Claude Code. Внутри:
- 6 пунктов polish-pack (P-2..P-7) — Colab-friendly CSV_PATH, filename/header source разделение, inline-warning Q03/Q07, dead code, slugify utility, legacy YAML heuristic для metric_name.
- UX-RENAME labels в `Stepper.jsx` (следствие ADR-012): «04 Анализ» → «Быстрая валидация», «05 Read-out» → «Скачать артефакты». **Только labels.** Полный redesign Шага 4 — Sprint 6.

**ADR-012 Accepted 2026-05-28.** UX-RENAME реализуется в Sprint 5; FLOW.md / concept.md / JTBD §7-§8 переписываются Cowork в Sprint 5 CLOSE; полный redesign Шага 4 («Быстрая валидация» = SRM/sanity + ручной ввод + decision rules → SHIP/ITERATE/KILL + validation.md, без CSV-парсинга как валидатора) — Sprint 6 main.

| Sprint | Type | Status | Active time |
|---|---|---|---|
| 1 | Code | Closed | 51 мин |
| 2 | Code + FIX | Closed | ~2.5 ч |
| 3 | Code + FIX | Closed | ~3.5 ч |
| 4 main | Code (Phase A + B) | Closed | ~3.8 ч |
| 4 FIX iter 1 | Code (Phase A + B + C) | Closed | ~2.5 ч |
| 4 FIX iter 2 | Code | Closed | ~1.5 ч |
| 4 CLOSE | Cowork | Closed | ~40 мин |
| **5** | **Code mini (polish + UX-RENAME)** | **Prompt ready — ждёт передачи Code** | ~1.5-2 ч (план) |
| 5 CLOSE | Cowork (FLOW/concept/JTBD §7-§8 rewrite) | Planned после Code-коммита | ~30-45 мин (план) |
| 6 | Code main — Шаг 4 «Быстрая валидация» | Planned под ADR-012 | ~2-3 ч (план, было 4-5 ч) |
| 7 | Code — Шаг 5 «Скачать артефакты» (JSZip + readout.md) | Planned | ~2-3 ч (план) |
| 8 | Code — Methodology + demo/how-to + a11y/mobile audit | Planned | ~4-5 ч (план) |

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

**Тестов:** 249/249 зелёных (после Sprint 4 FIX iter 2). Sprint 5 prогноз — ~260+.

---

## Архитектурные решения (для следующего инстанса критично понять)

### ADR-011 — Accepted 2026-05-28: Semantic shift metric_name / metric_label

**До:** `YAML.metric_name` = натуральный текст из brief.metric_name (например, «конверсия в первый депозит»). В CSV колонка обычно snake_case латиница → mismatch.

**После:** `YAML.metric_name` = код колонки (snake_case из brief.metric_column). Новое опциональное `YAML.metric_label` = натуральный текст из brief.metric_name.

**Legacy:** старые test_plan.md из Sprint 3/Sprint 4 main → после load полу-сломаны (натуральный текст уходит в `brief.metric_column`, label пуст). Heuristic для legacy — в polish-pack P-7.

**Связано с filename и header (см. polish-pack BUG-8):** в polish-pack будет переключение filename/test_id на metric_column (slug), а header в .ipynb — на metric_name (натуральный).

### ADR-012 — Accepted 2026-05-28: Шаг 4 как «Быстрая валидация» + UX rename

**Контекст:** обсуждение в Sprint 4 RETEST показало, что concept «Шаг 4 = independent validation» — это **circular validation**. Мы пересчитываем теми же формулами, что заложили в ноутбук. Защита от наших ошибок отсутствует.

**Решение:**
- Шаг 4 redesign из «independent validation» в «Быстрая валидация»: SRM check, sanity check, **ручной ввод результатов** (Δ, p, CI, n) + применение decision rules → SHIP/ITERATE/KILL + простые визуализации + validation.md. CSV upload — опциональный helper для автозаполнения полей, **не валидатор**.
- UI rename: 04 «Анализ» → «Быстрая валидация»; 05 «Read-out» → «Скачать артефакты». **Реализуется в Sprint 5** (Stepper.jsx labels).
- Methodology раздел (Sprint 8) усиливается явным «что мы НЕ делаем».
- Sprint 6 (бывший Sprint 5 main) scope сокращён с ~4-5 ч до ~2-3 ч.
- Roadmap до v1 — с ~16-21 ч до ~10-13 ч active.

**Status:** Accepted. UX-RENAME — в Sprint 5 prompt (Code-зона). FLOW.md / concept.md / JTBD §7-§8 переписываются в Sprint 5 CLOSE (Cowork-зона). Полный redesign Шага 4 — Sprint 6 main.

---

## Polish-pack (вошёл в Sprint 5, см. `docs/project/polish-pack.md` и `docs/project/sprint-5-prompt.md`)

6 non-critical fixes (P-1 закрыт в Sprint 4 FIX iter 2 как side-scope) + UX-RENAME labels Шагов 04/05 — суммарно ~1.5-2 ч Code DEV:

| # | Что | Severity |
|---|---|---|
| P-2 | BUG-7: Colab-friendly `CSV_PATH` в load template + инструкция | Low/Medium |
| P-3 | BUG-8: filename/test_id ← metric_column, header ← metric_name + переписать подзаголовок | Low/Medium UX |
| P-4 | inline-warning на Q03/Q07 о приближённости без data peek | Low UX |
| P-5 | dead code `baseline.unit === 'percent'` в notebook-builder | Low |
| P-6 | slugify utility (вынести из duplication в render.js + notebook-builder.js) | Low |
| P-7 | legacy YAML heuristic для metric_name (для backward compat ADR-011) | Low |
| UX-RENAME | Stepper.jsx labels 04 → «Быстрая валидация», 05 → «Скачать артефакты» (ADR-012) | Low |

---

## Стек

React 19 + Vite 8 + Tailwind v4 + react-router-dom v7 HashRouter + Vitest 4 + js-yaml (Sprint 4). Деплой: GitHub Pages через GitHub Actions из `main`. ADR-010 + ADR-011.

---

## Roadmap до v1 (актуализирован 2026-05-28)

1. **Sprint 5 — Polish + UX-RENAME** (prompt готов, ждёт Code). 6 пунктов polish-pack + Stepper labels. ~1.5-2 ч.
2. **Sprint 5 CLOSE** (Cowork) — переписать `FLOW.md` / `concept.md` / `JTBD §7-§8` под Шаг 4 «Быстрая валидация» и Шаг 5 «Скачать артефакты». Обновить tech debt в CONTEXT.md (закрыть закрытые polish-пункты). ~30-45 мин.
3. **Sprint 6 — Шаг 4 «Быстрая валидация»** — ручной ввод результатов (Δ, p, CI, n) + применение decision rules → SHIP/ITERATE/KILL + простые визуализации + validation.md. CSV upload как опциональный helper для автозаполнения. ~2-3 ч.
4. **Sprint 7 — Шаг 5 «Скачать артефакты»** — JSZip bundle + readout.md. ~2-3 ч.
5. **Sprint 8 — Methodology + demo/how-to + a11y/mobile audit.** ~4-5 ч.

Парсер test_plan.md **уже сделан в Sprint 4** (Phase A) — отдельный спринт не нужен. Round-trip контракт восстановлен в Sprint 4 FIX iter 2.

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
| Sprint 5 prompt | `docs/project/sprint-5-prompt.md` ← **передать в Claude Code** |
| Polish-pack (источник 6 пунктов в Sprint 5) | `docs/project/polish-pack.md` |
| Тест-кейсы Sprint 4 (BUG-1..BUG-9 + UX-RENAME) | `docs/project/test-cases-sprint-4.md` |

---

## Что делать дальше (для следующего инстанса)

**Прямо сейчас:**

1. Передать `docs/project/sprint-5-prompt.md` в Claude Code командой:
   > Прочитай `docs/project/sprint-5-prompt.md` и выполни все tasks. Главное — surgical changes; если по дороге заметишь что-то лишнее, флагни в sprint-report-5, не правь молча. Не сломай `tests/lib/plan/round-trip.test.js`.

2. Дождаться отчёта `docs/project/sprint-report-5.md`.

3. **Cowork code review** — прочитать изменения в `parse.js` (P-7 legacy heuristic), `render.js` + `notebook-builder.js` (P-3 + P-6 импорт slugify), `templates/notebook/load.cells.json` (P-2), новый `src/lib/util/slugify.js`, изменения в `QuestionRenderer.jsx`/`SingleSelect.jsx` (P-4), `Stepper.jsx` (UX-RENAME). Особое внимание — round-trip контракт.

4. **Передать пользователю на QA Sprint 5** (smoke ~10 мин по acceptance из sprint-5-prompt.md).

5. **Sprint 5 CLOSE (Cowork-зона):**
   - Переписать `docs/context/FLOW.md` §«Шаг 4», §«Шаг 5» под новый concept (Быстрая валидация / Скачать артефакты).
   - Обновить `docs/context/concept.md` если упомянуты Шаги 4/5.
   - Переписать `docs/project/JTBD.md §7` (Шаг 4) и `§8` (Шаг 5) — user stories под новый scope.
   - Закрыть в CONTEXT.md tech debt пункты, которые ушли в polish-pack (P-5 dead code, P-6 slugify duplication; P-7 legacy heuristic закрывает «полу-сломанный legacy» из ADR-011 consequences).
   - Обновить таблицу спринтов в этом PROJECT_STATUS.md (статус Sprint 5 → Closed, добавить active time).
   - Коммит Cowork-зоны batch'ем + push.

**Затем (по приоритету):**

6. **Sprint 6 PLAN** — Шаг 4 «Быстрая валидация» (Cowork совместно с пользователем).
7. **Sprint 6 main DEV** — Code.

---

## Открытые продуктовые вопросы

Зафиксированы в обсуждении, требуют решения:

1. **Methodology + demo/how-to структура** — три уровня глубины (тур / demo / methodology reference). JTBD §10 — 6 stories + 1 новая для demo. Sprint 8.
2. **Data peek calculator** для ручного ввода σ/cov (alternative to CSV upload). JTBD §4. Sprint 3+.
3. **Inline-warning на Q03/Q07** про приближённость без data peek. JTBD §2. Polish-pack P-4.
4. **`editedExternally` UI badge** — реализован LoadedBadge. Может быть переосмыслен после polish-pack.
5. **Legacy `metric_name` heuristic** — polish-pack P-7. Если не делать — legacy файлы из Sprint 3 «полу-сломаны».
