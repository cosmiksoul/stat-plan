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
- 🟡 **Edit-tool corruption на длинных Cyrillic replacements.** В CLOSE-фазе серия неудачных Edit'ов на CONTEXT.md, JTBD.md, CLAUDE.md, Dev-Cycle.md — файлы обрезались на UTF-8 boundary. Воспроизводилось упорно. Восстановление через `git checkout HEAD --`. Решение — делать только маленькие точечные Edit'ы или использовать Write для полной перезаписи. Подробно зафиксировано в Recurring questions.
- 🟡 **Pre-MVP документация перестала покрывать.** Sprint 2 prompt пришлось продумывать заметно дольше — `BRIEF_TREE.md` описывает вопросы, но не описывает UX advanced params (модалка vs collapsible), не описывает финальный экран Q10. В будущих спринтах PROMPT-фаза станет дольше относительно DEV.
- 🟢 **«Начать сначала», sensitivity helper, methodology раздел** — три product idea появились во время QA. Это паттерн: пользователь тестирует и думает про продукт. Записываем в JTBD сразу, обсуждаем в PLAN Sprint 3.

---

### Sprint N — ...

[аналогично]

---

## Tech Debt

> Накопленный технический долг. Каждая запись — что и из какого спринта приехало.

- [x] ~~**Inline rgba цвета вместо токенов @theme.**~~ Закрыто в Sprint 2 FIX-фазе (`@theme` токены `--color-warn-soft`, `--color-warn-border`, `--color-tour-hover`, `--color-danger-soft`).
- [ ] **Нет ErrorBoundary вокруг приложения.** Приехало из Sprint 1 (code review concern #5). `useAppState` throw'ает без Provider'а — сейчас не воспроизводится, но при добавлении React Testing Library тестов рендера компонентов без обёртки сломается с непонятным сообщением. Добавить минимальный ErrorBoundary или тестовый Provider-wrapper когда появятся первые RTL-тесты.
- [ ] **`defaultsApplied` в `state.brief` — UI-state в доменной структуре.** Приехало из Sprint 2 FIX. При реализации yaml-сериализатора (Sprint 5-6) учить игнорировать это поле или вынести уровнем выше.
- [ ] **`extractMetricName` дёргается на каждый переход на Q04 пока флаг false.** Приехало из Sprint 2 FIX. Дешёво (regex по короткой строке), оптимизировать не нужно. Просто наблюдение.
- [ ] **Mobile responsive для `GuardrailsList`.** 6-колоночный grid на <640px может ломаться. Не тестировался. Кандидат на отдельный спринт mobile UX.

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
