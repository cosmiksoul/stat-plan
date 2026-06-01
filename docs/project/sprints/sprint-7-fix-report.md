# Sprint 7 FIX iter 1 — Code-отчёт

> Источник прицеливания: `docs/project/sprints/sprint-7-fix-prompt.md` (F-1..F-9) + e2e сценарий A (`docs/project/sprints/e2e-scenarios-sprint-7.md`).
> План: `~/.claude/plans/breezy-petting-clover.md` (одобрен через ExitPlanMode).
> Закрывает 3 функциональных gap'а: ноутбук не рисовал графики · `SIGNIFICANT` терялся при export · NOVELTY был invisible в UI/отчёте.

## Что закрыто

| Gap | ID | Что | Файлы |
|---|---|---|---|
| 1 | F-1 | balance-cell: 2 субплота (размеры групп + средние по метрике), inline-цвета control/treatment, `display(balance)` сохраняет таблицу | `templates/notebook/balance.cells.json` |
| 1 | F-2 | srm-cell: grouped bars observed vs expected(50/50), title с χ²/p. **D-1**: использует фактические `chi2_srm`/`srm_pvalue`/`group_sizes`, не вымышленные `n_ctrl/chi2/p` | `templates/notebook/srm.cells.json` |
| 1 | F-3 | 4× main_test: точечный errorbar-график эффекта. **D-2**: рисует CI **абсолютной** разности `[ci_lower, ci_upper]` вокруг midpoint vs 0; `delta_rel` (в %) — только в title | `templates/notebook/main_test/{z_test,t_test,welch,bootstrap}.cells.json` |
| 1 | F-4 | guardrails-cell: горизонтальный bar chart, breach=`#f87171`/ok=`#a3e635`, маркер ✓/⚠. **D-3**: фильтрует записи с `value is None` | `templates/notebook/guardrails.cells.json` |
| 1 | F-9a | novelty-cell: bar early vs later, early=`#fbbf24` при novelty, title-suffix вердикта | `templates/notebook/novelty.cells.json` |
| 2 | F-5 | export-cell: `results['significant'] = bool(_pv is not None and _pv < _alpha)` после конструкции dict | `templates/notebook/export.cells.json` |
| 2 | F-6 | парсер не трогался — `significant` не в `REQUIRED_FIELDS` (backward-compat), extra-поля проходят. `effective.js` уже спредит все поля (**D-5**) | `src/lib/results/ipynb.js` (без правок кода, +1 тест) |
| 2/3 | F-7/F-9b | ResultsForm: readonly чип significant + readonly novelty-badge; manual-override novelty спрятан в `<details>`. **D-4**: significant — computed-only, без state/reducer/storage | `src/components/results/ResultsForm.jsx` |
| 2/3 | F-8/F-9c | report-html + readout-md: significance + novelty badges первыми в TL;DR; удалён старый novelty-bullet из sanity | `src/lib/results/report-html.js`, `src/lib/results/readout-md.js` |

## Дизайн-решения (адаптации к фактическому коду)

**D-1 (SRM-график).** Спека-сниппет ссылался на `n_ctrl/n_treat/chi2/p`, но `srm.cells.json` после Sprint 7 S10 использует `chi2_srm`, `srm_pvalue`, `group_sizes` (Series). График адаптирован: `observed = [int(group_sizes.get('control',0)), int(group_sizes.get('treatment',0))]`, `expected = [len(df)/2]*2`, title с `chi2_srm`/`srm_pvalue`.

**D-2 (main_test point-plot) — критичный фикс единиц.** Спека-сниппет смешивал единицы: `delta_rel` хранится в **процентах** (`rel_lift*100`), а `ci_lower/ci_upper` — **абсолютные** доли эффекта (например 0.005). Нельзя нарисовать центр в % с errorbar в абсолюте — `(delta_rel - ci_lower)*100` дало бы бессмыслицу. Решение: errorbar строит CI **абсолютного** эффекта `[ci_lower, ci_upper]` вокруг его середины `center = (ci_lower+ci_upper)/2`, `axvline(0)` = «нет эффекта», а `delta_rel` (%) выводится текстом в title. Self-consistent для всех 4 тестов, использует только canonical bindings. 0-crossing визуально = «не значимо».

**D-3 (guardrails None).** `guardrail_results` может содержать `{'value': None, 'status': 'column_missing'/'no_data'}` для отсутствующих колонок — `ax.barh` упал бы. Фильтр `plottable = [g for g in guardrail_results if g.get('value') is not None]`; пустой список → график не рисуется.

**D-4 (significant computed-only).** Выбран Option A из спеки. `significant` НЕ хранится в state — нет правок reducer/storage. Везде (UI, html, md) единый derive: `typeof eff.significant === 'boolean' ? eff.significant : (p_value finite ? p_value < alpha : null)`. Предпочитаем вердикт ноутбука (учёл свою alpha + one/two-sided), fallback на `p < alpha` (`alpha = brief.advanced.alpha ?? 0.05`) для manual flow. `null` → бэйдж скрыт.

**D-5 (effective.js не трогаем).** Хелпер уже `{...raw_results}` спредит все ключи, `significant` проходит автоматически.

**D-6 (палитра).** Inline-цвета (не rcParams cycle): control `#60a5fa`, treatment `#a3e635`, breach/no-effect `#f87171`, expected/neutral `#3a3f47`, novelty-warn `#fbbf24`. Совпадает с `plt.rcParams` preset из load-cell и UI-палитрой. Inline — чтобы control/treatment были стабильны во всех графиках независимо от порядка cycle.

## Edge cases — как обработаны

- **bootstrap CI absolute.** Bootstrap задаёт `ci_lo, ci_hi` как percentile-квантили абсолютной разности (см. `bootstrap.cells.json`) — те же единицы, что D-2 ожидает. График корректен без спецобработки. `if all(v is not None ...)`-guard стоит во всех 4 на случай, если пользователь сломает bindings выше.
- **guardrails `value:None`** — фильтр D-3.
- **manual flow без `significant`/`p_value`** — `sig = null` → significance-чип/бэйдж скрыты во всех трёх местах.
- **novelty cell disabled** — export пишет `novelty_flag = _safe(..., False)` → `false` → бэйдж «✓ Novelty: not detected» (а не скрыт). Скрытие novelty-бэйджа происходит только при `null/undefined` (manual flow, старый ipynb без поля).

## Тесты (+9)

| Файл | +cases | Что |
|---|---|---|
| `tests/lib/plan/notebook-builder.test.js` | +2 | export-cell содержит `results['significant']` + `_pv < _alpha`; ≥4 `plt.show()` и `ax.errorbar` присутствуют |
| `tests/lib/results/ipynb.test.js` | +1 | ipynb с `significant: true` парсится, поле доступно, без warnings (не required) |
| `tests/lib/results/report-html.test.js` | +4 | sig→`significance-badge ok`; p≥α→`warn`; novelty true→`novelty-badge warn`; novelty absent→нет `class="novelty-badge` |
| `tests/lib/results/readout-md.test.js` | +2 | bold significance-строка в TL;DR; bold novelty-строка при `novelty_flag=true` |

**Заметка по тесту:** негативный novelty-assert проверяет `class="novelty-badge` (не голое `novelty-badge`), т.к. CSS-блок всегда определяет класс `.novelty-badge` — голый regex ловил бы стиль, а не рендер. Поймано при первом прогоне (1 fail → fix).

```
Test Files  25 passed (25)
     Tests  431 passed (431)
  Duration  ~20s
```

Прирост vs Sprint 7 main: **+9** (422 → 431). UI (ResultsForm) — без unit-тестов (конвенция проекта).

## Bundle delta

| Артефакт | Sprint 7 main (gzip) | После FIX (gzip) | Δ |
|---|---|---|---|
| `index-*.js` (initial) | 132.54 KB | 134.29 KB | +1.75 KB |
| `ValidationReportPage-*.js` (lazy) | 5.55 KB | 5.81 KB | +0.26 KB |
| `readout-md-*.js` (lazy) | ~4.7 KB | 4.73 KB | ≈0 |
| `ipynb-*.js` (lazy) | 1.16 KB | 1.16 KB | 0 |

Initial +1.75 KB gzip — это matplotlib-код в `*.cells.json`, импортируемых `notebook-builder.js` (часть конструктора Шага 3, в initial chunk). Чуть выше планового «≈0», но объяснимо: добавили ~120 строк Python-строк в шаблоны. Round-trip 6/6 не задет (YAML-сериализация плана не менялась). Build чистый, 688 modules.

## Round-trip status

Правки только в `*.cells.json` (тело ячеек ноутбука) и в results-генераторах — YAML test_plan.md (ADR-002) не трогался. `tests/lib/plan/round-trip.test.js` зелёный без изменений.

## ADR соответствие

- **ADR-015** — export-контракт расширен **опциональным** `significant` (не в `REQUIRED_FIELDS`, старые ipynb парсятся без warnings). Требует апдейта DATA_MODEL.md / ADR-015 на стороне Cowork (CLOSE).
- **ADR-014** — графики только статический matplotlib PNG из ноутбука; recharts на /step4 не вводили.
- **ADR-004** — significant/novelty = вердикты данных, не решение тула; поле «Принятое решение» в readout остаётся пустым (`_To be filled manually._`).

## Browser smoke — за пользователем

1. Бриф → конструктор → скачать ipynb → проверить, что в balance/srm/main_test/guardrails/novelty есть `plt.show()`.
2. Выполнить ноутбук в Colab на `e2e_a_first_deposit.csv` → каждая code-cell после расчёта даёт PNG output.
3. Drag-drop выполненного ipynb на /step4 → gallery содержит **4-6 PNG**.
4. ResultsForm: readonly чип `✅ Statistically significant (p=…)` сверху + readonly novelty-badge `✓/⚠`; override спрятан в `<details>override</details>`.
5. `report.html` → графики inline (`data:image/png`), significance + novelty badges **первыми** в TL;DR.
6. `readout.md` → **bold** significance + novelty строки в начале TL;DR; YAML frontmatter `decision: ""` пустой.
7. Regression: manual flow (без ipynb / без `significant`) → чип significant виден если введён p-value < α, иначе скрыт; novelty-badge «N/A».

## Time tracking

- Часть A (5 файлов графиков + адаптации D-1/D-2/D-3): ~40 мин
- Часть B (export-cell significant): ~5 мин
- Часть C (ResultsForm badges + details override): ~15 мин
- Часть D (html + md badges, удаление старых bullet'ов): ~15 мин
- Часть E (9 тестов) + test/build/fix + отчёт: ~25 мин

**Total active: ~1.5 ч** (в нижней половине планового 1.5-2 ч).

## Trace-ability summary

Все правки в Code-зоне per CLAUDE.md §P-1:
- `templates/notebook/**` — тело ячеек генератора (application templates)
- `src/**` — application code (ResultsForm, report-html, readout-md)
- `tests/**` — unit-тесты
- `docs/project/sprints/sprint-7-fix-report.md` — этот файл (исключение Code-зоны по §P-1)

Cowork-зона (`docs/**` кроме отчёта, `CLAUDE.md`) не трогалась. Новых npm-зависимостей нет.
