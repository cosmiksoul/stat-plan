# Polish-pack v2 — backlog для Sprint 8 / mini-sprint

> Накопленные ◆ stories + CR concerns после Sprint 6 RETEST + Sprint 7 main/FIX iter 1/FIX iter 2 RETEST. **Все P2/P3, не блокеры.** Можно собрать в отдельный mini-sprint (~2-3 ч) или совместить со Sprint 8 (большой content sprint).

**Дата:** 2026-05-31 (составлено в Sprint 7 CLOSE)

---

## Origin tracking

| Источник | Дата | Кол-во items |
|---|---|---|
| Sprint 6 RETEST 2026-05-29 | 3 ◆ stories | Pv2-1, Pv2-2, Pv2-3 |
| Sprint 7 PLAN (после ADR-015 pivot) | 1 ◆ story | Pv2-6 (restart на финале) |
| Sprint 7 main/FIX RETEST 2026-05-30..31 | 1 ◆ story + 4 CR concerns | Pv2-7 (NotebookLM) + Pv2-8..Pv2-11 |
| Editable schema | Sprint 7 S10 main | ~~Pv2-4~~ **закрыто** |

---

## A. UX micro-polish (тривиальные правки, ~30 мин каждая)

### Pv2-1 — `fmtNum` precision в DataPeekStats

**Что:** для значений ≥ 1 — 2 знака после точки, для < 1 — 4 знака. Сейчас захардкожено 6 знаков для всех → `100.431813` выглядит шумно.
**Файлы:** `src/components/brief/DataPeekStats.jsx::fmtNum`
**JTBD:** §4
**Severity:** P3
**Estimate:** 5-10 мин (включая тест на edge cases 0/null/Infinity)

### Pv2-2 — ScoringCard детальный checklist

**Что:** раскрываемые блоки с remarks под 4 группами (гипотеза/дизайн/методология/data peek). Данные уже есть в `scorePlan() remarks` — нужно только UI render.
**Файлы:** `src/components/plan/ScoringCard.jsx`
**JTBD:** §5
**Severity:** P2 (полезно для трассируемости «почему такой score»)
**Estimate:** 20-30 мин (раскладка + collapsed state + accent indicator)

### Pv2-3 — MdPreview стилизованный scrollbar

**Что:** `::-webkit-scrollbar` под тёмную тему — узкий, accent-thumb. Сейчас дефолтный браузерный (обычно белый, ломает консистентность тёмной темы).
**Файлы:** `src/components/plan/MdPreview.jsx` + CSS module или Tailwind arbitrary
**JTBD:** §5
**Severity:** P3
**Estimate:** 5-10 мин

### Pv2-6 — Restart button на финальной странице

**Что:** Кнопка «↺ Новый тест» на /step4 после download ZIP, чтобы быстро начать ещё один цикл с чистого листа. Сейчас restart только в Header (легко не заметить когда внизу страницы).
**Файлы:** `src/pages/ValidationReportPage.jsx` (after ExportSection)
**JTBD:** §1 (новая строка)
**Severity:** P2
**Estimate:** 10-15 мин (включая ConfirmDialog reuse)

---

## B. CR concerns из code reviews (улучшения существующего кода)

### Pv2-8 — D-2 midpoint vs реальный point estimate в main_test errorbar

**Что:** Sprint 7 FIX iter 1 Code в `templates/notebook/main_test/*.cells.json` рисует `center = (ci_lower + ci_upper) / 2` для точки на errorbar. Для z_test wald CI это идентично `treatment - control` (Scenario A verify'd: midpoint 0.008666 vs observed 0.008667). Для bootstrap percentile CI может слегка отличаться (asymmetric distribution). Визуально приемлемо, но семантически правильнее — добавить canonical binding `point_estimate = treatment_mean - control_mean` (или `observed`) в каждый main_test cell и использовать как `center`.
**Файлы:** `templates/notebook/main_test/{z_test,t_test,welch,bootstrap}.cells.json` + tests
**Origin:** CR-1 из `code-review-sprint-7-fix.md`
**Severity:** P3 (визуально приемлемо, semantic refinement)
**Estimate:** 20-30 мин

### Pv2-9 — Decision rules parser aliases (lift, Эффект, Δ rel, p value)

**Что:** Текущий парсер ловит только canonical `delta_rel`, `p_value`, `ci_lower/upper` (+ aliases из Sprint 7 FIX iter 2 G-4: рус. границы, bare CI). Не понимает реальные PM-формулировки:
- `Lift ≥ +5% rel.` (lift не в whitelist)
- `Эффект ≥ +5%` (эффект не в whitelist)
- `Δ rel >= 5` (unicode delta не в whitelist)
- `p value < 0.05` (с пробелом)

**Добавить в `normalizeVariable`:**
- `lift|эффект|relative\s+effect|Δ\s*rel` → `delta_rel`
- `p\s*value|p-value|p-значение` → `p_value`

**Файлы:** `src/lib/results/decision-rules.js` + `tests/lib/results/decision-rules.test.js`
**Origin:** CR-1 из `code-review-sprint-7-fix-iter2.md`
**Severity:** P3
**Estimate:** 15-20 мин

### Pv2-10 — Unit conversion `% rel ↔ абс` в decision rules через baseline

**Что:** Правило `CI ≤ −2.5% rel.` сейчас сравнивается с raw `ci_upper` в абсолютных единицах метрики. Для proportion разница невелика (`-2.5%` ≈ `-0.025`), но для continuous пользователь должен сам конвертировать.

**Решение:** добавить canonical binding `control_mean` в каждый main_test cell (для bootstrap уже есть `control.mean()`). В export-cell добавить `'control_mean': float(...)`. В `effective.js` добавить derived `ci_lower_pct_rel = ci_lower / control_mean * 100`. В parser распознать суффикс `% rel` → вместо raw сравнения брать `_pct_rel` версию.

**Файлы:** `templates/notebook/main_test/{z_test,t_test,welch,bootstrap}.cells.json` (+ `control_mean` binding) + `templates/notebook/export.cells.json` (+ field) + `src/lib/results/effective.js` (+ derived fields) + `src/lib/results/decision-rules.js` (+ unit-aware comparison) + tests + ADR-015 amendment.
**Origin:** Sprint 7 FIX iter 2 G-4 documented limitation
**Severity:** P2 (важно для continuous metrics user experience)
**Estimate:** 1-1.5 ч (multi-layer change)

### Pv2-11 — Decision rules: ITERATE «направление positive в 2+ сегментах» как semantic-rule

**Что:** Правило вида `Статистически незначимо, но направление positive в 2+ сегментах — итерируем.` (ITERATE дефолт) — это **semantic rule**, не сравнение. Парсер корректно возвращает `parsed: false`, UI показывает manual checkbox. Но никакой help/explanation что именно нужно проверить.

**Идея:** добавить hint в UI рядом с unparseable rules — «Не распознано как условие — отметь вручную если согласен(а)». **Уже сделано** в Sprint 7 main (DecisionRulesBlock). Расширить hint для конкретных типов unparseable (semantic, multi-variable, narrative).

**Severity:** P3, **возможно skipped** (текущий UX достаточен).
**Estimate:** 10-15 мин если делать.

---

## C. Большие фичи — кандидаты в Sprint 8 (включаю как cross-ref)

### Pv2-7 — NotebookLM «CRO эксперт» integration

**Что:** Внешний knowledge base пользователя на NotebookLM (90 материалов от Kohavi/Evan Miller/CXL/Booking/VWO/Optimizely). Stat·plan = structured flow + механика, NotebookLM = conversational depth + цитаты на источники. Связка покрывает разные user needs одного PM.

**Уровни integration:**
- **Minimum:** footer-link `Methodology questions? Ask CRO Expert →` с явной пометкой "External resource by stat·plan author"
- **Medium:** `?` tooltip в брифе на каждом ключевом понятии (test_method/baseline/MDE/σ/randomization/guardrails) с deep-link в notebook
- **Maximum:** в Methodology странице (Sprint 8) как primary reference resource с inline examples

**Файлы:** `src/components/layout/Footer.jsx` + tooltips в `QuestionRenderer.jsx` + Methodology page (Sprint 8)
**JTBD:** §9 ◆ story (добавлена 2026-05-30)
**Origin:** обсуждение после Sprint 7 RETEST
**Severity:** P2 (важно для positioning продукта — честное «механика + дополнение»)
**Estimate:** Minimum ~20 мин, Medium ~1 ч, Maximum ~2-3 ч (включая content в Methodology)

**Подготовка:** концепт-документ для оформления NotebookLM обложки — `outputs/stat-plan-concept-for-notebooklm.md` (создан в Sprint 7 CLOSE-фазе).

---

## D. Что НЕ в polish-pack v2 (вынесено отдельно)

- **Sprint 8 main:** `/#/methodology` страница со sticky TOC + disclaimer «Что мы НЕ делаем» + a11y/mobile audit. Скоуп в `JTBD.md §9`. Не polish — content sprint.
- **Q07 sensitivity helper** (slider «MDE × duration» trade-off) — JTBD §2 ◆ story из Sprint 2 brainstorm. Полноценная фича, не polish.
- **2 disabled cell templates** (cuped, delta_method full implementation) — JTBD §6 tech debt. Кандидат на mini-content sprint после v1.
- **Demo CSV для ratio + count** — JTBD §6 tech debt. Контентная задача.
- **Mobile responsive для GuardrailsList** — JTBD §8 tech debt из Sprint 2. Кандидат на отдельный mobile UX sprint.

---

## Приоритизация (subjective)

**Если время ограничено — делать Pv2-7 (NotebookLM integration minimum) первым.** Это даёт позиционирование «механика + дополнение» и закрывает важный gap «PM-у нужно где-то углубиться в теорию», которого stat·plan principle says он сам делать не будет.

**Дальше по value/effort:** Pv2-1 (fmtNum, 5 мин) → Pv2-3 (scrollbar, 5 мин) → Pv2-6 (restart на финале, 10 мин) → Pv2-2 (ScoringCard checklist, 20 мин) → Pv2-9 (parser aliases, 15 мин) → Pv2-10 (unit conversion, 1-1.5 ч).

**Низший приоритет:** Pv2-8 (midpoint refinement) и Pv2-11 (semantic-rule hint expansion) — оба косметика над уже работающим кодом.

---

## Estimate total

- **Только tier A (Pv2-1, Pv2-2, Pv2-3, Pv2-6):** ~45-60 мин
- **Tier A + Tier B (исключая Pv2-10):** ~1.5-2 ч
- **Полный polish-pack v2:** ~3-4 ч
- **Combined со Sprint 8 (Methodology + NotebookLM):** ~7-8 ч end-to-end

---

## Related

- `docs/project/JTBD.md` — основной backlog (§2 sensitivity helper, §4 ◆ stories, §5 ScoringCard/MdPreview, §6 disabled templates, §9 Methodology + NotebookLM)
- `docs/project/CONTEXT.md` — Sprint 6+7 timeline с notes откуда какой ◆ пришёл
- `docs/project/code-review-sprint-7-fix.md` — CR-1 (D-2 midpoint)
- `docs/project/code-review-sprint-7-fix-iter2.md` — CR-1 (parser aliases)
- `docs/project/sprint-7-fix-iter2-prompt.md` — G-4 documented limitation про unit conversion
- `docs/project/polish-pack.md` — v1 (закрыт в Sprint 5 main + FIX iter 1)
