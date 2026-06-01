# Sprint 2 Fix Prompt — Guardrails Layout + Q08 Unit Clip + useEffect→Reducer Defaults

**Type:** FIX phase (часть Sprint 2, не отдельный спринт)
**Estimated:** 30-45 минут работы

---

## Context

Sprint 2 закрыт по основному скоупу (Q01-Q10 + advanced + interactive map), QA-фаза прошла. 65 из 68 тест-кейсов = `ok`. Найдены **3 бага** (1 High, 2 Medium) и **1 архитектурный concern** из code review, который пользователь согласовал зафиксировать в этой же FIX-итерации (вместо переноса в Sprint 3).

Этот fix-prompt — **не новая фича**. Это закрытие проблем из:
- `docs/project/sprints/test-cases-sprint-2.md` — секция Bugs found (BUG-1, BUG-2, BUG-3)
- `docs/project/sprints/code-review-sprint-2.md` — Concern #1 (Decision Log)

После выполнения этого fix-prompt — RETEST по затронутым тест-кейсам, потом CLOSE Sprint 2.

---

## Bugs to fix

### Bug #1 + Bug #3 (combined) — **Guardrail row layout overflow**

**Severity:** High (BUG-3) + Medium (BUG-1). Одна корневая проблема, два симптома.

**Description:**
В компоненте `src/components/brief/GuardrailsList.jsx` строка guardrail имеет grid `grid-cols-[1.2fr_1fr_1fr_1.1fr_auto]` — 5 колонок: name, column, direction, threshold (value+unit), ×. В 4-й колонке `flex`-контейнер с `<input type="number" className="flex-1 min-w-0">` + `<select>`. При появлении select'а с `relative_percent` / `absolute` он **не влезает** в 1.1fr column:
- BUG-1: select **обрезан** или рендерится в нулевую ширину (при одной guardrail-строке)
- BUG-3: select **уезжает за границу карточки** в область карты вопросов справа, ✕ кнопка следующей строки **перекрывается сайдбаром** (визуально видно на скрине, две и более guardrail-строки)

**Steps to reproduce:**
1. Перейти на Q09 (guardrails). 
2. Кликнуть карточку-предложение «+ Bounce rate» → появляется строка.
3. Кликнуть «+ Time on site» → появляется вторая строка.
4. Посмотреть на правую часть обеих строк: `% rel.` select клиппится / уезжает за границу карточки, ✕ может быть недоступен для клика на второй строке.

**Expected:**
Каждая строка guardrail рендерится **внутри** карточки брифа (`bg-bg-elev border border-border rounded-lg p-6` в `BriefPage.jsx`), все 5 контролов (name, column, direction, value, unit, ×) видны и кликабельны.

**Proposed fix (направление, реализацию выбираешь ты):**

Несколько вариантов — выбери наиболее простой и устойчивый:

- **(A) Разделить threshold на 2 column-а** — заменить grid на `grid-cols-[1.2fr_1fr_1.1fr_0.7fr_0.6fr_auto]` (6 колонок: name, column, direction, threshold_value, threshold_unit, ×). Убрать внутренний `flex`-div. Каждый контрол — свой grid-cell. Это closest к существующему коду.
- **(B) Reflow на 2 строки внутри одного guardrail-row** — name/column/direction на первой строке, value+unit на второй с отступом и подписью «Порог». Если первый вариант не помещается на 1240px viewport.
- **(C) Использовать flex с wrap'ом** — но grid обычно даёт более предсказуемый layout.

**Файлы:** `src/components/brief/GuardrailsList.jsx` (строки 89-165 — рендер списка строк).

**Не забудь:**
- Кнопка ✕ должна быть **полностью внутри** карточки `bg-bg-elev border border-border` (контейнер `<section>` в `BriefPage.jsx`), не залезать в правый сайдбар.
- Проверить визуально с 1, 2 и 3 guardrail-строками (добавь временно 3-ю через кнопку «+ ДОБАВИТЬ GUARDRAIL»).

---

### Bug #2 — **Q08 unit select clips long label «пользователей в день»**

**Severity:** Medium.

**Description:**
На Q08 (Доступный трафик) `<select>` для юнита показывает label «пользователей в день» / «сессий в день», которые **обрезаются** в визуальной ширине select-элемента (number input занимает большую часть строки). Видно на скрине от пользователя — текст «пользоват...ей в день», обрезанный.

**Steps to reproduce:**
1. Перейти на Q08.
2. Посмотреть на select справа от number input.

**Expected:**
Label полностью читаем без обрезания.

**Proposed fix (на твоё усмотрение):**

Один из вариантов:
- **(A) Сократить labels** в `src/lib/brief/questions.js` — `TRAFFIC_UNIT_OPTIONS`: «пользователей в день» → «польз./день», «сессий в день» → «сессий/день». Консистентно с другими selectаs в проекте (`% rel.`, `доля`, `п.п. abs.`).
- **(B) Дать select'у больше места** — поменять grid layout в `NumberWithUnit.jsx` (если он использует grid) или дать `min-width` select'у.

Я склоняюсь к (A) — короткие labels вписываются в общий стиль брифа и не требуют layout-правок.

**Файлы:** `src/lib/brief/questions.js` (TRAFFIC_UNIT_OPTIONS) или `src/components/brief/NumberWithUnit.jsx`.

---

## Architectural fix

### Concern #1 — **useEffect-defaults → reducer-action**

**Откуда:** `docs/project/sprints/code-review-sprint-2.md` Concern #1 + Decision Log решение «Sprint 2 fix» (пересмотрено после QA с пользователем).

**Description:**
В Sprint 2 defaults для двух полей подставляются через `useEffect(() => { ... }, [])` на mount компонента:

- `src/components/brief/StopAndDecisionRules.jsx` — defaults для `decision_rules.ship/iterate/kill` с подстановкой MDE из Q07
- `src/components/brief/QuestionRenderer.jsx` (`MetricNameInput`) — auto-prefill `metric_name` из `extractMetricName(hypothesis.text)` на первом mount

Это работает (StrictMode-safe через guard'ы), но создаёт implicit-цепочку «mount → useEffect → dispatch → reducer → re-render». Нет единого пути наполнения state'а — defaults живут в компонентах, всё остальное — через reducer.

**Why fix:**
Когда в Sprint 5-6 будет писаться парсер `test_plan.md`, он будет наполнять state.brief через dispatch'ы. Если defaults тоже идут через reducer-actions, парсер и компонентные defaults используют **один путь**. Меньше surface area для багов.

**Proposed fix:**

1. Создать **`src/lib/brief/defaults.js`** — чистая функция `applyEnterDefaults(brief, questionId) → brief` (immutable). Берёт текущий brief и id вопроса. Возвращает новый brief с подставленными defaults для этого вопроса, если необходимо. Pure function, без React.

   Логика:
   - `questionId === 'metric_name'`: если `brief.metric_name === ''` и в `brief.hypothesis.text` есть extractable metric — `brief.metric_name = extractMetricName(brief.hypothesis.text)`. Иначе — без изменений.
   - `questionId === 'stop_decision'` (Q10): если все три из `brief.decision_rules.ship/iterate/kill` пустые — заполнить дефолтами с подстановкой MDE из `brief.mde`.
   - Для остальных id — `return brief` без изменений.

2. **Расширить action `GOTO_QUESTION`** в `src/state/reducer.js`. После установки `currentQuestion = num` — вызвать `applyEnterDefaults(state.brief, getQuestion(num).id)` и патчить результат. Альтернативно — добавить новый action `INIT_QUESTION_DEFAULTS` и диспатчить его сразу после `GOTO_QUESTION` в `BriefPage.jsx` или в `QuestionNav.jsx`. На твоё усмотрение, главное — defaults применяются **через reducer**, не через useEffect.

3. **Удалить useEffect'ы** из `StopAndDecisionRules.jsx` и `MetricNameInput` (в `QuestionRenderer.jsx`), которые сейчас подставляют defaults. Компоненты остаются «тупыми» и просто читают state.

4. **Vitest:** добавить `tests/lib/brief/defaults.test.js` — минимум 4 кейса:
   - Q04: hypothesis с extractable metric → metric_name заполнен
   - Q04: hypothesis без metric → metric_name остаётся пустым
   - Q10: decision_rules пустые + MDE 8% rel. → defaults подставлены с MDE/2 = 4%
   - Q10: пользователь уже что-то ввёл (ship непустой) → defaults НЕ перезаписываются

**Файлы:**
- Создаём: `src/lib/brief/defaults.js`, `tests/lib/brief/defaults.test.js`
- Модифицируем: `src/state/reducer.js` (GOTO_QUESTION), `src/components/brief/StopAndDecisionRules.jsx`, `src/components/brief/QuestionRenderer.jsx` (удаление useEffect'ов из MetricNameInput)

---

## Уведомление про vite.config.js

В `vite.config.js` появилось поле `server.watch.ignored: ['**/docs/**', '**/mockups/**', '**/tests/**']` — это **правка Cowork'а во время QA-фазы**. Причина: пользователь редактировал `docs/project/sprints/test-cases-sprint-2.md` параллельно с тестированием, и Vite триггерил full reload приложения, сбрасывая state. Эта правка решает проблему.

**Не удаляй её. Не «оптимизируй». Если нужно расширить ignored список (например, добавить `**/.obsidian/**`) — можно. Просто не трогай существующие три пути.**

---

## RETEST после fix'ов

После того как фиксы готовы и `npm test`/`npm run build` зелёные, проверь руками в браузере **только затронутые места**, не весь бриф:

1. **Q09:** добавь Bounce rate + Time on site через карточки-предложения. Убедись:
   - Обе строки **внутри** карточки брифа (не залезают в карту вопросов).
   - `% rel.` / `абс.` select **виден и кликабелен** на обеих строках.
   - Кнопка ✕ на обеих строках **доступна** (клик удаляет соответствующую строку).
2. **Q09 (extreme):** добавь 3 guardrail-строки через «+ ДОБАВИТЬ GUARDRAIL». Убедись, что layout не ломается.
3. **Q08:** label юнита читается полностью без обрезания.
4. **Q04:** перейди на Q04 — `metric_name` подставляется из hypothesis (если есть extractable metric). Удали значение → перейди вперёд → вернись → значение **не возвращается** (touched state, как раньше).
5. **Q10:** перейди на Q10 первый раз — defaults в ship/iterate/kill подставлены с MDE из Q07. Удали SHIP → вернись назад → вперёд на Q10 → SHIP **остаётся пустым** (touched state).
6. **`npm test`** — все тесты зелёные, включая новые `defaults.test.js`.

---

## DO NOT

- ❌ **Не «заодно» рефакторить** соседний код. Surgical changes — только BUG-1/2/3 и Concern #1.
- ❌ **Не трогай `docs/`, `mockups/`, `CLAUDE.md`, `README.md`.**
- ❌ **Не трогай `vite.config.js` server.watch.ignored** — это правка Cowork (см. выше).
- ❌ **Не добавляй sample size derivation, localStorage, парсер test_plan.md, click→file picker fallback** — всё это Sprint 3+.
- ❌ **Не меняй структуру state.brief** кроме того что требуется для defaults-action. Парсер test_plan.md в Sprint 5-6 будет ориентироваться на эту схему.
- ❌ **Не подключай новые npm-зависимости.** Чистый React + Tailwind как и было.
- ❌ **Не добавляй React-импорты в `src/lib/`.** `defaults.js` — чистая функция, без React.
- ❌ **Не пиши UI-тесты** (RTL, Playwright). Только Vitest для `defaults.js`.
- ❌ **Не уходи в улучшение mobile responsive** для GuardrailsList. Сейчас задача — починить desktop overflow. Mobile — отдельный кандидат на JTBD.

---

## Fix Report — что ожидаем

После завершения дополни **существующий** `docs/project/sprints/sprint-report-2.md` секцией «## Bug Fixes (FIX phase)» в конце (или создай отдельный `docs/project/sprints/sprint-2-fix-report.md` — на твоё усмотрение, см. Dev-Cycle.md). В отчёте:

- Какой вариант layout выбрал для guardrail row (A/B/C из proposed fix #1) и почему
- Какой подход к defaults (расширение `GOTO_QUESTION` vs новый action) и почему
- Сколько unit-тестов добавлено в `defaults.test.js`
- Подтверждение что вся RETEST-секция проходит
- Время DEV-фазы fix'а
