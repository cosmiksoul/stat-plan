# Sprint 4 FIX iter 2 — Full Round-trip Repair

**Type:** FIX iter 2 (по Dev-Cycle разрешено до 2 итераций FIX внутри спринта).
**Estimated:** ~1-1.5 ч Code DEV.

## Context

После RETEST FIX iter 1 пользователь сделал Run 1 (fresh бриф «S4+S5 mix», score 80) и Run 2 (drag-drop того же test_plan.md). Score упал 80 → 77 с замечанием «Decision rules неполные — 0/3, нужно ≥2». Расследование (см. `docs/project/test-cases-sprint-4.md` BUG-9) показало: **decision_rules + stop_conditions не сериализуются в YAML frontmatter**, только в markdown-секции. Parser по ADR-002 markdown-секции игнорирует → поля восстанавливаются из дефолтов emptyBriefShape (пустые).

Дальнейший audit (Cowork) выявил, что round-trip ломается не только на этих двух полях. **Всего 7 дыр**, нарушающих Sprint 3 контракт ADR-002 «test_plan.md как переносимое состояние». Этот контракт — центральное обещание тула.

**Iter 2 необходим, не deferred.** Push на прод со сломанным round-trip нарушает основное обещание.

## Audit table

| Поле в state.brief | render.js? | parse.js? | Severity |
|---|---|---|---|
| goal_type | ❌ нет в YAML | ❌ восстанавливается дефолтом через applyEnterDefaults — но **ломает Q01=other case** | HIGH |
| goal_description | ✅ в YAML | ✅ читается | Bug-9b: **обрезание** на ~27 символах |
| ratio_components (numerator, denominator) | ❌ нет в YAML | ❌ нет | HIGH (критично для ratio) |
| cluster_field | ❌ нет в YAML | ❌ нет | HIGH (критично для cluster) |
| advanced.two_sided | ❌ нет в YAML | ❌ нет | Medium |
| stop_conditions (object 4 поля) | ❌ только markdown | ❌ нет | **BUG-9 HIGH** |
| decision_rules (object 3 поля) | ❌ только markdown | ❌ нет | **BUG-9 HIGH** |

Остальные поля (metric_type, metric_name/column, metric_label, baseline, randomization_unit, mde, daily_traffic, guardrails, alpha, power, variance_reduction, stratification_by, holdback_percent, data_peek, hypothesis) уже работают.

## Tasks

### A. `src/lib/plan/render.js` — добавить серилизаторы

**A.1. stop_conditions block:**

В `substitutions` добавить `stop_conditions_yaml` через новый helper:

```js
function renderStopConditionsYaml(stops) {
  const s = stops ?? {}
  return [
    `  srm_detected: ${yamlScalar(s.srm_detected ?? true)}`,
    `  guardrail_breach_24h: ${yamlScalar(s.guardrail_breach_24h ?? true)}`,
    `  length_cap_days: ${yamlScalar(s.length_cap_days ?? null)}`,
    `  manual_stop: ${yamlScalar(s.manual_stop ?? false)}`,
  ].join('\n')
}
```

В substitutions: `stop_conditions_yaml: renderStopConditionsYaml(brief.stop_conditions)`.

**A.2. decision_rules block:**

```js
function renderDecisionRulesYaml(dr) {
  const r = dr ?? {}
  return [
    `  ship: ${yamlScalar(r.ship ?? '')}`,
    `  iterate: ${yamlScalar(r.iterate ?? '')}`,
    `  kill: ${yamlScalar(r.kill ?? '')}`,
  ].join('\n')
}
```

В substitutions: `decision_rules_yaml: renderDecisionRulesYaml(brief.decision_rules)`.

**A.3. ratio_components block (только для metric_type=ratio):**

В substitutions добавить простую строку через yamlScalar:

```js
ratio_numerator: yamlScalar(brief.ratio_components?.numerator ?? null),
ratio_denominator: yamlScalar(brief.ratio_components?.denominator ?? null),
```

В template — две новые строки в `# Test design` секции (после metric_label):

```yaml
ratio_numerator: {{ratio_numerator}}
ratio_denominator: {{ratio_denominator}}
```

Для non-ratio они будут `null` — это нормально.

**A.4. cluster_field:**

```js
cluster_field: yamlScalar(brief.cluster_field ?? null),
```

В template, в `# Test design` (после randomization_unit):

```yaml
cluster_field: {{cluster_field}}
```

**A.5. advanced.two_sided:**

```js
two_sided: yamlScalar(advanced.two_sided ?? true),
```

В template, в `# Optional techniques` или новой секции:

```yaml
two_sided: {{two_sided}}
```

**A.6. goal_type (когда != default 'product_change'):**

Сериализуем `goal_type` всегда (один enum-токен короткий, не загромождает):

```js
goal_type: yamlScalar(brief.goal_type ?? null),
```

В template (в самом начале `# Test design` или в новой секции `# Context` после meta):

```yaml
goal_type: {{goal_type}}
```

### B. `src/lib/plan/parse.js` mapFrontmatter — readers

**B.1. stop_conditions:**

После guardrails блока, добавить:

```js
if (fm.stop_conditions != null && typeof fm.stop_conditions === 'object' && !Array.isArray(fm.stop_conditions)) {
  const sc = fm.stop_conditions
  brief.stop_conditions = {
    srm_detected: isBool(sc.srm_detected) ? sc.srm_detected : true,
    guardrail_breach_24h: isBool(sc.guardrail_breach_24h) ? sc.guardrail_breach_24h : true,
    length_cap_days: isNum(sc.length_cap_days) ? sc.length_cap_days : null,
    manual_stop: isBool(sc.manual_stop) ? sc.manual_stop : false,
  }
} else if (fm.stop_conditions != null) {
  warnings.push('Поле stop_conditions не объект — оставлены дефолты.')
}
```

**B.2. decision_rules:**

```js
if (fm.decision_rules != null && typeof fm.decision_rules === 'object' && !Array.isArray(fm.decision_rules)) {
  const dr = fm.decision_rules
  brief.decision_rules = {
    ship: isStr(dr.ship) ? dr.ship : '',
    iterate: isStr(dr.iterate) ? dr.iterate : '',
    kill: isStr(dr.kill) ? dr.kill : '',
  }
} else if (fm.decision_rules != null) {
  warnings.push('Поле decision_rules не объект — оставлены дефолты.')
}
```

**B.3. ratio_components:**

```js
if (isStr(fm.ratio_numerator)) brief.ratio_components.numerator = fm.ratio_numerator
if (isStr(fm.ratio_denominator)) brief.ratio_components.denominator = fm.ratio_denominator
```

**B.4. cluster_field:**

```js
if (isStr(fm.cluster_field)) brief.cluster_field = fm.cluster_field
```

**B.5. advanced.two_sided:**

```js
if (fm.two_sided != null) {
  if (isBool(fm.two_sided)) brief.advanced.two_sided = fm.two_sided
  else warnings.push(`Поле two_sided не boolean — оставлено true.`)
}
```

**B.6. goal_type:**

```js
if (fm.goal_type != null && fm.goal_type !== false) {
  if (isStr(fm.goal_type)) brief.goal_type = fm.goal_type
  else warnings.push('Поле goal_type не строка — оставлено null.')
}
```

И **снять флаг `defaultsApplied.goal_type` = true** если goal_type был прочитан, чтобы applyEnterDefaults не перезаписал. Аналогично с randomization_unit (наверняка та же проблема при load).

```js
if (brief.goal_type) brief.defaultsApplied.goal_type = true
if (brief.randomization_unit) brief.defaultsApplied.randomization_unit = true
```

### C. BUG-9b: goal_description truncation

**Симптом:** пользователь ввёл `оптимизация воронки партнёрки` (29 символов), в YAML вышло `оптимизация воронки партнёр` (27 символов) — обрезано «-ки».

**Гипотеза 1:** maxLength в text input компоненте на Q01 sub-question. Проверь `QuestionRenderer.jsx` секцию для goal_type=other, найди `<TextInput maxLength={...}>` или `<input maxLength={...}>`.

**Гипотеза 2:** truncate в ANSWER_QUESTION handler — мало вероятно, но проверить.

**Гипотеза 3:** truncate в render.js — маловероятно (yamlScalar не обрезает).

**Гипотеза 4:** какой-то slugify-подобный handler — но goal_description не должен прогоняться через slug.

Найди причину и пофикси. Лимит длины снять либо поставить разумный (например, 200 символов). В sprint report укажи, что именно нашёл.

### D. `templates/test_plan.md.tmpl` — обновить

Добавить новые YAML поля. Финальный шаблон должен выглядеть примерно так (порядок секций по смыслу):

```yaml
---
test_id: {{test_id}}
title: {{title}}
created: {{created}}
status: {{status}}
approved_at: {{approved_at}}

# Context
goal_type: {{goal_type}}
goal_description: {{goal_description}}

# Test design
metric_type: {{metric_type}}
metric_name: {{metric_name}}
metric_label: {{metric_label}}
ratio_numerator: {{ratio_numerator}}
ratio_denominator: {{ratio_denominator}}
baseline: {{baseline}}
test_method: {{test_method}}
randomization_unit: {{randomization_unit}}
cluster_field: {{cluster_field}}
alpha: {{alpha}}
power: {{power}}
two_sided: {{two_sided}}

# Effect
mde:
  value: {{mde_value}}
  unit: {{mde_unit}}
direction: {{direction}}

# Sample
sample_size_per_arm: {{sample_size_per_arm}}
duration_days: {{duration_days}}
daily_traffic_available: {{daily_traffic_available}}

# Optional techniques
variance_reduction: {{variance_reduction}}
stratification_by: {{stratification_by}}
holdback_percent: {{holdback_percent}}

# Guardrails
guardrails:
{{guardrails_yaml}}

# Stop conditions
stop_conditions:
{{stop_conditions_yaml}}

# Decision rules
decision_rules:
{{decision_rules_yaml}}

# Data peek info
data_peek:
{{data_peek_yaml}}

# Scoring snapshot (информационно, при загрузке игнорируется и пересчитывается)
score: {{score}}
---
```

Markdown body (после `---`) — **оставить как есть**: `## Hypothesis`, `## Guardrails`, `## Stop conditions`, `## Decision rules`, `## Notes`. Они служат human-readable дублированием. По ADR-002 приоритет у frontmatter — markdown-копия информативна.

### E. Tests

**E.1. `tests/lib/plan/render.test.js`:**
- Inline snapshot обновится автоматически после правок (новые YAML поля). Update snapshot.
- Добавить 1 explicit case: для brief с `decision_rules: { ship: 'foo', iterate: '', kill: 'bar' }` YAML должен содержать `decision_rules:\n  ship: foo\n  iterate: ""\n  kill: bar`.

**E.2. `tests/lib/plan/parse.test.js`:**
- Расширить round-trip тесты:
  - `proportion + full options` (включая custom decision_rules, stop_conditions с length_cap, two_sided=false, cluster) — round-trip даёт identical brief.
  - `ratio + ratio_components` — round-trip восстанавливает numerator/denominator.
  - `goal_type=other + goal_description` — после round-trip goal_type='other', goal_description полностью сохранён.
- Update `extractBriefShape` в round-trip тестах — добавить все новые поля.
- 1 кейс для legacy YAML (без новых полей) — должен парситься без ошибок, поля заполняются дефолтами с warnings.

**E.3. `tests/state/reducer.test.js`:**
- 1 кейс: `LOAD_TEST_PLAN_MD` с payload содержащим `goal_type='other'` + `goal_description='...'` — после load бриф содержит оба, applyEnterDefaults не перезаписывает.

### F. Round-trip integration test

Добавить **end-to-end test** в `tests/lib/plan/round-trip.test.js` (новый файл):

```js
import { renderTestPlanMd } from '../../../src/lib/plan/render.js'
import { parseTestPlanMd } from '../../../src/lib/plan/parse.js'
import { initialState } from '../../../src/state/reducer.js'

describe('full round-trip', () => {
  it('preserves all brief fields for ratio + cluster + custom rules', () => {
    const original = makeFullState({
      brief: {
        goal_type: 'other',
        goal_description: 'оптимизация воронки',
        metric_type: 'ratio',
        ratio_components: { numerator: 'clicks', denominator: 'views' },
        randomization_unit: 'cluster',
        cluster_field: 'campaign_id',
        stop_conditions: { srm_detected: true, guardrail_breach_24h: false, length_cap_days: 14, manual_stop: true },
        decision_rules: { ship: 'custom ship', iterate: 'custom iterate', kill: 'custom kill' },
        advanced: { alpha: 0.01, power: 0.9, two_sided: false, variance_reduction: 'cuped', stratification_by: 'geo', holdback_percent: 10 },
        // ...
      },
    })
    const md = renderTestPlanMd(original)
    const parsed = parseTestPlanMd(md)
    expect(parsed.ok).toBe(true)
    expect(parsed.brief.goal_type).toBe('other')
    expect(parsed.brief.goal_description).toBe('оптимизация воронки')
    expect(parsed.brief.ratio_components).toEqual({ numerator: 'clicks', denominator: 'views' })
    expect(parsed.brief.cluster_field).toBe('campaign_id')
    expect(parsed.brief.stop_conditions).toEqual(original.brief.stop_conditions)
    expect(parsed.brief.decision_rules).toEqual(original.brief.decision_rules)
    expect(parsed.brief.advanced.two_sided).toBe(false)
  })
})
```

Этот тест — **canonical round-trip contract**. Если в будущем появится новое поле в state.brief, этот тест должен также его проверять.

## Acceptance criteria

1. `npm test` зелёный, всего тестов ~245-255 (было 235).
2. `npm run build` чистый.
3. **End-to-end RETEST в браузере:**
   - Run 1: fresh бриф с custom decision rules (или дефолтными) → скачать test_plan.md.
   - Run 2: «Начать сначала» → drag-drop тот же файл → score **тот же что в Run 1** (не падает).
   - Q01=other кейс: брифинг с goal_type=other → drag-drop → бриф восстановлен с goal_type='other' + полным goal_description.
   - Ratio кейс: бриф с metric_type=ratio + numerator/denominator → drag-drop → восстановлены.
   - Cluster кейс: randomization_unit=cluster + cluster_field → drag-drop → восстановлены.
4. **BUG-9b расследован** — указано где было обрезание и как пофикшено.
5. **Legacy compatibility:** старые test_plan.md (из Run 1 пользователя в QA до этого fix'а) парсятся без падений — новые поля заполняются дефолтами с warnings.

## DO NOT

- ❌ **Не убирать** markdown-секции (## Stop conditions, ## Decision rules, ## Guardrails). Они служат human-readable дублированием. По ADR-002 приоритет у frontmatter — markdown информативен.
- ❌ **Не добавлять** новые npm-зависимости.
- ❌ **Не менять** существующую структуру YAML полей которые работают (metric_type, baseline, mde, etc).
- ❌ **Не «заодно» рефакторить** slugify, scoring, sample-size, notebook-builder.
- ❌ **Не разрешать** мутацию state в parse.js — функция остаётся pure.

## Sprint Fix iter 2 Report

В `docs/project/sprint-4-fix-iter2-report.md`:
- Что закрыто по audit table (все 7 строк).
- Где было обрезание goal_description (root cause + fix).
- Новые тесты и их количество.
- Bundle size delta.

После — Cowork RETEST + CLOSE Sprint 4 окончательно.

## Related

- `docs/project/test-cases-sprint-4.md` — BUG-9, BUG-9b.
- `docs/context/decisions-log.md` — ADR-002 (round-trip контракт).
- `docs/project/sprint-4-fix-report.md` — что было сделано в iter 1.
- В CLOSE: ADR-011 (semantic shift, уже в очереди) + обновление DATA_MODEL.md с новыми YAML полями.
