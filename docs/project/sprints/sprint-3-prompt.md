# Sprint 3 — Sample Size + Step 2 «Тест-план» + Persistence + Reset

**Type:** Code sprint (большой)
**Estimated:** 7-10 дней работы

---

## Overview

Первый «продуктовый» спринт. Sprint 1-2 дали пользователю бриф. Этот спринт даёт **весь value loop:** пользователь заполняет бриф → видит реальный sample size/duration → переходит на шаг 2 → видит сгенерированный test_plan.md со scoring → утверждает план → разблокируется шаг 3.

Параллельно — quality-of-life: localStorage persistence (прогресс не теряется при reload) и «Начать сначала» в шапке (явный reset, критично с localStorage).

После Sprint 3 у пользователя будет рабочий «бриф → план → утверждение» end-to-end. Шаги 3-5 остаются placeholder'ами под будущие спринты.

---

## Scope (user stories из JTBD.md)

### Из § 2 «Бриф»

- ★ Расчётный sample size и duration сразу после ввода MDE и трафика `[calc]` *(закрытие pending)*

### Из § 5 «Шаг 2 — Тест-план»

- ★ Видеть сгенерированный test_plan.md с YAML frontmatter и markdown-секциями `[render]`
- ★ Видеть оценку плана с разбивкой по 4 группам критериев `[calc]` `[ui]`
- ★ Видеть конкретные замечания (не общий балл) `[calc]` `[ui]`
- ★ Скачать test_plan.md `[export]`
- ★ ◆ Нажать «Утвердить план» → status=approved, открыть следующий шаг `[storage]` `[ui]`
- ★ ◆ Видеть индикатор статуса (draft/approved) в UI плана `[ui]`
- ★ ◆ «Вернуть в черновик» с подтверждением `[storage]` `[ui]`
- В статусе approved бриф (шаг 1) переключается в readonly режим `[ui]`

### Из § 1 «Старт и навигация»

- Сохранять прогресс в localStorage `[storage]`
- ◆ «↺ Начать сначала» в шапке с confirmation `[ui]` `[storage]`

### Из § 9

- Все вычисления (sample size, скоринг) происходят на клиенте `[calc]`

---

## Что НЕ закрываем в этом спринте

Зафиксировано чтобы не было скоуп-крипа:

- **Парсер загруженного test_plan.md** (drag-and-drop восстановление state). Это отдельная архитектурная задача с js-yaml зависимостью и roundtrip-тестированием. Кандидат на Sprint 4-5.
- **Data peek** (csv parsing) — Sprint 4+.
- **Sensitivity helper Q07** (slider/таблица «MDE × duration») — кандидат после базового sample size.
- **Methodology раздел** `/#/methodology` — отдельный content-спринт.
- **Конструктор ноутбука** (шаг 3 контент) — Sprint 4+. В этом спринте шаг 3 разблокируется, но показывает только placeholder.
- **Анализ, Read-out** — следующие спринты.
- **«Новый тест» на финальном шаге** — нет финального шага в этом спринте.

---

## Tasks

### 1. `src/lib/plan/sample-size.js` — формулы расчёта

Реализовать согласно `docs/context/SAMPLE_SIZE_CALC.md`. Это **авторитативный источник** формул и edge cases. Прочитай его целиком перед началом.

Минимум:
- **Z-test для пропорций** (proportion) — точная формула из SAMPLE_SIZE_CALC.md Case 1
- **T-test для continuous** — с σ из data peek или fallback CV=1 (но data peek в этом спринте нет → используем fallback с warning'ом)
- **Mann-Whitney approximation** — `n_t_test * 1.157` с warning
- **Bootstrap approximation** — `n_t_test` с warning «фактический размер может отличаться»
- **Delta method для ratio** — если есть data peek (нет → используем bootstrap fallback с warning)

Дополнительно:
- Хелперы `normalInv(p)`, `normalCdf(x)` — 10-15 строк собственного кода (Beasley-Springer для inverse, Abramowitz-Stegun для cdf). НЕ подключать сторонние библиотеки.
- Edge cases с warning'ами: `n > 10M`, `n < 30`, `baseline = 0/1`, `duration > 90 дней`.

Функция-фасад:
```js
calculateSampleSize(brief) → {
  sample_size_per_arm: number | null,
  duration_days: number | null,
  test_method: 'z_test_proportions' | 't_test' | 'mannwhitney' | 'bootstrap' | 'delta_method',
  warnings: string[],
  approximate: boolean,
}
```

### 2. `src/lib/plan/test-method-selector.js` — выбор test_method

Матрица из SCORING.md (если несколько вариантов — берём первый). На основе `metric_type` и data peek info (нет → используем дефолты).

### 3. `src/lib/plan/direction.js` — derive MDE.direction из гипотезы

Расширение для `parseHypothesis`. Возвращает `'increase' | 'decrease' | 'any'` на основе глагола (вырастет/повысится → increase, упадёт/снизится → decrease, изменится/прочее → any).

Используется в reducer'е при `UPDATE_HYPOTHESIS` — обновляет `state.brief.mde.direction` автоматически. Пользователь не вводит руками.

### 4. `src/lib/plan/scoring.js` — скоринг плана

Реализовать согласно `docs/context/SCORING.md` — **прочитай целиком**. 4 группы критериев с весами 20/30/30/20 (полнота гипотезы / полнота дизайна / методологическая консистентность / data peek).

Функция:
```js
scorePlan(brief, derived) → {
  total: number,
  breakdown: { hypothesis: number, design: number, consistency: number, dataPeek: number },
  remarks: { id: string, group: string, severity: 'info' | 'warn' | 'critical', message: string }[],
}
```

Каждый remark должен быть **конкретным** (не «методология не очень», а «MDE 8% rel. оптимистичен при baseline 3.1% — нужно ~81 000 пользователей на arm»).

### 5. `src/lib/plan/render.js` — генерация test_plan.md

Шаблонизация в строку. Структура из `docs/context/DATA_MODEL.md` (раздел test_plan.md).

Функция:
```js
renderTestPlanMd(state) → string  // полный md с YAML frontmatter
```

Все поля frontmatter из state.brief + derived (sample_size, duration, test_method). YAML — пишем руками (не подключать js-yaml — генерация простая, формат строгий, можно собрать вручную из шаблона).

Шаблон живёт в `templates/test_plan.md.tmpl` с плейсхолдерами `{{...}}`. Render.js делает простую замену.

### 6. `tests/lib/plan/*` — unit-тесты

Минимум:
- `sample-size.test.js` — **обязательно 7 предопределённых кейсов** из SAMPLE_SIZE_CALC.md (z-test, t-test, MW approx, bootstrap, delta method, edge cases).
- `scoring.test.js` — 8-10 фикстур (полная гипотеза + хороший дизайн → 90+; неполная гипотеза → проседает hypothesis group; неконсистентный test_method для metric_type → critical remark; ...)
- `direction.test.js` — 5-6 кейсов (вырастет, упадёт, увеличится, изменится, пустое).
- `render.test.js` — snapshot-test полной генерации (3-4 разных state.brief конфигурации).

### 7. Расширение reducer.js

Добавить:
- `state.plan = { status: 'draft' | 'approved', approvedAt: null, derived: {...}, score: {...}, editedExternally: false, briefSubmitted: false }`
- Actions: `MARK_BRIEF_SUBMITTED`, `APPROVE_PLAN`, `RETURN_PLAN_TO_DRAFT`, `RECOMPUTE_PLAN` (вызывается при изменениях brief)
- `RESET_STATE` action — полностью сбрасывает state к initial.

### 8. `src/lib/storage.js` — localStorage adapter

Чистая логика, без React. Функции:
- `loadState()` — читает state из localStorage, валидирует, fallback на initialState если broken
- `saveState(state)` — сохраняет в localStorage
- `clearState()` — очищает

**Что персистим:** `state.started`, `state.brief` (всё кроме `currentQuestion` и `advancedExpanded` — UI state не нужен), `state.plan` (без `derived`/`score` — они вычисляются).

**Что не персистим:** `state.tourEnabled`, UI-only поля брифа.

Subscribe — на каждый dispatch, через middleware-pattern или явный effect в Provider.

### 9. `src/state/AppStateContext.jsx` обновление

- На mount: `loadState()`, инициализация reducer'а с восстановленным state'ом.
- Каждый dispatch → `saveState(newState)`.

### 10. `src/components/Header.jsx` — добавить «Начать сначала»

Кнопка-ссылка `↺ Начать сначала` слева от tour-toggle. Видна только когда `state.started === true`. Клик → ConfirmDialog «Все ответы будут сброшены. Продолжить?» → если ОК → dispatch `RESET_STATE` + navigate to `/`.

`ConfirmDialog` — простой компонент с overlay, без сторонних библиотек.

### 11. `src/pages/PlanPage.jsx` — шаг 2

Layout (см. `docs/context/FLOW.md` Step 2):
- Слева — preview сгенерированного test_plan.md. Использовать `<pre className="font-mono whitespace-pre-wrap">` для отображения raw md. Никаких markdown-rendering библиотек.
- Справа — ScoringCard (общий скор N/100 + breakdown по 4 группам + список замечаний)
- Сверху — индикатор статуса (`Draft` / `Утверждён ✓`)
- Кнопки внизу:
  - `↓ Скачать test_plan.md` — Blob URL download
  - `↑ Загрузить отредактированный test_plan.md` — placeholder сообщение «Парсинг — Sprint 4+» (не реализуем)
  - `✓ Утвердить план` (только в draft)
  - `↻ Вернуть в черновик` (только в approved, с confirmation)

### 12. `src/components/plan/*` — UI компоненты шага 2

- `MdPreview.jsx` — `<pre>` с генерируемым контентом
- `ScoringCard.jsx` — карточка scoring с breakdown
- `PlanActions.jsx` — группа кнопок
- `StatusBadge.jsx` — draft/approved индикатор
- `ConfirmDialog.jsx` — переиспользуемый dialog для approve/return-to-draft/reset

### 13. Roteur и Stepper

- `src/App.jsx`: добавить routes `/step2` и `/step3` (последний — placeholder)
- `src/pages/NotebookBuilderPage.jsx` — простой placeholder «Конструктор ноутбука будет в Sprint 4»
- `src/components/Stepper.jsx`: реагирует на `state.plan.status` — шаг 3 unlocked когда `approved`, шаги 4-5 остаются locked.
- `ProtectedStep` в App.jsx — обновить логику: шаг 2 требует `state.plan.briefSubmitted === true`, шаг 3 требует `state.plan.status === 'approved'`.

### 14. Шаг 1 (бриф) — readonly когда approved

`src/pages/BriefPage.jsx`: если `state.plan.status === 'approved'` — все поля disabled, навигация по карте разрешена, но изменения нет. Сверху — badge «План утверждён — режим только-чтения» с ссылкой на «Вернуть в черновик» (которая ведёт на шаг 2).

### 15. Реактивный sample size в Q08

В `BriefPage.jsx` под Q08 заменить текущий placeholder («Sample size будет рассчитан...») на реальный display:
```
Sample size: ~38 400 / arm  ·  Длительность: ~5 дней  ·  Метод: z_test_proportions
[warning'и если есть]
```

Реактивно пересчитывается при изменении baseline/MDE/traffic/randomization_unit/metric_type. Расчёт мемоизируется (useMemo).

### 16. Финиш брифа — переход на шаг 2

На Q10 кнопка «Завершить» (которая в Sprint 2 показывает inline-сообщение) должна:
1. Dispatch `MARK_BRIEF_SUBMITTED`
2. Dispatch `RECOMPUTE_PLAN` (генерирует derived + score)
3. Navigate to `/step2`

Если в Sprint 2 был sticky-toast про «Бриф заполнен» — заменяется на real navigation.

### 17. `templates/test_plan.md.tmpl`

Шаблон для генерации. Структура из DATA_MODEL.md. Плейсхолдеры `{{test_id}}`, `{{metric_name}}`, `{{baseline.value}}{{baseline.unit_label}}`, и т.д.

---

## Technical Notes

### Зависимости

**Никаких новых npm-зависимостей.** Никакого js-yaml, react-markdown, react-modal, recharts. Всё реализуем сами или через существующие React + Tailwind.

### Структура папок `src/lib/`

```
src/lib/
├── brief/          # уже есть (Sprint 2)
└── plan/           # новое в Sprint 3
    ├── sample-size.js
    ├── test-method-selector.js
    ├── direction.js
    ├── scoring.js
    └── render.js
```

### Тестирование

Все модули в `src/lib/plan/` — без React, чисто тестируются. Минимум 25-30 unit-тестов в `tests/lib/plan/`.

### Стиль

Использовать существующие `@theme` токены и Tailwind utility-классы. Если нужны новые цвета для status badge (например, `--color-success-soft`) — добавить в `@theme`, не inline rgba.

### localStorage квота

Текущий state ~10-30KB. localStorage quota 5-10MB — с большим запасом. Версионируем ключ: `stat-plan:v1:state` чтобы при будущих структурных изменениях легко мигрировать.

---

## ADR Constraints

| ADR | Что значит для этого спринта |
|---|---|
| ADR-001 (no backend) | Никаких fetch. Всё локально. |
| ADR-002 (артефакты как переносимое состояние) | Генерируемый test_plan.md СТРОГО соответствует DATA_MODEL.md — это критично для будущего парсера (Sprint 4-5). |
| ADR-003 (структурная оценка) | Scoring проверяет полноту и консистентность, не качество. Никаких «эта гипотеза плохая». |
| ADR-004 (тул не принимает решений) | Никаких автоматических «утверждать или нет». Approve — только явное действие пользователя. |
| ADR-005 (5-шаговый флоу) | Step 2 и Step 3 (placeholder) разблокируются по правилам. Шаги 4-5 остаются locked. |
| ADR-006 (статусы плана draft/approved с readonly после approve) | **Полная реализация в этом спринте.** Status в YAML frontmatter, бриф readonly когда approved, return-to-draft с подтверждением. |
| ADR-008 (тур без overlay) | Тур не трогаем. |
| ADR-009 (sample size: точные формулы + приближения с warning) | Реализуем строго по этому ADR + `SAMPLE_SIZE_CALC.md`. Каждое приближение — с warning'ом. |
| ADR-010 (стек) | Никаких новых npm-зависимостей. `src/lib/plan/` без React-импортов. |

---

## Files involved

**Создаём:**
- `src/lib/plan/{sample-size,test-method-selector,direction,scoring,render}.js`
- `src/lib/storage.js`
- `tests/lib/plan/{sample-size,scoring,direction,render}.test.js`
- `tests/lib/storage.test.js`
- `src/pages/PlanPage.jsx`
- `src/pages/NotebookBuilderPage.jsx` (placeholder)
- `src/components/plan/{MdPreview,ScoringCard,PlanActions,StatusBadge,ConfirmDialog}.jsx`
- `src/components/RestartButton.jsx` (или прямо в Header)
- `templates/test_plan.md.tmpl`

**Модифицируем:**
- `src/state/reducer.js` — расширение state.plan, новые actions
- `src/state/AppStateContext.jsx` — load/save localStorage
- `src/App.jsx` — новые routes, обновлённые protected steps
- `src/pages/BriefPage.jsx` — readonly mode, реактивный sample size display, navigation к step 2 при завершении
- `src/components/Header.jsx` — добавить restart button
- `src/components/Stepper.jsx` — реакция на state.plan.status

**Не трогаем:**
- `docs/`, `mockups/`, `CLAUDE.md`, `README.md` — Cowork-зона
- `src/lib/brief/` (кроме direction.js — расширение)
- `src/styles/index.css` — кроме новых @theme токенов если нужны

---

## Acceptance criteria (smoke + функциональные)

**Деплой и инфра:**
1. Workflow зелёный после push
2. Сайт открывается, регрессия Sprint 1-2 не сломана
3. `npm test` зелёный, включая 25+ новых unit-тестов в `tests/lib/plan/`
4. `npm run build` чистый

**Sample size:**
5. Q08: после ввода baseline/MDE/traffic — реактивно показывается sample_size/duration/test_method
6. Для proportion с baseline 3.1% и MDE 8% rel. — sample size ~81 000 (точное число по формуле, см. ADR-009)
7. Если metric_type=continuous без data peek — warning «расчёт приближённый» виден

**Шаг 2:**
8. Завершение брифа на Q10 → переход на /#/step2
9. Видно: статус «Draft», preview test_plan.md слева, ScoringCard справа с общим скором и 4 группами breakdown
10. Замечания scoring — конкретные строки с severity (info/warn/critical)
11. Кнопка «Скачать test_plan.md» — открывает download
12. Скачанный файл содержит правильный YAML frontmatter + markdown секции

**Approve / return:**
13. Кнопка «Утвердить план» — диспатчит APPROVE_PLAN, status становится approved, badge меняется
14. Бриф на /#/step1 в approved — все inputs disabled, виден badge «План утверждён»
15. Степпер: шаг 3 разблокирован, кнопка кликается → переход на /#/step3
16. Шаг 3 показывает placeholder «Конструктор ноутбука будет в Sprint 4»
17. Кнопка «Вернуть в черновик» на step 2 — confirmation modal, OK → status=draft, бриф снова editable

**localStorage persistence:**
18. Заполнить бриф частично → F5 (reload) → state восстановлен, currentQuestion ВНЕ персистенса (стартуем с Q01 или последнего отвеченного — на твоё усмотрение)
19. Утвердить план → F5 → status=approved сохранён
20. Версионирование ключа: `stat-plan:v1:state`

**Начать сначала:**
21. После старта брифа в шапке появилась ссылка «↺ Начать сначала»
22. Клик → ConfirmDialog «Все ответы будут сброшены. Продолжить?»
23. OK → state сброшен, localStorage очищен, редирект на /#/

**Browsers:**
24. Chrome + Firefox smoke pass

---

## DO NOT

- ❌ **Не делать parser** загруженного test_plan.md (drag-drop остаётся заглушкой)
- ❌ **Не делать data peek** (csv parsing)
- ❌ **Не делать sensitivity helper** Q07
- ❌ **Не делать конструктор ноутбука** (Шаг 3 — placeholder)
- ❌ **Не подключать новые npm-зависимости** — никакого js-yaml, react-markdown, react-modal, recharts
- ❌ **Не добавлять React-импорты в `src/lib/`** — чистая логика
- ❌ **Не писать UI-тесты** (RTL, Playwright) — только Vitest unit-тесты
- ❌ **Не делать sample size без warning'ов** для approximations — каждое приближение видимо
- ❌ **Не оценивать «качество» гипотезы** — ADR-003
- ❌ **Не добавлять автоматическое суждение** «можно катить» — ADR-004
- ❌ **Не разблокировывать шаги 4-5** — они locked до своих спринтов
- ❌ **Не делать mobile responsive аудит** — отдельный спринт
- ❌ **Не «заодно» рефакторить** соседний код — Surgical Changes

---

## Sprint Report — что ожидаем

В `docs/project/sprints/sprint-report-3.md` по шаблону Code-Onboarding.md. Особое внимание:

- Реальное число unit-тестов (запрошено 25+, сколько получилось)
- Точные числа sample size для 3-4 типичных конфигураций (proportion 3.1%/8% rel., continuous, ratio) — для проверки формул вручную
- Что в state.plan структурно получилось (для будущего парсера)
- Любые архитектурные решения по localStorage (что персистим, как версионируем)
- Время фаз
