# Code Review — Sprint 7 FIX iter 1

> **Verdict:** ✅ APPROVED. Готов к browser smoke (Colab e2e). 1 minor concern (CR-1) для обсуждения после QA, не блокер. 1 organisational point (CR-2) про modified JTBD.md.

**Источник:** `docs/project/sprints/sprint-7-fix-prompt.md` F-1..F-9 + `docs/project/sprints/sprint-7-fix-report.md`.
**Reviewed:** ключевые файлы из Code-зоны (templates/notebook/{balance,srm,novelty,main_test/{z_test,bootstrap}}.cells.json + src/{components/results/ResultsForm.jsx, lib/results/{report-html.js, readout-md.js}}).

---

## Trace-ability F-1..F-9

| F | Что обещано в prompt | Что в коде | Verdict |
|---|---|---|---|
| F-1 | balance: 2 субплота + inline colors | `balance.cells.json` — 2 subplot, inline `#60a5fa`/`#a3e635`, `display(balance)` сохранён | ✅ |
| F-2 | srm: grouped bars observed vs expected(50/50) | `srm.cells.json` — `width=0.35`, два bar (observed/expected), title с χ²/p из `chi2_srm`/`srm_pvalue` | ✅ |
| F-3 | 4× main_test: errorbar Δ с CI vs 0 | Все 4 (z_test, t_test, welch, bootstrap) — errorbar present, `axvline(0)`, `if all(...)` guard. **D-2 фикс единиц применён** (см. CR-1) | ✅ |
| F-4 | guardrails: barh, breach=red/ok=green, ✓/⚠ | `guardrails.cells.json` — barh, `#f87171`/`#a3e635`, маркеры, фильтр None | ✅ (по отчёту) |
| F-9a | novelty: bar early vs later с verdict | `novelty.cells.json` — bar two-color, axhline(0), title с suspected/not, `text` с %, `if lift_early is not None and lift_later is not None` guard | ✅ |
| F-5 | export-cell: `results['significant']` | `export.cells.json` (по отчёту) — `_pv is not None and _pv < _alpha` | ✅ (по отчёту, не вычитан целиком) |
| F-6 | ipynb parser support optional significant | Code не правил — поле опциональное, проходит через `{...raw}` spread в `effective.js` (D-5). Тест +1 | ✅ |
| F-7 | UI significant readonly badge | `ResultsForm.jsx:70-83` — conditional render `sig !== null`, green/yellow classes, p-value в скобках | ✅ |
| F-8 | report-html + readout-md significance + novelty badges в TL;DR первыми | `report-html.js:111-124` — sigBadge → noveltyBadge → tldr. `readout-md.js:78-87` — bold lines первыми. CSS-класс `.significance-badge,.novelty-badge` определён, color-coded | ✅ |
| F-9b | UI novelty badge + `<details>` override | `ResultsForm.jsx:98-127` — три состояния (true/false/null), readonly chip, `<details><summary>override</summary>` с checkbox | ✅ |
| F-9c | HTML+MD novelty badge | Реализовано вместе с F-8 в обоих файлах | ✅ |

**Tests:** 422 → 431 (+9, ожидалось +10 — допустимая дельта).
**Bundle:** initial +1.75 KB gzip (planned ~0) — Code объяснил matplotlib-строки в notebook-builder chunk; explanation sound, не критично.
**Round-trip:** YAML не трогался, 6/6 зелёные.

---

## Дизайн-решения (D-1..D-6) — оценка

**D-1 (SRM bindings).** ✅ Sound. Code адаптировал под фактические `chi2_srm`/`srm_pvalue`/`group_sizes` Series вместо вымышленных `chi2`/`p`/`n_ctrl/n_treat` из prompt. Это правильная реакция на gap в моём спеке — я не сверился с фактическими bindings из Sprint 7 main.

**D-2 (main_test point-plot units fix).** ✅ Critical save. Мой prompt содержал баг — смешивал единицы (`delta_rel` в %, `ci_lower/ci_upper` в абсолюте). Code заметил и переписал на CI абсолютной разности вокруг midpoint. **Это правильно технически, но см. CR-1 о точечной оценке midpoint vs delta_abs.**

**D-3 (guardrails None filter).** ✅ Defensive coding, sound. `value: None` случаи (`column_missing`/`no_data`) теперь не падают.

**D-4 (significant computed-only, Option A).** ✅ Реализован как договорено. Код в `ResultsForm.jsx:48-53` и `report-html.js:105-110` идентичный — same derive logic: prefer notebook verdict (учёл свою α + sidedness), fallback на `p < alpha`. Чисто, без state-дубликации.

**D-5 (effective.js untouched).** ✅ Sound. `{...raw}` spread автоматически пробрасывает любые extra-поля, including новый `significant`.

**D-6 (inline palette).** ✅ Соответствует ADR на дизайн (UI палитра + load-cell rcParams). Control стабильно `#60a5fa`, treatment — `#a3e635`. Хорошо что не положился на rcParams cycle (order-sensitive).

---

## Concerns

### CR-1 (minor, observe-after-QA) — D-2 midpoint ≠ point estimate

**Что:** В точечном графике main_test Code рисует `center = (ci_lower + ci_upper) / 2`, а не реальную точечную оценку `treatment_mean - control_mean`. Для z_test wald-CI midpoint **совпадает** с point estimate (CI симметричен по конструкции). Для **bootstrap percentile CI** — midpoint может слегка отличаться от observed `treatment - control` (асимметричное распределение → centred percentile median ≠ mean).

**Почему обычно ок:**
- Width CI обычно >> асимметрии (5-15% от width).
- Визуальный сигнал "пересекает 0 / не пересекает" — корректен в обоих случаях.
- `delta_rel` (%) в title — даёт пользователю настоящую relative оценку отдельно.

**Когда не ок:**
- Сильно асимметричное распределение (тяжёлые хвосты, low sample size в bootstrap) — точка может визуально смещаться относительно "правильного" location.

**Что предлагаю:**
- **В этом sprint не трогаем** — поднимаем только если в Colab QA визуально точка визуально странно отъезжает от 0 относительно того что в `print` выводит ноутбук.
- **В Sprint 8 / polish v2:** добавить canonical binding `point_estimate = treatment_mean - control_mean` (или `observed`) в каждый main_test и использовать его как `center`. CI остаётся как сейчас.

**Severity:** minor. Не блокер для FIX iter 1.

### CR-2 (organisational) — `docs/project/JTBD.md` modified

**Что:** Code в отчёте отмечает «JTBD.md показан как modified, но я его не трогал — был изменён до сессии (Cowork-зона)».

**Причина:** в моих предыдущих сессиях (до compaction) я добавлял ◆ записи (polish v2 — restart button, fmtNum precision, ScoringCard checklist, MdPreview scrollbar, NotebookLM CRO эксперт). Видимо коммита моего этих правок не было до начала Sprint 7 FIX.

**Что делать:** Перед коммитом Sprint 7 FIX я (Cowork) коммичу свои pending файлы из docs/ зоны **отдельно**, до Code-коммита. Per P-1 zones rule. Пользователь — будь добр прогнать `git status` и подтвердить что в Cowork-зоне action items:
- `docs/project/JTBD.md` (мои polish ideas)
- `docs/project/sprints/sprint-7-fix-prompt.md` (F-1..F-9 spec)
- `docs/project/sprints/code-review-sprint-7-fix.md` (этот файл)
- `docs/project/sprints/test-cases-sprint-7-fix-retest.md` (после Task #54)
- возможно `outputs/stat-plan-concept-for-notebooklm.md` (если хочешь сохранить в проект)

---

## Что НЕ делал в review (для full audit оставлено)

- Не вычитывал каждый из 4 main_test файлов целиком (только z_test + bootstrap как контрольные точки — оба идентичны по errorbar-блоку). По отчёту все 4 идентичны.
- Не вычитывал `templates/notebook/export.cells.json` — Code чётко описал что добавил `results['significant']`, тестируется в notebook-builder.test.js.
- Не вычитывал `templates/notebook/guardrails.cells.json` целиком — D-3 фильтр описан, графики есть по отчёту.
- Не запускал `npm test` / `npm run build` — полагаюсь на Code-отчёт «431/431, build чистый».

Если хочешь deeper audit конкретного файла — скажи.

---

## Гото проверять в Colab?

Да. Следующий шаг — пользовательский browser smoke по 7 пунктам из `sprint-7-fix-report.md`. Параллельно я пишу `test-cases-sprint-7-fix-retest.md` с runnable click-by-click формулировками.

---

## Related

- `docs/project/sprints/sprint-7-fix-prompt.md` — спека F-1..F-9
- `docs/project/sprints/sprint-7-fix-report.md` — отчёт Code
- `docs/project/sprints/test-cases-sprint-7-fix-retest.md` — runnable smoke (TBD после этого review)
- `docs/context/decisions-log.md` — ADR-015 расширение `significant` поля (CLOSE-phase TBD)
