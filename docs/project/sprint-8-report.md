# Sprint 8 (Polish v2) — Code-отчёт

> Источник: `docs/project/sprint-8-prompt` (P-1..P-14) ← `polish-pack-v2.md` + `ux-audit-2026-05-31.md`.
> План: `~/.claude/plans/breezy-petting-clover.md` (одобрен через ExitPlanMode).
> Одна фаза. Цель — v1-presentation-ready: убран broken tour, добавлены onboarding-routes, унифицирован UX между шагами, дочищен polish-tail + unit-aware decision rules.

## Trace-ability P-1..P-14

| P | Что | Файлы |
|---|---|---|
| P-1 | Header: удалён tour-toggle + `tourEnabled`/`TOGGLE_TOUR`/case/`TourBodyClass`; добавлены 3 nav (NavLink Туториал/Методология + внешний `<a>` CRO Эксперт); 2 route вне `ProtectedStep`; 2 stub-страницы | `Header.jsx`, `App.jsx`, `reducer.js`, `storage.js`, NEW `pages/{TutorialPage,MethodologyPage}.jsx` |
| P-2 | /step1 H1 «Бриф» + subtitle (стиль = /step4) | `BriefPage.jsx` |
| P-3 | /step3 approval Banner (status/✓) | `NotebookBuilderPage.jsx` |
| P-4 | /step4 sticky StepFooter + ZIP-кнопка (дубль handler) | `ValidationReportPage.jsx` |
| P-5 | NEW `Banner` (status/info) — заменены 4 инлайн-banner'а | NEW `components/layout/Banner.jsx`; `BriefPage`, `PlanPage`, `NotebookBuilderPage`, `ValidationReportPage` |
| P-6 | LoadedBadge `↳ ЗАГРУЖЕН` → `↳ ИЗ ФАЙЛА` + title | `LoadedBadge.jsx` |
| P-7 | /step4 reset → `🗑 ОЧИСТИТЬ ФОРМУ` + ConfirmDialog (form-only scope) | `ValidationReportPage.jsx` |
| P-8 | `fmtNum` адаптивный (2/4 dp) + optional digits override; baseline/userBaseline → адаптивно; exported | `DataPeekStats.jsx` |
| P-9 | MdPreview `md-preview` класс + тёмный scrollbar (webkit + firefox) | `MdPreview.jsx`, `styles/index.css` |
| P-10 | /step4 `↺ НОВЫЙ ТЕСТ` после section 6 + ConfirmDialog + full restart | `ValidationReportPage.jsx` |
| P-11 | **Уже реализовано** (`<details open>` + severity remarks) — verify-only, без изменений | — |
| P-12 | D-2 midpoint → `center = observed_diff` (точечная оценка) | `main_test/{z_test,t_test,welch,bootstrap}.cells.json` |
| P-13 | decision-rules aliases (`lift`/`эффект`/`Δ rel`/`p value`/`relative effect`) | `decision-rules.js` |
| P-14 | unit-aware `% rel`: `control_mean` binding + export-field + derived `ci_*_pct_rel` + unit в parser/evaluate; reports → канонический `effectiveResults` | `main_test/*`, `export.cells.json`, `effective.js`, `decision-rules.js`, `report-html.js`, `readout-md.js`, `DecisionRulesBlock.jsx` |

## Дизайн-решения

**`--color-tour*` токены — оставлены, репурпоз.** Не удалял из `index.css` (спека разрешала Code решать). Внешняя ссылка «↗ CRO Эксперт» использует `text-tour border-tour hover:bg-tour-soft` — синий accent отделяет внешний ресурс от внутренней навигации. Дешевле, чем заводить новый токен; `.tour` CSS-правил в проекте не было (подтверждает broken-contract: тур-класс никогда ничего не стилизовал).

**`Banner` API:** `({type, icon, children, action})`. `type`: `status` (`bg-accent-soft border-accent text-fg`) / `info` (`bg-bg-elev-2 border-border-soft text-fg-dim`). `icon` — строка (✓/ℹ). `action` — правый слот (кнопка/ссылка). `mb-6` встроен. Заменил 4 инлайн-banner'а (BriefPage approved, PlanPage approved+CTA, NotebookBuilderPage P-3, ValidationReportPage disclaimer).

**ScoringCard (P-11):** фактически реализован в прошлом спринте — `GroupRow` уже рендерит `<details open>` с remarks, отфильтрованными по группе, и severity-стилями. Acceptance («раскрывается, цветная severity-маркировка») выполнен. Изменений не вносил (surgical).

**D-2 `observed_diff` per-method:** z_test `float(p_treatment - p_control)`, control_mean `float(p_control)`; t_test/welch `float(diff)` / `float(m_c)`; bootstrap `float(observed)` / `float(control.mean())`. `center = observed_diff` (вместо midpoint CI) — для wald-CI совпадает, для bootstrap-percentile точка визуально точнее при асимметрии.

**fmtNum:** оставил optional `digits`-override (variance/skew/kurt/cv сохранили явную точность), default → адаптивно. Перешёл с `toLocaleString('ru-RU')` (запятая-десятичный) на `toFixed` (точка) — соответствует acceptance `100.43`. Edge `0 → '0.00'` (трактуется как ветка `>=1`), null/Infinity → `—`.

**effectiveResults DRY:** `report-html.js` и `readout-md.js` импортируют канонический `effective.js` (удалены 2 инлайн-дубля) — derived `ci_*_pct_rel` теперь доступны и в отчётах.

## P-14 unit-aware — поведение и edge cases

- **Парсинг:** суффикс `(%\s*rel(?:ative)?|%)?` → `unit = /rel/.test(suffix) ? 'pct_rel' : null`. Голый `%` (без `rel`) → `unit: null` (raw сравнение). Только `% rel`/`% relative` включают конверсию.
- **evaluateRule:** при `unit === 'pct_rel'` И variable ∈ {ci_lower, ci_upper} → читает `${variable}_pct_rel`. Для `delta_rel` + `% rel` — value уже в %, сравнивается raw (конверсия не нужна).
- **derived:** `effective.js` считает `ci_bound / control_mean * 100` при `Number.isFinite(cm) && cm !== 0`.
- **backward-compat:** нет `control_mean` (старый ipynb) → derived undefined → `% rel`-правило на CI → `Number(NaN)` → `evaluateRule` возвращает `null` → manual checkbox fallback (существующее поведение). Покрыто тестом.
- **cm === 0:** derived не считаются (guard) → тот же fallback.
- **bare-`ci` semantic mapping** применяется ТОЛЬКО к bare `ci` (по оператору); явные `ci_lower`/`ci_upper` идут первой веткой `includes()` и не ремапятся — покрыто тестом.

**Семантическое изменение vs FIX iter 2:** ранее `CI ≤ −2.5% rel` сравнивалось с raw `ci_upper`; теперь — с `ci_upper_pct_rel`. Два iter-2 теста обновлены под новый контракт (передают `*_pct_rel` поля).

## ADR-015 amendment — текст для Cowork (CLOSE)

Code не правит `docs/context/decisions-log.md` (Cowork-зона §P-1). Предлагаемый пункт 3 в раздел Amendment ADR-015:

> **3. `control_mean` (added in Sprint 8, P-14).** Optional float в export-dict. Используется для derived `ci_lower_pct_rel` / `ci_upper_pct_rel` в `effective.js`, что позволяет decision rules вида `CI ≤ −2.5% rel.` корректно сравниваться для всех metric_type. Backward-compat: если поле отсутствует — derived undefined, unit-aware сравнение возвращает null (manual fallback). `novelty_flag` уже tri-state (True/False/None) с iter 2.

## Тесты (+19 net; 448 → 467)

| Файл | Δ |
|---|---|
| `tests/lib/storage.test.js` | очищены 2 tourEnabled-ассерта/фикстуры (контракта больше нет) |
| NEW `tests/components/brief/DataPeekStats.test.js` | +5 (адаптив 2/4, 0, null/Infinity, digits-override) |
| NEW `tests/lib/results/effective.test.js` | +4 (derived pct_rel, нет control_mean, cm=0, override) |
| `tests/lib/plan/notebook-builder.test.js` | +2 (observed_diff+control_mean+center в main_test; control_mean в export) |
| `tests/lib/results/decision-rules.test.js` | +8 (P-13 aliases ×5; P-14 unit-aware ×3) + 2 iter-2 обновлены |

```
Test Files  27 passed (27)
     Tests  467 passed (467)
```
В проекте не было unit-тестов на `TOGGLE_TOUR` (только storage-фикстуры). UI (Header, pages, Banner) — без unit-тестов (конвенция).

## Bundle delta

| Артефакт (gzip) | iter 2 | Sprint 8 | Δ |
|---|---|---|---|
| `index-*.js` (initial) | 134.40 KB | 135.61 KB | +1.21 KB |
| `ValidationReportPage-*.js` (lazy) | 5.93 KB | 6.52 KB | +0.59 KB |
| `readout-md-*.js` (lazy) | 5.09 KB | 5.33 KB | +0.24 KB |

Initial +1.21 KB (< +5 KB target): stub-страницы (eager) + Banner + Header nav + decision-rules regex + effective derived. Build чистый, 691 modules. Round-trip 6/6 не задет (YAML не менялся).

## Browser smoke — за пользователем

- Header: 3 nav-link, tour убран; «📖 Туториал»→/tutorial stub; «↗ CRO Эксперт»→новая вкладка NotebookLM (доступны до approval).
- /step1 H1+subtitle; /step2 ScoringCard раскрывается, MdPreview scrollbar тёмный, badge `↳ ИЗ ФАЙЛА`; /step3 approval banner ✓; /step4 info-banner ℹ, `🗑 ОЧИСТИТЬ ФОРМУ`+confirm, sticky footer ZIP, `↺ НОВЫЙ ТЕСТ`+confirm.
- DataPeek continuous: baseline `100.43`.
- decision rules: `Lift ≥ +5%`→delta_rel>=5; `CI ≤ −2.5% rel` для continuous ARPU → через `ci_upper_pct_rel` (не false-positive).
- Регенерация ipynb: main_test содержит `observed_diff`+`control_mean`; export JSON содержит `'control_mean'`.

## Time tracking

- P-1 (Header/routes/stubs/reducer): ~45 мин
- P-2/P-3/P-5 (Banner + page banners): ~35 мин
- P-4/P-7/P-10 (ValidationReportPage): ~30 мин
- P-6/P-8/P-9 (polish): ~20 мин
- P-12/P-13/P-14 (templates+decision-rules+effective): ~50 мин
- Тесты (+19) + build + report: ~40 мин

**Total active: ~3.5 ч** (ниже планового 5-6 ч — P-11 был уже готов, StepFooter/ConfirmDialog переиспользованы as-is).

## Trace-ability summary

Code-зона §P-1: `src/**`, `templates/notebook/**`, `tests/**`, + этот отчёт (исключение §P-1). `docs/context/decisions-log.md` (ADR-015 amendment) — **не трогал**, текст выше для Cowork. Cowork-зона (Tutorial/Methodology финальный контент) — stub'ы ждут инлайна. Без новых npm-deps.
