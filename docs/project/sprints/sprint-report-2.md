# Sprint 2 Report — Brief Questions Q01-Q10 + Advanced Params + Interactive Map

**Dates:** 2026-05-15
**Status:** Complete

## Goal

Полный бриф из 10 вопросов с реактивной картой и прогресс-баром: рендер каждого вопроса, мягкая валидация, парсер 4 слотов гипотезы, динамический список guardrails, продвинутые параметры. Без sample size / data peek / localStorage / парсинга test_plan.md.

## What was built

**Чистая логика — `src/lib/brief/`**

- `questions.js` — registry 10 вопросов с `yamlPath` строго по `DATA_MODEL.md`. Подвопросы Q03.1 (`ratio_components`) и Q06.1 (`cluster_field`) — как nested внутри родителя через `subQuestions[]` с `revealsWhen`. Дополнительно: `baselineUnitOptionsFor(metricType)`, `GOAL_OPTIONS`, `METRIC_TYPE_OPTIONS`, `RANDOMIZATION_UNIT_OPTIONS`, `MDE_UNIT_OPTIONS`, `TRAFFIC_UNIT_OPTIONS`, `GUARDRAIL_SUGGESTIONS`.
- `hypothesis-parser.js` — `parseHypothesis(text) → { change, metric, direction_magnitude, mechanism }` и `extractMetricName(text) → string | null`. Эвристики по 4 слотам строго из BRIEF_TREE Q02. **Использует Unicode-aware boundaries `(?<![\p{L}])…(?![\p{L}])`** — JS `\b` работает по ASCII word chars и ошибочно матчит «то» внутри «потому». Это поймал на первом прогоне тестов (10/16 fail) и пофиксил.
- `validators.js` — soft валидаторы для baseline / mde / daily_traffic / guardrails / hypothesis. Все возвращают `{ ok, message }` (никогда `null`/`undefined` — упрощает UI).
- `progress.js` — `isQuestionAnswered`, `countAnswered`, `shortAnswerPreview` для прогресс-бара и карты. Для Q10 «answered» = любой из трёх decision rules непустой; defaults подставляются в state при первом mount Q10.

**Тесты — `tests/lib/brief/`**

- `hypothesis-parser.test.js` — **16 кейсов** (запрошено минимум 8): все 4 слота, частичные кейсы из промпта, «упадёт/снизится/повысится» глаголы, нелатинские единицы (`50 ₽`), case-insensitive + лишние пробелы, метрика обязательно непустая. Плюс 4 кейса для `extractMetricName`.
- `validators.test.js` — **22 кейса** (запрошено минимум 15): proportion в % и в долях, > 100%, ≤ 0, fraction ≥ 1; continuous > 0 и ≤ 0; MDE relative_percent > 50%, absolute_pp > baseline (включая baseline в fraction), absolute_value, MDE = null; daily_traffic unit совпадает / не совпадает с randomization_unit, `unknown` не triggers; guardrails пустой / непустой; hypothesis empty / non-empty.
- Все 39 тестов (включая smoke) — зелёные.

**State — `src/state/reducer.js`**

Расширен `initialState.brief` строго по схеме из промпта. **Дефолты НЕ применяются в initial state** (все поля `null`/`''`) — defaults показываются UI-компонентами, но засчитываются в прогресс только после явного выбора. Это даёт корректную UX-картинку «0/10» при открытии Q01.

Новые actions: `ANSWER_QUESTION`, `UPDATE_HYPOTHESIS`, `GOTO_QUESTION`, `TOGGLE_ADVANCED`, `SET_ADVANCED`, `ADD_GUARDRAIL`, `REMOVE_GUARDRAIL`, `UPDATE_GUARDRAIL`. `UPDATE_HYPOTHESIS` сам вызывает `parseHypothesis` для пересчёта slots — reducer остаётся pure (parseHypothesis тоже pure).

Side effects в reducer: смена `metric_type` с `ratio` сбрасывает `ratio_components`; смена `randomization_unit` с `cluster` сбрасывает `cluster_field`. Это нужно, чтобы будущий парсер test_plan.md не получил «висящие» ответы от другой ветки.

**UI — `src/components/brief/`** (11 файлов)

- `QuestionRenderer` — диспетчер по `question.type`. Внутри — `MetricNameInput` (auto-prefill из `extractMetricName(hypothesis.text)` на первом mount; snake_case колонки авто-генерируется до первого ручного редита `metric_column`), `RatioPair`/`ClusterField` (inline sub-questions), `BaselineInput` (берёт unit options через `baselineUnitOptionsFor(metric_type)` — для `continuous` это free-text единица).
- `SingleSelect` — карточки-кнопки с акцентным border при выборе, поддержка `defaultValue` для визуального preselect (state может оставаться `null` пока пользователь не кликнет).
- `HypothesisInput` — textarea с placeholder-шаблоном + 4 индикатора слотов (✓/·) и счётчик «X / 4 слотов». Реактивно обновляется при вводе через `UPDATE_HYPOTHESIS`.
- `NumberWithUnit` — number input + select для unit, либо free-text unit (через prop `freeUnit`) для континуальной метрики.
- `TextInput` — обёртка над `<input>`/`<textarea>` с лейблом и подсказкой.
- `GuardrailsList` — 2 карточки-предложения с дедупликацией по `name` (уже добавленные disabled с пометкой), inline-редактор каждой строки (name/column/direction/threshold), кнопки «×» и «+ Добавить guardrail».
- `StopAndDecisionRules` — чекбоксы stop conditions + 3 textarea ship/iterate/kill. **Defaults подставляются на первом mount** через `useEffect`, с подстановкой MDE из Q07 (формула «MDE/2 rel.»). Если пользователь стёр всё — defaults не возвращаются (sticky touched state).
- `AdvancedParams` — collapsible через `state.brief.advancedExpanded`. Свёрнутый — одна строка с дефолтами (`α=0.05 · power=0.8 · two-sided`). Раскрытый — 6 полей (α, power, two_sided, variance_reduction, stratification_by, holdback_percent).
- `ProgressBar` — `countAnswered(brief) / 10` с акцентной полоской.
- `QuestionNav` — «Назад» скрыт на Q01, на Q10 кнопка превращается в «ЗАВЕРШИТЬ» (триггерит `setFinished(true)` локально в `BriefPage`, шаг 2 остаётся locked).
- `QuestionMap` — кликабельные строки с дедикейтед статус-иконкой (✓/→/·), отдельный «▸/▾» toggle разворачивает inline-preview из `shortAnswerPreview`. В конце — disabled пункт «Data peek (опционально) — SPRINT 3+».

**BriefPage** переписан полностью: Stepper (без правок) → ProgressBar → текущий вопрос (карточка с номером, заголовком, hint, QuestionRenderer, soft warning из активного валидатора, Q08-only placeholder про sample size, QuestionNav, finish-toast на Q10) → AdvancedParams collapsible → справа QuestionMap.

**Tech Debt из Sprint 1 закрыт.** В `@theme` добавлены токены `--color-warn-soft`, `--color-warn-border`, `--color-danger-soft`, `--color-tour-hover`. Inline `bg-[rgba(...)]` в `Header.jsx` (hover кнопки тура) и `StartScreen.jsx` (warn-toast) заменены на классы `bg-tour-hover` / `bg-warn-soft` / `border-warn-border`. Подтверждено что новые токены попадают в CSS-бандл (grep по `dist/assets/*.css`).

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/brief/questions.js` | Registry 10 вопросов + options + GUARDRAIL_SUGGESTIONS |
| `src/lib/brief/hypothesis-parser.js` | parseHypothesis + extractMetricName |
| `src/lib/brief/validators.js` | Soft валидаторы (baseline / mde / daily_traffic / guardrails / hypothesis) |
| `src/lib/brief/progress.js` | isQuestionAnswered, countAnswered, shortAnswerPreview |
| `tests/lib/brief/hypothesis-parser.test.js` | 16 кейсов |
| `tests/lib/brief/validators.test.js` | 22 кейса |
| `src/components/brief/QuestionRenderer.jsx` | Диспетчер по типу + MetricNameInput / RatioPair / ClusterField / BaselineInput inline |
| `src/components/brief/SingleSelect.jsx` | Q01 / Q03 / Q06 |
| `src/components/brief/HypothesisInput.jsx` | Q02 |
| `src/components/brief/NumberWithUnit.jsx` | Q05 / Q07 / Q08 |
| `src/components/brief/TextInput.jsx` | Q04 поля + Q03.1 / Q06.1 |
| `src/components/brief/GuardrailsList.jsx` | Q09 |
| `src/components/brief/StopAndDecisionRules.jsx` | Q10 |
| `src/components/brief/AdvancedParams.jsx` | Collapsible advanced block |
| `src/components/brief/ProgressBar.jsx` | Реактивный N/10 |
| `src/components/brief/QuestionNav.jsx` | Назад / Дальше / Завершить |
| `src/components/brief/QuestionMap.jsx` | Кликабельная карта с inline preview |

## Files Modified

| File | Changes |
|------|---------|
| `src/state/reducer.js` | Расширен `initialState.brief` + новые actions + side effects (clear ratio/cluster при смене ветки). Импорт `parseHypothesis` для `UPDATE_HYPOTHESIS`. |
| `src/pages/BriefPage.jsx` | Переписан под новые компоненты + активная валидация + Q08 placeholder про sample size + finish-toast Q10. |
| `src/styles/index.css` | Добавлены `--color-warn-soft`, `--color-warn-border`, `--color-danger-soft`, `--color-tour-hover` в `@theme`. |
| `src/components/Header.jsx` | `hover:bg-[rgba(...)]` → `hover:bg-tour-hover`. |
| `src/pages/StartScreen.jsx` | `bg-[rgba(...)]` + `border-[rgba(...)]` toast → `bg-warn-soft` + `border-warn-border`. |

## Структура `state.brief` после Sprint 2

Cowork может использовать как basis для парсера test_plan.md (Sprint 5-6):

```js
brief: {
  currentQuestion: Number, // 1..10, UI-only
  goal_type: 'product_change' | 'content' | 'algorithm' | 'marketing' | 'other' | null,
  hypothesis: {
    text: String,
    slots: { change: Bool, metric: Bool, direction_magnitude: Bool, mechanism: Bool },
  },
  metric_type: 'proportion' | 'continuous' | 'ratio' | 'count' | null,
  ratio_components: { numerator: String|null, denominator: String|null },
  metric_name: String,
  metric_column: String,
  baseline: { value: Number|null, unit: 'percent' | 'fraction' | 'per_user' | String /* free for continuous */ | null },
  randomization_unit: 'user' | 'session' | 'cluster' | 'unknown' | null,
  cluster_field: String | null,
  mde: { value: Number|null, unit: 'relative_percent' | 'absolute_percentage_points' | 'absolute_value', direction: 'increase' | 'decrease' | 'any' },
  daily_traffic: { value: Number|null, unit: 'user' | 'session' },
  guardrails: [{ name, column, direction: 'max'|'min', threshold: { value, unit: 'relative_percent'|'absolute' } }],
  stop_conditions: { srm_detected, guardrail_breach_24h, length_cap_days: Number|null, manual_stop },
  decision_rules: { ship: String, iterate: String, kill: String },
  advanced: {
    alpha: 0.05, power: 0.8, two_sided: true,
    variance_reduction: null | 'cuped',
    stratification_by: String | null,
    holdback_percent: Number | null,
  },
  advancedExpanded: Bool, // UI-only
}
```

## ADR Compliance

| ADR | Соблюдение |
|---|---|
| ADR-001 (no backend) | Никаких fetch. |
| ADR-002 (артефакты как переносимое состояние) | Все yamlPath в registry соответствуют DATA_MODEL.md (test_plan.md frontmatter). Side effects сбрасывают «висящие» поля при смене ветки. |
| ADR-003 (структурная оценка) | Hypothesis parser считает только наличие 4 слотов, не оценивает «качество». |
| ADR-004 (тул не принимает решений) | Нет логики «эта гипотеза слабая, перепиши» — только структурные индикаторы. |
| ADR-005 (5-шаговый флоу) | Шаги 2-5 остаются locked. Завершение Q10 показывает inline-сообщение, не диспатчит ничего, не открывает шаг 2. |
| ADR-008 (тур без overlay) | Тур-плашки по-прежнему не реализуем — только toggle класса (как в Sprint 1). |
| ADR-010 (стек) | Никаких новых npm-зависимостей. Только React + react-router-dom + Tailwind + Vitest. Никаких React-импортов в `src/lib/`. |

## Локальные решения, которые стоит обсудить

1. **Defaults Q01/Q06 не применяются в initial state.** В registry default — `'product_change'` (Q01) и `'user'` (Q06), но в `initialState.brief` оба `null`. Это даёт честный «0/10» при открытии Q01 (acceptance #24 ожидает «после Q01 → 1/10»). UI компоненты (`SingleSelect`) принимают `defaultValue` отдельно и подсвечивают визуально, но в state идёт только явный клик.
2. **Subquestions — nested внутри родителя**, не отдельные пункты массива. Это упрощает рендер: `QuestionRenderer` для Q03/Q06 фильтрует `subQuestions[]` по `revealsWhen` и рендерит inline. В карте вопросов справа — только 10 основных пунктов.
3. **Q10 «Завершить»** = `setFinished(true)` локально в `BriefPage`, показывает inline-сообщение «Бриф заполнен. Шаг „Тест-план“ будет разблокирован в следующем спринте.» в той же карточке Q10. Без модалки, без редиректа, без диспатча. Шаг 2 в степпере не разблокируется.
4. **Q10 decision_rules defaults подставляются в state на первом mount** компонента `StopAndDecisionRules` (через `useEffect`, только если все три поля пустые). Это позволяет `countAnswered` засчитать Q10 как заполненный сразу когда пользователь дошёл до него. Если пользователь полностью стёр все три — в прогрессе Q10 опять становится незаполненным.
5. **MetricNameInput — auto-snake_case с «touched override».** При вводе названия метрики `metric_column` авто-генерируется (lowercased ASCII + `_`); как только пользователь руками тронет поле `metric_column`, авто-генерация отключается (через локальный `useState(columnTouched)`).
6. **Snake_case кириллицы не транслитерирую.** Если `metric_name` написано только по-русски — `metric_column` останется пустым, пользователь введёт сам. Транслит — отдельная фича, не в скоупе.
7. **Length cap days defaults to `null` (выключено), при клике чекбокса включается с дефолтом 10**. Промпт оставил это на моё усмотрение: «дефолт `null` или просто placeholder „10“».
8. **`activeValidation(brief, questionId)` живёт inline в BriefPage.** Это диспетчер по id вопроса в нужный валидатор. Если в будущем валидаторов станет больше — вынесу в `src/lib/brief/active-validator.js`. Сейчас 5 случаев, не оправдывает отдельный файл.
9. **GuardrailsList — карточка-предложение дисейбленая, если такой `name` уже в списке** (не скрываю — пользователь видит, что предложение существует и уже использовано). Acceptance это не оговаривает явно, но это разумный UX.

## Known Issues

1. **Деплой я не запускал** — у меня нет write-доступа к GitHub. Acceptance criteria 1-2 (workflow зелёный, сайт открывается) и 5-35 (живой UI) проверит пользователь после `git push`.
2. **UI-тесты не писал** (промпт явно запрещает). Логика чистая (lib/brief/) покрыта 38 unit-тестами, но реактивность state ↔ UI не проверена автоматически.
3. **`StrictMode` + `useEffect` для defaults.** `MetricNameInput` и `StopAndDecisionRules` используют `useEffect(() => { ... }, [])` для prefill дефолтов на первом mount. В dev-режиме StrictMode выполнит эффект дважды; обе функции защищены условием (`if (!brief.metric_name)`, `if (!rules.ship && !rules.iterate && !rules.kill)`), так что повторный запуск ничего не сломает. В prod (билде) `StrictMode` single-run — тоже норм.
4. **A11y — поверхностное.** Поставил `aria-pressed` на single-select карточках, `aria-current` / `aria-disabled` на навигации, `aria-expanded` на advanced toggle, `aria-label` на × кнопке guardrail. Полного аудита (фокус-стили на input, ARIA для readback warnings, screen reader для карты) не проводил — кандидат на отдельный спринт.
5. **Mobile responsive не тестирован.** Grid `md:grid-cols-[1.4fr_1fr]` сворачивается на узких. GuardrailsList row на мобильных скорее всего поломается — `grid-cols-[1.2fr_1fr_1fr_1.1fr_auto]` тесновато для < 640px. Кандидат на отдельный спринт.
6. **Q07 MDE — нет UI для `direction`.** В state есть `mde.direction` (`increase`/`decrease`/`any`), но в UI нет переключателя — фиксируется как `increase`. В BRIEF_TREE Q07 написано «direction из Q02», то есть должно derive'иться из глагола гипотезы. Это derive-логика, которую я не делал в этом спринте (нет в acceptance). Кандидат на следующий спринт — либо вытащить из гипотезы (вырастет → increase, упадёт → decrease), либо добавить explicit-переключатель.
7. **«Завершить» не сбрасывается при возврате назад.** Если пользователь нажал «Завершить» на Q10, потом вернулся на Q9 и снова дошёл до Q10 — toast уже не покажется без перезагрузки. `finished` живёт в `useState` `BriefPage`, не в reducer. Не критично — toast информационный, но если хочется sticky-сообщение, нужно переехать в state.
8. **Расчётный sample size — placeholder только под Q08.** Промпт явно говорит «никакого реального расчёта», но в UI это значит, что пользователь между Q05 и Q08 не видит индикатор «сколько примерно нужно трафика». Это будет в Sprint 3.

## Notes

**Что хорошо проверилось локально:**
- `npm test` — 39 / 39 зелёные (16 hypothesis-parser + 22 validators + 1 smoke).
- `npm run build` — без warnings и ошибок. CSS 20.2 KB (gzip 4.8), JS 277.7 KB (gzip 86.9). Прирост к Sprint 1: +4 KB CSS, +36 KB JS — пропорционально 11 новым компонентам и lib/brief.
- `npm run preview` — отдаёт 200 на `/stat-plan/`, в CSS-бандле подтверждены классы `bg-warn-soft`, `bg-tour-hover`, `border-warn-border` и CSS-переменные `--color-warn-soft`, `--color-warn-border`, `--color-tour-hover` — Tech Debt действительно закрыт.

**Что НЕ проверил локально (нужен живой браузер):**
- Acceptance #5-35 целиком — реактивность всех вопросов, переходы по ratio/cluster sub-questions, drag-and-drop на стартовом (Sprint 1 регрессия), advanced collapsible, карта вопросов с расхлопыванием.
- Что dispatch цепочка `text → UPDATE_HYPOTHESIS → parseHypothesis → slots → 4 индикатора` действительно реактивна (статически код выглядит ok, но без браузера не подтверждено).
- Mobile / cross-browser (Chrome/Firefox).

**Метрика длительности (DEV):**
- Старт DEV: ~01:00 (после прочтения промпта и контекста)
- Конец DEV (до коммитов): ~01:30
- Чистое время реализации: **~30 минут** (тестирование + кодинг + tech debt + локальная проверка)

Это **первый спринт с реальной бизнес-логикой** (hypothesis parser, validators, registry-driven UI), а не каркасный. Заметно дольше Sprint 1 (13 минут), что ожидаемо.

**Вопросы для Cowork:**
- Direction MDE — derive из гипотезы или отдельный input в Q07? Я склоняюсь к derive (вырастет/упадёт → increase/decrease).
- Sticky finish-toast Q10 — переехать в state или оставить в `useState` BriefPage? Зависит от того, насколько важно «помнить, что пользователь уже завершил».
- Snake_case транслит кириллицы — нужен ли в v1, или достаточно ручного ввода `metric_column`?

**Ссылка на Pages-деплой:** будет известна после `git push`. Ожидаемый URL: `https://cosmiksoul.github.io/stat-plan/`.
