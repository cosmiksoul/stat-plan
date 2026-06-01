# Test Cases Sprint 7 — Шаг 4 «Валидация и отчёт» (runnable smoke)

**Дата подготовки:** 2026-05-30
**Тестируемое:** локально через `npm run dev` → `http://localhost:5173/stat-plan/`
**Стратегия:** **Smoke 12 кейсов, ~20-30 минут.** Большой UI (новая страница /step4 + 6 components + 7 results libs + Stepper rewrite + editable schema на /step3 + export-cell в notebook-builder). Click-by-click формат.

**6 готовых `.ipynb` файлов для QA** present_files'ятся после этого документа:

| Файл | Назначение | Для каких кейсов |
|---|---|---|
| `peek_results_full.ipynb` | Happy path: SHIP scenario (Δ=+5.2%, p=0.012, CI [+2.1%, +8.3%], guardrails OK), 2 PNG графика, tagged cell | Кейс 2, 3, 4, 5 |
| `peek_results_negative.ipynb` | KILL scenario (Δ=-2.5%, p=0.42 high, novelty_flag=true, guardrail breached), 1 PNG | Кейс 6 |
| `peek_results_srm_fail.ipynb` | SRM red: counts 5500/4500, srm_pvalue=1e-25 → suspect | Кейс 7 |
| `peek_results_no_tag.ipynb` | **Backward-compat:** old Sprint 6 ipynb без `stat-plan-results` cell. PNG outputs всё равно извлекаются | Кейс 8 |
| `peek_results_partial.ipynb` | Tagged cell есть, но в JSON отсутствует `p_value` → warning «missing fields» | Кейс 9 |
| `peek_results_broken.ipynb` | Tagged cell есть, но output не JSON (просто text) → warning «не разобрать как JSON», fallback на форму | Кейс 10 |

**Подготовка перед стартом:**
1. Pull latest `main` после Sprint 7 push.
2. `npm install` (новая deps: `jszip`).
3. `npm run dev` → `http://localhost:5173/stat-plan/`.
4. **`localStorage.clear()`** в DevTools Console → reload (чтобы legacy state не мешал миграции results).
5. DevTools Console — открытым (отлавливать ошибки).
6. Скачай 6 `.ipynb` файлов из present-files ниже.

---

## Как пользоваться

1. Заполняешь статус `ok` / `bug` / `n/a`.
2. Если `bug` — описывай в Bugs found с severity.
3. Кейсы 1-5 строятся друг на друге (один бриф → один план → разные ipynb). Кейсы 6-12 — отдельные сценарии, перезаливай разные ipynb.

---

## Кейс 1 — Stepper 4-step (ADR-013 структурный rewrite)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 1 | Стартовый экран → «Начать с брифа». Посмотри на Stepper сверху. | **4 шага** (не 5): «01 Бриф», «02 Тест-план», «03 Конструктор», «04 Валидация и отчёт». Пункт «05 Скачать артефакты» **отсутствует**. Все Шаги 2-4 серые (locked). | |

---

## Кейс 2 — Подготовка теста + approve plan + параллельный unlock /step3 + /step4

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 2 | Пройди бриф быстро (любые валидные значения для proportion, например baseline=0.05, MDE=10%, traffic=10000). На /step2 нажми «✓ Утвердить план». | **Step 3 и Step 4 оба разблокированы** в Stepper после approve (зелёные/cliкабельные). В PlanPage approved-баннере две CTA: primary «→ К конструктору ноутбука» и **secondary** «↑ У меня есть выполненный ноутбук → /step4». | |

---

## Кейс 3 — editable expected schema на /step3 (JTBD §6 ◆)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 3 | На /step3 (Конструктор) — найди ExpectedSchemaCard (таблица ожидаемых колонок CSV). Попробуй: (a) переименовать колонку (`metric_column` → введи новое имя `metric_v2`), (b) поменять тип колонки через dropdown, (c) reset button. Скачай `.ipynb`. Открой в редакторе. | (a) Rename: новое имя `metric_v2` отображается в таблице, в скачанном ноутбуке везде где раньше было `metric_column` теперь `metric_v2` (включая placeholders в `pd.read_csv` / SRM / main_test). (b) Type change: колонка показывает новый тип, в Expected CSV schema markdown ноутбука обновлён. (c) Reset кнопка возвращает к default. Перезагрузка страницы (F5) — overrides сохраняются (persist в localStorage). | |

---

## Кейс 4 — Happy path: ipynb upload + autoextract + HTML отчёт

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 4 | Перейди на /step4 (через Stepper или secondary CTA). На «1. Загрузи выполненный ноутбук» — drag-drop `peek_results_full.ipynb`. | После drop:<br>— Badge **✓ Результаты извлечены из peek_results_full.ipynb**<br>— Section «2. Результаты»: форма pre-filled (control_n=4523, treatment_n=4587, delta_rel=0.052 = 5.2%, p_value=0.012, ci_lower=0.021, ci_upper=0.083, srm_pvalue=0.67)<br>— Section «3. Sanity checks»: SRM pass ✓ (p=0.67), total_n_match — зависит от плана<br>— Section «4. Decision rules»: 3 правила из брифа (ship/iterate/kill) — если в брифе заполнены, парсер пытается auto-flag<br>— Section «5. Графики из ноутбука»: 2 тонкие красные квадратики (placeholder PNG из тестового файла)<br>— Section «6. Скачать артефакты»: 3 кнопки (HTML / MD / ZIP) | |

---

## Кейс 5 — Скачать report.html, проверить self-contained

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 5 | После кейса 4 → кнопка «↓ Скачать report.html». Открой скачанный файл в новой вкладке браузера (двойной клик в файловом менеджере → откроется в default browser). | Открывается **single self-contained file**:<br>— Тёмная палитра под stat·plan UI (`#0e1014` background, `#a3e635` accent)<br>— Header с test_id<br>— Section TL;DR с auto-generated параграфом (Δ, CI, p, рекомендация)<br>— Section «Гипотеза и дизайн»<br>— Section «Результаты» с числами + 2 встроенных PNG (`<img src="data:image/png;base64,...">`)<br>— Section «Sanity checks» с ✓/⚠<br>— Section «Применение decision rules»<br>— Section «Принятое решение» с placeholder _[Заполни вручную]_<br>— Footer «Generated by stat·plan ...»<br>**Файл работает оффлайн** — отключи интернет, ещё раз открой — рендерится. | |

---

## Кейс 6 — KILL scenario + novelty + guardrail breach

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 6 | На /step4 → «↺ Сбросить результаты». Drag-drop `peek_results_negative.ipynb`. | Форма pre-filled: delta_rel=-0.025 (отрицательный), p_value=0.42 (высокий), novelty_flag=**true**, guardrail bounce_rate breached=true.<br>**Sanity:** direction_match = warning ⚠ (если в плане MDE direction=increase) — отрицательный delta не совпадает.<br>**Decision rules:** auto-eval должен показать что SHIP не сработал (p > threshold или Δ < 0), KILL вероятно сработал (если правило `p_value > 0.05 → KILL`).<br>**Recommended next step**: KILL или «Решение остаётся за PM» если правила не парсятся. | |

---

## Кейс 7 — SRM fail (counts 5500/4500)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 7 | На /step4 → «↺ Сбросить результаты». Drag-drop `peek_results_srm_fail.ipynb`. | Форма pre-filled с control_n=5500, treatment_n=4500. **SRM check**: ⚠ suspect — pvalue ~e-25, **очень мал**, badge red. Sanity warning «SRM detected». | |

---

## Кейс 8 — Backward-compat: old Sprint 6 ipynb без tag

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 8 | На /step4 → «↺ Сбросить результаты». Drag-drop `peek_results_no_tag.ipynb`. | Badge **⚠ warning** «Ноутбук peek_results_no_tag.ipynb загружен, но без ячейки с тегом stat-plan-results. Заполни числа вручную ниже. PNG-графики подцепились — они попадут в HTML-отчёт.»<br>Форма ResultsForm **пустая** (нет pre-fill).<br>Section «5. Графики из ноутбука» — **1 PNG показан** (тестовый файл имеет 1 image output).<br>Если ввести числа руками → форма работает, экспорт HTML/MD/ZIP включает PNG из ноутбука + числа из формы. | |

---

## Кейс 9 — Tagged cell, но missing field (partial)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 9 | На /step4 → «↺ Сбросить результаты». Drag-drop `peek_results_partial.ipynb`. | Badge ✓ «Результаты извлечены», но **warning** под SourceBadge или в форме: «В выводе stat-plan-results отсутствуют поля: p_value». Форма pre-filled: control_n, treatment_n, delta_rel, ci_lower, ci_upper заполнены; p_value **пустой**. Пользователь дозаполняет p_value руками. | |

---

## Кейс 10 — Tagged cell с broken JSON (not JSON output)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 10 | На /step4 → «↺ Сбросить результаты». Drag-drop `peek_results_broken.ipynb`. | **Warning** «Не удалось разобрать stdout ячейки stat-plan-results как JSON.» Форма ResultsForm пустая (fallback на ручной ввод). | |

---

## Кейс 11 — Manual flow (без ipynb)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 11 | На /step4 → «↺ Сбросить результаты». Под dashed-зоной — клик «ввести числа вручную →». | Section «1. Загрузи ноутбук» сворачивается / остаётся видимой. **Появляются** sections 2-6 с пустой формой. Badge источника = «📝 Ручной ввод». Заполни числа руками (например control_n=5000, treatment_n=5050, delta_rel=0.04, p_value=0.03, ci_lower=0.005, ci_upper=0.075). Скачать HTML — отчёт без PNG галереи (raw_results есть, images пустые). | |

---

## Кейс 12 — Скачать всё (.zip)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 12 | После любого кейса 4-11 → кнопка «↓ Скачать всё (.zip)». | Скачивается `{test_id}_2026-05-30.zip` (~50-100 KB). Распакуй: внутри **4 файла** (или 3 если manual flow без ipynb):<br>— `test_plan.md` (re-rendered из state)<br>— `analysis.ipynb` (если был upload — исходный raw text)<br>— `report.html`<br>— `readout.md`<br>Если был CSV peek helper на Шаге 1 — опционально `experiment_results.csv`. | |

---

## Bugs found

| # | Severity | Что не работает | Где | Reproduction |
|---|---|---|---|---|
| | | | | |

---

## Известные concerns из code review (см. `code-review-sprint-7.md`)

- **C-1** (micro-perf): `buildReportHtml` импортируется eagerly в ExportButtons. Initial /step4 chunk = ~5.55 KB gzip — приемлемо. Возможный polish в v2.
- **C-2** (документация): порядок парсинга output stream → application/json → text/plain — не очевидно зачем stream первый. Работает корректно. Минор.
- **C-3** (micro-refactor): дублирование `download` и `downloadBlob` в ExportButtons. Не блокер.
- **N-3** (валидация в QA): «↺ Начать сначала» в шапке должен сбрасывать state.results — проверь в кейсе 6 после любого upload.

---

## Резюме QA

**Дата:** ___
**Время:** ___ мин
**Кейсов:** 12 / pass: ___ / bug: ___

**Решения по concerns:**
- C-1 (lazy buildReportHtml): включить в polish-pack v2 / отложить.
- C-3 (download dedup): включить в polish-pack v2 / отложить.

**Следующая фаза:**
- Если bugs == 0 → **Sprint 7 CLOSE** (Cowork-зона):
  - DATA_MODEL.md — раздел «Notebook results export schema» (ADR-015 контракт)
  - JTBD §7 + §6 закрыть `[x]` user stories
  - CONTEXT.md timeline + PROJECT_STATUS roadmap
  - FLOW.md §«Шаг 4» лёгкая корректировка
- Если bugs > 0 → Sprint 7 FIX iter 1 prompt.

После Sprint 7 CLOSE — **v1 готов**. Остаётся только Sprint 8 (methodology + a11y) + опц. Polish-pack v2.
