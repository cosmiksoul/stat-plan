# Project Status — stat·plan

**Обновлено:** 2026-05-16
**Назначение:** оперативный снимок проекта. Для пользователя или следующего инстанса Cowork — быстро войти в контекст. Обновляется по необходимости, не на каждом действии.

---

## Где мы сейчас

**Sprint 2 закрыт.** Бриф работает end-to-end на продакшене: `https://cosmiksoul.github.io/stat-plan/`. Следующий шаг — PLAN-фаза Sprint 3.

| Sprint | Type | Status | Длительность |
|---|---|---|---|
| 1 | Code | Closed | 51 мин |
| 2 | Code + FIX | Closed | ~2.5 ч |
| 3 | — | Ждёт PLAN-фазы | — |

---

## Что реально работает в продукте

**Стартовый экран** с развилкой («Начать с брифа» / «У меня уже есть план»). Drag-and-drop карточка показывает заглушку (парсер test_plan.md — будущий спринт).

**Степпер на 5 шагов** с заблокированными 2-5. Тур-toggle класса в шапке (без плашек самих).

**Шаг 1 «Бриф» — полностью функционален:**
- 10 вопросов с soft-валидацией
- Парсер 4 слотов гипотезы с Unicode boundaries (16 unit-тестов)
- Динамические guardrails с карточками-предложениями
- Advanced параметры (collapsible 6 полей: α, power, two-sided, variance reduction, stratification, holdback)
- Реактивная карта вопросов с кликами, статусами (✓/→/·), inline preview через ▸/▾
- Реактивный progress-bar N/10
- Defaults для Q10 decision rules подставляются через reducer-action `applyEnterDefaults`

**Шаги 2-5** заблокированы, страниц нет — это следующие спринты.

**Тестов в проекте:** 47/47 зелёных. Build чистый. CSS ~5KB gzip, JS ~87KB gzip.

---

## Стек

React 19 + Vite + Tailwind v4 + react-router-dom HashRouter + Vitest. Деплой: GitHub Pages через GitHub Actions из `main`. См. ADR-010.

---

## Принятые решения (важные для будущего)

1. **CLAUDE.md правило P-1** — Зоны коммитов:
   - Code → `src/`, `tests/`, `public/`, `package*.json`, build configs, `.github/workflows/`, `index.html`, **плюс** `sprint-report-N.md` и `sprint-N-fix-report.md` (его отчёты)
   - Cowork → `docs/`, `CLAUDE.md`, `README.md`, `.gitignore`, `.gitattributes`, `mockups/`
   - Build configs (`vite.config.js` и т.п.) — Code-зона с одним исключением: Cowork может править их для целей вне application-кода (например `server.watch.ignored` для UX QA).

2. **`.gitattributes` с `* text=auto eol=lf`** и **`core.autocrlf=false`** — все line endings нормализованы к LF в working tree и в репо.

3. **`vite.config.js` `server.watch.ignored`** включает `docs/**`, `mockups/**`, `tests/**` — Vite dev server не реагирует на правки документации (важно когда параллельно идёт QA и editor в test-cases-*.md).

4. **`.obsidian/` и `.claude/`** в `.gitignore`.

5. **Архитектурное правило:** `src/lib/**` не импортирует React. Чистая логика тестируется отдельно. Парсер test_plan.md в Sprint 5-6 будет читать ту же state shape, которую сейчас заполняют UI компоненты.

6. **Defaults вопросов** подставляются через **reducer-action `applyEnterDefaults`** (вызывается из `GOTO_QUESTION`), не через `useEffect` в компонентах. Это унифицирует наполнение state на будущее (парсер test_plan.md будет использовать тот же путь).

---

## Sprint 2 итоги (для метрик)

| Метрика | Значение |
|---|---|
| User stories `[x]` в Sprint 2 | 19 |
| `[~]` partial | 1 (keyboard hints) |
| Bugs в QA | 3 (1 High BUG-3, 2 Medium BUG-1/2) — все закрыты в FIX |
| Unit-тестов добавлено | 47 (39 + 8 в FIX) |
| Tech debt закрыт | 1 (inline rgba → `@theme` токены) |
| Tech debt накоплен | 3 (`defaultsApplied`, `extractMetricName` re-runs, mobile GuardrailsList) |

**Velocity baseline:** Sprint 1 = 51 мин (каркас), Sprint 2 = ~2.5 ч (полный бриф + FIX). Sprint 3 ожидается ещё дольше — там будут формулы sample size с тестами.

---

## Открытые идеи на стол PLAN Sprint 3

Из JTBD (приоритет обсуждается):

- **Sample size + duration derive** из Q05/Q07/Q08 после Q08. ADR-009 + `SAMPLE_SIZE_CALC.md` фиксируют формулы (z-test, t-test, MW approx, delta method, bootstrap). 7 предопределённых test cases.
- **MDE direction derive из глагола гипотезы** (вырастет → increase, упадёт → decrease). Технически — расширить `parseHypothesis`.
- **localStorage persistence** state'а.
- **«Начать сначала»** в шапке (с confirmation) — критично с localStorage, иначе reload не сбросит.
- **Разблокировка шага 2** (`state.brief.briefSubmitted` + соответствующий unlock UI).
- **Methodology раздел** `/#/methodology` (новая §10 в JTBD — 6 user stories).
- **Sensitivity helper Q07** (MDE × duration slider/таблица). Зависит от sample size calc.
- **Click→file picker** fallback для drag-and-drop карточки.
- **@fontsource swap** (low-priority).
- **Mobile responsive** для GuardrailsList.

Скоуп Sprint 3 — обсуждаем когда дойдём до PLAN.

---

## Состояние repo на момент CLOSE Sprint 2

- HEAD = последний CLOSE-коммит (Cowork CLOSE updates) + 4 предыдущих Sprint 2-связанных коммита от Code
- Working tree = clean (после `git push`)
- Origin/main = главный production, деплой работает
- Все известные баги закрыты, все ADR соблюдены

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
| Последний завершённый спринт | `docs/project/sprint-report-2.md` + `sprint-2-fix-report.md` |

---

## Что делать дальше

Когда пользователь готов — обсуждаем PLAN Sprint 3. Cowork предлагает 3-4 варианта скоупа с trade-off'ами. Пользователь выбирает. Cowork пишет `sprint-3-prompt.md`. Дальше — обычный 9-фазный цикл.