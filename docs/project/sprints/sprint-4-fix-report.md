# Sprint 4 FIX — отчёт Claude Code

> Источник прицеливания: `docs/project/sprints/sprint-4-fix-prompt.md` + уточнения по BUG-3 в чате с пользователем (опция A — semantic shift). План: `~/.claude/plans/expressive-herding-swan.md`.

## Что закрыто

| ID | Где | Коммит |
|---|---|---|
| NB-BUG-1 | Хардкод порядковых номеров в 11 cell templates | A |
| NB-BUG-2 | Warning blockquote в notebook header для fallback test_method | A |
| NB-BUG-3 | Slugify теряет ё | A |
| NB-BUG-4 | «1 days» в заголовке вместо «1 day» | A |
| NB-BUG-5 | Двойная точка в default decision rules | A |
| BUG-1 | На step 2 после approve нет CTA на step 3 | B |
| BUG-2 | Кнопка «Скачать .ipynb» внизу page, не sticky | B |
| Concern #3 UI | Нет визуальной индикации fallback на step 3 | B |
| BUG-5 | Q01/Q06 не отмечаются как answered без клика | C |
| BUG-3 | `YAML.metric_name` пишется как натуральный текст, а не snake_case код | C |
| BUG-4 | Q01 «Другое» не показывает свободный ввод | C |

11 фиксов в 3 коммитах + новые тесты.

## Коммиты

- **`943997b`** — `fix(sprint-4-fix-phase-a)` — templates + slugify ё + duration grammar + decision-rules dot + fallback warning
- **`907cfde`** — `fix(sprint-4-fix-phase-b)` — step-2 CTA transform + step-3 sticky download + plan-info-card warning
- **`960ae24`** — `fix(sprint-4-fix-phase-c)` — brief preselect + metric_name semantic shift + goal_description

## Тесты и сборка

- Было: 213 (после Sprint 4 main + LoadedBadge mini).
- Стало: **235 pass** (12 файлов).
- Прирост: Phase A +7, Phase B +0 (UI без юнитов по конвенции Sprint 3+), Phase C +15.
- `npm run build` чистый. Bundle: 397.26 KB raw / 123.65 KB gzip (+3 KB к предыдущему — главным образом Phase C UI и параметризованные подсказки).

## Уточнения и отклонения от prompt

### BUG-3 — prompt описывал не тот баг

В prompt'е BUG-3 формулировался как «при вводе названия метрики подмена `_→пробел`». Я грепнул `QuestionRenderer`, `TextInput`, `MetricNameInput`, `reducer.answerQuestion` и нигде такой трансформации не нашёл. Эскалировал пользователю.

Пользователь прислал два скриншота и пояснил реальный баг: `YAML.metric_name` после скачивания test_plan.md содержит натуральный текст («конверсия в первый депозит»), хотя по сути должно быть snake_case-имя CSV-колонки («cr_first_deposit»). Это и противоречит `DATA_MODEL.md` (`metric_name: cr_to_partner_click`), и user expectation (под YAML.metric_name есть отдельное поле «КОЛОНКА В CSV», которое сейчас просто не уезжает в YAML).

Я предложил два варианта:
- **A. Semantic shift**: `YAML.metric_name` стаёт кодом (из `brief.metric_column`), а под натуральный текст добавляем новое опциональное `YAML.metric_label`.
- **B. Hard rename**: переименовать `YAML.metric_name` → `YAML.metric_column`, плюс отдельный `YAML.metric_name` под натуральный текст.

Пользователь выбрал **A**. Реализовано в Phase C:

- `render.js` substitutions: `metric_name = brief.metric_column || brief.metric_name || null`, `metric_label = brief.metric_name || null`.
- `parse.js` mapFrontmatter: `fm.metric_name → brief.metric_column`, `fm.metric_label → brief.metric_name`.
- `templates/test_plan.md.tmpl`: добавлены строки `metric_label:` и `goal_description:` (рядом — для удобства локального чтения).
- Legacy YAML (только `metric_name`, без `metric_label`): после парса `brief.metric_column` = старое значение, `brief.metric_name` = '' — fallback не теряет данные, но требует от пользователя перепрописать «название». Это считаю осознанным компромиссом — без него старые файлы интерпретируются как «натуральный текст с подчёркиваниями», что хуже.
- `notebook-builder.deriveMetricColumn` оставлен как есть: column-first с fallback на metric_name (уже было в коде Sprint 4 main).

`DATA_MODEL.md` обновлять не стал — оставляю Cowork'у в CLOSE-фазе (это его зона по P-1).

### BUG-5 — фикс не в SingleSelect, а в applyEnterDefaults

Корень проблемы — `SingleSelect.jsx:2`: `effective = value ?? defaultValue` подсвечивает кнопку только визуально, в state ничего не пишется. Q01 имеет `default: 'product_change'`, Q06 — `default: 'user'`, поэтому без клика пользователя `state.brief.goal_type === null` и `isQuestionAnswered` отдаёт false, хотя UI показывает «уже выбрано».

Из двух подходов в prompt'е выбран (a) — расширить `applyEnterDefaults`. Этот паттерн уже работает для `metric_name` (Q04) и `decision_rules` (Q10), поэтому surgical change: добавлены два case в `defaults.js` + два флага в `initialBrief.defaultsApplied` + два флага в `parse.js:emptyBriefShape()`. SingleSelect я не трогал — изменение там потребовало бы либо useEffect-дисптача (которого в проекте сознательно нет, чтобы state контролировал reducer), либо отдельного callback'а. Через `applyEnterDefaults` чище и без race-conditions.

### NB-BUG-1 — нумерация ушла, без динамической перенумерации в builder

Просто убрал `## N. ` префикс из всех 11 templates. Jupyter сам показывает порядок ячеек в TOC, поэтому динамической перенумерации в builder не делал.

### Slugify duplication

`render.js:slugify` и `notebook-builder.js:slugify` остаются двумя независимыми копиями с одинаковым regex. Объединение в общую утилиту — это «заодно-рефакор», вне scope sprint fix'а. Зафиксировал в open notes.

### isQuestionAnswered для Q01

Когда пользователь выбирает «Другое», поле `goal_description` появляется но **не блокирует** переход на Q02 при пустом значении. Это согласовано с prompt'ом: «можно оставить пустым». Логика `isQuestionAnswered` для Q01 не трогалась — `goal_type !== null` достаточно.

### goal_type не пишется в YAML

Sprint 3 контракт не меняется — `YAML.goal_type` отсутствует. После round-trip через `applyEnterDefaults` восстанавливается как `'product_change'`. Это значит, что если в исходном YAML был непустой `goal_description`, то после парса goal_type автоматически НЕ выставится в 'other' (для UI пользователю придётся либо перевыбрать, либо просто оставить product_change с заполненным goal_description в state). Эту эвристику я сознательно не делал — это side-effect на парс-стороне, вне scope fix'а, лучше обсудить отдельно.

## Деталь по Concern #3 — двух-уровневый warning

Уведомление о fallback'е теперь и в ноутбуке (Phase A), и в UI (Phase B):

- **Ноутбук, header markdown**: `> ⚠️ **Внимание:** ... используется bootstrap-вариант ...` — пользователь увидит при открытии .ipynb даже если step 3 уже закрыт.
- **UI, PlanInfoCard на step 3**: жёлтый banner под grid'ом — `⚠ Метод delta_method: используется bootstrap-вариант ...`. Скрывается для всех методов кроме `delta_method` и `mannwhitney`.

Оба используют одни и те же warn-токены и формулировку (про Taylor expansion и ранги — только в header'е ноутбука, в UI banner'е компактная версия).

## Phase B — почему без юнит-тестов

UI/RTL мы в проекте не пишем (конвенция с Sprint 3, эстет-выбор пользователя — ловим всё ручным QA). Phase B — три чистые UI-правки: `PlanActions` CTA-трансформация (импорт useNavigate + перетасовка двух кнопок), sticky-bottom wrapper вокруг ipynb-download, banner в PlanInfoCard. Все три проверяются глазами на step 2 и step 3. Прирост тестов 0 для phase B запланирован в плане и совпадает с реальностью.

## Что нужно проверить пользователю (RETEST scope)

**Phase A** — открыть скачанный `*_analysis.ipynb` в Jupyter или просто visually inspect:
1. Все markdown-заголовки без `## 1.` / `## 2.` etc.
2. Для duration_days=1 в header'е `1 day` (без `s`).
3. Для test_method ∈ {delta_method, mannwhitney} в header'е есть `⚠️` blockquote.
4. Для metric с ё в названии — test_id содержит ё (Cyrillic не теряется).
5. Новый бриф, Q10 → decision rules: `+4% rel.` без двойной точки.

**Phase B** — браузер:
1. `/step2` черновой — кнопка «✓ Утвердить план» справа.
2. После approve — кнопка трансформировалась в «Перейти к конструктору →»; клик ведёт на `/step3`.
3. Слева от неё — «↻ Вернуть в черновик».
4. `/step3` для ratio с `delta_method` → жёлтый banner в PlanInfoCard под grid.
5. `/step3` со скроллом — кнопка скачивания .ipynb sticky к нижнему краю.

**Phase C** — браузер + round-trip:
1. `/step1` Q06: без клика опций нажать «Дальше» → карта показывает Q06 ✓.
2. `/step1` Q01 → «Другое» → появляется text input. Ввести «тест banner X» → step 2 → скачать → YAML содержит `goal_description: "тест banner X"`.
3. `/step1` Q04: «конверсия в депозит» в НАЗВАНИЕ, `cr_deposit` в КОЛОНКУ → step 2 → скачать → YAML: `metric_name: cr_deposit`, `metric_label: "конверсия в депозит"`.
4. Drag-drop этот же .md обратно на стартовый экран → попадаем на step 2, бриф корректно разделён: name = «конверсия...», column = `cr_deposit`.

## Open notes

- `DATA_MODEL.md` пока ничего не знает о `metric_label` и `goal_description` — Cowork обновит в CLOSE-фазе вместе с code review.
- `SingleSelect.jsx` оставлен как был, но логика «visual default» теперь дублируется фактом, что state сразу содержит default. Если позже надумаем убрать `defaultValue` из SingleSelect — это будет чисто косметика, в state ничего не сломает.
- Slugify по-прежнему живёт в двух местах — `render.js` и `notebook-builder.js`. Кандидат на unified utility в `lib/util/`, но вне scope этого fix'а.
- Round-trip теперь требует, чтобы Cowork в CLOSE-фазе зафиксировал в DATA_MODEL новый контракт `metric_name → код, metric_label → натуральный текст`. Иначе будущие парсеры (другие реализации) могут неверно интерпретировать legacy-файлы.
