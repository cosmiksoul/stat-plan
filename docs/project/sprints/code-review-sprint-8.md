# Code Review — Sprint 8 (Polish v2)

> **Verdict:** ✅ APPROVED. Все 14 P-items закрыты технически чисто (P-11 был уже реализован — skipped). Готов к browser smoke на 3 e2e сценариях. 1 minor note (CR-1) на будущее, не блокер.

**Источник:** `docs/project/sprints/sprint-8-prompt.md` P-1..P-14 + `docs/project/sprints/sprint-8-report.md`.
**Reviewed:** ключевые правки в `src/components/Header.jsx`, `src/components/layout/Banner.jsx`, `src/lib/results/decision-rules.js`, `src/lib/results/effective.js` (целиком) + отчёт Code.

---

## Trace-ability P-1..P-14

| P | Что обещано | Что в коде | Verdict |
|---|---|---|---|
| P-1 | Tour cleanup + 3 nav link + 2 stub pages + routes | Header.jsx с NavLink Туториал/Методология + external CRO Эксперт через `text-tour border-tour` (Code оставил tokens, репурпозил) + Routes + stub pages | ✅ |
| P-2 | /step1 H1 + subtitle | BriefPage.jsx | ✅ (по отчёту) |
| P-3 | /step3 approval Banner | NotebookBuilderPage.jsx + Banner type=status | ✅ |
| P-4 | /step4 sticky footer с ZIP | ValidationReportPage.jsx + StepFooter reuse | ✅ |
| P-5 | Unified Banner + замена 4 inline | Banner.jsx — чистый API `{type, icon, children, action}`, 4 страницы обновлены | ✅ |
| P-6 | LoadedBadge rename | `↳ ИЗ ФАЙЛА` + title | ✅ |
| P-7 | /step4 🗑 ОЧИСТИТЬ ФОРМУ + ConfirmDialog | scope: form-only, бриф/план остаются | ✅ |
| P-8 | fmtNum адаптивный (2/4 dp) | + optional digits override + edge cases (0/null/Infinity) | ✅ |
| P-9 | MdPreview тёмный scrollbar | webkit + firefox vendor prefixes | ✅ |
| P-10 | /step4 ↺ НОВЫЙ ТЕСТ под section 6 | + ConfirmDialog + full restart | ✅ |
| P-11 | ScoringCard details checklist | **Уже реализовано** в прошлом sprint'е — verify-only, без правок (surgical) | ✅ |
| P-12 | D-2 midpoint → observed_diff | Per-method bindings: z_test (p_treatment-p_control), t/welch (diff/m_c), bootstrap (observed) | ✅ |
| P-13 | Decision rules aliases | Regex расширен: lift/эффект/Δ rel/p value/relative effect — все mapping корректно. `Δ` regex `[Δδ]\s*rel` + strip `δ_?` префикса | ✅ |
| P-14 | Unit-aware % rel через control_mean | Multi-layer: main_test bindings + export-cell + effective.js derived + decision-rules unit-aware + reports переключены на канонический effectiveResults (убран дубль) | ✅ |

**Tests:** 448 → 467 (+19). ✅ Ожидалось +15, Code сделал +19 — больше тестов, лучше покрытие.
**Bundle:** initial +1.21 KB (< +5 KB target). ✅
**Round-trip:** YAML не задет (правки в src/ + templates + tests + новые pages stubs). ✅
**Time:** ~3.5 ч (план был 5-6 ч). ✅ Сэкономлено благодаря P-11 уже готовому + StepFooter/ConfirmDialog reuse.

---

## Качественная оценка ключевых решений

**P-1 tour cleanup decision.** Code оставил `--color-tour*` tokens и репурпозил под CRO-ссылку (`text-tour border-tour hover:bg-tour-soft`). Sound — не плодим новые токены, и явно отделяем external link от internal nav синим accent'ом. Подтверждено что `.tour` CSS-правил не было — broken-contract диагноз правильный.

**P-5 Banner API.** Чистый компонент `{type, icon, children, action}` с VARIANTS map. `mb-6` встроен в компонент — удобно для consumers. Action слот для CTA-кнопок (PlanPage «У меня есть выполненный ноутбук →»). Хороший shared component design.

**P-13 + P-14 regex extension.** Long alternatives первыми, bare `ci` последняя — корректно для regex alternation. Strip `δ_?` префикса для `Δ rel` aliases — clever. Unit suffix `(%\s*rel(?:ative)?|%)?` корректно различает «% rel» (включает конверсию) vs голый «%» (raw сравнение).

**P-14 unit-aware key swap.** В `evaluateRule:90-96` — только для `ci_lower`/`ci_upper` swap на `_pct_rel` версию. Для `delta_rel` + `% rel` — value уже в %, raw сравнение OK. Edge cases правильно покрыты: `cm === 0` → derived не считаются (guard), отсутствие control_mean → fallback на manual checkbox.

**P-14 DRY effectiveResults.** Code заметил что `report-html.js` и `readout-md.js` имели inline-дубли `effectiveResults` — переключил на канонический import. Теперь derived `ci_*_pct_rel` доступны и в отчётах (consistent behaviour). **Это side-improvement, не из spec — хорошая инициатива.**

**P-12 D-2 fix.** Per-method observed_diff bindings — теперь точечная оценка не зависит от симметрии CI. Sound для bootstrap-percentile. Подтверждено по сценарию A: для z-test wald CI midpoint = observed (0.008666 vs 0.008667) — identity сохранилась.

**P-11 already-done detection.** Code проверил existing `<details open>` + severity remarks в `GroupRow` — acceptance уже выполнен. Не сделал «дублирующих» правок (surgical principle CLAUDE.md §3). Sound.

---

## P-14 семантическое изменение — важно для retest

**До Sprint 8 (FIX iter 2):** правило `CI ≤ −2.5% rel` сравнивалось с raw `ci_upper` (в абсолютных единицах метрики).
**После Sprint 8:** сравнивается с `ci_upper_pct_rel = ci_upper / control_mean * 100`.

Для Scenario B (continuous ARPU, control_mean ≈ 100, ci_upper = 4.58):
- **До:** `4.58 <= -2.5` = false (но через wrong units — формально верно, semantically nonsense)
- **После:** `4.58/100*100 = 4.58% rel`, `4.58 <= -2.5` = false (через correct units — semantically true)

Результат тот же в этом примере, но для случаев около границы (ci_upper = -0.025 vs -2.5) — критически разные ответы. **Retest должен проверить** что Scenario B с явным KILL-правилом не false-positive'ит.

---

## Concerns

### CR-1 (nice-to-have, future) — Tutorial content пока stub

Code сделал TutorialPage.jsx как заглушку «Туториал готовится». **Я (Cowork) обещал параллельно подготовить content rewrite e2e-scenarios** в user-facing markdown — пока не сделал (был занят CLOSE + UX audit + sprint planning). Можно:

- **A:** Запустить retest на stub (functional verification) → Cowork готовит content → второй коммит с инлайн text → push.
- **B:** Сначала Cowork готовит content (~1.5 ч), потом инлайнит, потом retest на финальной версии.

**Рекомендую A** — stub functional (route работает, текст «Туториал готовится» — честно). Content rewrite не блокирует Sprint 8 CLOSE; можно делать как **Sprint 8 follow-up** (mini-commit без отдельного sprint'а) или включить в Sprint 9 как часть Methodology content phase.

**Severity:** P3, не блокер. Решает пользователь после retest.

---

## ADR-015 amendment пункт 3 — Cowork добавит в CLOSE

Code корректно не правил `decisions-log.md` (Cowork-зона §P-1). Текст пункта 3 из отчёта:

> **3. `control_mean` (added in Sprint 8, P-14).** Optional float в export-dict. Используется для derived `ci_lower_pct_rel` / `ci_upper_pct_rel` в `effective.js`, что позволяет decision rules вида `CI ≤ −2.5% rel.` корректно сравниваться для всех metric_type. Backward-compat: если поле отсутствует — derived undefined, unit-aware сравнение возвращает null (manual fallback). `novelty_flag` уже tri-state (True/False/None) с iter 2.

Добавлю в Sprint 8 CLOSE batch вместе с обновлением CONTEXT.md + JTBD §1 (tutorial/methodology stories) + PROJECT_STATUS.

---

## Готов проверять в browser?

Да. Retest test cases — отдельный документ `test-cases-sprint-8-retest.md`. Smoke ~10-15 мин на 2 сценариях (A proportion + B continuous), плюс отдельный блок на /tutorial и /methodology stub-pages.

---

## Related

- `docs/project/sprints/sprint-8-prompt.md` — спека P-1..P-14
- `docs/project/sprints/sprint-8-report.md` — отчёт Code (переименован из sprint-polish-v2-report.md)
- `docs/project/sprints/test-cases-sprint-8-retest.md` — runnable smoke (TBD)
- `docs/project/polish-pack-v2.md` — backlog с MindMap идеей для Sprint 9 (добавлено 2026-05-31)
- `docs/context/decisions-log.md` — ADR-015 amendment пункт 3 (Cowork добавит в CLOSE)
