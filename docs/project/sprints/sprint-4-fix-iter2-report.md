# Sprint 4 FIX iter 2 — отчёт Claude Code

> Источник прицеливания: `docs/project/sprints/sprint-4-fix-prompt.md` (iter 2 raздел) + audit table в `docs/project/sprints/test-cases-sprint-4.md` (BUG-9, BUG-9b). План: `~/.claude/plans/expressive-herding-swan.md`.

## Что закрыто

Все 7 строк audit table сериализуются через YAML frontmatter в обе стороны. BUG-9 (decision_rules/stop_conditions терялись при drag-drop, score падал 80→77) больше не воспроизводится — поля восстанавливаются из YAML, scoring видит их и не штрафует.

| Поле | render → YAML | parse ← YAML | Где в шаблоне |
|---|---|---|---|
| `goal_type` | ✅ | ✅ | `# Context` |
| `goal_description` | ✅ (был с iter 1, переехал в Context) | ✅ | `# Context` |
| `ratio_components.numerator` | ✅ (`ratio_numerator`) | ✅ | `# Test design` |
| `ratio_components.denominator` | ✅ (`ratio_denominator`) | ✅ | `# Test design` |
| `cluster_field` | ✅ | ✅ | `# Test design` |
| `advanced.two_sided` | ✅ (`two_sided`) | ✅ | `# Test design` |
| `stop_conditions` (4 поля) | ✅ (`stop_conditions:` object block) | ✅ | `# Stop conditions` |
| `decision_rules` (3 поля) | ✅ (`decision_rules:` object block) | ✅ | `# Decision rules` |

Markdown body (`## Stop conditions`, `## Decision rules`, `## Guardrails`) **оставлены как human-readable дублирование** по ADR-002 (frontmatter wins, body — для глаз). Парсер их по-прежнему не читает — никаких новых markdown-парсеров.

## Коммиты

- **`b1a95b3`** — `fix(sprint-4-fix-iter2)` — render + template + parse + 14 новых тестов
- *(этот отчёт)* — `docs(sprint-4-fix-iter2)`

Один commit на Code-зону, поскольку render/parse/template/тесты тесно связаны (контракт меняется атомарно). BUG-9b не потребовал отдельного фикса (см. ниже).

## Тесты и сборка

- Было: 235 (после iter 1), 12 файлов.
- Стало: **249 pass**, 13 файлов.
- Прирост:
  - `tests/lib/plan/render.test.js` — обновлён inline snapshot, +4 явных case для новых YAML blocks
  - `tests/lib/plan/parse.test.js` — обновлён `extractBriefShape`, +5 case (goal_type, stop_conditions, decision_rules, ratio+cluster+two_sided, legacy silent defaults)
  - `tests/state/reducer.test.js` — +1 case на non-clobber goal_type при LOAD → GOTO_QUESTION
  - `tests/lib/plan/round-trip.test.js` — **новый** файл, 4 canonical case (full pack, BUG-9b sanity, length_cap_days, custom decision_rules)
- `npm run build` чистый. Bundle: **399.62 KB raw / 124.18 KB gzip** (+2.36 KB raw к iter 1, в основном новые readers + helpers).

## BUG-9b — расследование

**Симптом:** пользователь сообщил, что `оптимизация воронки партнёрки` (29 символов) приехал в YAML обрезанным до `оптимизация воронки партнёр` (27 символов).

**Что проверено:**
- `src/components/brief/TextInput.jsx` — нет `maxLength`, нет `.slice`, нет substring (плоский pass-through `value={value ?? ''}`).
- `src/components/brief/QuestionRenderer.jsx::GoalDescription` — value прямо в `dispatch`, без преобразований.
- `src/state/reducer.js::answerQuestion` — `patch.goal_description = v` без обработки.
- `src/lib/plan/render.js::yamlScalar` — Cyrillic-строка без YAML-спецсимволов возвращается as-is.
- `src/lib/storage.js` (`STORAGE_KEY = 'stat-plan:v1:state'`) — стандартный `JSON.stringify` / `JSON.parse`, никаких лимитов.
- `src/pages/PlanPage.jsx::downloadMd` — `Blob([content], { type: 'text/markdown;charset=utf-8' })` + `URL.createObjectURL` — корректный UTF-8 путь, без обрезаний.
- `src/state/AppStateContext.jsx` — `useEffect(() => saveState(state), [state])` без debounce, без труncation.

**Что собрано:**
- Добавлен `tests/lib/plan/round-trip.test.js` с **explicit case на BUG-9b**: input `'оптимизация воронки партнёрки'` (29 chars) → render → parse → output `'оптимизация воронки партнёрки'`, длина 29. Тест зелёный.

**Вывод:** в текущем коде после iter 1 + iter 2 truncation **не воспроизводится**. Скорее всего пользователь видел артефакт ДО iter 1 (когда `goal_description` ещё не сериализовался в YAML вообще — был добавлен только в iter 1 Phase C). Если симптом повторится post-iter-2, требуется raw .md hex dump для дальнейшего расследования (скорее всего — текстовый редактор / OS-level кодировка, а не код фронта).

Canonical round-trip test закрывает класс «я случайно обрезал поле» автоматически — любое будущее regression на goal_description / любом сериализуемом поле провалит CI.

## Acceptance & RETEST scope

**Локально проверено:**
- `npm test --run` — 249/249 pass, 13 files
- `npm run build` — чистый, bundle ~399 KB raw

**Браузерный RETEST (нужен Cowork / пользователь):**

1. **Round-trip baseline** (главный смоук BUG-9):
   - Fresh бриф, заполнить Q1-Q10 включая custom decision_rules (Q10) и stop_conditions с `length_cap_days=14` (Q9).
   - Скачать `test_plan.md` → открыть в редакторе → видеть `decision_rules:`, `stop_conditions:`, `length_cap_days: 14` в frontmatter.
   - «Начать сначала» → drag-drop тот же файл → попадаем на step 2 → score **тот же что был** (не падает); decision_rules / stop_conditions / length_cap восстановлены.

2. **goal_type='other' персистентность:**
   - Q1 → «Другое» → ввести длинный goal_description с ё (для проверки BUG-9b в новой среде).
   - Скачать → drag-drop → goal_type остался `other`, goal_description целый (без труncации).

3. **Ratio:**
   - Q3 → ratio + Q3-sub: numerator='clicks', denominator='views'.
   - Скачать → drag-drop → ratio_components восстановлены, бриф не теряет «выбор ratio» при перезагрузке.

4. **Cluster:**
   - Q6 → cluster + Q6-sub: cluster_field='campaign_id'.
   - Скачать → drag-drop → cluster_field восстановлен.

5. **Legacy:**
   - Любой test_plan.md из QA до этого fix'а (без `# Context`, без `stop_conditions:` block, и т.д.) парсится без падений; новые поля заполняются дефолтами тихо (т.е. БЕЗ warnings о их отсутствии — отсутствие optional поля = silent default, как уже работало для `variance_reduction`).

## Notes для CLOSE (Cowork)

`docs/context/DATA_MODEL.md` нужно обновить — добавились YAML поля:
- `goal_type` (string enum, optional, default null)
- `ratio_numerator` (string, optional, only meaningful when metric_type='ratio')
- `ratio_denominator` (string, optional)
- `cluster_field` (string, optional, only meaningful when randomization_unit='cluster')
- `two_sided` (boolean, optional, default true)
- `stop_conditions` (object: `srm_detected` bool, `guardrail_breach_24h` bool, `length_cap_days` int|null, `manual_stop` bool)
- `decision_rules` (object: `ship` str, `iterate` str, `kill` str)

Структура `# Context` блока — новая, между meta-полями (test_id..approved_at) и `# Test design`. Markdown body не изменился.

Также — переехал `goal_description` из `# Test design` в `# Context` (по смыслу goal_type + goal_description идут вместе). Старые файлы с goal_description в Test design **продолжают парситься** (порядок ключей в YAML не имеет значения для парсера).

## Open notes

- `extractBriefShape` в `tests/lib/plan/parse.test.js` теперь сравнивает 16 полей вместо 10. Любое новое поле в YAML должно туда добавляться. Аналогично — в `tests/lib/plan/round-trip.test.js` canonical контракт.
- Скудные warnings policy: для опциональных полей (`stop_conditions`, `decision_rules`, `goal_type`, etc.) отсутствие в YAML = silent default, без warning'а в `parse_warnings`. Только битый формат поля (например, `stop_conditions: ["array"]`) даёт warning. Это согласовано с уже работающим поведением для `variance_reduction` / `stratification_by` / `holdback_percent` (тоже optional → silent default).
- `defaultsApplied.goal_type=true` и `defaultsApplied.randomization_unit=true` ставятся в `mapFrontmatter` если поля были прочитаны. Защищает от того, что GOTO_QUESTION num=1/6 после LOAD_TEST_PLAN_MD затрёт загруженное значение дефолтом (Q01 имеет `default: 'product_change'`, Q06 — `default: 'user'`). Mirror к тому, как iter 1 устроил это для metric_name через applyEnterDefaults.
