# Polish-pack v2 — **CLOSED 2026-06-01** (Sprint 8)

> **Status:** ЗАКРЫТ. Все 18 items (Pv2-1..Pv2-18) реализованы в Sprint 8 (main + FIX iter 1 + FIX iter 2). Этот документ остаётся для исторической справки + Sprint 9 backlog (Pv9 sections в конце).
>
> Изначально (2026-05-31): накопленные ◆ stories + CR concerns после Sprint 6 RETEST + Sprint 7 main/FIX iter 1/FIX iter 2 RETEST + UX audit 2026-05-31. Решение — объединить в один полноценный Sprint 8 (spec: `docs/project/sprint-8-prompt.md`).
>
> **Реальная имплементация:**
> - Sprint 8 main (P-1..P-14): Pv2-1, 2, 3, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18 (15 items)
> - Sprint 8 FIX iter 1 (F-1..F-6): UX audit правки 2-го раунда — добавлены поверх (logo clickable, AI-компаньон rename, /docs structure restructure, amber accent, footer pattern)
> - Sprint 8 FIX iter 2 (F-7..F-9): smoke retest правки 3-го раунда — segments rename, missed download button, ScoringCard chevron (Pv2-11 review-miss закрыт)
>
> Sprint 9 backlog — в секции C ниже (Pv9-NEW, Pv9-NEW-2 + tutorial/methodology content).

**Дата:** 2026-05-31 (составлено в Sprint 7 CLOSE)

---

## Origin tracking

| Источник | Дата | Кол-во items |
|---|---|---|
| Sprint 6 RETEST 2026-05-29 | 3 ◆ stories | Pv2-1, Pv2-2, Pv2-3 |
| Sprint 7 PLAN (после ADR-015 pivot) | 1 ◆ story | Pv2-6 (restart на финале) |
| Sprint 7 main/FIX RETEST 2026-05-30..31 | 1 ◆ story + 4 CR concerns | Pv2-7 (NotebookLM) + Pv2-8..Pv2-11 |
| **UX audit 2026-05-31** (`ux-audit-2026-05-31.md`) | **7 items** | Pv2-12..18 (tour remove + 2 onboarding links + H1 на Шаге 1 + Шаг 3 banner + Шаг 4 sticky footer + rename badges + reset confusion + banner styling) |
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

## C. Большие фичи — кандидаты в Sprint 9 (cross-ref для Methodology content)

### Pv9-NEW-3 — /step3 H1 + subtitle inconsistency

**Что:** Sprint 8 P-2 добавил H1 «Бриф» + subtitle на /step1; /step2 имеет H1 «Тест-план» + subtitle; /step4 имеет H1 «Валидация и отчёт» + subtitle. **/step3 — без H1 + subtitle**, начинается сразу с карточки «Конструктор ноутбука». Layout inconsistency.

**Решение:** добавить H1 «Конструктор» + subtitle (например: «Выбери ячейки анализа, посмотри ожидаемую схему данных, скачай готовый Jupyter-ноутбук под свой тест-план»). Стиль = /step1/2/4.

**Файлы:** `src/pages/NotebookBuilderPage.jsx`
**Origin:** browser smoke 2026-06-01 после Sprint 8 CLOSE — user заметил при финальном sweep что /step3 выбивается из ритма.
**Severity:** P2 (UX consistency)
**Estimate:** ~10 мин

---

### Pv9-NEW-4 — StartScreen тексты

**Что:** Тексты на стартовом экране требуют редактуры (точный список — на этапе Sprint 9 PLAN, user даст).

**Файлы:** `src/pages/StartScreen.jsx`
**Origin:** user feedback 2026-06-01 после Sprint 8 CLOSE.
**Severity:** P2 (content polish)
**Estimate:** ~15-20 мин (зависит от объёма правок)

---

### Pv9-NEW-2 — Explicit segment dropdown на /step3

**Что:** Сегментный анализ cell сейчас (после Sprint 8 FIX iter 2) принимает любую категориальную колонку через editable expected schema. Но user должен **сам додуматься** переименовать `geo` → `device_type` в schema table. Это не очевидно.

**Решение:** добавить рядом с checkbox «Сегментный анализ» на /step3 dropdown «По какому полю сегментировать?» с common-опциями:
- geo (default)
- device
- country
- plan / subscription_tier
- CRM segment (кит / whale / VIP)
- **Other...** → text input

Изменение записывается в `state.notebook_config.segment_column`. Editable schema автоматически синхронизируется (placeholder читает это значение).

**Файлы:** `src/components/notebook/CellsList.jsx` или `SegmentsConfig.jsx` (новый компонент) + reducer action + sync с notebook-builder placeholder.

**Origin:** Sprint 8 FIX iter 1 browser smoke 2026-05-31 — user заметил «геo хардкод» + обсуждение 3 вариантов решения. Sprint 8 FIX iter 2 закрыл minimum (rename labels), B-вариант остался для будущего.
**Severity:** P3 (полноценная feature)
**Estimate:** ~45-60 мин

---

### Pv9-NEW — NotebookLM кастомный MindMap (внешний content, не код)

**Что:** NotebookLM имеет фичу MindMap customization. Можем составить кастомный mindmap по основным терминам методологии stat·plan: test_method, MDE, sample size, SRM, novelty, guardrails, decision rules. Связки между терминами + цитаты на источники (Kohavi, Evan Miller, CXL, Booking).

**Зачем:** дополняет conversational Q&A визуальной навигацией. PM сначала смотрит карту терминов → видит связи → углубляется в конкретный термин через чат.

**Где живёт:** внешний ресурс NotebookLM (не код stat·plan). Связан через `↗ CRO Эксперт` ссылку в Header (Sprint 8 P-1).

**Также finalize в Sprint 9 (одним подходом — оформление NotebookLM обложки):**
- Обложка notebook с stat·plan branding (черновик `outputs/stat-plan-concept-for-notebooklm.md`)
- Audio Overview / Slide Deck / Video Overview (studio артефакты NotebookLM)
- MindMap кастомизация по терминам методологии

**Origin:** идея 2026-05-31 от пользователя после Sprint 8 DEV (увидел плашку «Try new Mind Map customizations!» в NotebookLM).
**Severity:** P3 content polish
**Estimate:** ~1-1.5 ч (вне code base) — content + curation. Параллельно с Sprint 9 Methodology page.

### Pv2-7 — NotebookLM «CRO эксперт» — сквозная ссылка в Header

**Что:** Внешний knowledge base пользователя на NotebookLM (90 материалов от Kohavi/Evan Miller/CXL/Booking/VWO/Optimizely). Stat·plan = structured flow + механика, NotebookLM = conversational depth + цитаты на источники.

**Решение пользователя 2026-05-31:** не tooltips на ключевых понятиях (over-engineered), а **одна сквозная ссылка в Header**, видимая на всех 4 шагах. Объединяется с Pv2-12 в единую navigation group справа в Header.

**URL:** `https://notebooklm.google.com/notebook/040498fe-3843-4562-a854-863d2101a0d8`

**Визуальная иерархия в Header (после Pv2-12 + Pv2-7):**

```
[stat·plan logo]    [📖 Туториал] [📘 Методология] [↗ CRO Эксперт]    [↺ Начать сначала]
   left                       center (3 nav links)                       right (utility)
```

- **Tutorial / Methodology** — internal routes, neutral text (например `text-fg-faint hover:text-fg`)
- **CRO Эксперт** — external link с `↗` иконкой (universal external link convention) + `target="_blank" rel="noopener"` + tooltip `Внешний AI-ассистент по A/B методологии (NotebookLM)`. Можно accent цветом для emphasis (показать что это знаниевый ресурс), или такой же neutral как остальные.
- **Начать сначала** — как сейчас, utility border button

**Файлы:** `src/components/Header.jsx` (3 link добавить — combined с Pv2-12 ниже)
**JTBD:** §9 ◆ story
**Origin:** обсуждение 2026-05-30 + finalize 2026-05-31
**Severity:** P2
**Estimate:** ~10 мин (часть Pv2-12 Header rewrite)

**Подготовка:** концепт-документ для оформления NotebookLM обложки — `outputs/stat-plan-concept-for-notebooklm.md` (создан в Sprint 7 CLOSE-фазе).

---

## E. UX audit items (Pv2-12..18 — добавлены 2026-05-31)

Источник: `docs/project/ux-audit-2026-05-31.md`. Анализ 4 скриншотов всех шагов после Sprint 7 CLOSE + грeп функции тура.

### Pv2-12 — Header rewrite: убрать broken tour + 3 navigation link (Tutorial / Methodology / CRO Эксперт)

**Что:** Полный rewrite правой части Header'а. Удалить broken tour toggle + state + class + tokens. Добавить 3 navigation link:
- `📖 Туториал` → `/tutorial` (internal, NavLink)
- `📘 Методология` → `/methodology` (internal, NavLink)
- `↗ CRO Эксперт` → `https://notebooklm.google.com/notebook/040498fe-3843-4562-a854-863d2101a0d8` (external, `target="_blank"`)

Combined с Pv2-7 (NotebookLM сквозная ссылка).

Удалить также `state.tourEnabled`, `Actions.TOGGLE_TOUR`, `document.body.classList.toggle('tour')`, color tokens `--color-tour*`. Это **продуктовое решение пользователя 2026-05-31:** «Уберём её. Вместо неё будет два онбординг раздела. Методология и туториал. В туториал закинем тестовые e2e сценарии — подредактируем до полноценного туториала».

**Tutorial content:** переработать `docs/project/e2e-scenarios-sprint-7.md` (Scenario A proportion + B continuous + C ratio) в user-facing walkthrough. CSV-файлы (`e2e_a_*.csv`, `e2e_b_*.csv`, `e2e_c_*.csv`) дать как downloadable demo data в туториале.

**Methodology content:** Sprint 9 main (отдельный sprint, в этом Sprint 8 — только route stub).

**Файлы:**
- Remove: `Header.jsx` (tour button block) + `App.jsx` (tour classList toggle) + `reducer.js` (tourEnabled + TOGGLE_TOUR) + `styles/index.css` (tour color tokens) + `storage.js` line 13 comment
- Add: `Header.jsx` (3 nav link — 2 internal NavLink + 1 external anchor) + `App.jsx` routes `/tutorial` `/methodology` + новые pages `TutorialPage.jsx` (stub «Туториал готовится» + cross-ref на e2e-scenarios) + `MethodologyPage.jsx` (stub «Sprint 9 content»)
- Tests: `reducer.test.js` удалить TOGGLE_TOUR case

**Tutorial content (отдельным content task в этом же sprint'е):** переработать `docs/project/e2e-scenarios-sprint-7.md` (Scenario A proportion + B continuous + C ratio) в user-facing walkthrough на `TutorialPage.jsx`. CSV-файлы (`e2e_a_first_deposit.csv`, `e2e_b_arpu.csv`, `e2e_c_partner_ctr.csv`) дать как downloadable demo data. Это **content rewrite** — не код, а текст + примеры.

**Methodology content:** оставить заглушку «Раздел готовится в Sprint 9». Content — Sprint 9 main.

**Origin:** UX audit A (broken contract P1) + user decision 2026-05-31 + Pv2-7 NotebookLM combined
**Severity:** P1
**Estimate:**
- Header rewrite + 2 stub pages + route setup + tests: ~45 мин
- Tutorial content rewrite (e2e → user-facing): ~1.5 ч (text-heavy task, Cowork может помочь подготовить контент)
- **Total Pv2-12 в polish v2:** ~2-2.5 ч

### Pv2-13 — Шаг 1: добавить H1 «Бриф» с subtitle

**Что:** На /step1 нет H1 + subtitle (выбивается из ритма шагов 2/3/4). Добавить, например: `# Бриф` / `«Опиши тест в 10 вопросах — sample size и план посчитаются автоматически.»`. Position: над progress bar (или вместо него — progress bar становится частью header'а).
**Файлы:** `src/pages/BriefPage.jsx`
**Origin:** UX audit B.1
**Severity:** P1
**Estimate:** 10-15 мин

### Pv2-14 — Шаг 3: добавить banner с approval status

**Что:** Симметрия с Шагом 2 (там есть accent green banner «План утверждён. Бриф переключён в режим только-чтения...»). На Шаге 3 такого banner'а нет — пользователь после bookmark navigation не видит approval context. Добавить аналогичный banner: «План утверждён. Конструируешь ноутбук на основе финального плана. Хочешь поменять — верни план в черновик на Шаге 2 →».
**Файлы:** `src/pages/NotebookBuilderPage.jsx`
**Origin:** UX audit B.3
**Severity:** P1
**Estimate:** 15 мин

### Pv2-15 — Шаг 4: sticky bottom footer с primary action

**Что:** На /step4 нет footer'а (рамка страницы исчезает). Добавить sticky bottom bar с primary `↓ СКАЧАТЬ ВСЁ (.zip)`, дублирующий section 6 button. Симметрия с шагами 1-3, плюс UX: после правки результатов в section 2 не надо скроллить вниз до section 6.
**Файлы:** `src/pages/ValidationReportPage.jsx` + `src/components/layout/StepFooter.jsx` reuse
**Origin:** UX audit B.4
**Severity:** P1
**Estimate:** 15-20 мин

### Pv2-16 — Rename `↳ ЗАГРУЖЕН` → `↳ ИЗ ФАЙЛА`

**Что:** Семантика badge неочевидна — `ЗАГРУЖЕН` можно прочесть как «загружен в систему» (что always true). `↳ ИЗ ФАЙЛА` — explicit что план пришёл из upload, а не из брифа.
**Файлы:** `src/components/plan/LoadedBadge.jsx` (или эквивалент)
**Origin:** UX audit B.2
**Severity:** P2
**Estimate:** 5 мин

### Pv2-17 — Шаг 4: разделить «Сбросить результаты» и «Начать сначала»

**Что:** Одна иконка ↺ для двух разных reset (global vs local) — confusing. Изменить на /step4: `↺ Сбросить результаты` → `✕ Очистить форму` (или `🗑 Reset upload`) + ConfirmDialog с явным scope «Удалить только результаты Шага 4? Бриф и план останутся».
**Файлы:** `src/pages/ValidationReportPage.jsx` + ConfirmDialog reuse
**Origin:** UX audit B.5
**Severity:** P2
**Estimate:** 15-20 мин

### Pv2-18 — Banner styling: разделить status (✓) и info (ℹ)

**Что:** Сейчас на Шагах 1, 2 banner с accent border = «status info» (план утверждён), на Шаге 4 banner с тем же стилем = «info description» (что делает страница). Разные роли, одинаковый вид. Разделить иконкой: status banner с ✓ icon (accent green), info banner с ℹ icon (нейтральный border-soft).
**Файлы:** `src/components/layout/Banner.jsx` (или inline в pages — Code сам решает выносить ли в компонент)
**Origin:** UX audit B.6 (B.3 в audit)
**Severity:** P2
**Estimate:** 10-15 мин

---

## D. Что НЕ в polish-pack v2 (вынесено отдельно)

- **Sprint 9 main:** `/#/methodology` страница со sticky TOC + disclaimer «Что мы НЕ делаем» + a11y/mobile audit. Скоуп в `JTBD.md §9`. Не polish — content sprint.
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

## Estimate total (обновлено после UX audit)

- **Tier A (UX micro Pv2-1, Pv2-3, Pv2-6, Pv2-16):** ~30 мин
- **Tier B (layout consistency Pv2-13, Pv2-14, Pv2-15):** ~45 мин
- **Tier C (architecture Pv2-12 tour remove + 2 stub link/route):** ~30 мин
- **Tier D (features Pv2-2, Pv2-7, Pv2-8, Pv2-9, Pv2-17, Pv2-18):** ~1.5-2 ч
- **Tier E (big feature Pv2-10 unit conversion):** ~1-1.5 ч
- **Полный polish-pack v2 (включая Pv2-12..18 из UX audit):** **~4-5 ч active**
- **Combined со Sprint 9** (Methodology main + a11y/mobile audit + при необходимости tutorial deeper rewrite): **~10-11 ч end-to-end** до v1

**Размер итогового sprint'а** уже сопоставим с Sprint 6 (~8-9 ч end-to-end). Это **больше не «mini-sprint»** — полноценный.

---

## Related

- `docs/project/JTBD.md` — основной backlog (§2 sensitivity helper, §4 ◆ stories, §5 ScoringCard/MdPreview, §6 disabled templates, §9 Methodology + NotebookLM)
- `docs/project/CONTEXT.md` — Sprint 6+7 timeline с notes откуда какой ◆ пришёл
- `docs/project/code-review-sprint-7-fix.md` — CR-1 (D-2 midpoint)
- `docs/project/code-review-sprint-7-fix-iter2.md` — CR-1 (parser aliases)
- `docs/project/sprint-7-fix-iter2-prompt.md` — G-4 documented limitation про unit conversion
- `docs/project/polish-pack.md` — v1 (закрыт в Sprint 5 main + FIX iter 1)
