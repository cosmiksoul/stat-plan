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
| 3 | Code | DEV в работе у Claude Code | ~3-5 ч (план) |
| 4-8 | — | Запланированы (см. Roadmap до v1 ниже) | ~16-23 ч (план) |

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

## Roadmap до v1

Цель: full-functionality v1 со всеми 5 шагами флоу + парсером загружаемых планов + methodology разделом. Пользователь зафиксировал «релизим только в полном объёме».

| # | Скоуп | Wall-clock | QA-стратегия | Главный риск |
|---|---|---|---|---|
| **Sprint 3** (в работе) | Sample size + Шаг 2 (preview + scoring + approve) + localStorage + restart | ~3-5 ч | Полный QA (статистика критична) | Sample size формулы — нужны точные test cases из SAMPLE_SIZE_CALC.md |
| **Sprint 4** | Шаг 3 «Конструктор ноутбука» — ipynb template cells, toggling UI, demo CSV (4 файла под metric_type), schema rendering | ~3-4 ч | **Smoke 8-12 кейсов** — логика простая, юнит-тесты ipynb-сборки покрывают | Сборка `.ipynb` JSON правильно для всех toggle-комбинаций |
| **Sprint 5** | Шаг 4 «Анализ» — CSV parse (papaparse), independent recalc, SRM, novelty, recharts графики, PNG/PDF export | ~4-5 ч | Полный QA (статистика + новые либы) | Самый рисковый: 3+ новые npm-зависимости (papaparse, recharts, html2pdf/jspdf), CSV edge cases |
| **Sprint 6** | Шаг 5 «Read-out» — readout.md шаблон, JSZip bundle, copy markdown-index | ~2-3 ч | **Smoke 6-8 кейсов** — простая склейка артефактов | Корректность zip-сборки на больших артефактах |
| **Sprint 7** | Парсер `test_plan.md` (js-yaml) — drag-drop восстановление state, roundtrip validation | ~3-4 ч | Полный QA (roundtrip с разными конфигурациями) | Roundtrip: render → save → load → должен дать identical state |
| **Sprint 8** | Methodology раздел `/#/methodology` (§10 JTBD, 6 stories) + click→file picker + @fontsource swap + a11y/mobile audit | ~4-5 ч | **Smoke + content review** — раздел типа Content sprint | Корректность объяснений статистических концепций |

**Итого до v1:** ~19-26 ч wall-clock (медиана ~22 ч). За 2-3 фокус-дня реалистично, при условии что Sprint 5 не уйдёт в 1-2 FIX-итерации.

**Smoke QA в Sprint 4, 6, 8:** 6-12 ключевых кейсов вместо 60-70 кейсов полного pass. Делается в браузере за 10-15 минут. Если smoke зелёный — закрываем спринт без full pass. Решение совместное на CLOSE Sprint 2.

**Sprint 7 — архитектурно важен.** Парсер `test_plan.md` это roundtrip-критичный кусок (если он ломается — артефакты теряются). Sprint 3 должен **строго** соблюдать схему DATA_MODEL.md в render.js — это контракт, по которому Sprint 7 будет читать обратно.

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