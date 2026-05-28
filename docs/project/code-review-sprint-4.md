# Code Review Sprint 4 — Парсер test_plan.md + Шаг 3 «Конструктор ноутбука»

**Reviewer:** Cowork
**Date:** 2026-05-28

---

## Summary

Sprint 4 закрыт качественно. Оба phase сделаны, **213 unit-тестов pass** (+66 к Sprint 3), новых deps только одна (`js-yaml` — заранее запланированная в ARCHITECTURE.md). Code сам поднял в report 3 пункта на review, плюс самостоятельно добавил `editedExternally` UI badge сверху ([7463fd7]). Самый ценный технический момент — **round-trip контракт работает**, и при работе над парсером Code обнаружил latent bug в render.js (title с двоеточием ломал YAML) и пофиксил его — это та редкая ситуация, когда round-trip тест действительно ловит баг до прода.

**Blockers: 0. Concerns: 3 (все Medium, обсуждаемые). Notes: 4.**

Проверил автоматически:
- `src/lib/plan/parse.js` и `notebook-builder.js` — без React-импортов ✓
- `js-yaml` единственная новая npm-зависимость ✓
- Phase A → Phase B → LoadedBadge коммиты идут по зонам P-1 (src/, tests/, templates/, public/, package*) ✓
- 8 ячеек из 10 + 2 demo-csv из 4 — урезание соответствует prompt'у, заглушки в UI помечены ✓
- ADR-002 строгий путь A соблюдён (structural errors → ok:false, bad fields → warnings) ✓
- ADR-006 соблюдён: `RETURN_PLAN_TO_DRAFT` сбрасывает `notebook_config` + `editedExternally`

---

## Concerns

### 🔴 Blockers

Нет.

### 🟡 Concerns (требуют решения)

| # | Где | В чём concern |
|---|-----|---------------|
| 1 | `src/state/reducer.js:87-98` | **`state.test_id` и `state.title` добавлены как root-поля state**, а не внутрь `state.brief` или `state.plan`. В prompt'е я этого явно не прописывал — там говорилось только про `state.plan.parse_warnings` и `state.notebook_config`. Сейчас это runtime metadata (имя теста + название), которое нужно и в render, и в notebook-builder, и в filename. Аргумент Code'а (в комментарии line 91-92) разумен: «test_id derived из brief.metric_name если не загружен MD, иначе из самого MD». Но **не задокументировано в ARCHITECTURE.md / DATA_MODEL.md**, и при будущей сериализации (Sprint 7 round-trip) надо помнить, что это поля верхнего уровня. **Предложение:** оставить как есть (rework был бы scope creep), но **добавить упоминание в `docs/context/ARCHITECTURE.md`** в секцию «Состояние приложения» — что state теперь имеет root-уровневые `test_id`, `title` для document metadata. Сделать это в CLOSE Sprint 4. |
| 2 | `src/lib/plan/notebook-builder.js:170-175` | **Dead code в `buildPlaceholderMap`:** проверка `brief.baseline?.unit === 'percent'` с делением на 100. По коду `parse.js:161-167` `coerceBaseline` ставит `unit: 'fraction'` для proportion и `unit: null` для остальных. По `render.js` baseline тоже не пишется с unit='percent'. То есть ветка `=== 'percent'` никогда не срабатывает. Не баг, просто mёртвый branch. **Предложение:** удалить условие, оставить `brief.baseline?.value ?? 0` — это уберёт сомнение «откуда там percent если его нигде не пишут». Тривиально, можно в FIX-фазе если будут другие пункты, иначе — в следующем спринте. |
| 3 | `templates/notebook/main_test/bootstrap.cells.json` (используется как fallback для `mannwhitney` и `delta_method`) | **Семантически некорректный fallback.** Для `mannwhitney` правильный подход — `scipy.stats.mannwhitneyu`, не bootstrap. Для `delta_method` — формула через ковариацию числителя/знаменателя ratio, тоже не bootstrap. Builder выдаёт warning «для метода X используется bootstrap-вариант», но пользователь получит numerически другой результат (CI шире/уже, p другой). В prompt'е я писал «bootstrap (упрощённо)» — то есть скоп-cap был осознанным, но **в UI это нигде не отображается**, пользователь увидит только тонкий warning под кнопкой скачивания. **Предложение:** либо (а) добавить более заметный warning в UI рядом с PlanInfoCard «test_method = mannwhitney, доступная ячейка — bootstrap (упрощённо)»; либо (б) совсем заблокировать скачивание для этих двух методов с подписью «появится в Sprint 4.1». Лично я бы выбрал (а) — даёт пользователю сразу скачать рабочий ноутбук, но честно предупреждает. |

### 🟢 Notes (на будущее)

| # | Где | Заметка |
|---|-----|---------|
| 1 | `src/lib/plan/parse.js` | **CRLF handling:** `md.split('\n')` оставит `\r` в конце строк на Windows-файлах. Для frontmatter не критично (`trim() === '---'` снимает `\r`), но в `extractSection('Hypothesis')` trailing `\r\n` остаётся в тексте гипотезы. Это попадёт в `state.brief.hypothesis.text` и далее — в render обратно. Round-trip не сломается (render тоже сохранит), но косметически hypothesis может содержать невидимый `\r`. Не баг, наблюдение. |
| 2 | `src/lib/plan/notebook-builder.js:38-42` | **bootstrap_ci дублирует main_test когда test_method=bootstrap.** Если пользователь выбрал bootstrap-метод (main_test уже bootstrap) и **дополнительно включил** опциональную ячейку bootstrap_ci — в ноутбуке будет 2 bootstrap-блока с одинаковой логикой. Это не падает, но избыточно. Можно либо disabled bootstrap_ci когда main test = bootstrap, либо переименовать опциональную ячейку в «Bootstrap CI for guardrails» / убрать. Сейчас оставляем как есть. |
| 3 | `templates/notebook/*.cells.json` | **Python код в ячейках не покрыт тестами в JS.** Builder проверяет валидность JSON и подстановку плейсхолдеров, но не запускает Python. Это нормально (нет Python в CI), но значит — синтаксические ошибки в Python будут обнаружены только при ручном запуске в Jupyter. На Sprint 4 это закрывается ручным QA-кейсом (попросить пользователя запустить ipynb на demo-csv хотя бы для одной конфигурации). |
| 4 | `src/state/reducer.js:240-270` | **`LOAD_TEST_PLAN_MD` merges initialBrief + incoming + UI-forced fields** — паттерн чистый, и **отдельный тест в `reducer.test.js` гарантирует, что UI-поля (`currentQuestion: 1`, `advancedExpanded: false`) всегда сброшены**. Это то, что нужно для будущего парсера. |

---

## ADR Compliance Check

| ADR | Статус | Комментарий |
|---|---|---|
| ADR-001 (no backend) | ✅ | js-yaml на клиенте, demo-csv static в `public/`, никаких fetch. |
| ADR-002 (артефакты как переносимое состояние, строгий парсинг) | ✅ | Path A: unrecoverable → `{ok:false}` с понятной ошибкой; bad fields → warnings; приоритет у frontmatter (тест 2.frontmatter-vs-section в parse.test.js явно проверяет это). |
| ADR-003 (структурная оценка) | ✅ | После LOAD_TEST_PLAN_MD — `recomputePlan()` с тем же scoring кодом. Никаких новых критериев. |
| ADR-004 (тул не принимает решений) | ✅ | Status загружается из MD, не выставляется автоматически. Approve — отдельное явное действие. |
| ADR-005 (5-шаговый флоу) | ✅ | Load test_plan.md → /step3 (с ProtectedStep редиректом на /step2 если status=draft). |
| ADR-006 (approved/draft + readonly) | ✅ | `RETURN_PLAN_TO_DRAFT` сбрасывает `notebook_config` + `editedExternally`. Это явное выполнение обещания «конфигурация ноутбука будет сброшена». |
| ADR-007 (4 demo-csv) | ✅ (частично, по prompt-cap) | 2 файла из 4 в Sprint 4. Остальные 2 — disabled-заглушки в DemoCsvCard с подписью «появится в следующем спринте». ADR-007 не нарушен, скоп сужен сознательно. |
| ADR-008 (тур без overlay) | ✅ | Не трогали. |
| ADR-009 (формулы) | ✅ | Sample size не трогали — Sprint 3 контракт. |
| ADR-010 (стек, deps) | ✅ | +`js-yaml` (~17 KB gzip) — обоснование совпадает с ADR-010 «для Спринта парсинга». `src/lib/plan/{parse,notebook-builder}.js` без React-импортов. |

---

## Scope Compliance

✅ **Phase A → Phase B порядок коммитов** соблюдён. 2 фазы — 2 коммита, плюс LoadedBadge третьим коммитом по запросу.
✅ **Урезание scope** (8 ячеек, 2 csv) — соответствует prompt'у, заглушки помечены в UI.
✅ **DO NOT соблюдён:** нет papaparse/recharts/JSZip, нет UI/RTL тестов, нет Python-validation на клиенте.
🟡 **Латентный bug fix в `render.js`** (title с двоеточием) — формально это правка вне Phase A scope, но **prompt явно разрешал** («Если round-trip ломается — найти и пофиксить»). Это **не scope creep**, это согласованное pre-condition для round-trip контракта.
🟢 **LoadedBadge как бонус** — был «consciously deferred» в Sprint 4 report, потом добавлен. Один коммит, маленький — accept.

---

## Discussion of Code's self-reported items

Code в Sprint 4 report сам поднял три пункта на review. Прохожусь:

1. **«Browser smoke не выполнен мной»** — нормально, это всегда задача пользователя на QA-фазе. TEST PREP (test-cases-sprint-4.md) у меня готов параллельно с этим review.
2. **«Round-trip для ratio и count не покрыт явным тестом»** — happy-path парсинг покрыт, логика идентична proportion/continuous. Кейс в test-cases-sprint-4 покроет это через QA: «загрузи `ratio`-план, скачай, загрузи обратно — данные совпадают?». Если найдётся баг в RETEST — отдельным fix.
3. **«`editedExternally` UI badge не добавлен»** — добавлен в [7463fd7] после отдельной просьбы. Закрыто.

---

## Decision Log

> Заполняется после твоего подтверждения по концернам.

| # | Concern | Решение | Куда зафиксировано |
|---|---------|---------|--------------------|
| 🟡 1 | `state.test_id`/`state.title` как root | **Accept,** документируем в `docs/context/ARCHITECTURE.md` секция «Состояние приложения» в CLOSE Sprint 4. | ARCHITECTURE.md правка в CLOSE-batch'е |
| 🟡 2 | Dead code `=== 'percent'` в baseline | **Defer** в новую user story «cleanup pass» или в первый next-sprint commit. Не блокирующее. | JTBD §9 / next sprint |
| 🟡 3 | mannwhitney/delta_method fallback на bootstrap без явного UI warning | **Обсуждаем.** Я склоняюсь к (а) — более заметный warning в PlanInfoCard. Можно добавить в FIX Sprint 4 если другой fix будет, иначе — в Sprint 4.1. | FIX Sprint 4 (если будет) или Sprint 4.1 |

---

## Что делать дальше

1. **Подтверди / отклони концерны** (особенно #3 — про fallback).
2. **TEST PREP готов** — `docs/project/test-cases-sprint-4.md` (~25-30 кейсов).
3. **Ты гоняешь QA в браузере** + опционально запускаешь скачанный `.ipynb` в Jupyter (если есть Python).
4. После QA: если bugs или agreed concerns — `sprint-4-fix-prompt.md`.
5. CLOSE Sprint 4 с обновлением ARCHITECTURE.md, JTBD, CONTEXT, PROJECT_STATUS, Dev-Cycle.

---

## Метрики

- **Code DEV active:** ~3.8 часа (Phase A ~80 мин + Phase B ~135 мин + LoadedBadge ~10 мин). В пределах оценки prompt'а (5-7 ч).
- **Cowork PLAN + PROMPT:** ~25 мин (плотный prompt оплатил себя — Code сразу делал без вопросов посередине).
- **Cowork CODE REVIEW:** ~30 мин (включая чтение всех ключевых файлов: parse.js 502 строки, notebook-builder.js 380, reducer.js 305, StartScreen.jsx 169, NotebookBuilderPage.jsx 87).
- **Phase порядок** доказал свою ценность — Phase A коммит независимо проверяем, Phase B наслаивается без перемешивания.
