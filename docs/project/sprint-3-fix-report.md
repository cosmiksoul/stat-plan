# Sprint 3 Fix Report — AdvancedParams readonly в approved-режиме

**Phase:** FIX (часть Sprint 3, одна итерация)
**DEV duration:** ~10 минут
**Tests:** 147/147 зелёных (без новых тестов — UI-фикс, см. CLAUDE.md project-specific правила)
**Build:** ok, CSS 26.53 KB / JS 309.75 KB (gzip 5.68 / 96.53)

---

## 1. BUG-1 — AdvancedParams не disabled в approved-режиме

**Что было:** `<AdvancedParams />` рендерился в `BriefPage.jsx:197` снаружи `<fieldset disabled={isApproved}>` (тот fieldset обёртывает только `<QuestionRenderer />`). В approved-режиме все 6 полей внутри секции «Продвинутые параметры» оставались редактируемыми → SET_ADVANCED → RECOMPUTE_PLAN мог изменить score уже утверждённого плана. Нарушение ADR-006.

**Что сделано (минимально-инвазивно, 2 строки сигнатур + одна обёртка):**

- `src/pages/BriefPage.jsx:197` — `<AdvancedParams disabled={isApproved} />`.
- `src/components/brief/AdvancedParams.jsx:9` — компонент принимает `{ disabled = false }`.
- `src/components/brief/AdvancedParams.jsx:42` — внутренний раскрытый блок (`<div className="border-t border-border-soft …">`) обёрнут в `<fieldset disabled={disabled} className="border-0 p-0 m-0 min-w-0">`.

**Почему именно так:**

- Toggle-кнопка (lines 26-39) не задета — пользователь в approved-режиме может раскрыть секцию и посмотреть значения. Это требование из prompt'а ("должен иметь возможность посмотреть, что там за значения").
- Нативного browser-greyout от `<fieldset disabled>` достаточно — никакого extra-стилирования (opacity, баннер «параметры заморожены») не добавлял; если в RETEST окажется визуально неочевидно — отдельная user story.
- Reducer не трогал — `SET_ADVANCED` остался без guard'а. Защита на UI достаточна; action-level guard был бы преждевременной защитой.

**Поведение после фикса:**

- Draft (`disabled={false}`): всё как раньше — поля редактируются.
- Approved: toggle работает, секция раскрывается, все 6 полей (α, power, two-sided чекбокс, variance reduction, стратификация, holdback) показаны браузером как inactive.

---

## 2. Verification

- `npm test` → **147 passed (10 files)**, 3.49s. Никаких регрессий.
- `npm run build` → **ok, 330ms**. dist собран чисто.
- Scope: только 2 файла, без «заодно»-рефакторинга. NumField/SelectField/TextField helpers, summary string, стили AdvancedParams — не трогал. BriefPage.jsx — изменена только строка 197, остальной код (isApproved, баннер, fieldset вокруг QuestionRenderer) без правок.

---

## 3. Не трогал

- Reducer и `SET_ADVANCED` action — disabled на UI достаточно (см. п. 1).
- Визуальное стилирование approved-состояния AdvancedParams — браузер сам делает greyout.
- Соседний код в AdvancedParams.jsx (helpers, summary computation) — out of scope, surgical changes.
- `docs/project/sprint-report-3.md` — секция Known Issues остаётся как была; this fix-report — отдельный файл per prompt'у.

---

## 4. Что осталось пользователю (RETEST)

Один кейс, описанный в prompt'е:

| # | Кейс | Способ |
|---|------|--------|
| 1 | Draft: AdvancedParams — поля редактируются | браузер |
| 2 | Approved (после approve плана + возврат на /#/step1): AdvancedParams раскрывается, но все 6 полей нередактируемые | браузер |

После RETEST — Cowork делает CLOSE Sprint 3 (JTBD/CONTEXT/PROJECT_STATUS) и коммит Cowork-зон.
