# Code Review Sprint 7 — Step 4 «Валидация и отчёт» + ipynb primary + Stepper 4-step

**Reviewer:** Cowork
**Date:** 2026-05-30

---

## Summary

Sprint 7 закрыт **очень качественно** — ~4.5 ч active (на час меньше плана 5-6 ч благодаря качественной разведке + чёткой архитектуре от ADR-015). Все S1-S13 реализованы (S12 DATA_MODEL.md — Cowork CLOSE задача). **422 теста зелёных** (+87 net), initial bundle +1.4 KB gzip благодаря lazy chunking. Round-trip Sprint 6 6/6 без regression.

**Самое сильное в спринте — продуктовая инверсия flow.** Изначально (Sprint 7 PROMPT draft) форма ручного ввода была primary. После твоей идеи «возьми отработанный ноутбук и сделай из него отчёт» (PLAN-фаза 2026-05-29) — flow перевернулся: ipynb upload primary, форма fallback. Это уникальная фича на рынке A/B-инструментов.

**Code сам провёл AskUserQuestion с 7 продуктовыми решениями (D1-D7)** во время implementation. Особо важные:
- **D6 hybrid bindings:** canonical Python bindings в каждом cell-шаблоне (discoverable пользователю) + defensive `globals().get('name', default)` в export-cell (tolerant к user-кастомизации). Это elegant двухуровневая защита от поломки контракта.
- **D7 trio adapter:** обнаружил divergence от spec (`brief.decision_rules` это `{ship, iterate, kill}` trio, а не array of strings как я писал) — адаптировал `evaluateAllRules` под существующий контракт. **Хороший catch.**
- **D4 lazy jszip + D3 lazy ValidationReportPage** — сохранили initial bundle малым (+1.4 KB gzip total).

**Blockers: 0. Concerns: 3 (1 minor architectural, 2 nano-UX). Notes: 3.**

Проверил автоматически:
- ✅ `src/lib/results/*.js` — без React-импортов (чистая логика, тестируется отдельно)
- ✅ Lazy chunking sохранён: `IpynbUpload.jsx` использует `await import('../../lib/results/ipynb.js')`, `ExportButtons.jsx` использует `await import('../../lib/results/zip.js')`. ValidationReportPage через `React.lazy` в `App.jsx`.
- ✅ `Stepper.jsx STEPS` имеет 4 пункта, route `/step5` удалён из `App.jsx`, isStepUnlocked case 4 = `planStatus === 'approved'`.
- ✅ Round-trip Sprint 6 6/6 не задет — Шаг 4 ортогонален `data_peek`.
- ✅ ADR-015 контракт: tagged cell `metadata.tags: ['stat-plan-results']` + `_safe(globals().get(...))` defensive read.
- ✅ ADR-004 соблюдён: поле «Принятое решение» в readout = `_To be filled manually._` (явно зафиксировано в readout-md.js).
- ✅ ADR-014 соблюдён: recharts в Шаге 4 **НЕ используется** — переиспользуем PNG из ipynb через `<img>` data URL. Recharts остаётся только в Шаге 1 Data Peek (lazy chunk).
- ✅ P-1 zones соблюдены: Code не трогал `docs/**` (кроме `sprint-report-7.md` — exception).

---

## Concerns

### 🔴 Blockers

Нет.

### 🟡 Concerns (требуют решения / future polish)

| # | Где | В чём concern |
|---|-----|---------------|
| **C-1** | `src/components/results/ExportButtons.jsx:3-5` | **`buildReportHtml` + `buildReadoutMd` импортируются eagerly** в ExportButtons, попадая в /step4 lazy chunk целиком. Sprint 7 report Code говорит про lazy `readout-md` chunk (4.42 KB gzip) — значит chunking всё-таки сработал, видимо через цепочку `buildZip → buildReadoutMd`. **Не уверен** что это работает оптимально — возможно `buildReportHtml` тоже стоит загружать лениво (`await import('../../lib/results/report-html.js')` внутри `handleHtml`). На данный момент initial /step4 chunk = 5.55 KB gzip — приемлемо, не критично. **Severity: micro-perf,** можно проверить и переписать в polish-pack v2. |
| **C-2** | `src/lib/results/ipynb.js:30-44` (`tryParseResultsJson` для `stream`) | **Stream output обрабатывается до `application/json` data**. Текущий порядок: если `output.output_type === 'stream'` → парсим как JSON. Но `print(json.dumps(...))` создаёт stream с stdout. Если пользователь сделает `display(JSON({...}))` или `IPython.display.JSON` — output_type будет `display_data` с `application/json` ключом. Парсер обработает оба, но не очевидно зачем `stream` приоритетнее. **Minor:** в practice stream — это default для `print(json.dumps(...))` шаблона (как в export.cells.json), `application/json` — менее частый. Логика работает. Просто отметить в комментарии что stream первый намеренно. |
| **C-3** | `src/components/results/ExportButtons.jsx:7-17` (`download` функция) | **Дублирование `download` и `downloadBlob`.** Обе функции делают `URL.createObjectURL(blob) + link.click() + revoke`. Различие только в том, что `download` сам Blob создаёт из string + mime. Можно унифицировать в одну `download(filename, blob)` + helper `stringToBlob(content, mime)`. **Micro-refactor**, не блокер. |

### 🟢 Notes (на будущее)

| # | Где | Заметка |
|---|-----|---------|
| **N-1** | `src/lib/results/checks.js:62` (SRM_THRESHOLD = 0.001) | Industry-стандарт из Microsoft/Booking, документировано. **OK** но стоит ли expose как user-setting в advanced? Низкий приоритет. |
| **N-2** | `templates/notebook/export.cells.json:39-47` (`_safe(globals().get(...))`) | Defensive `globals().get('name')` для каждого поля. Хороший паттерн, но если пользователь сделает `del control_n` после расчёта — поле станет `None`, попадёт в JSON как `null`. Парсер на стороне stat·plan тогда покажет warning «отсутствуют поля». Это правильное поведение, просто отметить. |
| **N-3** | `src/components/Stepper.jsx:18-19` (case 3 и 4 оба = `planStatus === 'approved'`) | Параллельный unlock Step 3 + Step 4 после approve plan — намеренное product решение. PM может прийти на /step4 напрямую через secondary CTA в PlanPage без захода в конструктор. **Это правильно** (deep link сценарий), но при удалении test_plan может потребоваться reset результатов — сейчас при `RESET_STATE` reducer должен сбрасывать `state.results` тоже. Проверить вручную в QA. |

---

## Trace-ability

Все S1-S13 в коде:

| S | Реализация | Тесты | Статус |
|---|---|---|---|
| **S1** | NEW `src/lib/results/ipynb.js` (parseIpynb, TAG_NAME, MAX_BYTES, REQUIRED_FIELDS, defensive validation) | NEW `ipynb.test.js` (+10) | ✅ |
| **S2** | NEW `src/lib/results/checks.js` (srmCheck via chi² df=1 + lowerIncompleteGamma + Lanczos gammaLn; sanityCheck total_n + direction) | NEW `checks.test.js` (+9) | ✅ |
| **S3** | NEW `src/lib/results/decision-rules.js` (parseDecisionRule regex, evaluateRule, evaluateAllRules trio adapter, recommendNextStep priority SHIP→ITERATE→KILL) | NEW `decision-rules.test.js` (+17) | ✅ |
| **S4** | NEW `src/pages/ValidationReportPage.jsx` (8-section layout) + 6 NEW `src/components/results/*.jsx` (Upload, ResultsForm, Checks, DecisionRules, Images, Export) | UI без unit-tests (по конвенции) | ✅ |
| **S5** | NEW `src/lib/results/report-html.js` (buildReportHtml, inline CSS темная палитра, PNG `data:image/png;base64,...`, HTML escape) | NEW `report-html.test.js` (+7) | ✅ |
| **S6** | NEW `src/lib/results/readout-md.js` (buildReadoutMd, YAML frontmatter `decision: ""`) | NEW `readout-md.test.js` (+5) | ✅ |
| **S7** | NEW `src/lib/results/zip.js` (buildZip async + dynamic jszip, buildFileMap pure helper) | NEW `zip.test.js` (+7) | ✅ |
| **S8** | `reducer.js:88-127, 161-168, 382-451` + `storage.js:30-117` (state.results top-level branch + 7 actions + persist whitelist + migrate legacy) | reducer.test.js +10, storage.test.js +3 | ✅ |
| **S9** | `Stepper.jsx:3-21` (STEPS array 4 items, isStepUnlocked case 4), `App.jsx:11-22, 60-75` (/step4 lazy route, /step5 removed) | — | ✅ |
| **S10** | NEW `templates/notebook/export.cells.json` + `load.cells.json` (plt.rcParams тёмная) + 4 main_test/* + srm/novelty/segments/guardrails canonical bindings | notebook-builder.test.js +13 | ✅ |
| **S11** | `ExpectedSchemaCard.jsx` (полный rewrite editable) + `notebook-builder.js:65-179` (resolveCol/resolveType + apply в expectedSchema + buildPlaceholderMap) | notebook-builder.test.js (+6 в +13) | ✅ |
| **S12** | DATA_MODEL.md раздел «Notebook results export schema» | — | **Cowork CLOSE** (см. ниже) |
| **S13** | `src/pages/PlanPage.jsx:78-95` (secondary CTA «У меня есть выполненный ноутбук →») | — | ✅ |

---

## ADR Compliance Check

| ADR | Статус | Комментарий |
|---|---|---|
| **ADR-015** | ✅ | export.cells.json `metadata.tags=['stat-plan-results']` + `_safe(globals().get(...))` defensive read. Парсер ipynb.js находит tagged cell, парсит stream/execute_result/application_json в этом порядке. Fallback на форму при absence ✓. PNG outputs автоматически извлекаются. |
| **ADR-013** | ✅ | Stepper 5→4 шага, Step 5 удалён, Step 4 «Валидация и отчёт». isStepUnlocked = approved. |
| **ADR-014** | ✅ | Recharts в Шаге 4 НЕ используется. PNG из ipynb через `<img src="data:image/png;base64,...">`. Recharts остаётся только в Шаге 1 Data Peek (lazy). |
| **ADR-004** | ✅ | Decision rules применяются для «Recommended next step» параграфа. Поле «Принятое решение» в readout = `_To be filled manually._`. recommendNextStep всегда заканчивается «Решение остаётся за PM» при no-match. |
| **ADR-002** | ✅ | YAML test_plan.md без изменений. Round-trip Sprint 6 6/6 без regression. |
| **ADR-001** | ✅ | Парсер ipynb на клиенте native JSON.parse, jszip lazy import. Никаких backend deps. |

---

## P-1 (зоны коммитов) Check

✅ **Code-зона commit:**
- 7 NEW в `src/lib/results/` (ipynb, checks, decision-rules, report-html, readout-md, zip, effective)
- 6 NEW в `src/components/results/`
- NEW `src/pages/ValidationReportPage.jsx`
- NEW `templates/notebook/export.cells.json`
- 6 NEW в `tests/lib/results/`
- Modified: `package.json`, `package-lock.json` (jszip), `vite.config.js` (не задет — recharts optimizeDeps остаётся), `src/App.jsx`, `Stepper.jsx`, `ExpectedSchemaCard.jsx`, `notebook-builder.js`, `storage.js`, `PlanPage.jsx`, `reducer.js`, 8 templates/notebook/*, 3 tests/

✅ **Cowork-зона не тронута** (exception: `docs/project/sprint-report-7.md` — Code-exception per CLAUDE.md P-1).

---

## Что закрыть в CLOSE-фазе Sprint 7 (Cowork)

1. **DATA_MODEL.md** — новый раздел «Notebook results export schema (ADR-015)»: канонический shape JSON (control_n / treatment_n / delta_rel / p_value / ci_lower / ci_upper / srm_pvalue / novelty_flag / guardrails[]), правила парсера (tag, fallback), backward-compat поведение.
2. **PROJECT_STATUS.md** — Sprint 7 → Closed, обновить «Что работает в продукте» (Шаг 4 + ipynb upload + HTML/MD/zip exports), roadmap (только Sprint 8 + опц. polish-pack v2).
3. **CONTEXT.md** — добавить Sprint 7 timeline entry (Goal, key decisions, что построено, ADR-015 finalization, time tracking ~4.5 ч, lessons).
4. **JTBD §7** — закрыть `[x]` user stories реализованные в Sprint 7. **JTBD §6** — закрыть `[x]` editable schema story (ADR JTBD §6 ◆).
5. **FLOW.md §«Шаг 4»** — лёгкая корректировка под ipynb upload primary (упоминание tagged cell, drag-drop, HTML/MD/zip артефакты).
6. **decisions-log.md** — ADR-015 пометить Implemented если был Proposed (Code говорит «Accepted и реализован»).

---

## Что говорить пользователю при передаче в QA

> Sprint 7 готов к QA. **Тест-кейсы + 6 готовых тестовых `.ipynb` файлов** в `docs/project/test-cases-sprint-7.md` — drag-drop их на /step4 для разных сценариев (full happy path, KILL scenario, SRM fail, backward-compat без tag, partial fields, broken JSON). Особое внимание:
> - **C-1 (micro-perf):** проверь bundle initial chunk если есть DevTools — это lazy split, не должен раздуваться (~5.55 KB gzip /step4 lazy).
> - **N-3:** проверь что «↺ Начать сначала» в шапке сбрасывает state.results тоже (после загрузки ipynb).

---

## Related

- `docs/project/sprint-report-7.md` — отчёт Code (детально про D1-D7 decisions, time tracking)
- `docs/project/sprint-7-prompt.md` — prompt (S1-S13 spec)
- `docs/context/decisions-log.md` — ADR-015 (ipynb export format)
- `docs/project/test-cases-sprint-7.md` — runnable smoke (создаётся)
