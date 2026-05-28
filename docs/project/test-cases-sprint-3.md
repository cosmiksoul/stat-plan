# Test Cases Sprint 3 — Smoke QA

**Дата подготовки:** 2026-05-16
**Тестируемый URL:** `https://cosmiksoul.github.io/stat-plan/` (после push)
**Локально:** `http://localhost:5173/stat-plan/` после `npm run dev`
**Стратегия:** Smoke — 15 ключевых кейсов вместо полного pass'а. Цель — за ~15-20 минут убедиться что happy path работает и что-то критичное не сломалось. Если smoke зелёный — закрываем спринт.

---

## Как пользоваться

1. Заполняешь статусы: `ok` / `bug` / `skip`.
2. Если `bug` — описываешь в Bugs found ниже.
3. **BUG-1 заранее зафиксирован** (AdvancedParams не disabled в approved) — это из code review Concern #2, будет в fix-prompt.

---

## Smoke тесты

### Sample size — точность формул (4 кейса)

| #   | Test Case                                                                                     | Expected                                                                                                                                                                                                                   | Status |
| --- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Q03=«Конверсия / proportion», Q05=3.1%, Q07=8% rel, Q08=42000. Display под Q08.               | `Sample size: ~79 620 / arm · Длительность: ~4 дня · Метод: z_test_proportions`. Без warning'а (z-test exact).                                                                                                             | +      |
| 2   | Q03=«Средняя величина» (= continuous), Q05=100, Q07=5% rel, Q08=любой. Display под Q08.       | `Sample size: ~6 280 / arm` (t-test с CV=1 fallback — σ=baseline=100, потому что data peek будет в Sprint 4) + warning «σ метрики неизвестна, fallback CV=1». **Sample size НЕ зависит от Q08 (только duration зависит).** | +      |
| 3   | Реактивность: case 1 → раскрыть advanced → α=0.01                                             | Sample size **увеличивается реактивно** при изменении α.                                                                                                                                                                   | +      |
| 4   | Гипотеза с глаголом «упадёт». Открыть test_plan.md preview на шаге 2 → найти `mde.direction`. | `mde.direction: decrease` (auto-derived).                                                                                                                                                                                  | +      |

### Step 2 — генерация и approve (5 кейсов)

| #   | Test Case                                  | Expected                                                                                                                                                                                                                                                       | Status |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 5   | Заполнить полный бриф → «Завершить» на Q10 | Переход на `/#/step2`. Виден layout: md preview слева, ScoringCard справа, StatusBadge `Draft`.                                                                                                                                                                | +      |
| 6   | Content test_plan.md в preview             | Видны секции: YAML frontmatter (test_id, status: draft, baseline, mde, sample_size_per_arm, test_method и т.д.), `## Hypothesis`, `## Guardrails`, `## Stop conditions`, `## Decision rules`. Скачивание (кнопка «Скачать») открывает download корректного md. | +      |
| 7   | ScoringCard: total + 4 группы + remarks    | Виден общий скор (например 78/100), breakdown по 4 группам, конкретные replies с severity (info/warn/critical).                                                                                                                                                | +      |
| 8   | Нажать «Утвердить план»                    | StatusBadge → `Approved ✓`. Шаг 3 в степпере unlocked. Кликнуть step 3 — переход на `/#/step3` с placeholder.                                                                                                                                                  | +      |
| 9   | «Вернуть в черновик» → ConfirmDialog → OK  | Status → `Draft`. Шаг 3 снова locked. Бриф снова editable (кроме известного BUG-1).                                                                                                                                                                            | +      |

### Persistence + Reset (3 кейса)

| #   | Test Case                                                | Expected                                                                                                     | Status |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| 10  | Заполнить Q01-Q05 → F5 (reload)                          | После reload state восстановлен, ответы видны. DevTools → Local Storage → `stat-plan:v1:state` присутствует. | +      |
| 11  | Утвердить план → F5                                      | После reload status=approved сохранён. Бриф readonly.                                                        | +      |
| 12  | Кликнуть «↺ Начать сначала» в шапке → ConfirmDialog → OK | state сброшен, localStorage очищен, редирект на `/#/`. Стартовый экран.                                      | +      |

### Approved readonly — известный bug check (1 кейс)

| #   | Test Case                                                                     | Expected                                                                                                                                        | Status |
| --- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 13  | Утвердить план → перейти на `/#/step1` (бриф) → проверить какие поля disabled | Все вопросы Q01-Q10 disabled. **AdvancedParams снаружи — alpha/power редактируются (BUG-1 known).** Должен быть accent-баннер «План утверждён». | +      |

### Регрессия Sprint 1-2 (1 кейс)

| #   | Test Case                                                                       | Expected                                                                                                                                 | Status |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 14  | После restart: стартовый → клик «Начать с брифа» → быстрый прогон через Q01-Q10 | Регрессия: бриф работает (карта, hypothesis парсер, ratio sub, guardrails, advanced collapse). Никаких новых багов в существующих фичах. | +      |

### Console clean (1 кейс)

| #   | Test Case                                                                             | Expected                                                   | Status |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| 15  | DevTools Console на всём флоу (стартовый → бриф → шаг 2 → approve → step 3 → restart) | Нет `console.error` / `console.warn` (кроме Google Fonts). | +      |

---

## Bugs found

> **BUG-1 заранее в списке.** Дополни если найдёшь ещё.

| ID | Severity | Test case # | Description | Steps to reproduce | Status |
|----|----------|-------------|-------------|-------------------|--------|
| **BUG-1** | **Medium** | 13 | **AdvancedParams не disabled в approved-режиме.** `<fieldset disabled>` обёртывает только основной QuestionRenderer, AdvancedParams сидит снаружи. В approved пользователь может изменить alpha/power/variance_reduction → derived обновится → план теряет «зафиксированность». Противоречит ADR-006. | 1. Заполнить бриф → утвердить план. 2. Перейти на /#/step1. 3. Раскрыть advanced параметры. 4. Изменить alpha — поле редактируется, хотя план approved. | **FIXED** (2026-05-28, `sprint-3-fix-report.md`, commits `fb51658` + `b8facb8`). RETEST: оба кейса (draft editable + approved disabled с раскрытием) пройдены. |

---

## Резюме после прохождения

- Всего кейсов: **15**
- `ok`: **15** (все «+»)
- `bug`: **1** — BUG-1 (заранее известный, см. таблицу выше)
- `skip`: 0
- Critical/High bugs: 0
- Готово к закрытию: **да** — все 15 smoke-кейсов прошли, BUG-1 (Medium) починен в FIX-фазе.
- QA / RETEST дата: 2026-05-28 (Sprint 3 был на паузе с 2026-05-16 по 2026-05-28).

---

## Что НЕ покрывает этот smoke

Сознательно пропущено (если что-то странное всплывёт там — не bug Sprint 3, отложенная функциональность):

- Все edge cases sample size (большие/маленькие baselines, micro-traffic) — покрыто unit-тестами Code'а (30 тестов в `sample-size.test.js`).
- Все 4 группы scoring отдельно — покрыто unit-тестами (22 теста).
- Cross-browser (Chrome only — если что-то ломается в Firefox/Safari, отдельный bug-report).
- Mobile responsive (отдельный спринт).
- Парсер test_plan.md (drag-drop = заглушка) — Sprint 7.
- Шаг 3 содержимое (только placeholder) — Sprint 4.

---

## Если smoke выявит проблемы

- **0 багов кроме BUG-1** → переходим в FIX (только BUG-1 + Test update case 2 spec).
- **Новые баги Medium/Low** → добавляем в fix-prompt.
- **Новый Critical/High** → стоп, обсуждаем; возможно нужен deeper QA.
