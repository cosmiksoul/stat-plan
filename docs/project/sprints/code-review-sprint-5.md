# Code Review Sprint 5 — Polish-pack + UX rename Шагов 04/05

**Reviewer:** Cowork
**Date:** 2026-05-28

---

## Summary

Sprint 5 закрыт **качественно и быстро** (~1ч 35мин active, при оценке 1.5-2 ч). Все 6 пунктов polish-pack + UX-RENAME реализованы surgical-changes, без скоуп-крипа. Тесты 249 → 266 (+17, в коридоре +10-15 из prompt). Bundle +1.44 KB raw / +0.62 KB gzip — под лимитом ≤ +2 KB. Round-trip `tests/lib/plan/round-trip.test.js` зелёный (4/4 canonical case).

Особое — **Code сам зафиксировал side-finding** (dead branches `baseline.unit === 'percent'` в sample-size.js и render.js) **не правил**, эскалировал в отчёт. Это правильная имплементация CLAUDE.md §3 (surgical changes + flag, не silent fix).

**Blockers: 0. Concerns: 4 (1 medium, 3 minor). Notes: 2.**

Проверил автоматически:
- `src/lib/util/slugify.js` — без React-импортов ✓
- `parse.js` legacy heuristic не нарушает round-trip (P-7 эвристика skipped для всех 4 canonical) ✓
- UX-RENAME затронул **только** `STEPS` labels, `route: null` и `isStepUnlocked` не тронуты ✓
- Code не правил `docs/` (только `docs/project/sprints/sprint-report-5.md` свой) ✓
- `templates/notebook/load.cells.json` имеет markdown-инструкцию + `CSV_PATH` константу — все 3 deploy-target'а (local Jupyter / Colab / GH Codespaces) описаны ✓
- Новых npm-зависимостей нет ✓

---

## Concerns

### 🔴 Blockers

Нет.

### 🟡 Concerns (требуют решения)

| # | Где | В чём concern |
|---|-----|---------------|
| **C-1** | `src/lib/plan/scoring.js:330` | **Третье место с dead branch `baseline.unit === 'percent'`** — Code в отчёте упомянул 2 (`sample-size.js`, `render.js`), но `scoring.js::normalizeBaseline` имеет идентичную dead-ветку (которая тоже недостижима, так как `parse.js coerceBaseline` ставит unit только `'fraction'` или `null`). Cleanup должен покрыть **все три** места. **Предложение:** одним trivial cleanup-PR в начале Sprint 6 (или как Sprint 5 FIX iter 1, если будут другие FIX-пункты). Не блокер для CLOSE Sprint 5 — поведение корректно, просто ноль информации, что ветка мёртвая. |
| **C-2** | `src/lib/plan/render.js:167-168` и `src/lib/plan/parse.js:198-230` | **Асимметрия round-trip для fallback case** (когда пользователь оставил `brief.metric_column` пустым). Сейчас render пишет `metric_name = brief.metric_name` (натуральный) **и** `metric_label = brief.metric_name` (тот же). При parse: `hasLabel = true` → legacy heuristic skipped → `brief.metric_column = "натуральный текст"` (полу-сломано). После round-trip пользователь потерял различие «оба поля одинаковые» vs «было только одно». Не блокер — это не один из канонических case в round-trip.test.js, и пользователь увидит натуральный текст в поле «Колонка в CSV» и поправит. Но эстетически lossy. **Фикс одной строкой:** `metric_label: yamlScalar(brief.metric_column ? brief.metric_name : null)` — пишем metric_label **только если есть metric_column** (новый формат). В fallback-режиме (metric_column пуст) метку не дублируем — тогда P-7 heuristic при загрузке восстанавливает то же состояние. **Предложение:** включить в Sprint 5 FIX iter 1 или Sprint 6 как часть P-7 завершения. |
| **C-3** | `src/lib/plan/parse.js:224-229` | **Edge case:** если в legacy-файле явно стоит `metric_label: ""` (пустая строка) — legacy heuristic срабатывает корректно (`hasLabel = false` из-за `!== ''` на строке 202), `brief.metric_name = fm.metric_name` (legacy text). Но потом блок 224-229 проходит проверку `fm.metric_label != null && fm.metric_label !== false` (пустая строка проходит обе) → `brief.metric_name = ''` перезаписывает только что восстановленный legacy text. Маловероятный случай в проде (никто не пишет `metric_label: ""` руками), но фиксится одной симметричной проверкой: `if (fm.metric_label != null && fm.metric_label !== false && fm.metric_label !== '')`. Не блокер. **Предложение:** включить в FIX вместе с C-2 (оба про эту же область кода). |
| **C-4** | `src/lib/plan/notebook-builder.js:225` | **Двойная локализация в header:** `# Analysis: ${deriveTitle(state)}` где `deriveTitle` возвращает `Тест: ${metric_name}` → финальный header `# Analysis: Тест: конверсия в первый депозит`. Английский Analysis + русский Тест в одной строке смотрится неуклюже. Не баг, **продуктовое UX-решение.** В prompt'е я писал `# Analysis: CTR клика по партнёру` (имея ввиду только текст без prefix-а «Тест:»). Code применил `deriveTitle` единообразно с YAML — это разумный единый паттерн, но визуально некорректный. **Варианты:** (а) `# Analysis: ${brief.metric_name || brief.metric_column || 'untitled'}` — без префикса Тест:; (б) `# ${deriveTitle(state)}` — без Analysis, только русск.; (в) оставить как есть. **Эскалация:** решение за пользователем — какой формат header'а в скачанном ноутбуке выглядит правильно для PM-аудитории. |

### 🟢 Notes (на будущее)

| # | Где | Заметка |
|---|-----|---------|
| **N-1** | `src/lib/util/slugify.js:18` | **`.slice(0, 40)` может оставить trailing `-`** если усечение пришлось на границу слова. Маловероятно (метрики обычно короче 40 символов), но косметика. Можно после `.slice(0, 40)` добавить `.replace(/-+$/, '')`. Не приоритет. |
| **N-2** | `src/lib/util/slugify.js:15` | **Флаг `i` в regex после `toLowerCase()`** — избыточен (`s.toLowerCase()` уже все буквы в lower, ASCII-class `a-z` достаточно). Не баг, просто лишний флаг. Не приоритет. |

---

## Trace-ability (каждый пункт prompt-а → файл/тест/коммит)

| Пункт | Реализован в | Тесты | Status |
|---|---|---|---|
| **P-2** CSV_PATH + Colab инструкция | `templates/notebook/load.cells.json` | покрыто placeholder-smoke в существующих тестах notebook-builder | ✅ |
| **P-3** filename/test_id ← metric_column, header ← metric_name, subtitle переписан | `render.js::deriveTestId` (line 130), `notebook-builder.js::deriveTestId/deriveTitle/buildHeaderCell` (line 62/74/219) | +3 в `render.test.js` (test_id derivation cases); 5 cases в `notebook-builder.test.js` переписаны под новый контракт | ✅ (см. C-4 эскалация) |
| **P-4** inline approx-info на Q03/Q07 для ratio/continuous | `QuestionRenderer.jsx` — `ApproxInfoBlock` + `APPROX_INFO_TEXT` + `APPROX_METRIC_TYPES` (line 12-27, 229-231, 255-271) | UI-логика без unit-тестов (конвенция проекта); RETEST браузер | ✅ |
| **P-5** удалить dead `baseline.unit === 'percent'` в notebook-builder | `notebook-builder.js` (комментарий line 169-171) | покрыто существующими placeholder-тестами | ✅ (см. C-1 — две оставшиеся dead-ветки) |
| **P-6** slugify utility | new `src/lib/util/slugify.js`; импорт в `render.js:12` и `notebook-builder.js:22` | new `tests/lib/util/slugify.test.js` (+10) | ✅ |
| **P-7** legacy heuristic | `parse.js::mapFrontmatter` (line 188-222) | +4 в `parse.test.js` (Cyrillic legacy, Bounce Rate legacy, new format, conflict case) | ✅ (см. C-2, C-3 — edge cases) |
| **UX-RENAME** labels Stepper | `Stepper.jsx:7-8` | — | ✅ |

---

## ADR Compliance Check

| ADR | Статус | Комментарий |
|---|---|---|
| ADR-001 (no backend) | ✅ | Всё на клиенте. |
| ADR-002 (артефакты как переносимое состояние) | ✅ (с asymmetry C-2) | Round-trip canonical 4/4 зелёный. Asymmetry — для не-канонического fallback case. |
| ADR-003 (структурная оценка) | ✅ | Не трогали scoring (см. C-1 — там оставлен dead-branch, не функциональное изменение). |
| ADR-004 (тул не принимает решений) | ✅ | Не трогали decision rules. |
| ADR-005 (5-шаговый флоу) | ✅ | Шаги 04/05 остаются locked, изменены только labels. |
| ADR-006 (approved/draft) | ✅ | Не трогали. |
| ADR-009 (точные формулы / приближения с warning) | ✅ | P-4 — UI-следствие этого ADR (информируем раньше). |
| ADR-010 (стек) | ✅ | Без новых npm-зависимостей. |
| ADR-011 (semantic shift metric_name/metric_label) | ✅ (с C-2 asymmetry) | P-3, P-6, P-7 — прямые следствия. Round-trip восстановлен для канонических кейсов. |
| ADR-012 (Шаг 4 «Быстрая валидация» + rename) | ✅ (частично — labels) | UX-RENAME сделан, полный redesign Шага 4 — Sprint 6. |

---

## P-1 (зоны коммитов) Check

✅ **Code-зона коммита `8c345fd`:**
- `templates/notebook/load.cells.json`
- `src/lib/util/slugify.js` (new)
- `src/lib/plan/{render,parse,notebook-builder}.js`
- `src/components/brief/QuestionRenderer.jsx`
- `src/components/Stepper.jsx`
- `tests/lib/util/slugify.test.js` (new)
- `tests/lib/plan/{parse,render,notebook-builder}.test.js`
- `docs/project/sprints/sprint-report-5.md` (exception по P-1: sprint-report Code пишет и коммитит сам)

Никаких файлов из Cowork-зоны (`docs/context/`, `docs/project/` кроме своего report, `CLAUDE.md`, `README.md`) не тронуто. P-1 соблюдён.

---

## Что закрыть в CLOSE-фазе (для будущего инстанса Cowork)

После QA пользователя (см. `test-cases-sprint-5.md`) и FIX (если будут баги):

1. **Решение по C-1..C-3:** включать в Sprint 5 FIX iter 1 / отложить в Sprint 6 / отдельный trivial cleanup.
2. **Решение по C-4:** пользователь выбирает формат header `.ipynb` (1 из 3 вариантов или предложит свой).
3. **Cowork-зона CLOSE Sprint 5 (запланирована в PROJECT_STATUS):**
   - Переписать `docs/context/FLOW.md` §«Шаг 4», §«Шаг 5» под ADR-012 (Быстрая валидация / Скачать артефакты).
   - Обновить `docs/context/concept.md` если упоминаются Шаги 4/5.
   - Переписать `docs/project/JTBD.md §7, §8` user stories под новый scope.
   - Закрыть в `CONTEXT.md` tech debt пункты, ушедшие в polish-pack (P-5 dead code, P-6 slugify duplication; P-7 legacy heuristic).
   - Обновить таблицу спринтов в `PROJECT_STATUS.md` (status Sprint 5 → Closed + active time).
   - Cowork-коммит batch'ем + push.

---

## Что говорить пользователю при передаче в QA

> Sprint 5 готов к smoke QA. Чек-лист в `docs/project/sprints/test-cases-sprint-5.md` — пройди 6 кейсов (~10 мин). Особое внимание:
> - **Заметка по header'у `.ipynb`** (concern C-4): сейчас выглядит как `# Analysis: Тест: <название>` — два префикса в одной строке (англ. + русск.). Скажи, какой формат предпочитаешь для финального ноутбука.
> - **Round-trip:** если в P-7 legacy upload найдёшь странности, дай знать — там есть edge cases (C-2, C-3) которые мы можем добить FIX iter 1.

---

## Related

- `docs/project/sprints/sprint-report-5.md` — отчёт Code
- `docs/project/sprints/sprint-5-prompt.md` — prompt
- `docs/project/polish-pack.md` — источник 6 пунктов
- `docs/context/decisions-log.md` — ADR-011, ADR-012
- `docs/project/sprints/test-cases-sprint-5.md` — будет создан для QA
