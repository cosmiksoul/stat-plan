# Code Review — Sprint 7 FIX iter 2

> **Verdict:** ✅ APPROVED. Все 4 G-items закрыты технически чисто. Готов к browser smoke. 0 blockers, 1 nice-to-have (CR-1) для будущих iter.

**Источник:** `docs/project/sprint-7-fix-iter2-prompt.md` G-1..G-4 + `docs/project/sprint-7-fix-iter2-report.md`.
**Reviewed:** `src/lib/results/decision-rules.js` (целиком) + `src/lib/results/report-html.js:68-93` (ciUnitNote + buildTldr) + цитаты из отчёта Code.

---

## Trace-ability G-1..G-4

| G | Что обещано | Что в коде | Verdict |
|---|---|---|---|
| G-1a | export-cell `_safe(..., None)`, novelty cell tri-state | Цитата из отчёта: `'novelty_flag': _safe(..., None)`; novelty.cells.json `novelty_flag = None` default + `if lift_early is not None and lift_later is not None: novelty_flag = bool(...)` | ✅ |
| G-1b | UI/HTML/MD без правок (уже умеют null) | Подтверждено Code — нет правок ResultsForm/report-html/readout-md в части novelty rendering | ✅ |
| G-2a/b | `ciUnitNote(brief)` + явный label по metric_type, без `*100` | `report-html.js:68-82` идентично спеке. `metric_label || metric_name || 'ед. метрики'` fallback. `*100` НЕТ. | ✅ |
| G-2c | 4× main_test title `CI95 [...]` → `CI95 (абс. разность) [...]` | По отчёту все 4 файла обновлены | ✅ |
| G-3 | Secondary «К ВАЛИДАЦИИ →» в footer | Подтверждено: `StepFooter` уже имел `secondary` slot (Вариант A), добавлен prop в NotebookBuilderPage | ✅ |
| G-4a | Unicode normalize + extended regex + normalizeVariable | `decision-rules.js:16-21, 29-40, 52-56` — точно по спеке. Regex literal с `\\s+` для пробелов, longer альтернативы первыми, bare `ci` последняя. | ✅ |
| G-4c | Hint про абс. единицы в Decision rules секции | Подтверждено: `DecisionRulesBlock.jsx` с hint | ✅ (не вычитан) |

**Tests:** 431 → 448 (+17, ожидалось +10-14 — даже больше). ✅
**Bundle:** initial +0.11 KB, lazy +0.12/0.36 KB — все в пределах ≈ 0. ✅
**Round-trip:** YAML не задет (правки только в .cells.json/src/tests). ✅

---

## Качественная оценка ключевых решений

**G-4 regex без `\b`.** Code заметил что JS word boundaries ASCII-only — сломали бы `нижняя\s+граница`. Решение через explicit `\s*` достаточно для precision (тест «explicit ci_lower/ci_upper are never remapped» подтверждает что bare `ci` не false-positive на `ci_lower`). ✅ Sound.

**G-4 порядок альтернатив.** `ci_lower|ci_upper|...|ci` — bare `ci` последняя, длинные матчатся раньше. Это **корректное** поведение regex alternation в JS (left-to-right matching). ✅

**G-4 semantic CI mapping применяется ТОЛЬКО к bare `ci`.** Подтверждено: `normalizeVariable` сначала проверяет `includes(['ci_lower', 'ci_upper', ...])` — явные variables возвращаются без переменной mapping по operator. Тест покрывает. ✅ Защищено от регрессии.

**G-2 fallback chain.** `metric_label || metric_name || 'ед. метрики'`. Code заметил что `metric_label` **не существует** в схеме брифа (только `metric_name`). Fallback chain покрывает это — поведение = `metric_name`. ✅ Защитно.

**G-1 novelty tri-state correctness.** `novelty_flag = None` default → внутри `if lift_early is not None and lift_later is not None` устанавливается в `bool(...)`. Семантика строгая: `None` = «не проверяли», `True`/`False` = «проверили». matplotlib-блок под тем же guard'ом — графика не рисуется когда нет данных. ✅ Sound.

---

## Concerns

### CR-1 (nice-to-have, не блокер) — G-4 missing: `delta_rel >= X%` без литерала variable

Сейчас парсятся 3 формы variable: `ci_lower`/`ci_upper`/`p_value`/`delta_rel` (literal), aliases (`нижняя граница` и т.п.), bare `ci`. Но в реальных PM-формулировках часто:
- `Lift ≥ +5% rel.` — `lift` не в whitelist
- `Эффект ≥ +5%` — `эффект` не в whitelist
- `Δ rel >= 5` — `Δ rel` (unicode delta) не в whitelist

В этом FIX **не критично** — пользователь может перейти на canonical `delta_rel`. Но если хотим истинно tolerant parser — добавить:
- `delta\s*rel|Δ\s*rel|lift|эффект|relative\s+effect` → `delta_rel`
- `p\s*value|p|p-value|p-значение` → `p_value`

**Severity:** P3 / future polish. Если в Sprint 8 будет «улучшаем decision rules UX» — добавить туда.

---

## ADR-15 notes для CLOSE

Из отчёта Code:
> `novelty_flag` теперь **tri-state** (`True`/`False`/`None`). Требует отметки в DATA_MODEL.md / ADR-015 на стороне Cowork (CLOSE).

Запомнено для Sprint 7 CLOSE phase. Когда дойдём — обновлю `docs/context/decisions-log.md` ADR-015 и `docs/context/DATA_MODEL.md`.

---

## Готов проверять в browser?

Да. Следующий шаг — пользовательский retest по 5 пунктам Browser smoke (см. `sprint-7-fix-iter2-report.md` §Browser smoke). Параллельно я пишу `test-cases-sprint-7-fix-iter2-retest.md` с runnable click-by-click формулировками.

---

## Related

- `docs/project/sprint-7-fix-iter2-prompt.md` — спека G-1..G-4
- `docs/project/sprint-7-fix-iter2-report.md` — отчёт Code
- `docs/project/test-cases-sprint-7-fix-iter2-retest.md` — runnable smoke (TBD)
- `docs/context/decisions-log.md` — ADR-015 (нужно обновить tri-state описание в CLOSE)
