# Sprint 5 FIX iter 1 — concerns C-1..C-4 from code review

**Type:** Code FIX (одна фаза, маленькая)
**Estimated:** ~30-45 мин active
**Источник:** `docs/project/sprints/code-review-sprint-5.md` (concerns C-1..C-4) + (опционально) bugs из `docs/project/sprints/test-cases-sprint-5.md` (если QA выявит — будут дописаны ниже до передачи в Code).

---

## Overview

Sprint 5 закрылся без блокеров, но code review выявил 4 concern'а, все non-critical, и пользователь явно решил **править все** в одном FIX iter. Включая один Code-flagged cleanup (C-1) и одно продуктовое решение по формату header'а notebook (C-4 — пользователь выбрал убрать английский prefix «Analysis: », оставить только русск. «Тест: »).

Цель iter 1 — закрыть concern'ы, не задеть round-trip контракт (`tests/lib/plan/round-trip.test.js` 4/4 canonical case должны остаться зелёными), не вводить новых зависимостей.

---

## Scope

### C-1 — Cleanup dead branches `baseline.unit === 'percent'` (×2 оставшиеся)

В Sprint 5 закрыто P-5 в `notebook-builder.js`. Code-flagged side-finding нашёл ещё **два** места, **плюс Cowork нашёл третье** (Code missed):

1. `src/lib/plan/sample-size.js::normalizeBaseline` (строка 92):
   ```js
   if (baseline.unit === 'percent') return baseline.value / 100
   ```
2. `src/lib/plan/render.js::normalizeBaselineForYaml` (строка 126):
   ```js
   if (baseline.unit === 'percent') return baseline.value / 100
   ```
3. `src/lib/plan/scoring.js::normalizeBaseline` (строка 330):
   ```js
   if (baseline.unit === 'percent') return baseline.value / 100
   ```

**Все три** недостижимы — `parse.js::coerceBaseline` ставит unit только `'fraction'` (proportion) или `null` (continuous/ratio/count). В YAML unit не сериализуется вообще (только value).

**Fix:** во всех трёх местах удалить ветку, оставить только финальный `return baseline.value` (или `baseline.value ?? 0` — что было в P-5).

**Тесты:** существующие тесты на `normalizeBaseline` остаются зелёными (поведение не меняется для реальных входных значений). Если в каком-то тесте баланс был тестируем именно через unit='percent' (что было бы странно) — fix это тоже flag.

### C-2 — Round-trip asymmetry для пустого `metric_column`

**Симптом (потенциальный, не критичный):** если пользователь оставил `brief.metric_column` пустым (заполнил только «Название метрики»), скачал план, перезагрузил — в YAML оба поля `metric_name` и `metric_label` содержат одинаковый натуральный текст. При parse: `hasLabel = true` → legacy heuristic skipped → `brief.metric_column = "натуральный текст"` (полу-сломано). Пользователь после round-trip видит в «Колонке в CSV» натуральный текст вместо пустого поля, которое надо было заполнить.

**Fix в `src/lib/plan/render.js`** в `renderTestPlanMd` блоке `substitutions` (строка ~168):

```js
// Было:
metric_label: yamlScalar(brief.metric_name || null),

// Стало:
metric_label: yamlScalar(brief.metric_column ? brief.metric_name || null : null),
```

Логика: `metric_label` пишем **только если есть `metric_column`** (новый формат пары). Если `metric_column` пуст — `metric_label` не пишется, parse при загрузке применит P-7 legacy heuristic и восстановит `brief.metric_column = ''`, `brief.metric_name = <натуральный>`. Round-trip симметричен.

**Тест** в `tests/lib/plan/round-trip.test.js` — добавить 5-й canonical case:
- input state: `brief.metric_column = ''`, `brief.metric_name = 'конверсия в первый депозит'`, остальные поля минимальные валидные.
- round-trip: render → parse → state matches input (включая пустой metric_column).
- bonus assert: `rendered` не содержит `metric_label:` строки (или содержит `metric_label: null`).

### C-3 — Edge case `metric_label: ""` в parse.js

**Симптом:** если в legacy-файле явно стоит `metric_label: ""` (пустая строка) — legacy heuristic правильно срабатывает (`hasLabel = false` благодаря `!== ''` на строке 202), `brief.metric_name = fm.metric_name` (legacy text). Но потом блок 224-229 проходит проверку `fm.metric_label != null && fm.metric_label !== false` (пустая строка проходит обе) → `isStr('') === true` → `brief.metric_name = ''` перезаписывает legacy text.

**Fix в `src/lib/plan/parse.js`** строка 224:

```js
// Было:
if (fm.metric_label != null && fm.metric_label !== false) {

// Стало:
if (fm.metric_label != null && fm.metric_label !== false && fm.metric_label !== '') {
```

Симметрично проверке `hasLabel` выше.

**Тест** в `tests/lib/plan/parse.test.js` — +1 case:
- legacy YAML: `metric_name: "конверсия в первый депозит"`, `metric_label: ""` (явно пустая строка).
- expected: `brief.metric_name = 'конверсия в первый депозит'` (legacy heuristic не перезатёрта), `brief.metric_column = ''`, warning о legacy формате присутствует.

### C-4 — Notebook header формат: убрать «Analysis:», оставить «Тест:»

**Симптом:** сейчас header первой markdown-ячейки скачанного `.ipynb`:
```
# Analysis: Тест: конверсия в первый депозит
```

Двойной prefix (англ. + русск.) выглядит неуклюже. Пользователь выбрал вариант **(б) из эскалации E-1:** убрать `Analysis: `, оставить только результат `deriveTitle` (который уже даёт `Тест: <name>` или `Тест-план без названия`).

**Fix в `src/lib/plan/notebook-builder.js::buildHeaderCell`** строка 225:

```js
// Было:
lines.push(`# Analysis: ${deriveTitle(state)}\n`)

// Стало:
lines.push(`# ${deriveTitle(state)}\n`)
```

После fix header будет:
- `# Тест: конверсия в первый депозит` (для заполненного `metric_name`)
- `# Тест-план без названия` (для совсем пустого state — fallback из `deriveTitle`)

**Тесты** в `tests/lib/plan/notebook-builder.test.js`:
- Найти существующий assert на header первой строки (он был переписан в Sprint 5 под `# Analysis: …`) и обновить под новый формат `# Тест: …`.
- Если есть тест на «Тест-план без названия» fallback — убедиться что он матчит `# Тест-план без названия`.

---

## Что НЕ делаем (DO NOT)

- ❌ **Не трогаем** `Stepper.jsx`, `QuestionRenderer.jsx`, `slugify.js`, `templates/notebook/load.cells.json` — они корректны после Sprint 5 main.
- ❌ **Не правим** `deriveTitle` (оставляем как есть с префиксом «Тест: ») — изменение **только в строке header'а** в `buildHeaderCell`. Это минимизирует диффу и не задевает YAML, где `title:` остаётся `Тест: <name>`.
- ❌ **Не меняем** P-7 legacy heuristic regex / правило — только закрываем edge case C-3 одной симметричной проверкой.
- ❌ **Не вводим** новых полей в state, новых YAML-ключей, новых @theme токенов, новых npm-зависимостей.
- ❌ **Не рефакторим** `normalizeBaseline` за рамки удаления dead-ветки (например, не пытаемся объединить три копии в общую utility — это отдельный refactor, не входит в скоуп).
- ❌ **Не делаем** UI/RTL тесты — только Vitest unit-тесты (как и в Sprint 1-5).
- ❌ **Не трогаем** Cowork-зону (`docs/**`, `CLAUDE.md`, `README.md`, `.gitignore`, `.gitattributes`).

---

## Files involved

**Модифицируем:**
- `src/lib/plan/sample-size.js` (C-1)
- `src/lib/plan/render.js` (C-1 + C-2)
- `src/lib/plan/scoring.js` (C-1)
- `src/lib/plan/parse.js` (C-3)
- `src/lib/plan/notebook-builder.js` (C-4 — одна строка в `buildHeaderCell`)
- `tests/lib/plan/round-trip.test.js` (+1 canonical case для C-2)
- `tests/lib/plan/parse.test.js` (+1 case для C-3 — metric_label="")
- `tests/lib/plan/notebook-builder.test.js` (обновить header assert под C-4)

**Не трогаем:**
- Все остальные файлы.

---

## Technical Notes

### Round-trip контракт — критическая проверка после C-2 fix

После реализации C-2 **обязательно** перепрогнать `tests/lib/plan/round-trip.test.js` все canonical case (4 из Sprint 4 FIX iter 2 + 1 новый из C-2). Если хоть один сломался — стоп, **не пушим, не fix-fix'им** — описываем в отчёт и эскалируем (CLAUDE.md §5 stop and replan).

Особое внимание: case 1 (full pack ratio+cluster+rules) использует **заполненный** `metric_column='ctr'` → C-2 fix на него не должен повлиять (условие `brief.metric_column ?` истинно → пишем `metric_label` как было).

### Симметрия C-2 с P-7

C-2 fix создаёт **прямую round-trip симметрию** для fallback case через P-7 heuristic:
- Render: `metric_column = ''` → не пишем `metric_label` → YAML содержит только `metric_name: "натуральный текст"` (legacy-подобный).
- Parse: видит `fm.metric_name` с пробелами/кириллицей + отсутствие `fm.metric_label` → P-7 heuristic применяется → `brief.metric_name = fm.metric_name`, `brief.metric_column = ''`, warning о legacy.

**Side-effect:** для нового пользователя, который не заполнил `metric_column` и сохранил → загрузил, на step 2 увидит warning «Обнаружен legacy формат». Это **корректно** — он действительно не дал коду колонки, ему **должно** прийти напоминание заполнить. Для UX этот warning не блокирует ничего, просто информирует.

### C-1 — почему все три за один FIX

Цель — закрыть «копия dead-кода в N местах», а не «убрать первый случай, остальные накопятся». Sprint 5 P-5 закрыл одно место как pilot; C-1 завершает уборку для остальных трёх. Будущий читатель не должен задаваться вопросом «почему в одном файле убрали, в трёх других — нет».

### C-4 — почему меняем только в header, не в `deriveTitle`

`deriveTitle` используется в **двух** местах:
- `notebook-builder.js::buildHeaderCell` (то, что меняем)
- `render.js::deriveTitle` для `YAML.title` в test_plan.md

Если поменять саму `deriveTitle` (убрать «Тест: »), YAML `title` тоже изменится, что нарушит round-trip (parse читает YAML.title и кладёт в state.title для notebook). Минимальное изменение — на уровне header'а: меняем только строку в `buildHeaderCell`. YAML `title` остаётся `"Тест: <name>"` как было.

---

## ADR Constraints

| ADR | Что значит для этого FIX |
|---|---|
| ADR-002 (round-trip контракт) | **Главное** — round-trip 4/4 + новый 5-й case должны быть зелёные после fix. |
| ADR-011 (semantic shift metric_name/metric_label) | C-2 — завершение round-trip симметрии для fallback. C-3 — edge case той же области. |
| ADR-009 (точные формулы) | Не трогаем sample-size логику, только удаляем dead-ветку в нормализации. |
| ADR-010 (стек) | Без новых зависимостей. |
| Все остальные | Без изменений. |

---

## Acceptance criteria

1. `npm test` зелёный. **Прирост ~+2 теста** (C-2 round-trip + C-3 parse edge case). Total: **~268**.
2. `npm run build` чистый. Bundle delta **≈ 0** (удаление строк + добавление одной условной).
3. `tests/lib/plan/round-trip.test.js` — **5/5** canonical case зелёные (4 старых + новый C-2 case с пустым metric_column).
4. **Browser smoke (~3-5 мин):**
   - Заполнить бриф с пустым «Колонка в CSV», утвердить, скачать `test_plan.md` → в YAML нет строки `metric_label:`. Загрузить обратно → в Q04 «Колонка в CSV» по-прежнему пусто (не появился натуральный текст). На step 2 виден legacy warning.
   - Заполнить бриф с обоими полями Q04, скачать `.ipynb` → первая строка `# Тест: <название>` (без `Analysis:`).
   - Любая страница → Stepper labels не изменились (sanity check P-1: «не задели то, что было готово»).

---

## Sprint FIX Report — что ожидаем

В `docs/project/sprints/sprint-5-fix-report.md` (короткий):

- **Trace-ability** C-1..C-4: каждый → файл/строка/коммит.
- **Round-trip status:** 5/5 зелёные? Если нет — какой case сломан, почему, fix.
- **Bundle delta** до/после (ожидание ≈ 0).
- **Если был bonus refactor / уборка** — флаг отдельной секцией.
- **Time tracking** — ожидаемый total ~30-45 мин.

---

## QA bugs

**Smoke прошёл без багов** (10/10 кейсов `ok`, 2026-05-28). Скоуп FIX iter 1 финализирован — только C-1..C-4 из code review, ничего дополнительного из QA.

| # | Severity | Что не работает | Где | Reproduction |
|---|---|---|---|---|
| — | — | — | — | — |

---

## Related

- `docs/project/sprints/code-review-sprint-5.md` — concerns C-1..C-4
- `docs/project/sprints/test-cases-sprint-5.md` — smoke кейсы + эскалация E-1
- `docs/project/sprints/sprint-report-5.md` — отчёт Code Sprint 5 (Code-flagged side-finding)
- `docs/context/decisions-log.md` — ADR-011 (контракт metric_name/metric_label)
