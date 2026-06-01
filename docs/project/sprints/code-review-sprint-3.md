# Code Review Sprint 3 — Sample Size + Step 2 + Persistence + Reset

**Reviewer:** Cowork
**Date:** 2026-05-16

---

## Summary

Спринт сделан очень аккуратно. Скоуп закрыт целиком и местами с запасом: **100 новых unit-тестов** (запрашивалось 25+), все 7 канонических кейсов из SAMPLE_SIZE_CALC.md покрыты, snapshot-test на render.js защищает формат test_plan.md от регрессии, structure state.plan продумана под будущий парсер (Sprint 7).

Code сам поднял **3 пункта на ревью** в Known Issues — это образцовая прозрачность. Все три обрабатываю ниже.

**Blockers: 0. Concerns: 3 (один из них Code flagged). Notes: 3.**

Я проверил автоматически:
- `src/lib/plan/` не содержит React-импортов ✓
- Никаких новых npm-зависимостей (package.json без изменений) ✓
- Sprint 3 коммиты идут после Cowork roadmap-коммита — порядок коммит-зон по P-1 соблюдён ✓
- Сэмпл расчётов: Cases 3, 4, 5, 6, 7 — exact или ±0.03% от spec. Case 1 — 1.7% diff (внутри 5%-tolerance, которую сам spec допускает). Case 2 — 8% diff (требует обсуждения).

---

## Concerns

### 🔴 Blockers

Нет.

### 🟡 Concerns (требуют решения)

| # | Где | В чём concern |
|---|-----|---------------|
| 1 | `docs/context/SAMPLE_SIZE_CALC.md` line 352 | **Case 2 spec выпадает из паттерна.** Все 7 канонических кейсов прогоняются одной формулой Fleiss non-pooled SE for H1 (как описано в spec тексте). Cases 3-7 совпадают exact или ±0.03%, case 1 — 1.7% (внутри 5%-tolerance, которую сам spec формулирует строкой 359). Case 2 spec `7555` отстаёт от формулы на 8%. Самостоятельная проверка вручную (см. ниже) показывает что **Fleiss даёт ~8149, как у Code**, а 7555 — не совпадает ни с одним стандартным вариантом (pooled, unpooled, Wald, one-sided, continuity correction). Скорее всего автор spec посчитал case 2 другим инструментом с какой-то ошибкой и записал результат. **Рекомендую обновить SAMPLE_SIZE_CALC.md case 2 → ~8149** (или диапазон 8100-8200 для honestly-told ±1% tolerance). Так как это `docs/context/`, нужна твоя санкция перед правкой (Dev-Cycle правило). |
| 2 | `src/pages/BriefPage.jsx` + `src/components/brief/AdvancedParams.jsx` | **AdvancedParams не disabled в approved-режиме.** `<fieldset disabled>` обёртывает только `QuestionRenderer`, а AdvancedParams сидит отдельной секцией снаружи. В approved-режиме пользователь может изменить alpha/power/variance_reduction → дальше при `RECOMPUTE_PLAN` derived изменится, score обновится, и план теряет «зафиксированность» которая обещана approved-статусом. Это **противоречит ADR-006** («approved заморожен, чтобы сменить — return-to-draft»). **Рекомендую починить в этом cycle review** через fix-prompt — тривиально (тоже завернуть в fieldset). Code сам это в Known Issues отметил. |
| 3 | `src/components/Stepper.jsx` | **Scope creep:** kliкабельность шагов добавлена Code'ом сверх запрошенного. Объективно — это нарушение CLAUDE.md правило 3 «Surgical Changes». Code сам поднял в Notes и объяснил: без этого после approve пользователь не может вернуться на бриф через шапку (только через ссылку с PlanPage). **Решение:** я бы оставил, потому что обоснование разумное и фича логически follows из появления unlocked step 2/3. Но это твоё решение — формально я обязан flag'нуть. |

### 🟢 Notes (на будущее)

| # | Где | Заметка |
|---|-----|---------|
| 1 | `tests/lib/plan/sample-size.test.js` | **Tolerance 5-10% для proportion** документировано в комментариях тестов. Это аккуратно — без него будущий read мог бы подумать «тесты слабые». Хорошо. |
| 2 | `src/lib/plan/render.js` + inline snapshot test | **`?raw` import шаблона** + inline snapshot защищают формат `test_plan.md` от регрессии. Это критично для Sprint 7 парсера — roundtrip-тест парсера будет сравнивать с этим же snapshot'ом. Защита заложена правильно. |
| 3 | `src/lib/storage.js` версионированный ключ | **`stat-plan:v1:state`** — bump version при structural changes. Это правильный паттерн на будущее. Когда state shape изменится в Sprint 5 (добавится state.results) — bump до v2 + миграция. |

---

## Разбор Case 2 расхождения (вручную проверил)

Параметры:
- p₁ = 0.05, p₂ = 0.06 (5% +20% rel = 0.05 × 1.2)
- z_α (two-sided) = 1.96, z_β = 0.84

**Fleiss non-pooled (как в spec тексте и в Code):**
- SE_0 = √(2 × 0.055 × 0.945) = √0.10395 = 0.32241
- SE_1 = √(0.05 × 0.95 + 0.06 × 0.94) = √(0.0475 + 0.0564) = √0.1039 = 0.32234
- Numerator = (1.96 × 0.32241 + 0.84 × 0.32234)² = (0.63192 + 0.27077)² = 0.90269² = 0.81485
- **n = 0.81485 / 0.01² = 8148.5 ≈ 8149**

**Pooled approximation:** ≈ 8150
**Wald:** ≈ 8146

**Все варианты дают ~8146-8150.** Spec'овское 7555 не воспроизводится ни одним из них. Скорее всего автор spec сделал ошибку при подсчёте этого конкретного кейса.

**Возможные причины 7555:**
- One-sided test (но это противоречит дефолту 0.05 two-sided)
- Случайная замена параметра вручную
- Использование калькулятора Evan Miller с другими настройками continuity correction

**Code's number 8159 — корректный.** Незначительное отличие от моих 8149 — численная точность normalInv/normalCdf реализации.

---

## ADR Compliance Check

| ADR | Статус | Комментарий |
|---|---|---|
| ADR-001 (no backend) | ✅ | Никаких fetch |
| ADR-002 (артефакты переносимое состояние) | ✅ | Snapshot test на формат test_plan.md, схема DATA_MODEL.md соблюдена |
| ADR-003 (структурная оценка) | ✅ | Scoring проверяет полноту и консистентность, не «качество». Remarks — конкретные |
| ADR-004 (тул не принимает решений) | ✅ | Approve — только явное действие |
| ADR-005 (5-шаговый флоу) | ✅ | Step 2/3 unlock по условиям, 4-5 hard locked |
| ADR-006 (approved/draft + readonly) | 🟡 в основном ✅, см. Concern #2 | Бриф disabled, но AdvancedParams снаружи fieldset — недокрытие |
| ADR-009 (точные формулы + warnings) | ✅ | Z-test/T-test exact, MW/bootstrap с warnings, CV=1 fallback с warning |
| ADR-010 (стек, no new deps) | ✅ | Никаких новых npm-deps, `src/lib/plan/` без React, normalInv/normalCdf написаны руками |

---

## Scope Compliance

✅ Все основные user stories из scope покрыты.
✅ DO NOT-список соблюдён: нет парсера, нет data peek, нет sensitivity helper, нет новых npm-deps.
🟡 Stepper кликабельность — scope creep (см. Concern #3). Решение твоё.
🟢 100 unit-тестов вместо запрошенных 25+ — позитивный over-deliver, не нагрузка.

---

## Ответы на 3 вопроса Claude Code

**Q1: Case 2 8% расхождение — поправить spec или формулу?**

**A:** Поправить **spec** (SAMPLE_SIZE_CALC.md line 352). См. Concern #1 + ручную проверку выше. Все 7 кейсов прогнаны одной Fleiss формулой, 6 из них дают совпадение exact / ±0.03% / 1.7% (в пределах spec-tolerance). Case 2 spec — outlier, не воспроизводится никаким стандартным вариантом. Это требует моей правки в `SAMPLE_SIZE_CALC.md` после твоего согласия (это `docs/context/` — нужна санкция).

**Q2: AdvancedParams не disabled в approved — это баг?**

**A:** Да, это баг (см. Concern #2). Противоречит ADR-006 «approved заморожен». Включаю в fix-prompt этого спринта.

**Q3: Browser smoke не выполнен — нужно ручное QA?**

**A:** Да. Это нормально — Code корректно делегировал в QA-фазу. QA по Sprint 3 я планирую как **полное** (статистика критична — sample size formulas, scoring, persistence). Test cases подготовлю в фазе TEST PREP.

---

## Decision Log

> Заполняется после твоего подтверждения по концернам.

| # | Concern | Решение | Куда зафиксировано |
|---|---------|---------|--------------------|
| 🟡 1 | Case 2 spec расхождение | **Fix spec.** Обновить SAMPLE_SIZE_CALC.md case 2 expected → ~8149 (Fleiss-формула). Тест `sample-size.test.js` обновится в fix-prompt (Code-зона). | Cowork правит `SAMPLE_SIZE_CALC.md` сразу. Тест — в FIX-фазе. |
| 🟡 2 | AdvancedParams не disabled | **Fix в этом cycle.** Включаем в `sprint-3-fix-prompt.md` после QA. | `sprint-3-fix-prompt.md` |
| 🟡 3 | Stepper kliкабельность scope creep | **Accept.** UX-обоснование принято. Code's notes сохраняются. | Закрыто в Decision Log без изменений в коде. |

---

## Что делать дальше

1. **Подтверди / отклони концерны** (особенно #1 — нужна твоя санкция на правку spec).
2. **Я делаю TEST PREP** (полное QA — sample size + scoring + step 2 + persistence + restart).
3. **Ты гоняешь QA в браузере.**
4. После QA: если bugs + agreed concerns — пишу **sprint-3-fix-prompt.md** (минимум — Concern #2 AdvancedParams).
5. CLOSE Sprint 3 с обновлением SAMPLE_SIZE_CALC.md case 2 (если согласовано).

---

## Метрики

- **Code DEV-фаза:** 24 минуты (по твоему замеру)
- **PLAN Sprint 3 + CLOSE Sprint 2 переход:** ~20 минут
- **Code self-reported total:** ~3 часа (вероятно wall-clock с idle / переключениями)

Code: 100 новых unit-тестов, 5 lib модулей, 5 plan UI компонентов, 2 страницы, расширение reducer, routes, header, stepper за 24 минуты. Velocity на знакомом стеке очень высокая.
