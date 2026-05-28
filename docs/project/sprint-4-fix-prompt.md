# Sprint 4 Fix Prompt — UX-pack + Notebook polish

**Type:** FIX phase Sprint 4 (большой, разбит на 3 phase внутри). Скоуп растёт за счёт UX-багов, найденных в QA + оценке ноутбуков. По решению пользователя — всё в одной фазе FIX, без откладывания на Sprint 5.
**Estimated:** ~3-4 ч DEV (Phase A ~45 мин, Phase B ~30 мин, Phase C ~2 ч).

---

## Context

После QA Sprint 4 (см. `docs/project/test-cases-sprint-4.md`) и оценки 5 сгенерированных ноутбуков (`docs/project/code-review-sprint-4.md` + промежуточный ассессмент пользователем) накопилось **10 пунктов** на fix:

- 1 из code review (Concern #3, теперь достижим органически для всех ratio-метрик через `delta_method`).
- 2 UX из smoke (BUG-1, BUG-2 — нет CTA после approve, кнопка скачивания внизу).
- 3 UX из сценариев (BUG-3, BUG-4, BUG-5 — Q04 underscore conversion, Q01=other нет ввода, карта не отмечает preselect).
- 4 баги в шаблонах ноутбука (NB-BUG-1, NB-BUG-3, NB-BUG-4, NB-BUG-5 — нумерация разделов, slugify ё, grammar «1 days», двойная точка в decision rules).

**Разбит на 3 phase для упорядочивания и снижения риска multi-iteration:**

- **Phase A** — `templates/notebook/*.cells.json` + slugify + grammar (NB-BUG-1, 2, 3, 4, 5, Concern #3 warning в header ноутбука). Изолированно, не трогает state/UI.
- **Phase B** — UI fixes на step 2/3 (BUG-1, BUG-2, Concern #3 warning в PlanInfoCard).
- **Phase C** — Бриф + парсер + render (BUG-3, BUG-4, BUG-5). Самая толстая часть.

Phase A → коммит → self-test. Phase B → коммит. Phase C → коммит. Это даёт Cowork'у три точки code review при необходимости.

---

## Phase A — Notebook templates + slugify + warnings (≈45 мин)

### A.1. NB-BUG-1: Убрать жёстко зашитые номера разделов из шаблонов

**Симптом:** во всех 5 сгенерированных ноутбуках первая markdown-ячейка имеет жёстко зашитый номер (`## 2. SRM check`, `## 6. Z-test для пропорций`, `## 5. Guardrails`). Порядок в потоке — load → srm → balance → novelty → main_test → guardrails → segments → bootstrap_ci. Но шаблоны main_test пронумерованы `6.`, guardrails `5.` — **порядок номеров противоречит порядку ячеек**. При skip novelty (S3, S4, S5 — duration<3) номера всё равно 5/6 (должно было сдвинуться на 4/5).

**Fix:** убрать порядковые номера из markdown заголовков шаблонов. Оставить только title. Jupyter сам показывает порядок ячеек.

Файлы (поправить первую markdown source-строку):
- `templates/notebook/load.cells.json`: `## 1. Загрузка данных` → `## Загрузка данных`
- `templates/notebook/srm.cells.json`: `## 2. SRM check` → `## SRM check`
- `templates/notebook/balance.cells.json`: `## 3. Балансовая проверка` → `## Балансовая проверка`
- `templates/notebook/novelty.cells.json`: `## 4. Novelty effect` → `## Novelty effect`
- `templates/notebook/main_test/z_test.cells.json`: `## 6. Z-test для пропорций` → `## Z-test для пропорций`
- `templates/notebook/main_test/t_test.cells.json`: аналогично, убрать `6.`
- `templates/notebook/main_test/welch.cells.json`: аналогично
- `templates/notebook/main_test/bootstrap.cells.json`: `## 6. Bootstrap (универсальный)` → `## Bootstrap (универсальный)`
- `templates/notebook/guardrails.cells.json`: `## 5. Guardrails` → `## Guardrails`
- `templates/notebook/segments.cells.json`: `## 7. Сегментный анализ (опционально)` → `## Сегментный анализ (опционально)`
- `templates/notebook/bootstrap_ci.cells.json`: убрать номер если есть

**Альтернатива** (если хочется сохранить номера): динамическая нумерация в `notebook-builder.js` через counter перед substituteCell. Но это сложнее, и Jupyter в Variable Inspector / TOC сам нумерует. **Рекомендую вариант «убрать номера полностью».** Можешь предложить иной вариант — но обоснуй.

### A.2. NB-BUG-2 (= Concern #3): Жирный warning в header ноутбука для fallback test_method

**Симптом:** в S5 (ratio, `test_method: delta_method`) builder использовал bootstrap-вариант ячейки main_test (по mapping в `notebook-builder.js:38-42`). В description ячейки есть упоминание «Универсальный fallback для mannwhitney и delta_method» — мелким текстом. Пользователь, который не вникает в код, не поймёт что результат ноутбука получен **другим методом**, чем заявлено в плане. Это методологически опасно.

**Fix:** в `buildHeaderCell` (`src/lib/plan/notebook-builder.js:222-274`) добавить заметный warning-блок, если `derived.test_method ∈ {'delta_method', 'mannwhitney'}`. Текст примерно такой:

```markdown
> ⚠️ **Внимание:** в плане выбран метод `{{test_method}}`. Этот ноутбук использует **bootstrap-вариант** ячейки main_test
> как универсальный fallback в Sprint 4 версии. Bootstrap-CI на разности средних — это **не то же самое**, что
> {{test_method}} (delta-method даёт CI через Taylor expansion над ratio, mannwhitney работает на рангах). Для
> строгого теста замени main_test-ячейку соответствующей реализацией. См. ноту в Sprint 4 report.
```

Блок ставится **после** «To run» в header (последняя секция). Должен быть визуально заметным — `> ⚠️` markdown blockquote (Jupyter рендерит хорошо).

### A.3. NB-BUG-3: Slugify обрезает кириллическую «ё»

**Симптом:** test_id для «конверсия в клик по партнёру» получился `конверсия-в-клик-по-партнру-v1` (без `ё`).

**Fix:** в `src/lib/plan/notebook-builder.js:61-71` функция `slugify`:
```js
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9а-я_\s-]/giu, '') ...
}
```

Regex `а-я` **не включает `ё`**. Расширить класс символов: `[^a-z0-9а-яё_\s-]` (добавить `ё` и при желании `й` который тоже отдельно от `а-я` в Unicode). После лоуэркейса `Ё → ё` — поэтому достаточно строчной `ё`. Параллельно проверить, что аналогичный slugify в `src/lib/plan/render.js` (если есть) имеет ту же regex. Также можно использовать `\p{L}\p{N}` Unicode classes как чище: `replace(/[^\p{L}\p{N}_\s-]/gu, '')`. Любой из двух подходов ОК — главное чтобы тест на `партнёру → партнёру` прошёл.

### A.4. NB-BUG-4: Грамматика «1 days» в header

**Симптом:** во всех ноутбуках с `duration=1` написано `Duration: 1 days`. Для 1 → `day`, для 2-4 → `days` тоже спорно (правильно `1 day`, `2 days` etc., English plural rules).

**Fix:** в `buildHeaderCell` (`notebook-builder.js:240`) поменять:
```js
lines.push(`- Duration: ${derived.duration_days} days\n`)
```
на:
```js
const dayWord = derived.duration_days === 1 ? 'day' : 'days'
lines.push(`- Duration: ${derived.duration_days} ${dayWord}\n`)
```

### A.5. NB-BUG-5: Двойная точка в decision rules

**Симптом:** во всех ноутбуках decision rules выглядят как `**SHIP**: CI не пересекает 0 и нижняя граница ≥ +4% rel..` — две точки в конце.

**Fix:** в `src/lib/brief/defaults.js:24-29` функция `defaultDecisionRules` — текст шаблонов уже **содержит** точку в конце (`+${half}.` где half = `${value/2}% rel.`). Итого `value/2 + '%' + ' rel.' + '.'` → две точки. Поправить либо в `mdeRel` (убрать `% rel.` → `% rel`), либо в `defaultDecisionRules` (убрать `.` на конце):

Минимально-инвазивно — в `defaultDecisionRules`:
```js
ship: `CI не пересекает 0 и нижняя граница ≥ +${half}.`,
// →
ship: `CI не пересекает 0 и нижняя граница ≥ +${half}`,
```
(убрать ведущую `.` после `${half}`). Аналогично для `kill`.

`iterate` не страдает (нет concatenation с `% rel.`).

**Тест:** для нового брифа decision rules должны быть `CI не пересекает 0 и нижняя граница ≥ +4% rel.` (одна точка от `rel.`).

### A.6. Тесты Phase A

- `tests/lib/plan/notebook-builder.test.js`:
  - 1 кейс: для `derived.test_method='delta_method'` header содержит warning-блок.
  - 1 кейс: для `derived.test_method='z_test_proportions'` header **НЕ** содержит warning (no false-positive).
  - 1 кейс: `slugify('конверсия в клик по партнёру')` → содержит `партнёру` (буква `ё` присутствует).
  - 1 кейс: `derived.duration_days=1` → header содержит «1 day» (singular).
- `tests/lib/brief/defaults.test.js`:
  - 1 кейс: `defaultDecisionRules({value: 8, unit: 'relative_percent'})` → `ship` заканчивается ровно на одну точку.

### Acceptance Phase A

- `npm test` зелёный (минимум 217 тестов, было 213).
- `npm run build` чистый.
- Скачать `.ipynb` для S1, S3, S5 (можно через локальный dev сервер):
  - S1: нет старых номеров (`## 6.`, `## 5.`). Header — `1 day` если duration=1, `4 days` если 4.
  - S5: warning-блок в header про delta_method/bootstrap fallback. test_id содержит `партнёру`.
  - Все: decision rules имеют ровно одну точку на конце.

**Phase A commit:** `fix(sprint-4-fix-phase-a): notebook templates polish + slugify ё + duration grammar + decision rules dot`.

---

## Phase B — UI fixes step 2/3 (≈30 мин)

### B.1. BUG-1: Трансформация «Утвердить» → «Перейти к конструктору →» после approve

**Симптом:** на step 2 после approve есть только бейдж APPROVED, нет видимого CTA для перехода на step 3. Пользователь должен догадаться кликнуть «03 Конструктор» в Stepper'е.

**Fix:** в `src/components/plan/PlanActions.jsx`:
- Кнопка `✓ Утвердить план` видна только в `status === 'draft'` (уже так).
- В `status === 'approved'` на её месте появляется зелёная primary-кнопка `Перейти к конструктору →`, при клике — `navigate('/step3')`.
- `↻ Вернуть в черновик` остаётся как сейчас (показывается только в approved, secondary стиль).
- `↓ Скачать test_plan.md` остаётся на своём месте (всегда виден).

Это «трансформация одной кнопки» — а не добавление третьей. В UI в каждый момент одна primary-кнопка.

### B.2. BUG-2: Sticky bottom bar для скачивания .ipynb на step 3

**Симптом:** primary CTA (скачивание .ipynb) на step 3 размещён в самом низу страницы, под ExpectedSchemaCard и блоком «ПРИ СБОРКЕ». Требует скролла.

**Fix:** в `src/pages/NotebookBuilderPage.jsx` (line 76-84) обернуть нижнюю flex-кнопку в sticky-контейнер:
```jsx
<div className="sticky bottom-0 -mx-4 px-4 py-3 bg-bg/95 backdrop-blur border-t border-border-soft">
  <div className="flex justify-center">
    <button ... >↓ СКАЧАТЬ {built.filename.toUpperCase()}</button>
  </div>
</div>
```

Точные классы Tailwind подбери под существующие токены (`@theme` в `index.css`). Главное:
- `position: sticky; bottom: 0`
- Полупрозрачный background (чтобы видеть контент под кнопкой)
- backdrop-blur для читаемости
- Border-top для визуального отделения

При скролле кнопка остаётся видимой. Block «ПРИ СБОРКЕ» с warnings остаётся **над** sticky-секцией (in-flow).

### B.3. Concern #3 = NB-BUG-2 UI часть: Warning в PlanInfoCard для fallback

Phase A добавила warning в header ноутбука (markdown). Тут — UI warning **до** скачивания, чтобы пользователь видел его сразу.

**Fix:** в `src/components/notebook/PlanInfoCard.jsx`:
- Прочитать `state.plan.derived.test_method`.
- Если `test_method ∈ {'delta_method', 'mannwhitney'}` — показать жёлтый inline-banner после основного блока полей:
  ```
  ⚠ Метод {{test_method}}: используется bootstrap-вариант ячейки main_test
  как универсальный fallback в Sprint 4. CI и p-value будут отличаться от
  строгого {{test_method}}. Для production-теста замени main_test вручную.
  ```
- Используй существующие токены `bg-warn-soft`, `border-warn-border`, `text-warn`.

### B.4. Тесты Phase B

UI-тестов не пишем (как в Sprint 3 — нет RTL). Phase B покрывается ручным smoke в RETEST.

### Acceptance Phase B

- На /step2 в draft — кнопка `✓ Утвердить план`. После approve — `Перейти к конструктору →` (зелёная primary), на месте старой `Утвердить`.
- На /step3 при ratio (S5-style сценарий) — виден жёлтый warning в PlanInfoCard про bootstrap fallback.
- На /step3 кнопка скачивания всегда видна при скролле (sticky bottom).
- `npm run build` чистый.

**Phase B commit:** `fix(sprint-4-fix-phase-b): step-2 CTA transform + step-3 sticky download + plan-info-card fallback warning`.

---

## Phase C — Brief + parser + render (≈2 ч)

Самая толстая часть. Затрагивает state shape, UI Q01, Q04, Q06, парсер test_plan.md, render шаблон, и опционально DATA_MODEL.md.

### C.1. BUG-5: Карта вопросов не отмечает Q как отвечённый при preselect

**Корневая причина (предварительная гипотеза):**

`isQuestionAnswered` (см. `src/lib/brief/progress.js:4-36`) определяет «отвечено» по непустому value в state. Но при preselect для Q06 «Единица рандомизации» — UI визуально показывает «Пользователь (user_id)» как выбранный, а в `state.brief.randomization_unit` остаётся `null` (значение из `initialBrief` в `reducer.js`). То есть **визуальная индикация выбора не соответствует state** — preselect показывается, но `ANSWER_QUESTION` не диспатчится.

**Задача Code:**

1. Изучить `src/components/brief/SingleSelect.jsx` (используется для Q01, Q03, Q06). Понять, как там обрабатывается preselect.
2. Решить: либо
   - **(a)** при mount компонента, если в state нет значения, но есть `defaultValue` (preselect), сразу диспатчить `ANSWER_QUESTION` с этим значением — state и UI синхронизируются.
   - **(b)** убрать preselect из UI полностью — пользователь обязан кликнуть.

**Рекомендую (a)** — preselect полезен для UX, просто его нужно проводить через reducer как «явный ответ при заходе на вопрос». Похоже на паттерн `applyEnterDefaults` уже работающий для Q04 metric_name и Q10 decision rules. Можно расширить `applyEnterDefaults` чтобы выставлять `randomization_unit = 'user'` при заходе на Q06 если ещё не выставлен.

Проверь все вопросы с potential preselect:
- Q01 goal_type — есть ли preselect? Если да, тот же fix.
- Q03 metric_type — есть ли preselect? Если да, тот же fix.
- Q06 randomization_unit — preselect = `user`. **Fix необходим.**
- Q07 MDE unit — preselect = `relative_percent`. Проверь, есть ли проблема.

**Tests:** в `tests/lib/brief/defaults.test.js` добавить кейсы для новых entry-defaults (если используешь подход (a)).

### C.2. BUG-3: Q04 поле «Название» молча заменяет _ на пробел

**Симптом:** пользователь вводит `bounce_rate` в поле «Название» → в state.brief.metric_name попадает `bounce rate` (с пробелом). Соседнее поле «Колонка в CSV» корректно показывает `bounce_rate`.

**Задача Code:**

1. Изучить `src/components/brief/QuestionRenderer.jsx` секцию `text_with_column` (lines ~20-65).
2. Найти где происходит подмена `_` → ` `. Вероятно это **обратный snake-case** в onChange handler'е поля «Название».
3. **Fix:** убрать обратную конверсию. Поле «Название» сохраняет ровно то, что ввёл пользователь — включая подчёркивания. Поле «Колонка в CSV» при `columnTouched === false` derived'ится из name через прямую конверсию `name.toLowerCase().replace(/\s+/g, '_')` — если в name уже подчёркивания, они сохраняются, пробелы заменяются на подчёркивания.

После фикса:
- Ввод `bounce_rate` → state.metric_name = `bounce_rate`, state.metric_column = `bounce_rate` (auto-derived, не touched).
- Ввод `bounce rate` → state.metric_name = `bounce rate`, state.metric_column = `bounce_rate`.
- Если пользователь touches column field руками, он перестаёт авто-derived'иться (текущее поведение сохраняется).

**Tests:** обновить relevant тесты для metric_name input (если есть). Минимум — добавить кейс «ввод с подчёркиванием не конвертируется в пробел».

### C.3. BUG-4: Conditional sub-question для `goal_type=other`

**Симптом:** при выборе «Другое» на Q01 нет поля для ручного ввода — информация теряется.

**Задача Code:**

По аналогии с существующими conditional sub-questions:
- Q03 `metric_type=ratio` → sub-question числитель/знаменатель (`brief.ratio_components`).
- Q06 `randomization_unit=cluster` → sub-question `cluster_field`.

Делаем:
- **State shape:** добавить `state.brief.goal_description: string | null` (null по умолчанию).
- **Reducer:** в `ANSWER_QUESTION` для field='goal_type', если value !== 'other', занулять goal_description (по аналогии с обнулением ratio_components/cluster_field в `answerQuestion` reducer.js:133-145).
- **UI:** в `src/components/brief/QuestionRenderer.jsx` для Q01 (`goal_type` SingleSelect) — если выбран `'other'`, отрендерить под опциями text input «Опиши кратко что тестируешь». Стиль — как existing sub-questions (см. cluster_field или ratio_components).
- **render.js:** в `templates/test_plan.md.tmpl` и `src/lib/plan/render.js` — добавить опциональное поле `goal_description` в YAML frontmatter (только если непустое, чтобы не загромождать).
- **parse.js:** в `mapFrontmatter` (`src/lib/plan/parse.js`) — читать `goal_description` если есть, мапить в brief.
- **isQuestionAnswered:** Q01 считается отвечённым если `goal_type !== null` (текущее поведение). При `goal_type === 'other'` — дополнительно проверить, что `goal_description` непустой (иначе question.id='goal_type' в карте остаётся в статусе «частично»). Хотя — может ослабить: всё ещё отвечён, просто опциональный description.

Реши сам как обрабатывать пустой goal_description когда goal_type=other. Я склоняюсь к: «можно оставить пустым, не блокирует, просто пользователь не уточнил». Сообщи в sprint report своё решение.

**DATA_MODEL.md update:** это `docs/context/` — Cowork-зона. Code НЕ редактирует. Cowork обновит DATA_MODEL.md в CLOSE Sprint 4 одним batch'ем с другими доками. В коде же поле опциональное — парсер не падает если его нет в YAML.

**Tests:**
- `tests/state/reducer.test.js`: кейс «при `goal_type=other` сохраняется goal_description; при смене на другой goal_type — goal_description обнуляется».
- `tests/lib/plan/parse.test.js`: round-trip кейс с непустым goal_description.
- `tests/lib/plan/render.test.js`: snapshot обновится — добавится новая опциональная строка в YAML.

### C.4. Acceptance Phase C

- На Q06 не кликая опции нажать «Дальше» → в карте Q06 = ✓ (отмечена как отвечённая). state.brief.randomization_unit = 'user'.
- На Q04 ввести `bounce_rate` в «Название» → отображается `bounce_rate` (с подчёркиванием). Column-поле показывает `bounce_rate`.
- На Q01 выбрать «Другое» → появляется text input. Ввод сохраняется в state. test_plan.md содержит `goal_description: "..."` (если не пустое).
- Round-trip: загрузить test_plan.md с goal_type=other и goal_description — бриф восстановлен корректно.
- `npm test` зелёный (+5-10 новых тестов).
- `npm run build` чистый.

**Phase C commit:** `fix(sprint-4-fix-phase-c): brief preselect persistence + Q04 underscore + Q01 other description`.

---

## ADR Compliance

| ADR | Соблюдено |
|---|---|
| ADR-001 (no backend) | ✓ Все правки на клиенте, никаких fetch. |
| ADR-002 (артефакты как переносимое состояние, строгий парсинг) | ✓ `goal_description` — опциональное поле, парсер не падает если отсутствует. Round-trip покрыт. |
| ADR-003 (структурная оценка) | ✓ Никаких новых правил скоринга. |
| ADR-004 (тул не принимает решений) | ✓ Warning в header ноутбука / PlanInfoCard — информирование, не решение. |
| ADR-005 (5-шаговый флоу) | ✓ Переход «Утвердить → Перейти к конструктору» — закономерная навигация в рамках одного шага. |
| ADR-006 (approved/draft) | ✓ Не трогаем. |
| ADR-007 (4 demo-csv) | ✓ Не трогаем. |
| ADR-010 (стек, deps) | ✓ Никаких новых npm-зависимостей. |

---

## Files involved

**Phase A (создаём/модифицируем):**
- `templates/notebook/{load,srm,balance,novelty,guardrails,segments,bootstrap_ci}.cells.json` — убрать номера в первой markdown-source строке.
- `templates/notebook/main_test/{z_test,t_test,welch,bootstrap}.cells.json` — то же.
- `src/lib/plan/notebook-builder.js` — slugify regex + duration grammar + header warning блок для fallback.
- `src/lib/brief/defaults.js` — убрать лишнюю точку в decision rules.
- `tests/lib/plan/notebook-builder.test.js` — добавить ~4 кейса.
- `tests/lib/brief/defaults.test.js` — добавить 1 кейс.

**Phase B (модифицируем):**
- `src/components/plan/PlanActions.jsx` — трансформация Утвердить → К конструктору.
- `src/pages/NotebookBuilderPage.jsx` — sticky bottom bar.
- `src/components/notebook/PlanInfoCard.jsx` — warning баннер для fallback test_method.

**Phase C (модифицируем + создаём):**
- `src/state/reducer.js` — initialBrief.goal_description, обнуление при смене goal_type.
- `src/lib/brief/defaults.js` — возможно расширить applyEnterDefaults для preselect Q06 (если выбран подход (a) для BUG-5).
- `src/components/brief/SingleSelect.jsx` — изменения для preselect (если выбран подход (a)).
- `src/components/brief/QuestionRenderer.jsx` — убрать обратную конверсию `_→space` для name; добавить sub-question text input для goal_type=other.
- `src/lib/plan/parse.js` — читать goal_description из YAML.
- `src/lib/plan/render.js` + `templates/test_plan.md.tmpl` — писать goal_description если непустое.
- `tests/state/reducer.test.js` — кейсы для goal_description, preselect persistence.
- `tests/lib/brief/defaults.test.js` — кейсы для расширенного applyEnterDefaults.
- `tests/lib/brief/progress.js` или relevant test — кейсы для isQuestionAnswered с preselect.
- `tests/lib/plan/parse.test.js` — round-trip с goal_description.

**Не трогаем:**
- `docs/` — Cowork-зона. DATA_MODEL.md обновится Cowork'ом в CLOSE.
- `src/lib/plan/{sample-size,scoring,test-method-selector,direction}.js` — Sprint 3 контракт.
- `package.json` — никаких новых deps.

---

## DO NOT

- ❌ **Не добавлять** новые npm-зависимости.
- ❌ **Не делать** динамическую нумерацию ячеек в builder (для NB-BUG-1) — выбран простой вариант «убрать номера».
- ❌ **Не редактировать** `docs/context/DATA_MODEL.md` — это Cowork-зона, обновится в CLOSE.
- ❌ **Не «заодно» рефакторить** соседний код. Особенно — не трогать `notebook-builder.js` сильно, нужны точечные правки (slugify regex, duration grammar, header warning).
- ❌ **Не добавлять** UI/RTL тесты — только Vitest unit-тесты.
- ❌ **Не делать** новые ячейки шаблонов (cuped, delta_method) — это отдельный спринт.
- ❌ **Не пытаться** добавить `mannwhitney`-вариант ячейки main_test — bootstrap fallback остаётся как сейчас, но с заметным warning. Это и есть Concern #3 решение «(а)».
- ❌ **Не трогать** Sprint 3 контракты (round-trip render↔parse должен продолжать работать).

---

## Acceptance criteria (overall)

После всех 3 phase:

1. `npm test` зелёный, всего тестов ~220-230 (было 213).
2. `npm run build` чистый.
3. Сгенерированный ноутбук:
   - Header не содержит порядковых номеров `## 1.`, `## 2.` и т.д. в названиях секций.
   - Для duration=1 пишет «1 day», для 2+ — «N days».
   - Decision rules без двойной точки.
   - test_id для названий с `ё` — содержит `ё`.
   - Для `delta_method`/`mannwhitney` — заметный warning-блок в header.
4. UI шаг 2:
   - В approved-режиме кнопка «Перейти к конструктору →» вместо «Утвердить».
5. UI шаг 3:
   - Жёлтый warning в PlanInfoCard для fallback test_method (ratio).
   - Кнопка скачивания всегда видна при скролле (sticky bottom).
6. UI шаг 1:
   - Q06 при принятии дефолтного выбора (Дальше без клика) — карта отмечает ✓.
   - Q04 поле «Название» сохраняет подчёркивания.
   - Q01 при выборе «Другое» — появляется text input для уточнения.
7. Парсер: загрузка test_plan.md с `goal_description` — корректно восстанавливает state.

---

## Sprint Fix Report — что ожидаем

В `docs/project/sprint-4-fix-report.md`. По phase + общая статистика тестов + bundle. Особое внимание:

- **BUG-5 root cause** — что именно ты нашёл в SingleSelect, какой вариант выбрал ((a) или (b)).
- **BUG-3 root cause** — где была обратная конверсия `_→space` в QuestionRenderer.
- **BUG-4 семантика goal_description пустого** — как решил обрабатывать (заблокировать переход / accept как опциональное / прочее).
- **Phase A → B → C порядок коммитов** — три отдельных коммита.
- Time tracking по phase.

После — Cowork RETEST + CLOSE Sprint 4 (включая обновление DATA_MODEL.md, JTBD, CONTEXT, PROJECT_STATUS, Dev-Cycle).

---

## Related

- `docs/project/test-cases-sprint-4.md` — таблица багов (BUG-1...BUG-5, NB-BUG-1...NB-BUG-5).
- `docs/project/code-review-sprint-4.md` — Concern #3 (теперь = NB-BUG-2).
- `docs/project/sprint-report-4.md` — Known Issues, секция про editedExternally / round-trip.
- `docs/context/DATA_MODEL.md` — будет обновлён в CLOSE с полем `goal_description`.
- `docs/context/decisions-log.md` — ADR-002, 006 не затрагиваются.
