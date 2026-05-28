# Sprint 3 Fix Prompt — AdvancedParams readonly в approved-режиме

**Type:** FIX phase Sprint 3 (одна итерация, один баг)
**Estimated:** ~10 минут DEV + ~5 минут на report

---

## Context

После QA Sprint 3 (см. `docs/project/test-cases-sprint-3.md`, все 15 smoke-кейсов прошли `+`) остался **один known bug**, заранее зафиксированный ещё на этапе CODE REVIEW (см. `docs/project/code-review-sprint-3.md` Concern #2).

Баг был отмечен Code в `sprint-report-3.md` секция Known Issues и подтверждён в QA (case #13). Согласовано как fix в этом же cycle, не deferred.

Других багов нет. Это единственный пункт FIX-фазы.

---

## Bugs to fix

### BUG-1 — Medium — AdvancedParams не disabled в approved-режиме

**Description:**
В `src/pages/BriefPage.jsx` блок `<fieldset disabled={isApproved}>` (lines 177-179) обёртывает только `<QuestionRenderer />`. Компонент `<AdvancedParams />` рендерится отдельной секцией ниже (line 197) **снаружи** fieldset и поэтому остаётся полностью интерактивным даже когда `state.plan.status === 'approved'`.

Пользователь в approved-режиме может изменить `alpha`, `power`, `two_sided`, `variance_reduction`, `stratification_by`, `holdback_percent`. Любое изменение триггерит `SET_ADVANCED` в reducer'е → следующий `RECOMPUTE_PLAN` (или мемоизация `SampleSizeDisplay`) пересчитает `derived` → score обновится → план потеряет «зафиксированность», обещанную approved-статусом.

**Почему это критично:**
Прямое нарушение **ADR-006** («План в статусе approved заморожен. Чтобы внести правки — явно вернуть в draft через ConfirmDialog»). Если оставить как есть — обещание ADR-006 пользователю не выполняется, и в Sprint 7 парсер `test_plan.md` может ловить рассогласования между frontmatter и UI-state.

**Steps to reproduce:**
1. Запустить dev server, заполнить бриф (Q01-Q10), нажать «Завершить» — попадаешь на `/#/step2`.
2. Нажать «✓ Утвердить план» — StatusBadge становится `Approved`.
3. Кликнуть степпер «01 Бриф» (или ссылка «← Вернуться к брифу») — попадаешь обратно на `/#/step1`.
4. В верху страницы виден accent-баннер «ПЛАН УТВЕРЖДЁН — Бриф в режиме только-чтения». Основной вопрос Q01-Q10 disabled (правильно).
5. Прокрутить вниз, раскрыть секцию «▶ ПРОДВИНУТЫЕ ПАРАМЕТРЫ».
6. **Bug:** все 6 полей (alpha, power, two-sided чекбокс, variance reduction, стратификация, holdback) редактируются. Изменить alpha = 0.10 — `SampleSizeDisplay` под Q08 пересчитается, ScoringCard на step 2 тоже изменится при следующем RECOMPUTE.

**Expected:**
В approved-режиме секция «Продвинутые параметры» **раскрывается** (пользователь должен иметь возможность посмотреть, что там за значения), но все 6 полей **disabled** — попытка изменить значение ничего не делает.

**Proposed fix:**

Минимально-инвазивный двухстрочный фикс. Не оборачивать `<AdvancedParams />` целиком в `<fieldset disabled>` снаружи — это задизейблит toggle-кнопку раскрытия и пользователь не сможет даже посмотреть значения. Вместо этого:

1. **`src/pages/BriefPage.jsx` (line 197):**
   ```jsx
   <AdvancedParams disabled={isApproved} />
   ```

2. **`src/components/brief/AdvancedParams.jsx`:**
   - Принять prop `disabled` (default `false`):
     ```jsx
     export default function AdvancedParams({ disabled = false }) {
     ```
   - Обернуть внутренний раскрытый блок (line 41-83, начиная с `<div className="border-t border-border-soft px-4 py-4 grid sm:grid-cols-2 gap-4">`) в `<fieldset disabled={disabled} className="border-0 p-0 m-0 min-w-0">`.
   - Toggle-кнопку (line 26-39) **не трогать** — она должна работать всегда, чтобы пользователь мог раскрыть/свернуть секцию.

После фикса поведение:
- Draft (по умолчанию): всё как сейчас, `disabled={false}` ничего не меняет.
- Approved: toggle работает, секция раскрывается, но все input/select/checkbox внутри fieldset показаны браузером как inactive (нативный greyout, не нужно дополнительно стилить).

**Files involved:**
- `src/pages/BriefPage.jsx` — одна строка (line 197)
- `src/components/brief/AdvancedParams.jsx` — сигнатура функции + обёртка раскрытого блока в fieldset

---

## Acceptance criteria

1. `npm test` — все 147 тестов остаются зелёные. Никаких новых тестов на этот фикс **не нужно** (нет RTL/UI-тестов в проекте по архитектурному решению — см. CLAUDE.md, project-specific правила).
2. `npm run build` — чистый.
3. Smoke вручную (Cowork опишет в RETEST, не нужно делать в DEV):
   - Draft: AdvancedParams работает как раньше — поля редактируются.
   - Approved (после approve плана + возврата на /#/step1): AdvancedParams раскрывается, но все 6 полей нередактируемые.

---

## DO NOT

- ❌ **Не оборачивать `<AdvancedParams />` целиком в `<fieldset disabled>` снаружи** — это задизейблит toggle-кнопку, пользователь не сможет даже посмотреть значения.
- ❌ **Не добавлять визуальное «approved-стилирование»** (opacity-50, доп.баннер «параметры заморожены», и т.п.) — нативного browser greyout от `<fieldset disabled>` достаточно. Если в RETEST окажется что визуально неочевидно — обсудим отдельно, новая user story в JTBD.
- ❌ **Не трогать сам reducer / `SET_ADVANCED`** — disabled на UI достаточно. Дополнительный guard на action-level — преждевременная защита.
- ❌ **Не «заодно» рефакторить** `AdvancedParams.jsx` (стили, NumField/SelectField/TextField helpers, summary string). Surgical Changes.
- ❌ **Не трогать `BriefPage.jsx`** за пределами строки 197. Особенно — не менять логику `isApproved`, баннер, fieldset вокруг `QuestionRenderer`.
- ❌ **Не добавлять новых npm-зависимостей** — ADR-010.

---

## Files allowed to modify

- `src/pages/BriefPage.jsx` (одна строка)
- `src/components/brief/AdvancedParams.jsx` (сигнатура + одна обёртка)

Всё. Никаких других файлов в `src/` трогать не нужно.

---

## Sprint Fix Report — что ожидаем

В `docs/project/sprint-3-fix-report.md` (отдельный файл, не правка `sprint-report-3.md`). Минимум:

- Что сделано (по BUG-1, со ссылкой на изменённые строки)
- Подтверждение: `npm test` green, `npm run build` clean
- Подтверждение: scope не превышен (только 2 файла, никаких «заодно»)
- Time tracking (DEV-фаза)

После — Cowork делает RETEST (один кейс), CLOSE Sprint 3 (JTBD/CONTEXT/PROJECT_STATUS), коммит Cowork-зоны одним batch'ем, push.

---

## Related

- Code review concern #2: `docs/project/code-review-sprint-3.md`
- Test case #13: `docs/project/test-cases-sprint-3.md`
- Known Issue в Sprint 3 report: `docs/project/sprint-report-3.md` (секция Known Issues, пункт «AdvancedParams в approved-режиме НЕ disabled»)
- ADR-006: `docs/context/decisions-log.md`
