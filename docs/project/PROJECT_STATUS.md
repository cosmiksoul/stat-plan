# Project Status — stat·plan

**Обновлено:** 2026-05-28 (CLOSE Sprint 3)
**Назначение:** оперативный снимок проекта. Для пользователя или следующего инстанса Cowork — быстро войти в контекст. Обновляется в фазе CLOSE каждого спринта.

---

## Где мы сейчас

**Sprint 3 закрыт.** Полный value loop «бриф → sample size → тест-план → утверждение» работает локально. После push'а Cowork-batch'а едет на продакшен (`https://cosmiksoul.github.io/stat-plan/`). Следующий шаг — PLAN-фаза Sprint 4 (Шаг 3 «Конструктор ноутбука» по roadmap).

| Sprint | Type | Status | Active time | Wall-clock |
|---|---|---|---|---|
| 1 | Code | Closed | 51 мин | 51 мин |
| 2 | Code + FIX | Closed | ~2.5 ч | ~1 день |
| 3 | Code + FIX | Closed | ~3.5 ч | 12 дней (пауза между TEST PREP и QA) |
| 4 | Code | Planning | — | — |
| 5-8 | — | Roadmap до v1 | ~13-18 ч (план) | — |

---

## Что реально работает в продукте (после push Sprint 3)

**Стартовый экран** с развилкой («Начать с брифа» / «У меня уже есть план»). Drag-and-drop карточка показывает заглушку (парсер test_plan.md — Sprint 7).

**Степпер на 5 шагов:** реактивный. Шаг 1 всегда доступен. Шаг 2 unlocked после `briefSubmitted`. Шаг 3 unlocked после `approved`. Шаги 4-5 hard locked до своих спринтов. Все unlocked шаги кликабельны через мышь и клавиатуру.

**Шаг 1 «Бриф» — полностью функционален:**
- 10 вопросов с soft-валидацией
- Парсер 4 слотов гипотезы с Unicode boundaries (16 unit-тестов)
- Динамические guardrails с карточками-предложениями
- Advanced параметры (collapsible, 6 полей: α, power, two-sided, variance reduction, stratification, holdback). **В approved-режиме disabled, но раскрытие работает** (можно посмотреть значения).
- Реактивная карта вопросов с кликами, статусами (✓/→/·), inline preview через ▸/▾
- Реактивный progress-bar N/10
- Defaults для Q10 decision rules подставляются через reducer-action `applyEnterDefaults`
- **Реактивный sample size display под Q08:** sample/arm + длительность + test_method + inline warnings (MW, bootstrap, CV=1 fallback, edge cases)
- **MDE direction** автоматически derived из глагола гипотезы (вырастет/упадёт/изменится)
- В approved-режиме весь бриф (включая AdvancedParams) — readonly; сверху accent-баннер «План утверждён» с ссылкой на step 2

**Шаг 2 «Тест-план»:**
- Preview сгенерированного `test_plan.md` слева (YAML frontmatter + markdown-секции)
- ScoringCard справа: общий скор N/100 + breakdown по 4 группам (полнота гипотезы / полнота дизайна / методологическая консистентность / data peek) + конкретные remarks с severity
- StatusBadge сверху (Draft / Approved)
- Кнопки: «Скачать test_plan.md» (Blob URL), «Утвердить план» (только draft), «Вернуть в черновик» с ConfirmDialog (только approved), «Загрузить отредактированный» — placeholder до Sprint 7

**Шаг 3** — placeholder «Конструктор ноутбука будет в Sprint 4».
**Шаги 4-5** — locked.

**Persistence:** localStorage ключ `stat-plan:v1:state`, версионированный. Persist whitelist: `started`, `brief` (без UI-полей), `plan` (без `derived`/`score` — пересчитываются на mount). На reload — `RECOMPUTE_PLAN` восполняет производные.

**Restart:** «↺ Начать сначала» в шапке (виден когда `started`) → ConfirmDialog → `clearState()` + `RESET_STATE` + navigate to `/`.

**Тестов в проекте:** 147/147 зелёных. Build чистый. JS ~310KB (gzip ~96KB), CSS ~26KB (gzip ~6KB).

---

## Стек

React 19 + Vite 8 + Tailwind v4 + react-router-dom v7 HashRouter + Vitest 4. Деплой: GitHub Pages через GitHub Actions из `main`. См. ADR-010. Никаких новых npm-зависимостей со Sprint 1.

---

## Принятые решения (важные для будущего)

1. **CLAUDE.md правило P-1 — Зоны коммитов:**
   - Code → `src/`, `tests/`, `public/`, `package*.json`, build configs, `.github/workflows/`, `index.html`, **плюс** `sprint-report-N.md` и `sprint-N-fix-report.md` (его отчёты).
   - Cowork → `docs/`, `CLAUDE.md`, `README.md`, `.gitignore`, `.gitattributes`, `mockups/`.
   - Build configs — Code-зона с одним исключением: Cowork может править для целей вне application-кода (например `server.watch.ignored`).

2. **`.gitattributes` `* text=auto eol=lf`** + **`core.autocrlf=false`** — все line endings нормализованы к LF.

3. **`vite.config.js` `server.watch.ignored`** включает `docs/**`, `mockups/**`, `tests/**` — Vite dev server не реагирует на правки документации.

4. **Архитектурное правило:** `src/lib/**` не импортирует React. Чистая логика тестируется отдельно. Парсер test_plan.md в Sprint 7 будет читать ту же state shape, которую сейчас заполняют UI компоненты и которую сейчас рендерит `lib/plan/render.js`.

5. **`?raw` import шаблонов** через Vite — используется для `templates/test_plan.md.tmpl`. Простая `String.prototype.replace` вместо template-движка.

6. **YAML вручную** через `yamlScalar()` с JSON-style эскейпом (валидный YAML принимает JSON-style строки). Inline snapshot test защищает формат от регрессии. Парсер Sprint 7 будет использовать `js-yaml` или собственный — но render останется без зависимостей.

7. **`editedExternally: false` в `state.plan`** — зарезервировано под Sprint 7. Persist'ится для forward-compatibility.

8. **`stat-plan:v1:state`** — версионированный ключ localStorage. При структурных изменениях state shape — bump v1 → v2 + миграция.

9. **Defaults вопросов** через **reducer-action `applyEnterDefaults`** (вызывается из `GOTO_QUESTION`), не через `useEffect`. Унифицирует наполнение state — парсер Sprint 7 будет использовать тот же путь.

---

## Sprint 3 итоги (для метрик)

| Метрика | Значение |
|---|---|
| User stories `[x]` в Sprint 3 | 12 (полностью) + 3 `[~]` (частично, остаток ждёт Sprint 5/7) |
| Bugs в QA | 1 (BUG-1 Medium AdvancedParams, был known из code review) — закрыт в FIX |
| Unit-тестов добавлено | 100 (новые: direction 12, sample-size 30, scoring 22, render 12, storage 12, reducer 12). **Всего: 147/147 pass.** |
| Tech debt накоплен | 2 (`editedExternally` зарезервированное поле, Case 2 в SAMPLE_SIZE_CALC) |
| Tech debt закрыт | 0 |
| Новых npm-зависимостей | 0 |
| Файлов создано | 19 (5 lib-модулей, 5 plan-компонентов, 2 страницы, 6 тест-файлов, 1 шаблон) |
| Active time | ~3.5 ч |
| Wall-clock | 12 дней (с паузой 2026-05-16 → 2026-05-28) |

**Velocity baseline:** Sprint 1 = 51 мин (каркас), Sprint 2 = ~2.5 ч (полный бриф + FIX), Sprint 3 = ~3.5 ч active (×2 объём — формулы, тесты, plan UI, persistence). Sprint 4 ожидается короче (UI сборка ipynb проще, чем статистические формулы).

---

## Roadmap до v1

Цель: full-functionality v1 со всеми 5 шагами флоу + парсером загружаемых планов + methodology разделом. Релизим только в полном объёме.

| # | Скоуп | Wall-clock (active) | QA-стратегия | Главный риск |
|---|---|---|---|---|
| ~~**Sprint 3**~~ | ~~Sample size + Шаг 2 + localStorage + restart~~ | ~~Done — ~3.5 ч~~ | ~~Smoke 15 кейсов~~ | ~~Закрыт~~ |
| **Sprint 4** (next) | Шаг 3 «Конструктор ноутбука» — ipynb template cells, toggling UI, demo CSV (4 файла под metric_type), schema rendering | ~3-4 ч | Smoke 8-12 кейсов — логика простая, юнит-тесты сборки покрывают | Сборка `.ipynb` JSON правильно для всех toggle-комбинаций |
| **Sprint 5** | Шаг 4 «Анализ» — CSV parse (papaparse), independent recalc, SRM, novelty, recharts графики, PNG/PDF export | ~4-5 ч | **Полный QA** (статистика + новые либы) | Самый рисковый: 3+ новые npm-зависимости (papaparse, recharts, html2pdf/jspdf), CSV edge cases |
| **Sprint 6** | Шаг 5 «Read-out» — readout.md шаблон, JSZip bundle, copy markdown-index | ~2-3 ч | Smoke 6-8 кейсов | Корректность zip-сборки на больших артефактах |
| **Sprint 7** | Парсер `test_plan.md` (js-yaml) — drag-drop восстановление state, roundtrip validation | ~3-4 ч | Полный QA (roundtrip с разными конфигурациями) | Roundtrip: render → save → load → identical state. Snapshot из Sprint 3 — cross-check. |
| **Sprint 8** | Methodology раздел `/#/methodology` (§10 JTBD, 6 stories) + click→file picker + @fontsource swap + a11y/mobile audit | ~4-5 ч | Smoke + content review | Корректность объяснений статистических концепций |

**Итого осталось до v1:** ~16-21 ч active (медиана ~18 ч). За 2-3 фокус-дня реалистично.

**Sprint 7 — архитектурно важен.** Snapshot test из Sprint 3 render.js (inline в `tests/lib/plan/render.test.js`) — это контракт, по которому парсер Sprint 7 будет читать MD обратно. Roundtrip-тест в Sprint 7 будет сверяться с этим snapshot'ом.

---

## Состояние repo после CLOSE Sprint 3 (на момент этого update)

- **HEAD** — будущий Cowork CLOSE-коммит (после этого update + остальных правок).
- **Code-зона коммиты Sprint 3** (6 шт., все локально, готовы к push):
  - `8a6529d` feat(sprint-3): plan computation core
  - `43f5bd6` feat(sprint-3): state.plan + actions + storage
  - `3ee186e` feat(sprint-3): step 2 PlanPage UI + approve/readonly + restart
  - `64e7278` docs(sprint-3): report
  - `fb51658` fix(sprint-3): disable AdvancedParams in approved-mode brief
  - `b8facb8` docs(sprint-3): add fix-phase report
- **Cowork-зона коммит** (формируется одним batch'ем): code-review-sprint-3.md + test-cases-sprint-3.md + sprint-3-fix-prompt.md + SAMPLE_SIZE_CALC.md правка + JTBD.md + CONTEXT.md + PROJECT_STATUS.md + Dev-Cycle.md (таблица текущего состояния).
- После push (10 коммитов суммарно с CLOSE Sprint 2 push'ем — у нас в локали накопилось) origin/main сравняется с локальным HEAD.

---

## Где искать что

| Хочешь узнать | Где смотри |
|---|---|
| Концепция, для кого делаем | `docs/context/concept.md` |
| Стек, структура папок | `docs/context/ARCHITECTURE.md` |
| Все ADR | `docs/context/decisions-log.md` |
| Backlog с чекбоксами | `docs/project/JTBD.md` |
| История проекта по спринтам | `docs/project/CONTEXT.md` (Development Timeline) |
| Процесс (фазы спринта) | `docs/project/Dev-Cycle.md` |
| Правила поведения обоих инстансов | `CLAUDE.md` |
| Последний завершённый спринт | `docs/project/sprint-report-3.md` + `sprint-3-fix-report.md` |
| Snapshot test test_plan.md (контракт для Sprint 7) | `tests/lib/plan/render.test.js` |

---

## Что делать дальше

После push'а — PLAN Sprint 4. Cowork предложит вариант скоупа под Шаг 3 (конструктор ноутбука) с trade-off'ами. Пользователь выбирает. Cowork пишет `sprint-4-prompt.md`. Дальше — обычный 9-фазный цикл.

**Ключевой вопрос для PLAN Sprint 4:**
- Берём ли мы в Sprint 4 только UI конструктора + demo-csv (3-4 ч), или сразу с генерацией реального .ipynb JSON (4-5 ч)? Это решит размер спринта.
