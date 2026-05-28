# Test Cases Sprint 4 — Parser + Constructor

**Дата подготовки:** 2026-05-28
**Тестируемое:** локально через `npm run dev` → `http://localhost:5173/stat-plan/`. После QA + CLOSE задеплоится на `https://cosmiksoul.github.io/stat-plan/`.
**Стратегия:** Mid-pass — **25 кейсов**, ~25-30 минут в браузере. Полнее чем smoke (Sprint 4 толстый: парсер + конструктор + новые state-поля), но не full pass — много логики уже покрыто 66 новыми unit-тестами.

**Запасной кейс с Jupyter:** опционально, если есть Python окружение — запустить скачанный `.ipynb` на demo-csv.

---

## Как пользоваться

1. Заполняешь статусы: `ok` / `bug` / `skip` / `n/a`.
2. Если `bug` — описываешь в Bugs found ниже с severity.
3. После прохождения — заполни Резюме внизу.

**Известные concerns из code review (не баги, ждут твоего решения):**

- C-1: `state.test_id`/`title` как root-поля — задокументируем в CLOSE.
- C-2: Dead code в notebook-builder (baseline `=== 'percent'`) — defer.
- C-3: `mannwhitney`/`delta_method` fallback на bootstrap без заметного UI warning — обсуждается.

---

## Парсер test_plan.md — drag-drop на старте (5 кейсов)

| #   | Test Case                                                                                                                                                            | Expected                                                                                                                                                                      | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | На стартовом экране **drag** валидного draft `test_plan.md` в правую карточку (можно использовать тот, что качал во время Sprint 3 QA — `sasad-v1.md` или подобный). | Переход на `/#/step3` (через ProtectedStep редирект `/step2` если status=draft в файле). Бриф восстановлен — кликни «01 Бриф», проверь что ответы Q01-Q10 заполнены из файла. | +      |
| 2   | На стартовом экране **клик** по dashed-зоне «Перетащи файл сюда или выбери» → file picker → выбрать тот же файл.                                                     | То же что в кейсе 1. **Закрывает Concern #4 из Sprint 1 code review** (click→file picker fallback).                                                                           | +      |
| 3   | Drag битого файла (любой `.txt` без YAML frontmatter, например пустого).                                                                                             | Не переходим, inline-баннер с осмысленной ошибкой (типа «Не найден YAML frontmatter»). State не меняется.                                                                     | +      |
| 4   | Drag файла размером > 5MB (можно сгенерировать через `dd if=/dev/zero of=big.md bs=1M count=6` или просто скопировать большой `.txt` и переименовать).               | Inline-баннер «Файл слишком большой (6.0 MB). Ожидается до 5 MB». State не меняется.                                                                                          | +      |
| 5   | Drag файла с **валидным frontmatter но битым YAML внутри** (например, специально сделать `mde:` с открывающей скобкой без закрытия, типа `mde: { value: 5`).         | Inline-баннер с понятной ошибкой («Ошибка парсинга YAML: ...»). Желательно с указанием line, если js-yaml вернул mark.                                                        | +      |

---

## Парсер test_plan.md — file picker на step 2 (3 кейса)

| #   | Test Case                                                                                                                                                              | Expected                                                                                                                                                                                                                                | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 6   | Заполнить новый бриф → попасть на /step2 → нажать «↑ Загрузить отредактированный test_plan.md» → file picker → выбрать заранее подготовленный валидный `test_plan.md`. | Остаёмся на `/step2`. Preview MD слева обновлён под загруженный план. ScoringCard справа пересчитан. StatusBadge соответствует `status` из загруженного файла. Если в файле есть отличия от текущего state.brief — они в preview видны. | +      |
| 7   | Тот же сценарий, но в файле **status: approved**.                                                                                                                      | После load: бриф автоматически в readonly-режиме (можешь убедиться кликнув «01 Бриф»), StatusBadge = APPROVED, шаг 3 разблокирован, видна кнопка «↻ Вернуть в черновик».                                                                | +      |
| 8   | Загрузить файл с warning-уровневыми проблемами (например, отсутствующее опциональное поле — самый простой кейс: удалить строку `holdback_percent: null`).              | Файл загружается успешно (`ok: true`). На step 2 или step 3 (зависит от status) виден ParseWarningsBanner с пунктами warnings. Кнопка «СКРЫТЬ» очищает баннер.                                                                          | +      |

---

## Round-trip через UI (3 кейса)

| #   | Test Case                                                                                                                                                                                                                                    | Expected                                                                                                                                                                                                             | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 9   | На /step2 (после заполненного брифа) скачать `test_plan.md`. Нажать «↺ Начать сначала» (Header) → подтвердить. На стартовом экране загрузить скачанный файл обратно. Сравнить заполнение брифа (через карту вопросов или кликая по Q01-Q10). | Все ответы Q01-Q10 совпадают с тем что было до скачивания. **Это критический round-trip контракт** Sprint 3 render ↔ Sprint 4 parse.                                                                                 | +      |
| 10  | Тот же сценарий, но с `metric_type: ratio` (или `count`) — заполни бриф с этим типом, скачай, загрузи.                                                                                                                                       | Все ответы совпадают. **Эти metric_type явный round-trip тестом не покрыты** (Sprint 4 report, точка 2 в Known Issues) — поэтому проверяем через UI.                                                                 | +      |
| 11  | Заполнить бриф с одним guardrail с **двоеточием в имени** (например, `bounce:rate` или `time:on_site`). Скачать, загрузить обратно.                                                                                                          | Не падает. Бриф восстанавливается. **Это регрессия на latent bug в render.js**, который Code пофиксил в Phase A (title с двоеточием ломал YAML). Хочу убедиться, что fix покрыл все строковые поля, не только title. | +      |

---

## LoadedBadge editedExternally (2 кейса)

| #   | Test Case                                                                                         | Expected                                                                                                                                | Status |
| --- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 12  | После любого LOAD_TEST_PLAN_MD (drag-drop или file picker) — перейти на /step2 (если ещё не там). | Рядом со StatusBadge виден компактный badge `↳ ЗАГРУЖЕН`. На step 3 в шапке PlanInfoCard — пара badge'й (draft/approved + загруженный). | +      |
| 13  | После шага 12 нажать «↻ Вернуть в черновик» → подтвердить.                                        | LoadedBadge **исчезает** (план больше не externally-sourced). Status → draft. notebook_config сбрасывается.                             | +      |

---

## Шаг 3 — Конструктор (6 кейсов)

| #   | Test Case                                                                                                                                        | Expected                                                                                                                                                                                                                                                                                            | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 14  | Утвердить план → попасть на /step3. PlanInfoCard сверху.                                                                                         | Видны корректные значения: test_id, metric_type, metric_name, test_method, sample_size_per_arm, duration_days. Совпадают с тем что в плане на step 2.                                                                                                                                               | +      |
| 15  | Cells list слева.                                                                                                                                | 6 обязательных строк (load, srm, balance, novelty, main_test, guardrails) — все с галочкой ☑, disabled (галочки не снимаются). 2 опциональные (segments, bootstrap_ci) — toggleable, по умолчанию выключены. 2 заглушки (cuped, delta_method) — disabled с подписью «появится в следующем спринте». | +      |
| 16  | Toggle опциональной ячейки (например, segments).                                                                                                 | Чекбокс реагирует, ExpectedSchemaCard внизу **реактивно обновляется** — появляется строка с колонкой `geo`. Toggle обратно — строка исчезает.                                                                                                                                                       | +      |
| 17  | DemoCsvCard справа.                                                                                                                              | 4 radio-кнопки. По умолчанию выбран `demo_proportion.csv` (если metric_type=proportion) или `demo_continuous.csv` (если continuous). Для `ratio`/`count` — выбран proportion с info-баннером «для твоего metric_type demo появится позже». Файлы `demo_ratio.csv`/`demo_count.csv` — disabled.      | +      |
| 18  | Нажать «↓ СКАЧАТЬ DEMO-CSV» для активного варианта.                                                                                              | Файл скачивается (`demo_proportion.csv` или `demo_continuous.csv`). Открой текстовым редактором или Excel'ем: заголовок и хотя бы 75k строк.                                                                                                                                                        | +      |
| 19  | Включить `variance_reduction = cuped` в Advanced parameters брифа (надо сначала вернуться в draft → step1) → утвердить план → попасть на step 3. | DemoCsvCard показывает inline-warning «demo-csv не содержит pre-period для CUPED, ячейка будет пропущена».                                                                                                                                                                                          | +      |

---

## Скачивание .ipynb (3 кейса)

| #   | Test Case                                                                                                                                                                                             | Expected                                                                                                                                                                                                                       | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 20  | Нажать большую кнопку «↓ СКАЧАТЬ {filename}.ipynb».                                                                                                                                                   | Файл скачивается с именем вида `{test_id}_analysis.ipynb` (например, `sasad-v1_analysis.ipynb`). Открой текстовым редактором — это валидный JSON, начинается с `{`. Никаких `{{...}}` в финальном тексте (поищи через Ctrl+F). | +      |
| 21  | Открыть скачанный `.ipynb` в **Jupyter / JupyterLab / VS Code** (если есть, иначе — skip).                                                                                                            | Файл открывается без ошибок «not a valid notebook». Видна header-ячейка с шапкой теста + таблицей Expected schema. Дальше — code-ячейки с pandas/scipy/statsmodels кодом, плейсхолдеры подставлены.                            | +      |
| 22  | **(Опциональный)** Если есть Python с pandas/numpy/scipy/statsmodels/matplotlib — скачать `demo_proportion.csv`, положить рядом с `.ipynb` под именем `experiment_results.csv`, запустить все ячейки. | Ноутбук проходит сверху вниз без exceptions. SRM показывает No SRM detected (p > 0.001). Main test даёт значимый эффект (treatment лучше control). Header показывает шапку и schema.                                           | +      |

---

## Persistence (2 кейса)

| #   | Test Case                                                   | Expected                                                                                                                       | Status |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 23  | На step 3 toggleнуть segments → bootstrap_ci → F5 (reload). | После reload toggle-состояние сохранено: segments и bootstrap_ci включены. ExpectedSchemaCard содержит соответствующие строки. | +      |
| 24  | Loaded план (state.editedExternally=true) → F5.             | После reload state восстановлен, editedExternally=true, LoadedBadge виден. test_id/title тоже persist'ятся.                    | +      |

---

## Регрессия Sprint 1-3 (1 кейс)

| #   | Test Case                                                                                                                                | Expected                                                                                                                                                              | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 25  | Restart → стартовый → клик «Начать с брифа» → быстрый прогон Q01-Q10 (можно с минимумом ответов) → утвердить → на step 3 скачать .ipynb. | Никаких регрессий: sample size display под Q08 работает, ScoringCard корректен, StatusBadge переключается, restart очищает state. Console — без `console.error/warn`. | +      |

---

## Bugs found

| ID | Severity | Test case # | Description | Steps to reproduce | Status |
|----|----------|-------------|-------------|-------------------|--------|
| **BUG-1** | **Medium** | (UX, smoke) | **Нет CTA для перехода на step 3 после approve.** Пользователь нажимает «✓ Утвердить план» → видит только бейдж APPROVED справа сверху. Чтобы попасть на конструктор, нужно догадаться кликнуть «03 Конструктор» в Stepper'е. Не интуитивно для нового пользователя. | 1. Заполнить бриф → попасть на /step2. 2. Нажать «✓ Утвердить план». 3. На странице нет видимой кнопки перехода вперёд. | **TO FIX** (выбран вариант (а) — трансформация кнопки «✓ Утвердить план» → «Перейти к конструктору →» после approve) |
| **BUG-2** | **Medium** | (UX, smoke) | **Primary CTA (скачивание .ipynb) на step 3 размещён внизу страницы**, под ExpectedSchemaCard и блоком «ПРИ СБОРКЕ». Требует скролла. На скриншоте step 3 для одного из тестов кнопка оказалась off-screen без явного affordance. | 1. Утвердить план → попасть на /step3. 2. PlanInfoCard, CellsList, DemoCsvCard видны сверху. 3. Кнопка «↓ СКАЧАТЬ {filename}.ipynb» — внизу, нужно скроллить. | **TO FIX** (выбран вариант (а) — sticky bottom bar с кнопкой скачивания) |
| **BUG-3** | **Medium** | (semantic, scenarios) | **Семантический mismatch: YAML.metric_name содержит натуральный текст вместо кода CSV-колонки.** Sprint 4 main писал в YAML.metric_name значение из brief.metric_name (натуральный текст из поля «Название», например «конверсия в первый депозит»), а не из brief.metric_column (snake_case «cr_first_deposit», который пользователь явно вводит в соседнее поле). В CSV пользователя колонка с большой вероятностью названа `cr_first_deposit` (английский snake_case) — поэтому ноутбук обращается к `df['cr_first_deposit']`. Но YAML говорит «метрика называется `конверсия в первый депозит`», что бессмысленно: такой колонки в CSV нет. *(Note: в test-cases-sprint-4 этот баг исходно был описан как «UI молча заменяет `_` на пробел» — это была неверная гипотеза Cowork'а по скриншоту. Реальной conversion в коде не было; Code корректно грепнул и эскалировал.)* | 1. Q04: Название = «конверсия в первый депозит», Колонка = `cr_first_deposit`. 2. Утвердить план → скачать `test_plan.md`. 3. В YAML видим `metric_name: конверсия в первый депозит` (нерабочий идентификатор). | **FIXED** (semantic shift, выбран вариант A): после FIX `YAML.metric_name` = код колонки (`cr_first_deposit`), новый опциональный `YAML.metric_label` = натуральный текст. Зафиксировать как ADR-011 в CLOSE. Обновить DATA_MODEL.md. |
| **BUG-4** | **Medium** | (UX, scenarios) | **При выборе «Другое» на Q01 «Цель теста» нет поля для ручного ввода.** Семантически информация теряется — пользователь не может уточнить что именно он тестирует. В UI это выглядит как «отвечено», в YAML уходит `goal_type: other` без контекста. Парные паттерны уже есть в брифе (Q03=ratio → числитель/знаменатель; Q06=cluster → cluster_field), но для Q01=other такого conditional sub-question нет. | 1. На Q01 выбрать «Другое». 2. Никакого дополнительного поля не появилось. 3. Дальше → на Q02 без возможности указать что за цель. | **TO FIX** (новая conditional sub-question по аналогии с ratio/cluster: при `goal_type=other` показать text input `goal_description`. Сериализуется в YAML отдельным полем. Парсер читает обратно. В DATA_MODEL.md добавить новое поле как опциональное). |
| **BUG-5** | **Medium** | (UX, scenarios) | **Карта вопросов не отмечает Q как отвечённый, если пользователь принял preselect без явного клика.** На Q06 (randomization_unit) preselect = «Пользователь (user_id)», UI показывает его как ВЫБРАНО. Пользователь жмёт «Дальше», state корректно содержит `randomization_unit: user`, но в карте справа Q06 остаётся `·` (точка, как непройденный). То же касается Q07 unit dropdown (preselect «Относительный %»), вероятно других preselect'ов. Расхождение визуальной обратной связи с реальным состоянием → дезориентирует. Наследие Sprint 2: карта определяет «отвечено» по факту dispatch `ANSWER_QUESTION`, а не по наличию value в state. | 1. На Q06 не кликать опции, сразу нажать «Дальше». 2. На Q07 в карте справа: Q06 = `·` (не зелёная галочка). 3. State при этом содержит `randomization_unit: user` (можно проверить через DevTools или scrollить до карты — если кликнуть на Q06 в карте, опция показана как выбранная). | **FIXED** в Sprint 4 FIX Phase C через расширение `applyEnterDefaults` для Q01/Q06. |
| **BUG-6** | **✅ FIXED** в Sprint 4 FIX iter 2 (user-sanctioned side-scope: user попросил унификацию sticky footer на step 1-3). Code вынес QuestionNav как StepFooter на page-level вне grid'a, AdvancedParams переместил внутрь карточки вопроса. Sticky bottom со backdrop-blur + border-top. | (UX, RETEST) | **Primary CTA на step 2 размещён внизу страницы**, после большого preview test_plan.md. После approve пользователь видит «✓ УТВЕРЖДЁН» бейдж сверху, но кнопки «Скачать», «Загрузить», «Вернуть в черновик», «Перейти к конструктору →» — внизу страницы, требуют скролла. Тот же UX-pattern что BUG-2 (step 3 кнопка скачивания .ipynb), но для step 2. После FIX BUG-2 на step 3 теперь sticky bottom — UX asymmetric: step 3 sticky, step 2 уплывает. | 1. /step2 в approved → бейдж APPROVED справа сверху. 2. Кнопки управления — внизу под preview. 3. При скролле уплывают вверх. | **DEFERRED → Sprint 5 polish-pack** (выбран вариант (в) sticky bottom mirror step 3 — UX consistency между шагами). Sprint 4 FIX закрываем без этого пункта, чтобы не открывать FIX iter 2. |
| **BUG-7** | **Low/Medium** | (notebook, RETEST) | **Шаблон `load.cells.json` ожидает CSV в working directory** — `pd.read_csv('experiment_results.csv')` без переменной пути. Это работает в локальном Jupyter (положил рядом — запустил), но в Colab / JupyterLab Hub / GitHub Codespaces — нужно либо upload через UI и указать путь, либо mount Google Drive, либо качать с URL. Инструкция «CSV должен лежать рядом с этим ноутбуком» сейчас вводит в заблуждение Colab-пользователей. | 1. Скачать любой `.ipynb`. 2. Открыть в Colab. 3. Run All → `FileNotFoundError: 'experiment_results.csv'` (потому что в Colab нет файла в `/content/`). | **DEFERRED → Sprint 5 polish-pack**. Fix: в `templates/notebook/load.cells.json` ввести переменную `CSV_PATH = 'experiment_results.csv'  # рядом с ноутбуком, или укажи полный путь / URL`, использовать `pd.read_csv(CSV_PATH)`. Markdown-инструкцию переписать: «CSV должен лежать рядом с ноутбуком — или укажи в `CSV_PATH` полный путь / URL (для Colab — путь в `/content/` после upload или mount Google Drive)». |
| **BUG-9** | **✅ FIXED** в Sprint 4 FIX iter 2 (commit `b1a95b3`) — все 7 round-trip полей теперь сериализуются в YAML; canonical round-trip test в `tests/lib/plan/round-trip.test.js` гарантирует от регрессий. Подробности: `docs/project/sprint-4-fix-iter2-report.md`. | (round-trip, RETEST Run 1+2) | **Stop conditions и Decision rules не сериализуются в YAML frontmatter test_plan.md** — только в markdown-секциях. Парсер по ADR-002 игнорирует markdown секции, поэтому drag-drop → brief.stop_conditions / decision_rules восстанавливаются из дефолтов emptyBriefShape (пустые), а не из исходного брифа. Score падает (80 → 77) из-за штрафа «Decision rules неполные — 0/3, нужно ≥2». **Нарушение Sprint 3 контракта ADR-002 «test_plan.md как переносимое состояние»** — главное обещание тула. | 1. Fresh бриф → score 80. 2. Скачать test_plan.md. 3. «Начать сначала» → drag-drop тот же файл. 4. Открыть бриф — Q10 поля пустые. На step 2 — score 77 с замечанием про decision rules. | **TO FIX** — в Sprint 4 FIX iter 2 (необходима, не deferred — критично). `render.js`: добавить `stop_conditions:` + `decision_rules:` в YAML serializer. `parse.js mapFrontmatter`: добавить чтение этих полей. `templates/test_plan.md.tmpl`: новые YAML строки. Round-trip тест обновится. |
| **BUG-9b** | **NOT REPRODUCIBLE** (закрыт в Sprint 4 FIX iter 2 расследованием). Code сделал static audit (TextInput, reducer, render.yamlScalar, storage, downloadMd, AppStateContext) — обрезаний нет. Canonical round-trip test для exact 29-char input проходит. Гипотеза Code: артефакт ДО iter 1 когда goal_description ещё не сериализовался. Регрессии заперты canonical test'ом. | (render, RETEST) | **goal_description обрезается на хвосте.** Пользователь ввёл «оптимизация воронки партнёрки», в YAML вышло `goal_description: оптимизация воронки партнёр` (без «-ки»). Похоже либо на YAML scalar serialization баг (обрезание на специальном символе), либо на truncate в onChange handler / state. Требует расследования. | 1. Q01 → Другое → ввести «оптимизация воронки партнёрки». 2. Скачать test_plan.md. 3. В YAML видно обрезанное. | **TO FIX в Sprint 4 FIX iter 2** вместе с BUG-9 (один Cyclic batch для round-trip critical issues). |
| **UX-RENAME** | **Low** (по коду) / **High** (концепт) | (RETEST, product) | **Переименование шагов степпера 04/05 в соответствии с продуктовым переосмыслением.** Q4 «Анализ» → «Быстрая валидация»: убирает амбицию «полная независимая валидация», которая концептуально слабая (см. обсуждение про circular validation). Q5 «Read-out» → «Скачать артефакты»: функциональнее, по делу — главное действие шага. Согласуется с предстоящим Architecture sprint по redesign'у Шага 4. | Открыть продукт → step 4 / step 5 в степпере. | **DEFERRED → planning перед Sprint 5 main** (часть Architecture sprint для redesign'а Шага 4). Fix touches: `src/components/Stepper.jsx` (UI labels), `docs/context/FLOW.md` (заголовки разделов «Шаг 4», «Шаг 5» + текст), `docs/context/concept.md` (если упомянуты шаги в основном сценарии), `docs/project/JTBD.md` (§7, §8 заголовки секций). Code-зона + Cowork-зона — отдельные коммиты по P-1. Зафиксировать как ADR-012 «Шаг 4 как Быстрая валидация (не independent validation)» с обоснованием. |
| **BUG-8** | **Low/Medium** | (notebook, RETEST) | **Header ноутбука: смешение filename-slug и natural title + misleading подзаголовок.** (1) `# Analysis: конверсия-в-клик-по-партнру-v1` — markdown-заголовок использует `deriveTestId()` (slug), хотя там должен быть **natural title** (как в test_plan.md `title:`). Filename же — наоборот, должен быть slug на латинице, не кириллический. Сейчас оба используют одну функцию → результат одинаковый и плохой в обоих местах. **Правильное разделение:** filename ← slug(`metric_column`), header ← `metric_name` (натуральный текст). Полная таблица: `filename .ipynb` + `YAML.test_id` → slug из `metric_column` (`cr-to-partner-click-v1`); `# Analysis: ...` в header + `YAML.title` → `metric_name` натуральный (`конверсия в клик по партнёру`). (2) Подзаголовок `> Test plan: рядом лежит test_plan.md` — misleading: если пользователь скачал только `.ipynb` (без `test_plan.md`), или открыл в Colab — никакого «рядом» нет. | (1) Сценарий S1: filename `конверсия-в-клик-по-партнру-v1_analysis.ipynb` + Analysis-header такой же. Хотим filename `cr-to-partner-click-v1_analysis.ipynb` + header `# Analysis: конверсия в клик по партнёру`. (2) Колаб с открытым ноутбуком: подзаголовок «рядом лежит test_plan.md», но в `/content/` его нет. | **DEFERRED → Sprint 5 polish-pack**. Fix: (1a) `deriveTestId(state)` в `notebook-builder.js:73` + `render.js:120` — приоритет `brief.metric_column` над `brief.metric_name`. Согласуется с ADR-011. Fallback на slugify(metric_name) если column пуст. (1b) `buildHeaderCell` в `notebook-builder.js` — `# Analysis: ${deriveTitle(state)}` вместо `deriveTestId(state)`. `deriveTitle` уже есть в builder и возвращает либо `state.title`, либо `Тест: ${metric_name}`. (2) Переписать подзаголовок на нейтральный: `> Test plan: см. test_plan.md, генерируется отдельно в stat·plan (шаг 2).` |
| | | | | | |

---

## Резюме после прохождения

- Всего кейсов: **25** (24 обязательных + 1 опциональный кейс 22 c Jupyter)
- `ok`: __
- `bug`: __
- `skip`: __ (включая кейс 22 если нет Python)
- `n/a`: __
- Critical/High bugs: __
- Готово к закрытию без новых fix'ов? __

---

## Что НЕ покрывает этот mid-pass

Сознательно пропущено (если что-то странное всплывёт там — отдельная user story):

- Все 4 metric_type × все 6 test_method × все toggle-комбинации (комбинаторно много, покрыто 22 unit-теста builder'а).
- Cross-browser (Firefox/Safari) — если в Chrome всё ok, отдельный bug-report если найдётся.
- Mobile responsive (отдельный спринт).
- Performance на больших guardrails (>10 штук) или supertight constraints — edge case.
- Шаги 4-5 — отдельные спринты, locked.
- Деталь Python-кода в каждой ячейке — покрывается опциональным кейсом 22.

---

## Если QA выявит проблемы

- **0 багов** → переходим прямо в CLOSE Sprint 4.
- **Только Medium/Low баги** + concerns из code review → fix-prompt с обоими (опционально + concern #3 fallback warning).
- **Critical/High баг** → стоп, разбираем; возможно FIX-итерация + повторный QA.
- **Round-trip через UI ломается** (кейсы 9, 10, 11) → это **критический баг**, parser/render контракт расходится; обязательный fix.

---

## Дополнительные ссылки

- Sprint 4 report: `docs/project/sprint-report-4.md`
- Code review: `docs/project/code-review-sprint-4.md`
- Prompt: `docs/project/sprint-4-prompt.md`
- Snapshot контракт (для понимания round-trip): `tests/lib/plan/render.test.js`
