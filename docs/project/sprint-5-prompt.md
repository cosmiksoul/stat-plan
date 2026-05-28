# Sprint 5 — Polish-pack + UX rename Шагов 04/05

**Type:** Code mini-sprint (одна фаза, без явных Phase A/B)
**Estimated:** ~1.5-2 ч active

---

## Overview

После закрытия Sprint 4 (main + FIX iter 1 + FIX iter 2) накопилось 6 non-critical fixes в `docs/project/polish-pack.md` (P-2..P-7; P-1 уже закрыт в Sprint 4 FIX iter 2 как user-sanctioned side-scope). Параллельно в ADR-012 (Accepted 2026-05-28) зафиксирован UX rename Шагов 04/05 — это маленькое изменение в `Stepper.jsx`, логично взять в том же спринте.

**Зачем:**
1. **Polish-pack** разгружает Sprint 6 (Шаг 4 «Быстрая валидация») от мелких накопленных хвостов — чтобы main-спринт шёл по своей теме без отвлечений на «по дороге заодно». Все 6 пунктов трассируются на конкретные BUG/Concern из Sprint 4 RETEST или code review.
2. **UX rename** — следствие ADR-012. Шаги 04 «Анализ» и 05 «Read-out» переименовываются в «Быстрая валидация» и «Скачать артефакты» соответственно. Сами шаги остаются `route: null` (полная реализация — Sprint 6+), меняются только labels.

Спринт мелкий, поэтому одна фаза с одним коммитом (или 2-3 логических, на усмотрение Code). Никакого Phase A/B разделения.

---

## Scope

### P-2 — BUG-7: Colab-friendly `CSV_PATH` в load template

**Симптом:** в Colab / JupyterLab Hub / GitHub Codespaces файл `experiment_results.csv` не лежит рядом с ноутбуком автоматически — пользователь получает `FileNotFoundError` сразу на первой ячейке.

**Что делаем:**
- В `templates/notebook/load.cells.json` — code cell:

```python
import pandas as pd
import numpy as np

CSV_PATH = 'experiment_results.csv'  # рядом с ноутбуком, или укажи полный путь / URL
df = pd.read_csv(CSV_PATH)
print(f'rows: {len(df):,}')
df.info()
df.head()
```

- Markdown-инструкция (предшествующая или следующая ячейка, на усмотрение):

> CSV должен лежать рядом с ноутбуком — или укажи в `CSV_PATH` полный путь / URL. Для Colab — путь в `/content/` после upload или mount Google Drive.

Покрывает 3 кейса: локальный Jupyter, Colab после upload, GitHub-raw URL.

### P-3 — BUG-8: filename / `test_id` / header source разделение

После ADR-011 (semantic shift `metric_name` = код колонки snake_case, `metric_label` = натуральный текст) логично, чтобы:

| Артефакт | Источник | Пример |
|---|---|---|
| filename `.ipynb` | slug из `brief.metric_column` | `cr_first_deposit_analysis.ipynb` |
| `YAML.test_id` (test_plan.md) | slug из `brief.metric_column` | `cr-first-deposit` |
| `# Analysis: …` в header notebook | `brief.metric_name` (натуральный) | `# Analysis: CTR клика по партнёру` |

**Файлы:**
- `src/lib/plan/notebook-builder.js` функция `deriveTestId` — приоритет `brief.metric_column` над `brief.metric_name`. Fallback на `metric_name` если `metric_column` пуст.
- `src/lib/plan/render.js` функция `deriveTestId` — то же изменение (синхронно, иначе round-trip ломается).
- `src/lib/plan/notebook-builder.js` функция `buildHeaderCell` — header `# Analysis: ${deriveTitle(state)}` где `deriveTitle` отдаёт `brief.metric_name` (натуральный) с fallback на `brief.metric_column` если пуст.
- Подзаголовок notebook header, если он сейчас содержит формулировку типа «Test plan: рядом лежит test_plan.md» — переписать на нейтральное: `> Test plan: см. test_plan.md, генерируется отдельно в stat·plan (шаг 2).` (та же мизлидинг-проблема что и в P-2 — пользователь в Colab `test_plan.md` рядом не имеет).

После P-6 (slugify utility) обе `deriveTestId` будут использовать общий slugify.

### P-4 — Inline-warning о приближённости расчёта на Q03/Q07

**Симптом:** пользователь видит warning о приближённости sample size только в Q08 (где появляется реактивный display). Если он выбирает ratio или continuous в Q03 — никакого сигнала о том, что для точного расчёта нужны параметры исторических данных. Поздняя информация ломает ожидания.

**Что делаем:**
- В компоненте, который рендерит Q03 (`src/components/brief/QuestionRenderer.jsx` или `SingleSelect.jsx` — найти по фактическому коду), при выборе опции `ratio` или `continuous` — показать info-блок под выбранной опцией (или под полем сразу):

> ⓘ Для точного sample size нужны параметры исторических данных (для ratio — ковариация числителя/знаменателя; для continuous — σ метрики). Если их нет — расчёт будет приближением через bootstrap (±20-30%). Точная цифра — после Data Peek (запланировано на Sprint 3+).

- Стилизация: использовать существующие токены `bg-info-soft`, `border-info-border`, `text-info-fg` (или эквивалент). Если в `@theme` нет `info-*` — использовать `bg-warn-soft` / `border-warn-border` (тёплый info). **Новых токенов не вводим** — переиспользуем что есть.
- На Q07 (MDE) — **аналогичный info-блок** только если ранее выбран `ratio` или `continuous` (то есть warning имеет смысл). Для proportion и count — Q07 без warning'а.

Принцип №6 (минимум ветвлений) не нарушается — это информационный блок, не дополнительный вопрос.

### P-5 — Dead code: `baseline.unit === 'percent'` ветка

В `src/lib/plan/notebook-builder.js` (около строки 173-175):

```js
baseline: brief.baseline?.unit === 'percent'
  ? brief.baseline.value / 100
  : (brief.baseline?.value ?? 0),
```

`parse.js coerceBaseline` всегда выставляет `unit: 'fraction'` для proportion и `unit: null` для остальных. Ветка `'percent'` недостижима.

**Fix:** удалить условие, оставить `brief.baseline?.value ?? 0`. Если для proportion нужна конверсия из 0-100 в 0-1 — проверить, происходит ли она где-то ещё (в `parse.js` или `sample-size.js`); если да — не дублировать; если нет — оставить отдельный комментарий о том, где происходит нормализация.

### P-6 — Slugify utility

Дублирующийся код в `src/lib/plan/render.js` (около строки 110) и `src/lib/plan/notebook-builder.js` (около строки 61).

**Fix:**
- Создать `src/lib/util/slugify.js` с экспортируемой функцией `slugify(str: string): string` — поведение полностью совпадает с текущим (включая сохранение «ё» по NB-BUG-3 fix из Sprint 4 FIX iter 1).
- Импортировать в `render.js` и `notebook-builder.js`, удалить inline-реализации.
- Юнит-тесты в `tests/lib/util/slugify.test.js` (минимум 8 кейсов): латиница, кириллица с «ё», смешанные, пустая строка, только пробелы, цифры в начале, спецсимволы, длинная строка.

После этого `deriveTestId` в обоих местах будет читаемее.

### P-7 — Legacy YAML heuristic для `metric_name`

После ADR-011 старые test_plan.md из Sprint 3 / Sprint 4 main содержат `metric_name: «конверсия в первый депозит»` (натуральный текст). Новый парсер мапит это в `brief.metric_column`, что концептуально неверно (`metric_column` должен быть кодом колонки).

**Эвристика на парсе:**
- В `src/lib/plan/parse.js` функции `mapFrontmatter` (или эквивалент): если `fm.metric_name` содержит **любой из**: пробел, кириллический символ, прописную латинскую букву — **И** одновременно нет `fm.metric_label` — это legacy формат.
- В этом случае: маппим `fm.metric_name → brief.metric_label`, оставляем `brief.metric_column = ''` (пустое — пользователь должен ввести руками), добавляем warning `'Обнаружен legacy формат test_plan.md (metric_name содержит натуральный текст). Перенесено в metric_label. Заполни код колонки вручную.'`
- Если `fm.metric_label` уже есть — heuristic не применяется (это новый формат), `fm.metric_name → brief.metric_column` напрямую.

**Тесты в `tests/lib/plan/parse.test.js` (минимум 4 кейса):**
1. Legacy YAML с `metric_name: "конверсия в первый депозит"`, без `metric_label` → `brief.metric_label = 'конверсия в первый депозит'`, `brief.metric_column = ''`, в warnings есть нужная фраза.
2. Legacy YAML с `metric_name: "Bounce Rate"` (латиница с прописной, пробел), без `metric_label` → то же поведение.
3. Новый YAML с `metric_name: "cr_first_deposit"` + `metric_label: "конверсия в первый депозит"` → `brief.metric_column = 'cr_first_deposit'`, `brief.metric_label = 'конверсия в первый депозит'`, никаких legacy-warnings.
4. Конфликтный case: `metric_name: "конверсия"` + `metric_label: "что-то ещё"` → heuristic пропускается (новый формат), `brief.metric_column = 'конверсия'` (полу-сломано, как было), warning не добавляется.

### UX-RENAME — Stepper.jsx labels

В `src/components/Stepper.jsx` массив `STEPS`:

```js
{ num: '04', label: 'Анализ', route: null },     →  { num: '04', label: 'Быстрая валидация', route: null },
{ num: '05', label: 'Read-out', route: null },   →  { num: '05', label: 'Скачать артефакты', route: null },
```

**Только labels.** `route: null` оставляем — полная реализация Шага 4 и Шага 5 это Sprint 6+. Никакой логики, никакого UI больше не трогаем.

**Если есть существующие тесты на Stepper.jsx с проверкой текста labels** (`tests/components/Stepper.test.jsx` или snapshot) — обновить ожидаемые значения. Если тестов на этот текст нет — не добавляем (не входит в scope).

---

## Что НЕ делаем (DO NOT)

- ❌ **Не реализовываем** Шаг 4 «Быстрая валидация» — это Sprint 6 main по новому ADR-012. Только rename label.
- ❌ **Не переписываем** `docs/context/FLOW.md`, `docs/context/concept.md`, `docs/project/JTBD.md §7-§8` — это Cowork-зона CLOSE-фазы Sprint 5, **не Code**. Code только меняет label в `Stepper.jsx`.
- ❌ **Не подключаем** новые npm-зависимости. Все 6 пунктов реализуются в существующем стеке.
- ❌ **Не вводим** новые `@theme` CSS-токены. Для P-4 переиспользуем существующие info/warn токены.
- ❌ **Не рефакторим** `render.js`, `notebook-builder.js`, `parse.js` за рамки указанных пунктов. Surgical changes. Если по дороге заметишь явный мусор или баг — **flag в sprint-report-5.md**, не правь молча (см. CLAUDE.md §3).
- ❌ **Не добавляем** legacy heuristic для других полей кроме `metric_name` — только то, что в P-7.
- ❌ **Не правишь** `templates/notebook/main_test/*.cells.json` — там Code уже корректен после Sprint 4 FIX iter 1 (slugify с «ё», grammar, decision rules).
- ❌ **Не пытайся** разблокировать Шаги 4-5 в `Stepper.jsx isStepUnlocked` — они остаются locked.
- ❌ **Никаких** UI/RTL-тестов — только Vitest unit-тесты (как и в Sprint 1-4).
- ❌ **Не трогаем** `docs/`, `mockups/`, `CLAUDE.md`, `README.md`, `.gitignore`, `.gitattributes` — Cowork-зона (CLAUDE.md P-1).

---

## Files involved

**Создаём:**
- `src/lib/util/slugify.js` (P-6)
- `tests/lib/util/slugify.test.js` (P-6)

**Модифицируем:**
- `templates/notebook/load.cells.json` (P-2)
- `src/lib/plan/notebook-builder.js` (P-3 deriveTestId + buildHeaderCell, P-5 dead code, P-6 импорт slugify)
- `src/lib/plan/render.js` (P-3 deriveTestId, P-6 импорт slugify)
- `src/lib/plan/parse.js` (P-7 legacy heuristic)
- `src/components/brief/QuestionRenderer.jsx` или `SingleSelect.jsx` (P-4 inline warning Q03/Q07 — место уточнить по факту)
- `src/components/Stepper.jsx` (UX-RENAME)
- `tests/lib/plan/parse.test.js` (P-7 +4 кейса)
- `tests/lib/plan/notebook-builder.test.js` (P-3 проверка header title vs filename — добавить 2-3 кейса)
- `tests/lib/plan/render.test.js` (P-3 проверка test_id из metric_column — обновить или добавить)
- Если есть `tests/components/Stepper.test.jsx` с проверкой labels — обновить.

**Не трогаем (явно):**
- `docs/**` (Cowork-зона; CLOSE будет писать FLOW.md, concept.md, JTBD §7-§8 после Code-коммита и code-review)
- `src/lib/brief/`, `src/lib/plan/{sample-size,scoring,direction,test-method-selector}.js` — не относятся к polish-pack.
- `src/state/`, `src/pages/`, `package.json`, `vite.config.js`, `.github/workflows/` — без изменений.
- `templates/notebook/main_test/*.cells.json`, `templates/test_plan.md.tmpl` — Sprint 4 FIX iter 2 контракт.

---

## Technical Notes

### P-4 — где именно вешать info-блок

Перед реализацией: грепнуть `src/components/brief/` чтобы понять, как рендерится Q03 (single-select с опциями proportion/continuous/ratio/count). Если есть централизованный компонент типа `QuestionRenderer.jsx` — info-блок логично делать там через conditional (`if questionId === 'metric_type' && value in ['ratio','continuous']`). Если рендеринг разбросан — info-блок локально в Q03/Q07 markup'е.

**Текст info-блока — единый для Q03 и Q07** (текст в P-4 выше). Не надо дублировать строку в коде — вынеси в const рядом с компонентом или в `src/lib/brief/messages.js` если такой паттерн уже есть в кодовой базе.

### P-6 — поведение slugify по NB-BUG-3

Sprint 4 FIX iter 1 NB-BUG-3 явно требовал, чтобы slugify **сохранял «ё»** (не сводил к «е»). Проверь существующий код в `render.js` / `notebook-builder.js` — там уже должно быть. При выносе в utility поведение сохраняется без изменений. Тест-кейс «`cr_первый_депозит` → `cr-pervyj-depozit`» (или какая там транслитерация) с явным сохранением «ё» в результирующем slug.

### P-7 — взаимодействие с round-trip

P-7 трогает `parse.js` — потенциально может задеть round-trip. После реализации обязательно перепроверить, что `tests/lib/plan/round-trip.test.js` (из Sprint 4 FIX iter 2) остаётся зелёным. **Если round-trip ломается — стоп, написать в отчёт, не костылить.** (CLAUDE.md §5 stop and replan.)

### Bundle size

После всех изменений `npm run build` должен дать прирост bundle не больше +1-2 KB raw. Если больше — что-то не то, флагнуть в отчёт.

---

## ADR Constraints

| ADR | Что значит для этого спринта |
|---|---|
| ADR-001 (no backend) | Всё на клиенте. Legacy heuristic — runtime в браузере. |
| ADR-002 (артефакты как переносимое состояние) | **P-7 усиливает контракт** для legacy файлов. Round-trip из Sprint 4 FIX iter 2 не должен сломаться. |
| ADR-003 (структурная оценка) | Не трогаем scoring. |
| ADR-004 (тул не принимает решений) | Не трогаем decision rules. |
| ADR-005 (5-шаговый флоу) | Шаги 04/05 остаются locked, меняются только labels. |
| ADR-006 (approved/draft) | Не трогаем. |
| ADR-009 (точные формулы / приближения с warning) | P-4 — UI-следствие этого ADR (информируем раньше). |
| ADR-010 (стек) | Без новых зависимостей. |
| ADR-011 (semantic shift metric_name/metric_label) | **Главный контекст спринта.** P-3 и P-7 — прямые следствия. |
| ADR-012 (Шаг 4 «Быстрая валидация» + rename) | UX-RENAME = частичная имплементация. Полный redesign Шага 4 — Sprint 6. |

---

## Acceptance criteria

1. `npm test` зелёный. **+10-15 новых тестов** (P-6 slugify ~8, P-7 legacy ~4, P-3 header/filename ~2-3). **Total tests:** ~260+ (249 после Sprint 4 + ~11+).
2. `npm run build` чистый. Прирост bundle ≤ +2 KB.
3. Round-trip тест `tests/lib/plan/round-trip.test.js` остаётся зелёным.
4. **Browser smoke (~10 минут):**
   - Старт → бриф → Q03 выбрать `ratio` → видно inline-info про data peek. Выбрать `continuous` → видно то же. Выбрать `proportion` или `count` → info-блока **нет**.
   - На Q07 при ранее выбранном `ratio` → видно info-блок. При `proportion` — info-блока нет.
   - Step 3: скачать `.ipynb`. Открыть в текстовом редакторе → header содержит `# Analysis: <натуральный metric_name>`, filename = `<slug-from-metric_column>_analysis.ipynb`. В load-ячейке есть `CSV_PATH = '...'`. Подзаголовок не содержит мизлидинг про «рядом лежит test_plan.md» (новая нейтральная формулировка).
   - Stepper в шапке: «04 Быстрая валидация» и «05 Скачать артефакты» (locked, но labels новые).
   - Загрузить legacy `test_plan.md` (можно подготовить вручную: натуральный текст в `metric_name`, без `metric_label`) → видно warning о legacy формате, в брифе `metric_label` заполнен, `metric_column` пустой.

---

## Sprint Report — что ожидаем

В `docs/project/sprint-report-5.md` по шаблону (как Sprint 4):

- **Trace-ability** для каждого пункта: P-X → что изменилось, какие тесты добавлены, какой commit. Если по дороге заметил что-то лишнее (что не было в prompt) — отдельная секция «User-sanctioned side-scope / Code-flagged» **с явным флагом**, не молчаливый push.
- **Bundle размер** до/после. Если прирост > +2 KB — объяснение.
- **Round-trip status** — все 4 canonical case в `round-trip.test.js` остались зелёные? Если хоть один сломался — почему, что починили.
- **P-4 решение** — где именно повесил info-блок (какой компонент, какая стратегия), почему так. Если оказалось, что Q03 и Q07 рендерятся разными компонентами — как реализовал переиспользование текста.
- **P-7 эвристика** — точное правило срабатывания (regex или perл boolean), какие edge cases покрыл, есть ли пограничные кейсы которые не покрыл (зафиксировать в Known issues).
- **Time tracking:** PROMPT-чтение, DEV, self-test (smoke + tests). Ожидаемый total active — ~1.5-2 ч; если получилось >3 ч — что съело время.
- **Открытые вопросы для Cowork code review** — если есть.

---

## Related

- `docs/project/polish-pack.md` — источник 6 пунктов P-2..P-7
- `docs/context/decisions-log.md` — ADR-011 (Accepted), ADR-012 (Accepted, обновлён в этом спринте)
- `docs/project/CONTEXT.md` — Sprint 4 Notes (контекст откуда взялись пункты)
- `docs/project/sprint-4-fix-iter2-report.md` — детали round-trip контракта который не должен сломаться
- `docs/project/PROJECT_STATUS.md` — roadmap (Sprint 5 = этот, Sprint 6 = Шаг 4 redesign main)
- `CLAUDE.md` — поведенческие правила, P-1 зоны коммитов
