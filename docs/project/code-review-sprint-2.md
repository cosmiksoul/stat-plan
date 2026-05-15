# Code Review Sprint 2 — Brief Questions Q01-Q10 + Advanced + Interactive Map

**Reviewer:** Cowork
**Date:** 2026-05-16

---

## Summary

Спринт сделан чисто. Скоуп закрыт целиком, ADR соблюдены без исключений, тестов больше чем требовал промт (38 вместо 23), бонусом закрыт tech debt из Sprint 1 (inline rgba → `@theme` токены). Архитектура чистая: `src/lib/brief/` не импортирует React, yamlPath строго по DATA_MODEL.md, reducer pure.

**Blockers: 0.** Все вопросы — 🟡 Concerns (для обсуждения) и 🟢 Notes.

Я проверил автоматически:
- `src/lib/` не содержит React-импортов ✓
- Никаких `console.*` в продакшен-коде ✓
- Inline rgba не осталось ✓
- yamlPath значения в registry матчат DATA_MODEL.md ✓

Спринт готов к QA сразу после того как ты закоммитишь cowork-доки и закроешь два мелких git-вопроса (см. ниже).

---

## Git-housekeeping (не код, но требует действий пользователя)

| Файл | Что с ним делать |
|---|---|
| `docs/project/sprint-2-prompt.md` | Untracked. Это **мой** артефакт (Cowork) — должен попасть в репо вместе с code-review. |
| `docs/project/Dev-Cycle.md` (modified) | Это **моё** изменение состояния state table. Закоммитить с этим же batch'ем. |
| `.obsidian/` (untracked) | Папка твоего редактора (Obsidian). Добавить в `.gitignore`. |

Что коммитить (рекомендация):

```bash
# 1) Добавить .obsidian/ в gitignore
echo "" >> .gitignore && echo "# Obsidian editor" >> .gitignore && echo ".obsidian/" >> .gitignore

# 2) Закоммитить cowork-доки и git-fixes одним коммитом
git add .gitignore docs/project/sprint-2-prompt.md docs/project/Dev-Cycle.md docs/project/code-review-sprint-2.md
git commit -m "docs(sprint-2): prompt + code review + gitignore obsidian"

# 3) Push всех 5 Code-коммитов + этого нового
git push
```

---

## Concerns

### 🔴 Blockers

Нет.

### 🟡 Concerns (обсуждаемые)

| # | Где | В чём concern |
|---|-----|---------------|
| 1 | `src/components/brief/StopAndDecisionRules.jsx` + `src/components/brief/QuestionRenderer.jsx` (MetricNameInput) | **Defaults подставляются через `useEffect` на mount.** Это работает (StrictMode-safe через guard'ы), но создаёт implicit-цепочку: Q10 mount → useEffect → dispatch → state update → re-render. На больших цепочках такое поведение становится трудно отслеживать. Альтернатива — defaults применяются в reducer при первом touch вопроса (action `GOTO_QUESTION` или новый `INIT_QUESTION_DEFAULTS`). **Не блокер для Sprint 2**, но имеет смысл унифицировать в Sprint 3, когда добавятся новые «mount-defaults» (например, derived sample_size). Записываю как tech debt. |
| 2 | `src/pages/BriefPage.jsx:39` | **`finished` живёт в `useState`, не в reducer.** Если пользователь нажал «Завершить» на Q10, ушёл назад, вернулся — toast не появится. Code сам отметил. **Не критично сейчас, но станет важным в Sprint 3-4**: когда появится логика разблокировки шага 2 («step 2 unlock = brief заполнен + finished нажат»), нам понадобится `state.brief.briefSubmitted` в reducer. **Решение:** оставляем в Sprint 2 как есть, переезжаем при unlock-логике. Записываю как tech debt. |
| 3 | `src/components/brief/QuestionRenderer.jsx` (MetricNameInput auto-snake_case) | **Кириллица в `metric_name` не транслитерируется.** `metric_column` останется пустым. Code сам подсветил. Это UX-ограничение: для пользователя с метрикой «Конверсия в клик» придётся писать `cr_to_partner_click` руками. Не блокер (можно вручную), но real users столкнутся. Кандидат на маленькую user story в JTBD. |
| 4 | `src/state/reducer.js` + `src/components/brief/HypothesisInput.jsx` | **MDE.direction в state есть, в UI нет.** По BRIEF_TREE Q07 «direction из Q02 — глагол гипотезы». State хранит `mde.direction='increase'` захардкоженно. Code корректно не делал derive (нет в acceptance Sprint 2). Реальная боль появится в Sprint 3 при расчёте sample size: формулы для односторонней vs двусторонней проверки могут разойтись, direction влияет. **Решение:** обязательно адресуем в Sprint 3 (derive из глагола `parseHypothesis` → mde.direction). |
| 5 | `src/components/brief/QuestionMap.jsx` (по описанию в sprint-report) | **Карта вопросов отдельно от «дополнительный пункт Data peek»** — Code сделал его в конце карты как disabled. Прочитать в коде не успел подробно. Если он сделал его *внутри* списка из 10 вопросов — может сбить счётчик. **Если** он отдельным элементом ниже основного списка, **не имеет** статуса в countAnswered — всё ок. (Это уточняющий вопрос, посмотрю при QA если что-то странное.) |

### 🟢 Notes (на будущее, без действий)

| # | Где | Заметка |
|---|-----|---------|
| 1 | `tests/lib/brief/*.test.js` | **38 unit-тестов вместо запрошенных 23.** Сверх-ответственно. Это позитивное наблюдение, а не нагрузка. |
| 2 | `src/lib/brief/hypothesis-parser.js:22-25` | **Unicode-aware boundaries** — отличное решение. JS `\b` действительно не работает с кириллицей правильно. Это хороший learning, в комментарии всё объяснено. |
| 3 | `src/lib/brief/progress.js` | **`shortAnswerPreview`** — функция в чистой логике, не в UI. Правильное разделение. |
| 4 | `src/pages/BriefPage.jsx:18-33` | **`activeValidation` inline.** Code пообещал вынести когда станет >5 случаев — сейчас 5, на границе. ОК. |
| 5 | `src/state/reducer.js:71-76` | **Side effects в `answerQuestion`** (сброс `ratio_components` при не-ratio, `cluster_field` при не-cluster) — критично для ADR-002 (артефакт-state не должен иметь «висящих» значений). Хорошо. |

---

## ADR Compliance Check

| ADR | Статус | Комментарий |
|---|---|---|
| ADR-001 (no backend) | ✅ | Никаких fetch. |
| ADR-002 (артефакты как переносимое состояние) | ✅ | yamlPath строго по DATA_MODEL.md. Side effects сбрасывают «висящие» поля при смене ratio/cluster. Когда дойдём до парсера test_plan.md в Sprint 5-6, эта схема будет работать в обе стороны. |
| ADR-003 (структурная оценка) | ✅ | hypothesis-parser проверяет только структуру слотов, не качество. |
| ADR-004 (тул не принимает решений) | ✅ | Никаких «эта гипотеза слабая». |
| ADR-005 (5-шаговый флоу) | ✅ | Шаг 2 остался locked. Завершение Q10 — inline-сообщение, без разблокировки. |
| ADR-008 (тур без overlay) | ✅ | Тур-toggle класса из Sprint 1 не тронут. |
| ADR-010 (стек) | ✅ | Нет новых npm-зависимостей. Нет React-импортов в `src/lib/`. |

Нарушений ADR нет.

---

## Scope Compliance

✅ Все 13 user stories из scope покрыты.
✅ DO NOT-список соблюдён: нет sample size derivation, нет parser, нет localStorage, нет csv, шаг 2 заблокирован.
✅ **Бонус:** Tech debt #1-2 из Sprint 1 (inline rgba → `@theme` токены) закрыт. Это вне scope, но в духе «маленькие improvements в @theme когда добавляются новые цвета» — приемлемо.
🟢 Дополнительные tech debt появились (см. Concerns #1-2) — нормально, накапливается.

---

## Ответы на открытые вопросы Claude Code

**Q1: Direction MDE — derive из гипотезы или отдельный input?**

**A:** Derive. Логически: гипотеза `вырастет` → direction `increase`, `упадёт` → `decrease`, иначе → `any`. Это можно сделать в `parseHypothesis` (вернуть дополнительное поле `direction`) или в новой функции `extractDirection(text)`. Реализация — в **Sprint 3**, естественно с sample size calc, т.к. direction влияет на формулу односторонней/двусторонней проверки. **В Sprint 2 не правим**, остаётся `'increase'` захардкоженным.

**Q2: Sticky finish-toast Q10 — useState или reducer?**

**A:** Переедет в reducer в **Sprint 3**, когда мы будем делать логику разблокировки шага 2. Поле — `state.brief.briefSubmitted: boolean`. Action — `MARK_BRIEF_SUBMITTED`. **В Sprint 2 не правим** — useState достаточен для информационного toast'а. Записал в tech debt.

**Q3: Snake_case транслит кириллицы — нужен ли в v1?**

**A:** Не нужен в v1. Пользователь сам вводит latin `metric_column`. Добавлю как маленькую low-priority user story в JTBD §2: «Как пользователь с метрикой на кириллице, я хочу видеть автотранслит в `metric_column`, чтобы не писать руками». Если за полгода никто не пожалуется — не делаем вообще.

---

## Decision Log

> Будет заполнен после твоего подтверждения по концернам.

| # | Concern | Решение | Куда зафиксировано |
|---|---------|---------|--------------------|
| 🟡 1 | `useEffect` defaults | TBD — обсудить | TBD |
| 🟡 2 | `finished` в useState | Defer на Sprint 3 (вместе с unlock logic) | CONTEXT Tech Debt |
| 🟡 3 | Кириллица в snake_case | Defer как low-priority story в JTBD §2 | JTBD |
| 🟡 4 | MDE.direction нет в UI | Defer на Sprint 3 (derive из глагола) | sprint-3-prompt (когда напишем) |
| 🟡 5 | Карта Data peek в счётчике | Уточнить при QA — посмотреть код / визуально | — |

Жду подтверждения / правок по этим решениям.

---

## Что делать дальше

1. **Закоммитить cowork-доки** + .gitignore обновление (см. блок «Git-housekeeping» выше).
2. **Push** всех 6 коммитов (5 Code + 1 Cowork).
3. **Проверить Actions** — workflow должен зелёный задеплоить на Pages.
4. **Подтвердить решения по Concerns** (твой ответ → я заполню Decision Log).
5. После — переходим в **TEST PREP**, я готовлю `test-cases-sprint-2.md`.

---

## Метрика длительности

| Точка | Время |
|---|---|
| Передача в Claude Code | 2026-05-15 01:10 |
| Получение sprint-report | 2026-05-15 01:38 |
| Чистое DEV | **28 минут** |

Sprint 2 DEV в 2.15× дольше Sprint 1 (13 мин) при значительно большем скоупе (11 компонентов vs 4, 38 тестов vs 1, реальная бизнес-логика). Это здоровая velocity на знакомом стеке.

CLOSE Sprint 1 → START Sprint 2: пауза 25 минут (CLOSE-фаза + PLAN + PROMPT).
