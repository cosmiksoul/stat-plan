# CONTEXT — история проекта `<project>`

> Журнал развития проекта. Обновляется Cowork в фазе CLOSE каждого спринта.
>
> **Назначение:** новый инстанс Cowork (или ты сам через месяц) сможет прочитать этот файл и понять историю проекта без перечитывания всех sprint-report.

---

## Development Timeline

> Записи в обратном хронологическом порядке (новые сверху).

### Pre-MVP (2026-05-14)

Концептуальная и документационная работа. Прорабатывались:
- Концепция продукта (`docs/context/concept.md`)
- Пользовательский флоу (`docs/context/FLOW.md`) — 5 шагов + развилка на старте
- Архитектура (`docs/context/ARCHITECTURE.md`)
- Модель данных (`docs/context/DATA_MODEL.md`) — YAML frontmatter для всех артефактов
- Дерево вопросов брифа (`docs/context/BRIEF_TREE.md`) — 10 обязательных вопросов
- Скоринг (`docs/context/SCORING.md`), формулы sample size (`SAMPLE_SIZE_CALC.md`)
- 10 ADR (`docs/context/decisions-log.md`) — фиксируют ключевые архитектурные и продуктовые решения
- Мокап v4 в HTML (`mockups/ab_planner_mockup_v4.html`)

К моменту старта Sprint 1: документация плотная, код = 0, репозиторий не инициализирован.

---

### Sprint 1 — Foundation + Start Screen + Step 1 Skeleton (2026-05-14 / 2026-05-15)

**Type:** Code
**Status:** Complete
**Goal:** Поднять стек React 19 + Vite + Tailwind по ADR-010, настроить деплой через GitHub Actions на GitHub Pages, реализовать стартовый экран с развилкой, степпер на 5 шагов и skeleton шага 1 без бизнес-логики.

**Closed (полностью) — `[x]`:**

- Стартовый экран с понятным выбором (JTBD §1)
- Степпер с пятью шагами (JTBD §1)
- Будущие шаги заблокированы до выполнения предыдущих (JTBD §1)
- Тул работает в браузере без бэкенда (JTBD §9) — GitHub Pages, нулевой backend

**Closed (частично) — `[~]`:**

- Drag-and-drop загрузка `test_plan.md` (UI готов, парсер — Sprint 2/3)
- Тур-режим (toggle класса работает; плашек самих нет)
- Тур сквозной (state внутри сессии работает; плашек самих нет)
- Прогресс N/10 (полоска отрисована, 0/10 placeholder)
- Карта вопросов справа (UI shell с 10 пунктами без интерактива)

**Key decisions:**

- **ADR-010** — пересмотр стека до начала кода: vanilla JS → React 19 + Vite + Tailwind v4 + react-router-dom HashRouter + Vitest, деплой через GitHub Actions. ADR-001 уточнён, не суперседится (no backend остаётся в силе).
- `.gitattributes` с `* text=auto eol=lf` добавлен для предотвращения CRLF-проблем на Windows.
- @fontsource swap отложен как low-priority в JTBD §9 после QA (нет багов, фонты загружаются с CDN — пока приемлемо).

**Tech debt / deferred:**

- Inline rgba цвета (`bg-[rgba(...)]`) в `Header.jsx` и `StartScreen.jsx` — вынести в `@theme` при добавлении новых hover/state-цветов (вероятно Sprint 2). См. `CONTEXT.md` Tech Debt.
- Нет ErrorBoundary вокруг приложения — добавить когда появятся первые RTL-тесты.
- Mobile responsive протестирован поверхностно, A11y-аудит не проводился — кандидаты на отдельный спринт после появления реального контента.
- Click→file picker fallback для drag-and-drop карточки — новая user story в JTBD §1.

**Metrics — длительность фаз:**

| Фаза | Старт | Конец | Δ |
|---|---|---|---|
| DEV (Claude Code) | 2026-05-14 23:54 | 2026-05-15 00:07 | **13 минут** |
| CODE REVIEW + TEST PREP (Cowork) | 00:07 | ~00:20 | ~13 минут |
| QA (пользователь) | ~00:20 | ~00:40 | ~20 минут |
| CLOSE (Cowork) | ~00:40 | 00:45 | ~5 минут |
| **Total** | 23:54 | 00:45 | **~51 минута** |

⚠ Это **первый каркасный спринт на знакомом для пользователя стеке** (React+Vite+Tailwind, опыт с retention-calculator). Цифры показательны как baseline, но не репрезентативны для будущих фич-спринтов с реальной бизнес-логикой.

**Notes — что узнали полезного, что пошло не так:**

- ✅ **Двухинстансная схема работает.** Cowork разработал prompt → Code сделал DEV → Cowork сделал ревью → пользователь сделал QA → Cowork закрыл. Передачи через файлы прошли без потерь смысла. Промт Sprint 1 был достаточно детальным, чтобы Claude Code не задавал вопросов посередине.
- ✅ **Code справился со скоупом точно.** Никаких внеплановых рефакторингов, ни одной лишней зависимости. ADR соблюдены без исключений.
- ✅ **`.gitattributes` добавлен в нужный момент** — после первого инцидента с побочной коррупцией файлов. Это спасёт время в будущем.
- 🟡 **Был инцидент с обрезанием файлов** (`.gitignore`, `CLAUDE.md`, `README.md`) в working tree после первого `git add .` на Windows. Точная причина не диагностирована — возможно сочетание Git autocrlf и какого-то фонового процесса. Восстановлено через `git checkout HEAD`. Если повторится — расследовать. Добавлено в Recurring questions ниже.
- 🟡 **Pre-MVP документация была настолько плотной, что Sprint 1 prompt получился почти из готовых блоков.** Это сильная сторона, но в будущих спринтах с менее детально проработанными user stories надо будет внимательнее формулировать DO NOT-список.
- 🟢 **Метрика длительности зафиксирована.** Будем сравнивать с фич-спринтами Sprint 2+, где появится реальная логика.

---

### Sprint 2 — Brief Questions Q01-Q10 + Advanced + Interactive Map (2026-05-15 / 2026-05-16)

**Type:** Code (с FIX-итерацией)
**Status:** Complete
**Goal:** Полный бриф из 10 вопросов с реактивной картой, мягкой валидацией, парсером 4 слотов гипотезы, динамическими guardrails, advanced параметрами. Без sample size derive / data peek / localStorage / парсинга test_plan.md.

**Closed (полностью) — `[x]`:**

§2 «Бриф вопросы»:
- Один вопрос на экран
- Прогресс N/10 реактивный (закрытие [~] из Sprint 1)
- Гипотеза по шаблону «если/то/потому что»
- 4-slot парсер гипотезы (Unicode-aware boundaries + 16 unit-тестов)
- Тип метрики (proportion/continuous/ratio/count) + ratio sub-question
- Имя метрики + auto snake_case с touched override
- Baseline (с условными единицами от metric_type)
- Единица рандомизации + cluster sub-question
- MDE (3 типа единиц) с soft warnings
- Guardrails (динамический список + 2 карточки-предложения)
- Stop conditions + decision rules (defaults через applyEnterDefaults в reducer)
- Advanced параметры (collapsible 6 полей)

§3 «Карта вопросов» — полностью:
- Карта 10 пунктов с интерактивом, статусами, inline preview через ▸/▾

**Closed (частично) — `[~]`:**

- Keyboard navigation hints (§9) — Tab/Enter работает, видимой подсказки нет

**Still pending — `[ ]`:**

- Sample size + duration derive после Q07/Q08 (placeholder, Sprint 3)
- MDE direction в UI (захардкожено `increase`, Sprint 3 derive из глагола)
- Snake_case транслит кириллицы для metric_column (low-priority)
- Sensitivity helper Q07 (новая user story Sprint 2 brainstorm)
- Methodology раздел (§10 — новая секция в JTBD)
- «Начать сначала» в шапке (Sprint 3 с localStorage)

**Key decisions:**

- **P-1 в CLAUDE.md** — Зоны ответственности по коммитам (Code: src/, tests/, configs; Cowork: docs/, CLAUDE.md, .gitignore, .gitattributes). Появилось в FIX-фазе после путаницы с пересечением.
- **applyEnterDefaults в reducer** (вместо useEffect-defaults в компонентах) — defaults подставляются при `GOTO_QUESTION` через чистую функцию `src/lib/brief/defaults.js`. Унификация пути наполнения state перед будущим парсером test_plan.md.
- **Tailwind токены для state-цветов** — `--color-warn-soft`, `--color-warn-border`, `--color-tour-hover`, `--color-danger-soft` добавлены в `@theme` при закрытии Sprint 1 tech debt.
- **`vite.config.js` server.watch.ignored** — добавлено Cowork во время QA, чтобы Vite dev server не перезагружал приложение при редактировании test-cases-*.md. Документировано в CLAUDE.md P-1 как разрешённое исключение для Cowork.

**Tech debt / deferred (added in Sprint 2):**

- `defaultsApplied` флаг внутри `state.brief` — UI-state в данных. При сериализации в Sprint 5-6 (парсер test_plan.md) надо учить yaml-сериализатор игнорировать это поле.
- `extractMetricName` дёргается при каждом переходе на Q04 пока флаг false. Дешёво (regex по короткой строке), не оптимизировано.
- Mobile responsive — `GuardrailsList` 6-колоночный grid на узких экранах (<640px) может ломаться. Не тестировался.

**Metrics — длительность фаз:**

| Фаза | Δ |
|---|---|
| DEV (Claude Code, Sprint 2 main) | 28 мин |
| CODE REVIEW + TEST PREP (Cowork) | ~25 мин |
| QA (пользователь, full pass 68 кейсов) | ~60 мин |
| FIX prompt (Cowork) | ~10 мин |
| FIX DEV (Claude Code) | 20-30 мин (Code оценил в 30, пользователь — в 20) |
| FIX RETEST (пользователь) | ~5 мин |
| CLOSE (Cowork) | ~30 мин (включая инцидент с Edit-tool corruption) |
| **Total** | **~2.5 часа end-to-end** |

Длительность × 3 от Sprint 1 (51 мин). Скоуп — в 4-5× больше (11 UI компонентов, 47 unit-тестов, бизнес-логика парсера, FIX-итерация). Velocity растёт нелинейно — это первый «настоящий» спринт.

**Notes:**

- ✅ **FIX-фаза прошла как штатная часть цикла.** 3 бага из QA + 1 архитектурный concern — единый fix-prompt, ~25 минут Code, 1 итерация. Не превратилось в Sprint 2.5.
- ✅ **`src/lib/brief/` без React-импортов.** Чистая логика, тестируется отдельно, 47 unit-тестов. Это база, на которой Sprint 5-6 будут строить парсер test_plan.md.
- ✅ **P-1 правило родилось из боли.** Stale `.git/index.lock` и пересечение Code/Cowork модификаций. Зафиксировано как convention — сэкономит время в будущих спринтах.
- 🟡 **Edit-tool corruption на длинных Cyrillic replacements.** В CLOSE-фазе серия неудачных Edit'ов на CONTEXT.md, JTBD.md, CLAUDE.md, Dev-Cycle.md — файлы обрезались на UTF-8 boundary. Воспроизводилось упорно. Решение — делать только маленькие точечные Edit'ы или использовать Write для полной перезаписи. Подробно зафиксировано в Recurring questions.
- 🟡 **Pre-MVP документация перестала покрывать.** Sprint 2 prompt пришлось продумывать заметно дольше — `BRIEF_TREE.md` описывает вопросы, но не описывает UX advanced params (модалка vs collapsible), не описывает финальный экран Q10. В будущих спринтах PROMPT-фаза станет дольше относительно DEV.
- 🟢 **«Начать сначала», sensitivity helper, methodology раздел** — три product idea появились во время QA. Это паттерн: пользователь тестирует и думает про продукт. Записываем в JTBD сразу, обсуждаем в PLAN Sprint 3.

---

### Sprint 3 — Sample Size + Step 2 «Тест-план» + Persistence + Reset (2026-05-16 / 2026-05-28)

**Type:** Code (с FIX-итерацией). Wall-clock 12 дней из-за паузы между TEST PREP и QA, чистого активного времени ~3.5 часа.
**Status:** Complete
**Goal:** Закрыть полный value loop «бриф → расчёт sample size → тест-план → утверждение». Параллельно — localStorage persistence и явный reset, чтобы прогресс не терялся при reload, а пользователь мог начать заново явным действием.

**Closed (полностью) — `[x]`:**

§1 «Старт и навигация»:
- Сохранение прогресса в localStorage (ключ `stat-plan:v1:state`, версионированный)
- «↺ Начать сначала» в шапке с ConfirmDialog + RESET_STATE

§2 «Бриф»:
- Реактивный sample size + duration + test_method display под Q08 (useMemo на `calculateSampleSize`, warnings inline)

§5 «Шаг 2 — Тест-план» (полностью кроме парсера загружаемого MD):
- Preview сгенерированного test_plan.md с YAML frontmatter + markdown-секциями
- ScoringCard: общий скор + breakdown по 4 группам + конкретные remarks с severity (info/warn/critical)
- Скачивание test_plan.md через Blob URL
- «Утвердить план» → `APPROVE_PLAN`, `status=approved`, `approvedAt` ISO timestamp, шаг 3 unlocked
- «Вернуть в черновик» с ConfirmDialog → `RETURN_PLAN_TO_DRAFT`
- StatusBadge (draft / approved)
- Бриф в approved-режиме — readonly (включая AdvancedParams после FIX BUG-1), accent-баннер «План утверждён» с ссылкой на step 2

§9 «Кросс-функциональные» (продвинулись):
- Все Sprint 3 вычисления (sample size, scoring, render) — на клиенте без fetch (`[~]` целиком, CSV — Sprint 5)
- Inline warnings для приближённых расчётов (MW ×1.157, bootstrap, CV=1 fallback, edge cases `n>10M`/`n<30`/`duration>90`)

**Closed (частично) — `[~]`:**

- Загрузка отредактированного test_plan.md обратно (UI placeholder «Парсинг — Sprint 4+»; сам парсер запланирован на Sprint 7 по roadmap)
- «Все вычисления на клиенте» — sample size/scoring/render готово, CSV-валидация ждёт Sprint 5
- «Честные warning для приближений» — для sample size готово, для analyze-фазы — Sprint 5

**Still pending — `[ ]`:**

- Warning при невалидном загруженном md (зависит от Sprint 7 парсера)
- Q07 sensitivity helper (slider «MDE × duration») — в Sprint 3 scope не входил
- Methodology раздел — Sprint 8 по roadmap

**Key decisions:**

- **Самописные `normalInv` / `normalCdf`** (Beasley-Springer-Moro + Abramowitz-Stegun, ~15 строк каждая) — вместо подключения `simple-statistics` или Pyodide. Соответствует ADR-009/010, держит bundle малым.
- **`?raw` import шаблона `test_plan.md.tmpl`** через Vite — без отдельного fetch и без подключения tмплейт-движка. ~1KB к bundle.
- **YAML вручную** в `render.js` через `yamlScalar()` с JSON-style эскейпом (валидный YAML принимает JSON-style строки) — устойчивее, чем regex-escape. Inline snapshot тест защищает формат от регрессии. Когда в Sprint 7 появится парсер — будет cross-check.
- **`editedExternally: false` зарезервировано** в `state.plan` для Sprint 7 парсера (вариант A решения от пользователя). Поле включено в persisted shape для forward-compatibility, семантика будет определена в Sprint 7.
- **`SAMPLE_SIZE_CALC.md` Case 2 spec поправлен** с 7555 → 8149 (Fleiss non-pooled SE for H1). Обоснование: 7555 не воспроизводится никаким стандартным вариантом формулы (pooled, unpooled, Wald, one-sided, continuity correction); 6 из 7 cases матчатся exact / ±0.03% / 1.7%. Спор задокументирован в `code-review-sprint-3.md` (Concern #1) с ручной проверкой.
- **Stepper kliкабельность** — scope creep, но принято: после approve пользователь должен иметь возможность вернуться на бриф через шапку (не только ссылкой со step 2). ~10 строк, UX-обоснование принято на code review.

**Tech debt / deferred (added in Sprint 3):**

- `editedExternally` в `state.plan` — зарезервированное поле без активного использования. Семантика определится в Sprint 7 (парсер test_plan.md).
- Tolerance 5-10% для proportion sample-size тестов — задокументировано прямо в комментариях тестов. Чтобы будущий читатель не подумал «тесты слабые».
- Случай Case 2 в SAMPLE_SIZE_CALC.md — добавлено объяснение, но если в Sprint 5-6 (анализ) встретятся такие же неоднозначности — нужен унифицированный подход к источникам формул.

**Metrics — длительность фаз:**

| Фаза | Дата | Δ |
|---|---|---|
| PLAN + PROMPT (Cowork) | 2026-05-16 | ~70 мин |
| DEV (Claude Code, по самозамеру) | 2026-05-16 | 24 мин (wall ~3 ч) |
| CODE REVIEW (Cowork) | 2026-05-16 | ~30 мин |
| TEST PREP (Cowork) | 2026-05-16 | ~15 мин |
| ⏸ **Пауза** | 2026-05-16 → 2026-05-28 | **12 дней wall-clock** |
| QA (пользователь, smoke 15 кейсов) | 2026-05-28 | ~15 мин |
| FIX PROMPT (Cowork, BUG-1) | 2026-05-28 | ~10 мин |
| FIX DEV (Claude Code) | 2026-05-28 | 10 мин |
| FIX RETEST (пользователь) | 2026-05-28 | ~5 мин |
| CLOSE (Cowork) | 2026-05-28 | ~30 мин |
| **Active total (без паузы)** | | **~3.5 часа** |
| **Wall-clock total** | | **12 дней** |

Активное время сопоставимо со Sprint 2 (~2.5 ч), несмотря на ×2 объём кода (5 lib-модулей + 5 plan-компонентов + 2 страницы + расширение reducer/router/stepper, 100 новых unit-тестов). Pause из-за внешних причин — не паттерн процесса. Smoke-стратегия (15 кейсов вместо full 60+) оправдалась: BUG-1 был известен заранее, новых багов smoke не выявил.

**Notes:**

- ✅ **100 unit-тестов вместо запрошенных 25+.** Code over-delivered осознанно — все 7 канонических кейсов из SAMPLE_SIZE_CALC.md, snapshot test на формат test_plan.md (критично для Sprint 7 парсера), reducer-тесты на новые actions. Тестовое покрытие = база, на которой Sprint 7 будет верифицировать roundtrip.
- ✅ **Code сам поднял 3 пункта на ревью в Known Issues.** Все три обработаны: Case 2 (правка spec), AdvancedParams (FIX BUG-1), Stepper scope creep (accept с обоснованием). Прозрачность Code'а сокращает review-фазу.
- ✅ **FIX через 12 дней пройден без проблем.** Pause не сломала контекст благодаря тому, что `code-review-sprint-3.md` зафиксировал все open вопросы — пользователь и Cowork вернулись к ним без перечитывания всего sprint-report.
- ✅ **P-1 правило с FIX отрабатывает чисто.** Code запушил `fb51658` + `b8facb8` (свою зону), Cowork-зона (code-review/test-cases/fix-prompt/SAMPLE_SIZE_CALC + JTBD/CONTEXT/PROJECT_STATUS) уходит одним batch'ем в CLOSE.
- 🟡 **PROJECT_STATUS.md устаревает быстро.** Когда между фазами проходит 12 дней — статус показывает «в работе у Code», хотя по факту QA уже сделано. Стоит подумать, не делать ли PROJECT_STATUS более «statе-machine-like» (генерировать из git + reports), но это over-engineering для pet-проекта. Пока — просто помнить про refresh в CLOSE.
- 🟢 **Sprint 4 PLAN откладывается на свежее обсуждение** (по roadmap — конструктор ноутбука, ipynb-сборка, demo-csv). После CLOSE Sprint 3 пользователь выбирает scope.

---

## Tech Debt

> Накопленный технический долг. Каждая запись — что и из какого спринта приехало.

- [x] ~~**Inline rgba цвета вместо токенов @theme.**~~ Закрыто в Sprint 2 FIX-фазе (`@theme` токены `--color-warn-soft`, `--color-warn-border`, `--color-tour-hover`, `--color-danger-soft`).
- [ ] **Нет ErrorBoundary вокруг приложения.** Приехало из Sprint 1 (code review concern #5). `useAppState` throw'ает без Provider'а — сейчас не воспроизводится, но при добавлении React Testing Library тестов рендера компонентов без обёртки сломается с непонятным сообщением. Добавить минимальный ErrorBoundary или тестовый Provider-wrapper когда появятся первые RTL-тесты.
- [ ] **`defaultsApplied` в `state.brief` — UI-state в доменной структуре.** Приехало из Sprint 2 FIX. При реализации yaml-сериализатора (Sprint 5-6) учить игнорировать это поле или вынести уровнем выше.
- [ ] **`extractMetricName` дёргается на каждый переход на Q04 пока флаг false.** Приехало из Sprint 2 FIX. Дешёво (regex по короткой строке), оптимизировать не нужно. Просто наблюдение.
- [ ] **Mobile responsive для `GuardrailsList`.** 6-колоночный grid на <640px может ломаться. Не тестировался. Кандидат на отдельный спринт mobile UX.
- [ ] **`editedExternally` в `state.plan` — зарезервированное поле.** Приехало из Sprint 3. Без активного использования до Sprint 7 (парсер test_plan.md). Семантика будет определена там.
- [ ] **Case 2 в SAMPLE_SIZE_CALC.md (исправлено, но нужен унифицированный подход).** Приехало из Sprint 3. Если в Sprint 5-6 встретятся spec'и из разных источников — нужно явно фиксировать source формул и сверять.

---

## Recurring questions

> Вопросы, которые периодически всплывают и заслуживают зафиксированного ответа (или ADR'а если они архитектурные).

- **Q:** Файлы в working tree обрезаются на середине UTF-8 символа после операций Cowork-инстанса. Что это?
  **A:** Зафиксировано **3 инцидента**:
  - Sprint 1: после `git add .` — `.gitignore`, `CLAUDE.md`, `README.md` обрезались.
  - Sprint 2 FIX: после Code-коммитов — 5 файлов из `src/` показались `modified` с trailing whitespace + `\ No newline at end of file`.
  - Sprint 2 CLOSE: серия Edit-инструмента Cowork на длинных Cyrillic replacements — файлы обрезались на UTF-8 boundary.

  **Истинная причина (выяснено в Sprint 2 CLOSE):** баг в pipeline инструмента **Edit** Cowork-инстанса — на длинных Cyrillic replacements обрезает запись на UTF-8 multibyte boundary. **Write** инструмент работает корректно (canary-тесты с 4KB кириллицы проходят).

  **Решение:** в Cowork использовать **только маленькие точечные Edit'ы** (одна строка, одно поле) или **Write для полной перезаписи**. **`.gitattributes`** с `eol=lf` и `core.autocrlf=false` нормализуют line endings — это правильное состояние, но **не решает** Edit-bug.

  **Восстановление:** `git checkout HEAD -- <files>` если working tree обрезан.

  **Что НЕ помогает (проверено):**
  - Закрытие Obsidian
  - Renormalize line endings к LF
  - `git config core.autocrlf false`
  - Sandbox bash для верификации .md — даёт stale view на 44 байта меньше Windows-stake, нельзя использовать.

- **Q:** PROJECT_STATUS.md устаревает между фазами при длинных паузах. Что делать?
  **A:** Sprint 3 пример — между TEST PREP (2026-05-16) и QA (2026-05-28) прошло 12 дней, PROJECT_STATUS всё это время показывал «Sprint 3 в работе у Code». Решение пока — просто обновлять его как часть CLOSE-фазы и не вкладывать в него точное «текущее место в цикле». Если станет реальной проблемой — рассмотреть генерацию из git log + последних reports автоматически, но это over-engineering для pet-проекта.
