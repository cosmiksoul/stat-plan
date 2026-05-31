# Sprint 7 FIX iter 1 — matplotlib графики в шаблонах + `significant` flag в export + NOVELTY visible

**Type:** Code FIX (одна фаза, фокусированная)
**Estimated:** ~2-2.5 ч active
**Источник:** QA сценария A пользователем 2026-05-30 (e2e-scenarios-sprint-7.md). Три функциональных gap'а обнаружены при первом полном e2e flow.

---

## Overview

Sprint 7 main закрылся качественно по структуре (422 теста, round-trip 6/6, ipynb upload работает, HTML отчёт self-contained). Но при первом e2e тесте на сценарии A (proportion SHIP) пользователь обнаружил **3 функциональных gap**'а, без которых главный value loop «ноутбук → красивый презентационный отчёт» не закрывается:

**Gap 1 — Ноутбук не генерирует графики.** В сгенерированном `analysis.ipynb` 13 ячеек, но **только load-cell** содержит `plt.*` (там `plt.rcParams` styling preset от Sprint 7 S10). Ни balance/SRM/main_test/guardrails не вызывают `plt.show()`. **Я в Sprint 7 prompt писал «matplotlib PNG из ноутбука встроятся в HTML отчёт» — но сами `plt.plot(...)` calls в шаблоны ячеек не добавил.** Code добавил только styling preset. Результат: пустая galleryсекция в /step4, HTML отчёт без графиков, плохо для presentation.

**Gap 2 — `SIGNIFICANT` теряется при export.** В Z-test cell делается `print('SIGNIFICANT' if p < alpha else 'not significant')` — но **только в stdout**, не в `results` dict для export-cell. На /step4 UI не выделяет «✅ Statistically significant (p=0.026)» в TL;DR — derived есть, но **явной подсветки нет**.

**Gap 3 — NOVELTY half-baked.** Cell `novelty.cells.json` работает (печатает `NOVELTY suspected`), `novelty_flag` идёт в export-cell. Но в /step4 ResultsForm — просто **немаркированный чекбокс** «NOVELTY?» без контекста (откуда, что значит, какое default). Если ноутбук посчитал `false` (нет novelty) — в UI остаётся пустой unchecked и в HTML отчёте нет ни слова. Если посчитал `true` — есть строка в TL;DR, но в UI она не подсвечена. Пользователь видит контрол, не понимая откуда он. Архитектурно фича есть, UX-wise — invisible.

**Цель FIX iter 1:** закрыть все 3 gap'а так, чтобы первый же сценарий A → drag-drop ноутбука → HTML отчёт давал **4-6 графиков inline + явный verdict «SHIP — statistically significant» + явный verdict «novelty: ✓ не замечен / ⚠ suspected»**.

---

## Scope (F-1..F-9)

### F-1. Графики в `balance.cells.json`

В `templates/notebook/balance.cells.json` после текущего расчёта `balance` DataFrame — добавить визуализацию:

```python
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 2, figsize=(10, 4))

# Bar 1: размеры групп
axes[0].bar(balance.index, balance['n'], color=['#60a5fa', '#a3e635'])
axes[0].set_title('Размер групп (counts)')
axes[0].set_ylabel('n')
for i, v in enumerate(balance['n']):
    axes[0].text(i, v, f' {int(v):,}', va='bottom', ha='center')

# Bar 2: средние / доли метрики
axes[1].bar(balance.index, balance[metric_col], color=['#60a5fa', '#a3e635'])
axes[1].set_title(f'Среднее по группам: {metric_col}')
axes[1].set_ylabel(metric_col)
for i, v in enumerate(balance[metric_col]):
    axes[1].text(i, v, f' {v:.4f}', va='bottom', ha='center')

plt.tight_layout()
plt.show()
```

**Палитра под stat·plan UI:** `#60a5fa` (control, синий), `#a3e635` (treatment, accent зелёный) — те же что в `plt.rcParams.prop_cycle` из load-cell. Цвета **inline** (не через rcParams cycle), чтобы control/treatment были стабильно одинаковыми во всех графиках.

### F-2. График в `srm.cells.json`

После расчёта `chi2, p` — добавить:

```python
import matplotlib.pyplot as plt

observed = [n_ctrl, n_treat]
expected = [(n_ctrl + n_treat) / 2] * 2
labels = ['control', 'treatment']
x = range(len(labels))
width = 0.35

fig, ax = plt.subplots(figsize=(7, 4))
ax.bar([i - width/2 for i in x], observed, width, label='Observed', color='#a3e635')
ax.bar([i + width/2 for i in x], expected, width, label='Expected (50/50)', color='#3a3f47')
ax.set_xticks(list(x))
ax.set_xticklabels(labels)
ax.set_ylabel('n')
ax.set_title(f'SRM check: observed vs expected (χ²={chi2:.2f}, p={p:.4f})')
ax.legend()
plt.tight_layout()
plt.show()
```

Если `n_ctrl/n_treat` существуют как переменные в SRM cell — использовать их. Если нет — посчитать как `df[df.variant=='control'].shape[0]` etc.

### F-3. Графики в 4 main_test шаблонах

Точечный plot Δ с CI vs 0 — стандарт A/B-отчёта. **Один и тот же patternsвo всех 4** main_test variants (z_test, t_test, welch, bootstrap):

```python
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(8, 3))
ax.errorbar(
    [delta_rel * 100],  # x = effect %
    [0],                # y = 0 (one row)
    xerr=[[(delta_rel - ci_lower) * 100], [(ci_upper - delta_rel) * 100]],
    fmt='o', color='#a3e635', ecolor='#a3e635', capsize=10, markersize=12,
)
ax.axvline(0, color='#f87171', linestyle='--', linewidth=1, alpha=0.7, label='No effect')
ax.set_yticks([])
ax.set_xlabel('Relative effect (%)')
ax.set_title(f'Δ = {delta_rel*100:+.2f}% CI 95% [{ci_lower*100:+.2f}%, {ci_upper*100:+.2f}%], p = {p_value:.4f}')
ax.legend(loc='upper right', frameon=False)
plt.tight_layout()
plt.show()
```

**Где брать переменные:** все 4 main_test cells уже устанавливают canonical bindings (`delta_rel`, `ci_lower`, `ci_upper`, `p_value`) после Sprint 7 main. График добавляется **после** этих bindings — в конце cell перед closing.

**Если переменная отсутствует** (например bootstrap не считает классический CI) — wrap в try/except или if-check, чтобы cell не падала.

### F-4. График в `guardrails.cells.json`

После сбора `guardrail_results` массива — добавить bar chart:

```python
import matplotlib.pyplot as plt

if guardrail_results:
    names = [g['name'] for g in guardrail_results]
    values = [g['value'] for g in guardrail_results]
    breached = [g['breached'] for g in guardrail_results]
    colors = ['#f87171' if b else '#a3e635' for b in breached]

    fig, ax = plt.subplots(figsize=(7, max(2, len(names) * 0.6)))
    bars = ax.barh(names, values, color=colors)
    ax.set_xlabel('value')
    ax.set_title('Guardrails (✓ ok / ⚠ breached)')
    for bar, breached_flag, val in zip(bars, breached, values):
        marker = '⚠' if breached_flag else '✓'
        ax.text(val, bar.get_y() + bar.get_height()/2, f' {marker} {val:.3f}',
                va='center', ha='left')
    plt.tight_layout()
    plt.show()
```

Если `guardrail_results == []` — graph не рендерится (пользователь не задавал guardrails в брифе).

### F-5. `export.cells.json` — добавить `significant`

В `templates/notebook/export.cells.json` в `results` dict добавить ключ:

```python
results = {
    ...existing fields...,
    'significant': _safe(globals().get('p_value')) is not None and _safe(globals().get('p_value')) < _safe(globals().get('alpha'), 0.05),
}
```

Или проще через if/else:

```python
_pv = _safe(globals().get('p_value'))
_alpha = _safe(globals().get('alpha'), 0.05)
results['significant'] = bool(_pv is not None and _pv < _alpha)
```

(добавить **после** конструкции results dict, перед `print(json.dumps(...))`.)

**Tests:** `tests/lib/plan/notebook-builder.test.js` (+1 case): export-cell содержит `'significant'` ключ.

### F-6. `src/lib/results/ipynb.js` — поддержать `significant`

В парсере `parseIpynb`:
- `REQUIRED_FIELDS` остаются как есть (significant НЕ обязательное — backward-compat для ipynb без него).
- В `validateResultsShape` — никаких изменений (любые extra fields из JSON корректно проходят через mapping).

В `effective.js` (если есть какой-то merge layer) — гарантировать что `significant` есть в `effective` результате.

**Tests:** `tests/lib/results/ipynb.test.js` (+1 case): ipynb с `significant: true` в JSON parses correctly.

### F-7. `src/state/reducer.js` initialResults + `ResultsForm.jsx`

`initialResults.user_overrides.significant` — добавить (default `null` = не задано). `ResultsForm.jsx` — добавить checkbox / readonly badge:

**Option A (рекомендую):** `significant` — **computed-only field в UI** (не editable):
- В ResultsForm показывать как readonly чип: `effective.significant ? '✅ Statistically significant' : '⚠ Not significant'`
- Computed как: `effective.p_value != null && effective.p_value < (state.plan?.brief?.advanced?.alpha ?? 0.05)`
- Это **не требует** хранить в state — derive on-the-fly.

**Option B:** добавить как user override (checkbox).

Code решает. Для simpicity и avoid duplicate of truth — option A лучше.

**Tests:** UI без unit tests (конвенция).

### F-8. `report-html.js` + `readout-md.js` — TL;DR с явной подсветкой

В обоих генераторах в начало TL;DR-секции добавить badge / строку:

**HTML:**
```html
<div class="significance-badge {significant ? 'ok' : 'warn'}">
  {significant ? '✅ Statistically significant' : '⚠ Not statistically significant'} (p = {p_value.toFixed(4)}, α = {alpha})
</div>
```

CSS добавить inline:
```css
.significance-badge.ok { background: #1a3a1a; color: #a3e635; padding: 8px 12px; border-radius: 4px; }
.significance-badge.warn { background: #3a2a1a; color: #fbbf24; padding: 8px 12px; border-radius: 4px; }
```

**Markdown:**
```markdown
**{significant ? '✅ Statistically significant' : '⚠ Not statistically significant'}** (p = {p_value}, α = {alpha})
```

Должно быть **первым визуальным элементом** TL;DR — чтобы открывая отчёт, стейкхолдер сразу видел «SIGNIFICANT» / «not significant».

**Tests:** `tests/lib/results/report-html.test.js` (+2 case: significant=true → badge ok class; significant=false → badge warn class). `readout-md.test.js` (+1 case).

### F-9. NOVELTY — visible badge как у significant

**Цель:** сделать NOVELTY такой же first-class в UI/HTML/MD как SIGNIFICANT — пользователь должен видеть verdict независимо от значения (true/false/null).

#### F-9a. График в `novelty.cells.json`

В `templates/notebook/novelty.cells.json` после расчёта `lift_early`, `lift_later` — добавить bar chart:

```python
import matplotlib.pyplot as plt

if lift_early is not None and lift_later is not None:
    fig, ax = plt.subplots(figsize=(7, 4))
    labels = ['Дни 1-2 (early)', 'Дни 3+ (later)']
    values = [lift_early * 100, lift_later * 100]
    colors = ['#fbbf24' if novelty_flag else '#a3e635', '#a3e635']
    bars = ax.bar(labels, values, color=colors)
    ax.axhline(0, color='#3a3f47', linewidth=0.8)
    ax.set_ylabel('Relative lift (%)')
    title_suffix = '⚠ NOVELTY suspected' if novelty_flag else '✓ no novelty effect'
    ax.set_title(f'Lift early vs later — {title_suffix}')
    for bar, v in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width()/2, v, f' {v:+.2f}%', va='bottom' if v >= 0 else 'top', ha='center')
    plt.tight_layout()
    plt.show()
```

Если одна из переменных None (нет day-колонки или нет данных по early/later) — график не рисуется (`if` сверху skip).

#### F-9b. `ResultsForm.jsx` — заменить чекбокс на readonly badge + manual override

**Current:** строка 70-79 — чекбокс «NOVELTY?» с подписью «эффект новизны замечен» без контекста.

**New:**
- Если `effective.novelty_flag != null` (значение пришло из ipynb или вручную) → показывать **readonly badge** «✓ Novelty: not detected» (green) или «⚠ Novelty: suspected» (yellow).
- Над badge подпись `mono-label` `NOVELTY (из ноутбука)` или `NOVELTY (manual)` в зависимости от источника.
- Manual override — оставить, но не как primary control. Перенести в expandable секцию «Manual override» внизу формы (как и для других user_overrides) — отдельная задача, в этом FIX **не** делаем expandable секцию, оставляем checkbox **рядом с badge** но мелким `<details>` блоком: `<details><summary class="text-xs text-fg-dim">override</summary><input checkbox /></details>`.

Tailwind palette: green badge — `bg-green-900/30 text-green-400`; yellow — `bg-yellow-900/30 text-yellow-400`; neutral («N/A» если совсем нет данных) — `bg-bg-elev2 text-fg-dim`.

#### F-9c. `report-html.js` + `readout-md.js` — TL;DR строка для novelty

**HTML:** после significance badge (из F-8) — добавить вторую строку:

```html
<div class="novelty-badge {novelty_flag ? 'warn' : 'ok'}">
  {novelty_flag ? '⚠ Novelty effect suspected' : '✓ No novelty effect detected'}
</div>
```

Показывать **всегда** если `novelty_flag != null` (т.е. данные были посчитаны). Если null (cell skipped из-за duration<3 или missing day column) — скрывать.

CSS:
```css
.novelty-badge.ok { background: #1a3a1a; color: #a3e635; padding: 8px 12px; border-radius: 4px; margin-top: 4px; }
.novelty-badge.warn { background: #3a2a1a; color: #fbbf24; padding: 8px 12px; border-radius: 4px; margin-top: 4px; }
```

**Markdown:** аналогичная вторая строка после significance:

```markdown
**{novelty_flag ? '⚠ Novelty effect suspected' : '✓ No novelty effect detected'}**
```

(Также скрывать если null.)

**Удалить** текущую строку `<li>⚠ Novelty effect замечен</li>` из `<ul>` (она была в `report-html.js:154`) — теперь это явный badge в TL;DR, не маленький bullet.

**Tests:** `report-html.test.js` (+2: novelty_flag=true → warn badge, false → ok badge, null → no badge); `readout-md.test.js` (+1).

---

## Что НЕ делаем (DO NOT)

- ❌ **Не трогаем** UI секции 1-6 на /step4 (Upload, Form, Checks, DecisionRules, Images, Export) — кроме добавления `significant` badge в ResultsForm.
- ❌ **Не трогаем** `ipynb.js` парсер кроме support'а `significant` (опционально).
- ❌ **Не трогаем** Stepper, editable schema, JSZip, decision_rules, baselineMatch — Sprint 7 main работает.
- ❌ **Не вводим** новых npm-зависимостей.
- ❌ **Не меняем** `plt.rcParams` из load-cell — там уже Sprint 7 styling preset, переиспользуем.
- ❌ **Не делаем** интерактивные графики (например plotly) — простой matplotlib, статический PNG в outputs.
- ❌ **Не делаем** Q-Q plot или distribution plots — слишком сложно для шаблона; нужны только базовые виз для basic A/B отчёта.
- ❌ **Не трогаем** Cowork-зону (`docs/**`).

---

## Files involved

**Модифицируем:**
- `templates/notebook/balance.cells.json` (F-1)
- `templates/notebook/srm.cells.json` (F-2)
- `templates/notebook/main_test/z_test.cells.json` (F-3)
- `templates/notebook/main_test/t_test.cells.json` (F-3)
- `templates/notebook/main_test/welch.cells.json` (F-3)
- `templates/notebook/main_test/bootstrap.cells.json` (F-3)
- `templates/notebook/guardrails.cells.json` (F-4)
- `templates/notebook/export.cells.json` (F-5)
- `templates/notebook/novelty.cells.json` (F-9a) — добавить bar chart
- `src/lib/results/ipynb.js` (F-6) — добавить `significant` опц. поле если не есть
- `src/lib/results/effective.js` (F-6) — пробросить `significant` через merge
- `src/components/results/ResultsForm.jsx` (F-7, F-9b) — significant badge + novelty badge с override
- `src/lib/results/report-html.js` (F-8, F-9c) — TL;DR badges
- `src/lib/results/readout-md.js` (F-8, F-9c) — TL;DR badges
- `tests/lib/plan/notebook-builder.test.js` (+1)
- `tests/lib/results/ipynb.test.js` (+1)
- `tests/lib/results/report-html.test.js` (+4: 2 significant + 2 novelty)
- `tests/lib/results/readout-md.test.js` (+2)

**Не создаём новых файлов** — только updates существующих.

---

## Technical Notes

### Палитра matplotlib

В `load.cells.json` уже задан `plt.rcParams` с palette `['#a3e635', '#60a5fa', '#fbbf24', '#f87171']` (Sprint 7 S10). Графики **могут** использовать default colors через `plt.cycler`, но для **balance / SRM / main_test point plot** — лучше **inline-color** чтобы control всегда `#60a5fa` (синий) и treatment `#a3e635` (зелёный/accent). Иначе rcParams cycle перепутает группы.

### Где брать переменные в каждой ячейке

После Sprint 7 main canonical bindings явно установлены в конце каждой cell:
- balance: `balance` DataFrame, `metric_col`
- srm: `n_ctrl`, `n_treat`, `chi2_srm`, `srm_pvalue` (после S10 rename), также `chi2`/`p` для local
- main_test: `delta_rel`, `ci_lower`, `ci_upper`, `p_value`, `alpha`
- guardrails: `guardrail_results` array

Графики добавляются **сразу после** canonical bindings — переменные гарантированно есть.

### Что если ячейка падает в Colab (matplotlib бэкенд)

В Colab `%matplotlib inline` по умолчанию. `plt.show()` создаёт display_data output с image/png. Это попадёт в ipynb outputs и через S1 parser в /step4 images gallery.

Если у пользователя локальный Jupyter — то же самое. Если headless — `matplotlib.use('Agg')` (но это **не нужно** для шаблонов — пользователь сам выберет backend).

### Significant в edge cases

- `p_value` отсутствует (старый ipynb, manual flow) → `significant = null` → UI скрывает badge.
- `alpha` отсутствует в state.plan → fallback `0.05`.
- `p_value > alpha` → `significant = false`, badge «⚠ Not significant».
- One-sided tests — `p_value` уже учитывает направление в notebook code. Сравнение всегда `p < alpha` ✓.

---

## Acceptance criteria

1. `npm test` зелёный. **+~10 новых тестов** (notebook-builder export-cell + ipynb parser + report-html × 4 + readout-md × 2 + 2 novelty-related). Total: **~432+**.
2. `npm run build` чистый. Bundle delta **≈ 0** (только text changes в шаблонах + минор в JS).
3. **Round-trip 6/6** остаётся (templates изменения не задевают YAML serialization).
4. **Browser smoke (~5 мин):**
   - Сгенерировать новый ipynb (через бриф → конструктор → скачать) — посмотреть что в шаблонах есть `plt.show()` calls.
   - Выполнить ноутбук в Colab на e2e_a_first_deposit.csv → проверить что в каждой code-cell после balance/srm/main_test/guardrails есть **PNG output**.
   - Drag-drop выполненного ipynb на /step4 → секция «5. Графики из ноутбука» содержит **4-6 PNG**.
   - В TL;DR-блоке на /step4 (ResultsForm) — явный badge `✅ Statistically significant (p=...)` или `⚠ Not significant`.
   - Скачать `report.html` — открыть в браузере — графики встроены (`<img data:image/png>`), badge significance + novelty в TL;DR.
   - Скачать `readout.md` — открыть — **bold** строка с significance и novelty в начале TL;DR.
   - В ResultsForm проверить что вместо чекбокса «NOVELTY?» теперь readonly badge «✓ Novelty: not detected» (или ⚠ suspected), с expandable `<details>override</details>` снизу.

---

## Sprint FIX Report — что ожидаем

В `docs/project/sprint-7-fix-report.md` (короткий, по образцу sprint-6-fix-report.md):

- **Trace-ability** F-1..F-8: каждый → файл + diff.
- **Bundle delta** initial и lazy chunks — должны быть нулевые / минор.
- **plt color palette** — какие colors использовал в graphs (вариация ±10% от моих предложений ок).
- **Tests count** — точное число +cases.
- **Edge case bootstrap main_test** — есть ли проблема с `ci_lower/ci_upper` (bootstrap может не задавать их в зависимости от implementation) — как обработал.
- **Time tracking** — ожидаемый ~1.5-2 ч.

---

## QA bugs (если будут добавлены пользователем после прохождения B+C сценариев)

Сейчас в скоупе только F-1..F-8 из feedback сценария A. Если пользователь пройдёт сценарии B (continuous) и C (ratio) и обнаружит **дополнительные** bugs — допишутся в эту секцию до передачи в Code.

| # | Severity | Что | Где | Repro |
|---|---|---|---|---|
| — | — | — | — | — |

---

## Related

- `docs/project/e2e-scenarios-sprint-7.md` — e2e сценарии, сценарий A прошёл и выявил оба gap'а.
- `docs/project/sprint-7-prompt.md` — оригинальный prompt (S10 включал только plt.rcParams styling, без plotting calls — мой gap в spec).
- `docs/project/sprint-report-7.md` — Code-отчёт Sprint 7 main.
- `docs/project/code-review-sprint-7.md` — C-1..C-3 concerns (не задеваем в этом FIX).
- `docs/context/decisions-log.md` — ADR-015 (notebook export contract; добавляем optional `significant` поле).
