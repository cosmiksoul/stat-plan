# Code Review Sprint 6 — Data Peek (Шаг 1)

**Reviewer:** Cowork
**Date:** 2026-05-29

---

## Summary

Sprint 6 закрыт **очень качественно** (~2ч 45мин active, при оценке 4-5 ч). Все T1..T10 реализованы, **313 тестов зелёных** (+46 net: +17 stats, +13 csv, +7 calculator, +4 reducer, +5 parse, +1 round-trip canonical, +1 inline snapshot update). Round-trip **6/6** canonical case включая новый ratio + полностью заполненный data_peek (закрывает 2 pre-existing parse-mapping gap: `ratio_variance` и `stability_cv_under_threshold`).

**Самое ценное в спринте — mid-flight architecture change.** При прямом импорте recharts + papaparse получился бы +367KB raw / +110KB gzip (почти 2× прогноза). Code сам обнаружил это, сделал `React.lazy(...) + Suspense` для DataPeekHistogram и `await import(...)` для parseDataPeekCsv. Initial bundle delta **+4.55 KB gzip** — в 13× ниже плана. Lazy chunks (recharts 96KB, papaparse 9KB) загружаются по запросу при первом CSV upload / гистограмме. Это правильное продуктовое решение: пользователь, не загрузивший CSV, не платит за recharts.

**Blockers: 0. Concerns: 2 (1 medium, 1 minor). Notes: 3.**

Проверил автоматически:
- `src/lib/data-peek/*.js` — без React-импортов ✓ (`stats.js`, `csv.js`, `calculator.js` чистые)
- `state.brief.data_peek` schema корректно расширена в `parse.js`, `render.js`, `reducer.js initialBrief` ✓
- Round-trip 6/6 включая ratio_variance + raw_values ✓
- Pre-existing gaps закрыты (`ratio_variance`, `stability_cv_under_threshold`) ✓
- Bundle: lazy chunking работает — initial +4.55KB / +18.36KB raw ✓
- ADR-014 соблюдён (recharts + papaparse подключены, никаких других npm-deps)
- P-1 P-1 зоны: Code не правил `docs/**` (кроме своего sprint-report-6.md) ✓
- `Stepper.jsx` не тронут (Sprint 7 structural rewrite остаётся в плане) ✓

---

## Concerns

### 🔴 Blockers

Нет.

### 🟡 Concerns (требуют решения)

| # | Где | В чём concern |
|---|-----|---------------|
| **C-1** | `src/components/brief/DataPeekStats.jsx:36-42` (`applyBaseline`) | **После клика «↳ ПОДСТАВИТЬ В Q05» visual не освежается.** Сценарий: CSV upload → `baseline_computed = 0.045`, `userInput = 0.031` → видим `⚠ Δ = 45.2%` + кнопку «ПОДСТАВИТЬ В Q05». Клик → `ANSWER_QUESTION` dispatch с `baseline.value = 0.045`. **Но** `data_peek.baseline_match_user_input` и `data_peek.baseline_computed` остаются прежними — UI продолжает показывать `⚠ Δ = 45.2%` и ту же кнопку, хотя теперь baseline в Q05 уже совпадает. Пользователь может подумать, что клик не сработал. **Варианты фикса:** (а) после `applyBaseline()` дополнительно dispatch `SET_DATA_PEEK` с обновлённым `baseline_match_user_input = true` (поле derived из текущего state.brief.baseline) и `delta = null`; (б) в `DataPeekStats` сравнивать `dp.baseline_computed` с **актуальным** `state.brief.baseline?.value` (а не с `baseline_match_user_input`) при рендере — тогда после `ANSWER_QUESTION` baseline обновится и Δ% пересчитается реактивно. Вариант (б) проще и не требует изменений reducer'а. **Severity: minor UX-bug,** ловится при QA scenario 4 (ratio + baseline mismatch). Можно в FIX iter 1 либо как side-task в Sprint 7. |
| **C-2** | `src/lib/data-peek/csv.js:239` (ratio branch) и `src/components/brief/DataPeekHistogram.jsx` (предположительно) | **Histogram для ratio показывается ОДИН** (по `N/D` ratios), а не три (numerator + denominator + ratio) как было в Sprint 6 prompt §S5.5 «Для ratio показываем 3 малых histogram». В коде это видно: `raw_values: reservoirSample(ratios, RAW_VALUES_LIMIT)` — только ratios сохраняются для histogram. **Не блокер:** один histogram по N/D даёт ключевую информацию для пользователя (распределение метрики). Numerator/denominator отдельно — это интересно для аналитика, но не критично. **Эскалация:** оставляем как сейчас (упрощение) или флагнуть как `[ ] ◆` user story в JTBD §4 для будущего «Если для ratio покажем 3 малых histogram, пользователь увидит откуда берётся variance»? Severity: minor product call. |

### 🟢 Notes (на будущее)

| # | Где | Заметка |
|---|-----|---------|
| **N-1** | `src/components/brief/DataPeekBlock.jsx:80-89` Suspense fallback | Code-flagged: при `LOAD_TEST_PLAN_MD` с заполненным data_peek (loaded peek после reload) пользователь видит `Загружаю гистограмму…` на 50-200ms. Не блокирующе. Кандидат на оптимизацию через `prefetch` chunk при hover на DataPeekBlock header — если будет жалоба. Пока не действуем. |
| **N-2** | `src/lib/data-peek/csv.js:262-269` proportion mean > 1 warning | Не error, а warning — разумно. Пользователь может сознательно загрузить что-то нестандартное. Кандидат на корректировку текста ('возможно проценты' vs 'возможно процент') если будет confusion. |
| **N-3** | `src/lib/data-peek/stats.js:101-103` distribution_label thresholds | Текущие `|skew| > 1` и `kurt > 3` — стандартные значения. Code в Open questions просит реальные log-normal CSV для tuning. Включаю CSV для skewed в test-cases (S6 ниже) — после QA если threshold не срабатывает где ожидается, скорректируем. |

---

## Trace-ability

Все T-задачи из prompt в коде:

| T | Реализация | Тесты | Статус |
|---|---|---|---|
| T1 | `parse.js:442-490` mapping + `render.js:53-86` + `reducer.js:46-48` initialBrief | parse.test +4 case | ✅ |
| T2 | NEW `src/lib/data-peek/stats.js` (skewness, kurtosis, deltaMethodVariance, dailyCV, distributionLabel) | stats.test +17 | ✅ |
| T3 | NEW `src/lib/data-peek/csv.js` (papaparse lazy, reservoir sampling, 4 metric_type, edge cases) | csv.test +13 | ✅ |
| T4 | NEW `src/lib/data-peek/calculator.js` (per metric_type) | calculator.test +7 | ✅ |
| T5 | `reducer.js:118-133, 320-330` SET/RESET_DATA_PEEK + auto-recompute | reducer.test +4 | ✅ |
| T6 | 6 NEW `src/components/brief/DataPeek*.jsx` (Block, Tabs, CsvUpload, ManualForm, Histogram, Stats) | UI без unit-tests (конвенция) — RETEST в браузере | ✅ (см. C-1, C-2) |
| T7 | `BriefPage.jsx:190-195` + `QuestionMap.jsx:101-167` | — | ✅ |
| T8 | round-trip.test +1 canonical (ratio + full data_peek) | parse.test +4, round-trip 6/6 | ✅ |
| T9 | full test + build + lazy refactor | — | ✅ |
| T10 | sprint-report-6.md + commit | — | ✅ |

---

## Gap fixes (pre-existing parse-mapping)

| Gap | До Sprint 6 | После Sprint 6 |
|---|---|---|
| `data_peek.ratio_variance` | sample-size.js:258 читал, parse.js не маппил → ratio peek через YAML round-trip терялся | round-trip 6/6 ✓ — поле сериализуется/парсится. Точный delta_method работает после reload. |
| `data_peek.stability_cv_under_threshold` | scoring.js:322 давал +5 pts, parse.js не маппил → штраф/бонус scoring через round-trip не симметричен | round-trip 6/6 ✓ — поле round-trip-able. |

---

## ADR Compliance Check

| ADR | Статус | Комментарий |
|---|---|---|
| ADR-001 (no backend) | ✅ | papaparse в браузере, никаких uploads. |
| ADR-002 (артефакты как переносимое состояние) | ✅ | Round-trip 6/6 canonical case. Все 8 новых data_peek полей восстанавливаются. |
| ADR-009 (точные формулы / приближения с warning) | ✅ | После peek для ratio — точный delta_method (не bootstrap fallback). Для continuous — точный t-test (σ из peek). |
| ADR-010 (стек) | ✅ | Только ADR-014 deps (recharts + papaparse). Lazy chunking уважает spirit ADR-001 — пользователь без peek не платит за recharts. |
| ADR-013 (объединение Шагов 4 и 5) | ✅ | Stepper.jsx не тронут — structural rewrite остаётся в Sprint 7. |
| ADR-014 (recharts + papaparse) | ✅ | Подключены. Bundle delta initial +4.55KB gzip — намного лучше прогноза +60-65KB благодаря lazy chunking. |

---

## P-1 (зоны коммитов) Check

✅ **Code-зона коммита Sprint 6:**
- `package.json` + `package-lock.json` (papaparse + recharts)
- `src/lib/data-peek/*.js` (NEW 3 файла)
- `src/lib/plan/parse.js` (modify mapping)
- `src/lib/plan/render.js` (modify YAML)
- `src/state/reducer.js` (modify initialBrief + actions)
- `src/pages/BriefPage.jsx` (modify integration)
- `src/components/brief/DataPeek*.jsx` (NEW 6 компонентов)
- `src/components/brief/QuestionMap.jsx` (modify Data peek row)
- `tests/lib/data-peek/*.test.js` (NEW 3 файла)
- `tests/lib/plan/{parse,round-trip}.test.js` (modify)
- `tests/lib/plan/render.test.js` (inline snapshot update)
- `tests/state/reducer.test.js` (modify)
- `docs/project/sprints/sprint-report-6.md` (exception по P-1: sprint-report Code пишет сам)

P-1 соблюдён.

---

## Что закрыть в CLOSE-фазе

1. **Решение по C-1** (visual refresh после applyBaseline): в FIX iter 1 Sprint 6 или как side-task Sprint 7 PLAN.
2. **Решение по C-2** (3 histogram для ratio): оставляем 1, добавляем в JTBD §4 как ◆ defer; или фиксим в FIX iter 1.
3. **Cowork-зона CLOSE Sprint 6:**
   - Обновить `docs/project/CONTEXT.md` Development Timeline — добавить Sprint 6 запись.
   - Обновить `docs/project/PROJECT_STATUS.md` — таблица спринтов (Sprint 6 → Closed + active time), roadmap (Sprint 7 main = Шаг 4 «Валидация и отчёт»).
   - Возможно — JTBD §4 закрыть user stories `[x]` для реализованных (CSV upload, baseline_match, σ из CSV, calculator).
   - Cowork-коммит batch'ем + push.

---

## Что говорить пользователю при передаче в QA

> Sprint 6 готов к QA. Тест-кейсы + 6 готовых CSV-файлов в `docs/project/sprints/test-cases-sprint-6.md`. Особое внимание:
> - **C-1 (minor UX):** в кейсе 4 (ratio + mismatched baseline) после клика «↳ ПОДСТАВИТЬ В Q05» — Δ% и кнопка должны исчезнуть, но могут остаться. Зафиксируй как bug в QA.
> - **C-2 (продуктовый call):** в кейсе 4 для ratio Histogram **один** (по N/D), не три отдельных. Подтверди — оставляем как есть, или хочешь 3 малых histogram (numerator, denominator, ratio).
> - **distribution_check tuning:** в кейсе 5 (skewed CSV) — `distribution_check` должен стать `'skewed'`. Если не сработает на реальных данных — флагнуть, скорректируем threshold.

---

## Related

- `docs/project/sprints/sprint-report-6.md` — отчёт Code (Sprint 6 main)
- `docs/project/sprints/sprint-6-prompt.md` — prompt
- `docs/context/decisions-log.md` — ADR-014 (recharts + papaparse), ADR-009 (приближения с warning)
- `docs/project/JTBD.md §4` — Data Peek user stories
- `docs/project/sprints/test-cases-sprint-6.md` — QA сценарии + CSV примеры (создаётся)
