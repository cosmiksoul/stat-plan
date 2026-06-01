# Sprint 2 — Brief Questions Q01-Q10 + Advanced Params + Interactive Map

**Type:** Code sprint
**Estimated:** 5-7 дней работы

---

## Overview

Реализовать полный бриф из 10 вопросов с реактивной картой и прогресс-баром. Включает: рендер каждого вопроса, валидацию (мягкую, не блокирующую), парсер 4 слотов гипотезы, динамический список guardrails, продвинутые параметры (раскрывающийся блок), кликабельную карту вопросов со статусами.

**Sample size derive, data peek (csv), localStorage, парсинг загруженного test_plan.md, разблокировка шага 2 — НЕ в скоупе.** См. DO NOT.

Sprint 2 — первый спринт с **бизнес-логикой**: появляется `src/lib/brief/` модуль с парсером гипотезы и валидаторами, первые Vitest unit-тесты на реальном коде.

---

## Scope (user stories из JTBD.md)

### Из § 2 «Бриф: дерево вопросов»

- ★ Один вопрос на экран
- ★ Прогресс N/10 реактивный (закрывает [~] из Sprint 1)
- ★ Гипотеза по шаблону «если/то/потому что»
- Автоматическая проверка 4 слотов гипотезы (изменение/метрика/направление/механизм)
- ★ Выбор типа метрики (proportion/continuous/ratio/count)
- Ratio → числитель/знаменатель (Q03.1)
- ★ Baseline (число + единица, зависит от типа метрики)
- ★ Единица рандомизации (user/session/cluster) + Q06.1 поле кластеризации
- ★ MDE (число + 3 типа единиц)
- ★ Guardrails (минимум один)
- Дефолтные предложения для guardrails
- Stop conditions + decision rules с дефолтами (подстановка MDE из Q07)
- Advanced параметры (α, power, two-sided, variance reduction, stratification, holdback)

### Из § 3 «Карта вопросов»

- ★ ◆ Клик по карте → переход на вопрос (закрывает [~] из Sprint 1)
- ◆ Расхлопывание стрелочкой → inline preview ответа
- Статус каждого вопроса (✓ отвечено / → текущий / · пусто)
- Превью ответа в свёрнутом виде

### Из § 9 «Кросс-функциональные»

- Подсказка о клавиатурной навигации (Tab, Enter в формах)

---

## Что НЕ закрываем в этом спринте

(Отдельно подсвечиваю, чтобы не было соблазна «заодно».)

- ★ Sample size + duration сразу после MDE/traffic — **формул нет в этом спринте**. Показываем placeholder «Будет рассчитан на шаге Тест-план». Sprint 3.
- Data peek загрузка csv — Sprint 3 или 4.
- localStorage — отдельный спринт, не сейчас.
- Парсинг загруженного `test_plan.md` — Sprint 5-6 (после того как есть state.brief и state.plan).
- Разблокировка шага 2 — шаг 2 остаётся `locked` в степпере, как в Sprint 1. Логика «когда план становится approved» — будущий спринт.
- Click→file picker на карточке «У меня уже есть план» (новая user story из Sprint 1 review) — отдельная небольшая задача, можно сделать одной строкой в этом спринте, **только если будет время**. Не критично.
- @fontsource swap — low priority, оставляем Google Fonts.

---

## Tasks

### 1. Модуль `src/lib/brief/` (чистая логика, без React)

Первый чистый библиотечный модуль. Тестируется отдельно через Vitest.

**`src/lib/brief/questions.js`**

Экспортирует **массив описаний 10 вопросов** в порядке, описанном в `docs/context/BRIEF_TREE.md`. Каждый вопрос — объект с полями (используй структуру из `BRIEF_TREE.md` секция «Структура одного вопроса»):

```javascript
{
  id: 'metric_type',
  num: 3,
  required: true,
  title: 'Какого типа главная метрика?',
  hint: 'От этого зависит выбор статистического критерия',
  type: 'single_select',  // single_select | text | hypothesis | number_with_unit | guardrails_list | stop_decision | ratio_pair | cluster_field
  options: [...],          // для single_select
  default: null,
  yamlPath: 'metric_type', // куда мапится в state.brief
  branches: [               // подвопросы, открывающиеся при выборе значения
    { ifValue: 'ratio', revealsQuestion: 'ratio_components' },
  ],
}
```

Структура с подвопросами Q03.1 (ratio) и Q06.1 (cluster) — на твоё усмотрение: либо отдельные элементы массива со связью `parentId`, либо вложенные внутрь родителя как nested-описание. Выбирай тот вариант, который проще рендерится.

**`src/lib/brief/hypothesis-parser.js`**

Функция `parseHypothesis(text) → { change, metric, direction_magnitude, mechanism }` где каждое поле — `boolean` (есть слот / нет). Эвристики из `BRIEF_TREE.md` Q02:

- `change`: текст между «если» и «то/запятой»
- `metric`: текст между «то» и глаголом направления
- `direction_magnitude`: наличие глагола (вырастет/упадёт/снизится/повысится/изменится) **и** числа с `%` или единицей
- `mechanism`: текст после «потому что»

Также экспортируй `extractMetricName(text) → string | null` — если в hypothesis удалось вытащить название метрики из слота `metric`, вернуть её (используется как дефолт для Q04). Простая эвристика: текст между «то» и направлением-глаголом, обрезанный.

**`src/lib/brief/validators.js`**

Функции вида `validate<QuestionId>(value, state) → { ok: boolean, message: string | null }`. Использовать таблицу валидаторов из `BRIEF_TREE.md`:
- baseline: для proportion 0 < value < 100% или 0 < value < 1
- baseline: для остальных value > 0
- mde: warning если relative_percent > 50
- mde: warning если absolute_pp > baseline
- daily_traffic.unit должен совпадать с randomization_unit (warning, не блокер)
- guardrails: пустой список → warning (мягкая обязательность)

Все валидаторы возвращают `{ ok: true, message: null }` при успехе и `{ ok: false, message: '<текст>' }` при failure. **Никогда не возвращай `null` или `undefined`** — это упрощает UI.

### 2. Тесты на `src/lib/brief/`

**`tests/lib/brief/hypothesis-parser.test.js`**

Минимум 8 кейсов (для каждого варианта):

1. Полная гипотеза со всеми 4 слотами — все 4 `true`
2. Только «если X» — `change: true`, остальные `false`
3. «Если X, то Y» — `change: true, metric: true`, направления нет
4. «Если X, то Y вырастет» — без числа → `direction_magnitude: false`
5. «Если X, то Y вырастет на 8%» — `direction_magnitude: true`
6. «..., потому что Z» без остального — `mechanism: true`, остальные `false`
7. Пустая строка — все `false`
8. Полная гипотеза с глаголом «упадёт» вместо «вырастет» — детектится

**`tests/lib/brief/validators.test.js`**

По 2-3 кейса на каждый валидатор (минимум 15 кейсов суммарно).

### 3. Обновить state и reducer

Расширить `state.brief` согласно `docs/context/DATA_MODEL.md` (раздел `test_plan.md` frontmatter) + `docs/context/ARCHITECTURE.md` (раздел «Состояние приложения»).

```javascript
state.brief = {
  currentQuestion: 1,        // 1..10
  goal_type: null,           // Q01
  hypothesis: { text: '', slots: { change: false, metric: false, direction_magnitude: false, mechanism: false } },  // Q02
  metric_type: null,         // Q03
  ratio_components: { numerator: null, denominator: null },  // Q03.1 (только если ratio)
  metric_name: null,         // Q04
  metric_column: null,       // Q04 (snake_case дополнительное поле)
  baseline: { value: null, unit: null },  // Q05
  randomization_unit: null,  // Q06
  cluster_field: null,       // Q06.1 (только если cluster)
  mde: { value: null, unit: 'relative_percent', direction: 'increase' },  // Q07
  daily_traffic: { value: null, unit: 'user' },  // Q08
  guardrails: [],            // Q09 — массив объектов { name, column, direction, threshold: { value, unit } }
  stop_conditions: { srm_detected: true, guardrail_breach_24h: true, length_cap_days: null, manual_stop: false },  // Q10
  decision_rules: { ship: '', iterate: '', kill: '' },  // Q10
  advanced: {
    alpha: 0.05,
    power: 0.80,
    two_sided: true,
    variance_reduction: null,
    stratification_by: null,
    holdback_percent: null,
  },
  advancedExpanded: false,   // UI state — раскрыт ли блок advanced
}
```

**Actions** (добавить в `Actions` enum в `src/state/reducer.js`):

- `ANSWER_QUESTION` — { payload: { field: 'goal_type', value: ... } } — общая для всех простых ответов
- `UPDATE_HYPOTHESIS` — { text } → пересчитывает slots через `parseHypothesis`
- `GOTO_QUESTION` — { num } — переход на номер 1..10
- `TOGGLE_ADVANCED` — раскрывает/сворачивает блок advanced
- `SET_ADVANCED` — { field, value }
- `ADD_GUARDRAIL` / `REMOVE_GUARDRAIL` / `UPDATE_GUARDRAIL` — управление списком

Reducer должен быть детерминированным. Никакой логики «derive sample size» в reducer — этого нет в скоупе.

### 4. UI-компоненты

Создать в `src/components/brief/`:

- **`QuestionRenderer.jsx`** — диспетчер по `question.type`, рендерит соответствующий специфический компонент. Передаёт value и onChange.
- **`SingleSelect.jsx`** — для Q01, Q03, Q06. Список радио-кнопок или больших карточек.
- **`HypothesisInput.jsx`** — textarea с placeholder-шаблоном «Если [изменение], то [метрика] [направление] на [Δ], потому что [механизм]». Под полем — 4 чек-индикатора слотов (✓/·) с подписями. Обновляется реактивно при вводе.
- **`NumberWithUnit.jsx`** — для Q05, Q07, Q08. Number input + select для единиц.
- **`TextInput.jsx`** — для Q04, Q03.1 (numerator/denominator), Q06.1 (cluster_field).
- **`GuardrailsList.jsx`** — для Q09. Динамический список строк, каждая строка: name, column (snake_case), direction (max/min), threshold (number + unit). Кнопка [+ Добавить guardrail]. Сверху — карточки-предложения «Добавить bounce_rate +5% rel.» и «Добавить time_on_site −10% rel.» — клик добавляет в список.
- **`StopAndDecisionRules.jsx`** — для Q10. Чекбоксы stop conditions (3 шт + manual_stop) с числовым полем для length_cap_days. 3 textarea для ship/iterate/kill с дефолтными подстановками из MDE.
- **`AdvancedParams.jsx`** — collapsible блок. Когда свёрнут — одна строка «▶ Продвинутые параметры (α=0.05, power=0.80, ...)». Когда раскрыт — 6 полей: α, power, two_sided checkbox, variance_reduction (null/cuped), stratification_by (null/free text), holdback_percent (null/number).
- **`QuestionMap.jsx`** — **обновлённая** правая колонка карты вопросов:
  - Каждый пункт кликабельный → диспатчит `GOTO_QUESTION`
  - Статус: ✓ если поле в state не null/empty, → если currentQuestion, · иначе
  - Под текстом вопроса (когда раскрыт стрелочкой ▼) — inline preview значения в человеко-читаемом виде. Стрелочка маленькая, кликается отдельно от пункта.
  - Дополнительный пункт «+ Data peek (опционально)» в конце — **disabled с пометкой «Sprint 3+»**, не кликабелен.
- **`ProgressBar.jsx`** — реактивный, считает `answeredRequiredQuestions / 10`. Что считать answered: поле в state не null/empty. Для hypothesis — текст не пустой (4 слота не требуются). Дисплей: «N / 10 вопросов» + полоска шириной N*10%.
- **`QuestionNav.jsx`** — кнопки «← Назад» и «Дальше →». Назад скрыт на Q01. На Q10 кнопка называется «Завершить» (но шаг 2 остаётся locked, так что просто остаёмся на Q10 после клика, можно показать сообщение «Шаг 2 будет в следующем спринте»).

Обновить **`src/pages/BriefPage.jsx`** так, чтобы он:
- Использовал ProgressBar, QuestionRenderer, QuestionNav в основной колонке
- Использовал QuestionMap в боковой
- Под основной колонкой — AdvancedParams collapsible
- Сверху — степпер (без изменений)

### 5. Валидация — мягкая, не блокирующая

По всему брифу:
- Невалидное значение → сообщение под полем, **но кнопка «Дальше» не блокируется**. Это сознательное решение (см. FLOW.md шаг 1 — «если эвристика не находит слот, помечаем как незаполненный, но не блокируем переход»).
- Прогресс-бар считает только заполненные обязательные поля. Если пользователь пропустил вопрос — он считается незаполненным.

### 6. Routing

URL остаётся `/#/step1`. Текущий вопрос — в `state.brief.currentQuestion`. Никакого deep linking на конкретный вопрос (`/step1/q3` НЕ делаем). Это упрощение Sprint 2; deep linking — кандидат на будущее.

### 7. Содержимое тур-плашек

В этом спринте **не реализуем**. ADR-008 описывает финальное поведение, но в Sprint 1 был только toggle класса. В Sprint 2 продолжаем тот же подход — `body.tour` переключается, плашек самих нет.

---

## Technical Notes

### Зависимости

**Никаких новых npm-зависимостей.** Только то, что уже стоит после Sprint 1 (React, react-router-dom, Tailwind, Vitest).

### Где живут вопросы — registry vs встроенный JSX

`src/lib/brief/questions.js` — это **data**, не JSX. Описание вопроса (id, title, type, options, validators) — конфиг. Каждый рендер берёт описание из этой registry и передаёт в `QuestionRenderer`. Это упростит будущие расширения и сразу даёт переиспользуемую структуру для парсинга загруженного test_plan.md (Sprint 5-6).

### Не клади React-зависимости в `src/lib/`

`src/lib/brief/` — чистая логика, не импортирует React. Это критично для тестируемости и потенциального переиспользования. Импорт `from 'react'` в `src/lib/**` — это нарушение архитектуры.

### Тесты

Vitest конфиг внутри `vite.config.js` уже настроен. Просто кладёшь `*.test.js` файлы в `tests/lib/brief/` и они подхватываются.

Тестируешь только чистую логику: `hypothesis-parser`, `validators`. UI-компоненты в этом спринте не тестируем (React Testing Library не подключаем).

### Структура GuardrailsList и StopAndDecisionRules

Это самые сложные компоненты по UI. Не пытайся сделать их «идеально красиво». Сделай функционально и понятно. Если получается громоздко — раздели на подкомпоненты, но в рамках `src/components/brief/`.

### Что делать на Q10 после «Завершить»

Шаг 2 заблокирован. После последнего вопроса показывай сообщение «Бриф заполнен. Шаг „Тест-план“ будет разблокирован в следующем спринте.» Не пытайся ничего диспатчить, не пытайся разблокировать шаг 2.

### Стилизация

Используй те же токены из `@theme` в `src/styles/index.css`. Если понадобятся новые токены (например, для error-state input или disabled state) — добавь их в `@theme` рядом с существующими, **не используй inline rgba**.

Из tech debt Sprint 1 (см. `docs/project/CONTEXT.md` Tech Debt):
- При добавлении новых hover/state-цветов вынеси их как `--color-warn-soft`, `--color-warn-border` и т.п. Это закроет один из накопившихся пунктов.

---

## ADR Constraints

| ADR | Что значит для этого спринта |
|---|---|
| ADR-001 (no backend) | Никаких fetch-ов. Всё в state. |
| ADR-002 (артефакты как переносимое состояние) | state.brief заполняется ровно по схеме DATA_MODEL.md — иначе будущий парсер test_plan.md не сможет восстановить. **Внимательно следи за маппингом yamlPath в registry.** |
| ADR-003 (структурная оценка) | Не оцениваем «качество» гипотезы. Только проверяем наличие 4 слотов. Не пытайся сделать «hypothesis quality score» или подобное. |
| ADR-004 (тул не принимает решений) | Никаких «эта гипотеза слабая, перепиши». Только структурные индикаторы. |
| ADR-005 (5-шаговый флоу) | Шаги 2-5 остаются locked. |
| ADR-008 (тур без overlay) | Тур-плашки в этом спринте не делаем. |
| ADR-010 (стек) | Никаких новых npm-зависимостей. React state + useReducer + Context. |

---

## Files involved

**Создаём:**

- `src/lib/brief/questions.js`
- `src/lib/brief/hypothesis-parser.js`
- `src/lib/brief/validators.js`
- `tests/lib/brief/hypothesis-parser.test.js`
- `tests/lib/brief/validators.test.js`
- `src/components/brief/QuestionRenderer.jsx`
- `src/components/brief/SingleSelect.jsx`
- `src/components/brief/HypothesisInput.jsx`
- `src/components/brief/NumberWithUnit.jsx`
- `src/components/brief/TextInput.jsx`
- `src/components/brief/GuardrailsList.jsx`
- `src/components/brief/StopAndDecisionRules.jsx`
- `src/components/brief/AdvancedParams.jsx`
- `src/components/brief/QuestionMap.jsx` (заменяет inline список из Sprint 1)
- `src/components/brief/ProgressBar.jsx`
- `src/components/brief/QuestionNav.jsx`

**Модифицируем:**

- `src/state/reducer.js` — расширяем initialState и Actions
- `src/state/AppStateContext.jsx` — если нужны хелперы, добавляем
- `src/pages/BriefPage.jsx` — переписываем под новые компоненты
- `src/styles/index.css` — добавляем токены под warn/error состояния при необходимости (НЕ inline rgba)

**Не трогаем:**

- `src/components/Header.jsx`, `src/components/Stepper.jsx`
- `src/pages/StartScreen.jsx`
- `src/App.jsx`, `src/main.jsx`
- Конфиги (vite, tailwind, vitest, GitHub Actions workflow)
- `docs/`, `mockups/`, `CLAUDE.md`, `README.md`, `.gitignore`, `.gitattributes`

---

## Acceptance criteria (smoke + функциональные)

**Деплой и инфра:**

1. После push в `main` workflow `.github/workflows/deploy.yml` отрабатывает зелёным.
2. Сайт на `https://cosmiksoul.github.io/stat-plan/` открывается, навигация старт → шаг 1 работает (регрессия из Sprint 1).
3. `npm test` — все тесты Vitest проходят зелёным, включая новые `hypothesis-parser.test.js` и `validators.test.js`.
4. `npm run build` собирается без ошибок.

**Q01 Цель:**

5. Q01: 5 опций single-select. По умолчанию выбран `product_change`. Клик «Дальше» → Q02. State `state.brief.goal_type` = выбранное значение.

**Q02 Гипотеза:**

6. Q02: textarea с placeholder, показывающим шаблон. Под полем — 4 индикатора слотов (✓/·) с подписями «изменение», «метрика», «направление», «механизм».
7. Ввод текста «Если показать новый блок, то CR вырастет на 8%, потому что больше офферов» → все 4 индикатора стали ✓.
8. Ввод «Если изменить цвет» → только «изменение» = ✓.
9. Кнопка «Дальше» **не заблокирована** даже если не все слоты найдены. Переход на Q03.

**Q03 Тип метрики:**

10. Q03: 4 опции (proportion / continuous / ratio / count). Клик `ratio` → появляется Q03.1 с двумя текстовыми полями (числитель, знаменатель) inline.
11. Если выбрать другое значение (не ratio), Q03.1 скрывается.

**Q04 Имя метрики:**

12. Q04: text input для metric_name. Если в Q02 был распознан `metric` слот — поле префиксировано извлечённой строкой. Под main полем — поле column_name (snake_case), дефолт = автоматический snake_case от metric_name.

**Q05 Baseline:**

13. Q05: number input + select для единиц. Если Q03 = proportion → единицы `%` или `доля (0-1)` (дефолт `%`). Если Q03 = continuous → свободная единица.
14. Введение значения вне диапазона (например, 150% для proportion) → warning под полем «значение должно быть 0 < x < 100%». Но «Дальше» работает.

**Q06 Единица рандомизации:**

15. Q06: 4 опции. Выбор `cluster` → появляется Q06.1 text input «По какому полю кластеризуем?».

**Q07 MDE:**

16. Q07: number + 3 единицы (relative_percent / absolute_percentage_points / absolute_value). Дефолт relative_percent. При значении > 50% rel — warning «очень крупный эффект».

**Q08 Трафик:**

17. Q08: number + select юнита (user/session). Под полем — место для расчётного sample size: **показывается placeholder «Sample size и длительность будут рассчитаны на шаге Тест-план (Sprint 3)»**. Никакого реального расчёта.

**Q09 Guardrails:**

18. Q09: видны 2 карточки-предложения (bounce_rate +5% rel., time_on_site −10% rel.). Клик по карточке добавляет элемент в список ниже. Список пустой по умолчанию.
19. В списке каждая строка имеет: name, column, direction (max/min), threshold (number + unit). Кнопка [×] удаляет строку. Кнопка [+ Добавить guardrail] внизу — добавляет пустую строку.
20. Пустой список после клика «Дальше» → warning «не заданы guardrails». Но переход разрешён.

**Q10 Stop & Decision rules:**

21. Q10: 3 чекбокса stop conditions включены по умолчанию (SRM, guardrail_breach_24h, length_cap_days), 1 опционален (manual_stop). У length_cap_days — числовое поле (дефолт = вычисленная длительность × 2, но в Sprint 2 нет вычисленной длительности → дефолт `null` или просто placeholder «10»).
22. 3 textarea (ship/iterate/kill) с дефолтными текстами с подставленным MDE из Q07. Например, при MDE 8% rel.: дефолт ship = «CI не пересекает 0 и нижняя граница ≥ +4% rel.»

**Завершение брифа:**

23. На Q10 кнопка «Завершить» вместо «Дальше». Клик → сообщение «Бриф заполнен. Шаг „Тест-план“ будет разблокирован в следующем спринте.» Шаг 2 в степпере **остаётся locked**.

**Прогресс-бар:**

24. Прогресс-бар обновляется реактивно. После Q01 → 1/10. После Q02 (любой текст) → 2/10. И так далее. Если пользователь вернулся назад и стёр Q02 — прогресс становится 1/10.

**Карта вопросов:**

25. Карта справа кликабельна. Клик по любому пункту → переход на этот вопрос. Статус: ✓ (отвечено), → (текущий), · (пусто).
26. Стрелочка ▼ рядом с каждым пунктом разворачивает inline-превью значения (например, для Q05: «3.1%» — короткое читаемое представление).
27. Внизу карты — disabled пункт «+ Data peek (опционально) — Sprint 3+».

**Advanced параметры:**

28. Раскрывающийся блок «▶ Продвинутые параметры» под основной колонкой. По умолчанию свёрнут. В свёрнутом виде показана краткая сводка дефолтов в одну строку.
29. В раскрытом виде — 6 полей: α (number, default 0.05), power (number, default 0.80), two_sided (checkbox, default true), variance_reduction (select: null/cuped), stratification_by (text or null), holdback_percent (number or null). Изменение — диспатчит SET_ADVANCED.
30. Изменения в advanced **не сбрасываются** при переходе между вопросами.

**Назад/Дальше:**

31. Кнопка «← Назад» скрыта на Q01.
32. Кнопка «Дальше →» переходит на следующий по порядку вопрос. Через ratio/cluster подвопросы переходит логически (если включены).

**Регрессия Sprint 1:**

33. Стартовый экран по-прежнему работает (две карточки, drag&drop placeholder, тур-toggle).
34. Прямой URL `/#/step1` без прохождения через старт → редирект на `/`.
35. Reload на `/#/step1` → возврат на стартовый (state в памяти, без localStorage).

---

## DO NOT

- ❌ **Не считать sample size** ни в одном случае. Никакого `src/lib/brief/sample-size.js`. Все производные поля показываем как placeholder.
- ❌ **Не парсить csv** на data peek. Нет файл-input для historical.csv в этом спринте.
- ❌ **Не парсить test_plan.md** при drag-and-drop. Карточка В на стартовом экране — без изменений из Sprint 1.
- ❌ **Не использовать localStorage** для persistence. State по-прежнему в памяти.
- ❌ **Не разблокировывать шаг 2** в степпере, даже если бриф «заполнен».
- ❌ **Не делать тур-плашки** содержательно — только toggle класса остаётся как в Sprint 1.
- ❌ **Не подключать новые npm-зависимости** — только React + react-router-dom + Tailwind + Vitest.
- ❌ **Не подключать React в `src/lib/`** — это чистая логика без UI.
- ❌ **Не делать UI-тесты** (React Testing Library, Playwright). Только Vitest unit-тесты на `src/lib/brief/`.
- ❌ **Не оценивать «качество» гипотезы** — только структурные слоты. ADR-003.
- ❌ **Не делать inline rgba цвета** — используй `@theme` токены. Если нужны новые токены — добавляй в `src/styles/index.css`.
- ❌ **Не трогать `docs/`, `mockups/`, `CLAUDE.md`, `README.md`** — только новые/обновляемые `src/`, `tests/`, `state/`, `pages/`.
- ❌ **Не «заодно»** рефакторить Stepper, Header, AppStateContext, StartScreen, App.jsx если только это не требуется явно для скоупа.
- ❌ **Не делать deep linking** на конкретные вопросы (`/step1/q3` и т.п.). Только internal state в Sprint 2.
- ❌ **Не делать ESLint/Prettier** правки если ничего не сломано.

---

## Sprint Report — что ожидаем

По завершении создай `docs/project/sprints/sprint-report-2.md` по шаблону из `docs/project/Code-Onboarding.md`. Особое внимание:

- Какие вопросы получились непросто (например, hypothesis parser edge cases) и какие решения принял локально
- Точная структура `state.brief` после спринта — Cowork использует это для будущего парсера test_plan.md
- Количество unit-тестов в `tests/lib/brief/`, прошли ли все
- Любые UX-решения, которые не были однозначны из промпта (например, как выглядит «свёрнутый» вид advanced params в одну строку)
- Сколько времени заняло (см. метрику длительности в Sprint 1 — фиксируем как baseline)
- Заметки про что не успел / что отнесено в Known Issues
