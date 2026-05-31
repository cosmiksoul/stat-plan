# Data Model

## Принципы

1. Все артефакты — markdown с YAML frontmatter.
2. YAML frontmatter — машинно-читаемый, содержит все ключевые параметры.
3. Markdown-секции — человеко-читаемые, идут после frontmatter.
4. Общий `test_id` связывает все артефакты одного теста.
5. Парсинг строгий (путь A): структура определена, отклонения от схемы помечаются как ошибки парсинга.

---

## test_plan.md

Главный артефакт, генерируется на шаге 2 и потенциально редактируется пользователем.

### Шаблон (после Sprint 4 FIX iter 2)

> **Контракт metric_name / metric_label:** см. ADR-011. `metric_name` = код CSV-колонки (snake_case, обычно латиница). `metric_label` = натуральный текст (для людей, может быть кириллицей). `test_id` и filename derived from `metric_column` (=`metric_name` после shift).

```markdown
---
test_id: cr-to-partner-click-v1
title: "Тест: CR в клик по партнёру"
created: 2026-05-12
status: draft  # draft | approved
approved_at: null  # ISO timestamp когда переведён в approved

# Context (новое в FIX iter 2)
goal_type: product_change  # product_change | content | algo | marketing | other | null
goal_description: null  # свободный текст, обязательно для goal_type=other; иначе обычно null

# Test design
metric_type: proportion  # proportion | continuous | ratio | count
metric_name: cr_to_partner_click  # КОД колонки CSV (snake_case)
metric_label: "CR в клик по партнёру"  # натуральный текст для людей (опционально)
ratio_numerator: null    # имя колонки числителя (для metric_type=ratio)
ratio_denominator: null  # имя колонки знаменателя
baseline: 0.031
test_method: z_test_proportions  # z_test_proportions | t_test | welch_t_test | mannwhitney | bootstrap | delta_method
randomization_unit: user  # user | session | cluster
cluster_field: null  # имя поля кластера (для randomization_unit=cluster)
alpha: 0.05
power: 0.80
two_sided: true  # boolean, default true

# Effect
mde:
  value: 8
  unit: relative_percent  # relative_percent | absolute_percentage_points | absolute_value
direction: increase  # increase | decrease | any

# Sample
sample_size_per_arm: 38400
duration_days: 5
daily_traffic_available: 42000

# Optional techniques
variance_reduction: null  # null | cuped | stratification
stratification_by: null  # null | geo | device | other
holdback_percent: null   # null | число от 0 до 100

# Guardrails
guardrails:
  - name: bounce_rate
    direction: max  # max | min
    threshold: 5
    unit: relative_percent
  - name: time_on_site
    direction: min
    threshold: -10
    unit: relative_percent

# Stop conditions (новое в FIX iter 2: object в YAML, не только markdown)
stop_conditions:
  srm_detected: true  # boolean
  guardrail_breach_24h: true
  length_cap_days: null  # null | integer
  manual_stop: false

# Decision rules (новое в FIX iter 2: object в YAML)
decision_rules:
  ship: "CI не пересекает 0 и нижняя граница ≥ +4% rel."
  iterate: "Статистически незначимо, но направление positive в 2+ сегментах — итерируем."
  kill: "Guardrail breach или CI ≤ −4% rel."

# Data peek info (расширено Sprint 6 main S1 — 15 полей; см. полную schema в Sprint 6 timeline в CONTEXT.md)
data_peek:
  uploaded: true
  source: csv            # csv | manual | null
  baseline_computed: 0.031
  std_computed: null              # для continuous-метрик, иначе null
  ratio_variance: null            # для ratio через delta method, иначе null
  ratio_mean_numerator: null
  ratio_mean_denominator: null
  ratio_cov_nd: null
  baseline_match_user_input: true
  distribution_check: ok          # ok | skewed | heavy_tailed | skewed_heavy
  skewness: null
  kurtosis: null
  cv_value: null                  # daily CV для stability check
  stability_cv_under_threshold: null  # true если CV < 0.3
  raw_values: null                # reservoir sample до 1000 для histogram
  raw_values_numerator: null      # для ratio (Sprint 6 FIX iter 1)
  raw_values_denominator: null

# Scoring snapshot (информационно, при загрузке игнорируется и пересчитывается)
score: 78
---

# Test Plan: {{title_heading}}

## Hypothesis
{{hypothesis_text}}

## Guardrails
- bounce_rate (max +5% rel.)
- time_on_site (min −10% rel.)

## Stop conditions
- SRM detected (chi² p < 0.001)
- Guardrail breach > 24h

## Decision rules
- **SHIP**: CI не пересекает 0 и нижняя граница ≥ +4% rel.
- **ITERATE**: Статистически незначимо, но направление positive в 2+ сегментах — итерируем.
- **KILL**: Guardrail breach или CI ≤ −4% rel.

## Notes
_(пусто)_
```

### Новые поля после Sprint 4 FIX iter 2 (2026-05-28)

| Поле | Тип | Семантика |
|---|---|---|
| `goal_type` | string enum, optional | Категория канала изменения (product_change / content / algo / marketing / other) |
| `goal_description` | string, optional | Свободный текст, обязательно для `goal_type=other` (по аналогии с conditional sub-questions) |
| `metric_label` | string, optional | Натуральный текст имени метрики (см. ADR-011). Если отсутствует — UI покажет пустой label. |
| `ratio_numerator` | string, optional | Имя колонки числителя; имеет смысл только при `metric_type=ratio` |
| `ratio_denominator` | string, optional | Имя колонки знаменателя |
| `cluster_field` | string, optional | Имя поля кластера; имеет смысл только при `randomization_unit=cluster` |
| `two_sided` | boolean, optional, default `true` | Двусторонний тест |
| `stop_conditions` | object, optional | 4 поля: `srm_detected`, `guardrail_breach_24h`, `length_cap_days`, `manual_stop` |
| `decision_rules` | object, optional | 3 строки: `ship`, `iterate`, `kill` |

### Парсинг обратно в state

1. **Frontmatter** — стандартный YAML через js-yaml. Все поля валидируются по enum/типу. Невалидные поля помечаются в `state.plan.parse_warnings`. **Отсутствующие optional поля = silent default**, без warning'а (как уже работало для `variance_reduction` / `stratification_by` / `holdback_percent`).
2. **Секция `## Hypothesis`** — текст до следующего `##`. Применяется эвристика по 4 слотам.
3. **Секции `## Guardrails`, `## Stop conditions`, `## Decision rules`** — **приоритет у frontmatter** (ADR-002). Текст секций используется только для human-readable отображения и не парсится.
4. **Секция `## Notes`** — свободный текст, сохраняется в `state.plan.notes`.

**Legacy compatibility:** старые `test_plan.md` (до Sprint 4 FIX iter 2) парсятся без падений — отсутствующие новые поля заполняются дефолтами silently. Для `metric_name` legacy (натуральный текст вместо кода) — см. polish-pack P-7 (heuristic запланирована).

**Round-trip контракт:** `parseTestPlanMd(renderTestPlanMd(state)).brief === state.brief` для всех сериализуемых полей. Закреплено в `tests/lib/plan/round-trip.test.js` (4 canonical case). Любое новое поле в state.brief должно добавляться в этот тест.

---

## brief.md

Опциональный артефакт, отражает заполненный бриф. Не редактируется пользователем напрямую — генерится из `state.brief`.

```markdown
---
test_id: bm-main-cta-v2
created: 2026-05-12
type: brief
brief_completed: true
questions_answered: 10
questions_total: 10
data_peek_uploaded: true
---

# Brief: {{title}}

## Goal
{{goal_description}}

## Hypothesis
{{hypothesis_text}}

## Key parameters
- Metric: {{metric_name}} ({{metric_type}})
- Baseline: {{baseline}}
- MDE: {{mde}}
- Randomization unit: {{randomization_unit}}
- Daily traffic: {{daily_traffic}}

## Data peek findings
{{data_peek_summary}}
```

---

## validation.md — superseded (ADR-013, see below)

> **Status:** SUPERSEDED 2026-05-28 by ADR-013 (4-step flow, Шаги 4+5 merged into Шаг 4 «Валидация и отчёт»). После Sprint 7 main + FIX iter 1/2 этот артефакт **не генерируется** — его функционал заменён на:
> - inline-валидацию в `/step4` (SRM/sanity checks без отдельного MD)
> - `report.html` + `readout.md` через парсинг выполненного ipynb (см. ADR-015)
>
> Исторический пример schema оставлен для архивной справки — не отражает текущее состояние.

```markdown
---
# (Архивный пример — НЕ генерируется текущей версией)
test_id: bm-main-cta-v2
type: validation
...
---
```

---

## ipynb export-cell (stat-plan-results) — Sprint 7 ADR-015

Контракт между ноутбуком пользователя (выполненным в Jupyter/Colab) и парсером /step4. Tagged cell с метатэгом `stat-plan-results` содержит JSON, который stat·plan извлекает и подставляет в форму результатов.

```python
# metadata.tags: ['stat-plan-results']
import json
results = {
    'control_n': int,          # размер control группы
    'treatment_n': int,        # размер treatment группы
    'delta_rel': float,        # relative effect в ПРОЦЕНТАХ (5.2 = +5.2%)
    'p_value': float,          # p-value основного теста
    'ci_lower': float,         # АБСОЛЮТНАЯ нижняя граница CI в ед. метрики (proportion: доли; continuous: ед. метрики; ratio: разность ratio)
    'ci_upper': float,         # АБСОЛЮТНАЯ верхняя граница CI
    'srm_pvalue': float,       # p-value chi² теста на 50/50 разбиение
    'novelty_flag': bool | None,  # tri-state с Sprint 7 FIX iter 2: True/False/None
    'guardrails': [
        {'name': str, 'value': float, 'rel_change_%': float, 'threshold_%': float, 'direction': 'min'|'max', 'breached': bool},
    ],
    'significant': bool,        # ДОБАВЛЕНО Sprint 7 FIX iter 1: bool(p_value < alpha)
}
print(json.dumps(results, indent=2, default=str))
```

### Семантика полей (важно — единицы)

| Поле | Тип | Семантика | Пример |
|---|---|---|---|
| `control_n`, `treatment_n` | int | Counts по variant | 5000 |
| `delta_rel` | float, **в %** | Relative lift (treatment − control) / control × 100 | 28.06 (= +28.06%) |
| `p_value` | float | p-value двустороннего теста (one-sided обрабатывается внутри ноутбука) | 0.0257 |
| `ci_lower`, `ci_upper` | float, **абсолют в ед. метрики** | Нижняя/верхняя граница CI **разности**, не relative. Для proportion = доли. Для continuous = ед. метрики (руб./сек./т.д.). Для ratio = разность ratio | 0.001 (proportion = +0.1pp) / −1.13 (continuous ARPU = −1.13 ₽) |
| `srm_pvalue` | float | p-value chi² SRM-теста; < 0.001 → SRM detected | 0.83 |
| `novelty_flag` | bool \| None | **tri-state с iter 2.** `True` — расхождение early vs later > 50% rel; `False` — нет novelty; `None` — проверки не было (cell skipped или нет данных) | true |
| `guardrails` | list[dict] | Список с per-guardrail status. `breached: true` → guardrail сработал | `[{name: 'bounce_rate', breached: false, value: 0.42, ...}]` |
| `significant` | bool | `p_value < alpha` (alpha из state.brief.advanced.alpha, default 0.05). UI/HTML/MD рендерят явный verdict-badge в TL;DR | true |

### Парсинг на стороне stat·plan

- `src/lib/results/ipynb.js`: открывает `.ipynb` как JSON, ищет cell с `cell.metadata.tags?.includes('stat-plan-results')`, берёт последний output (`text/plain` или `application/json`) → `JSON.parse`.
- `REQUIRED_FIELDS` = `['control_n', 'treatment_n', 'delta_rel', 'p_value', 'ci_lower', 'ci_upper']`. `srm_pvalue`, `novelty_flag`, `guardrails`, `significant` — optional (backward-compat со Sprint 7 main ipynb без `significant`).
- Все PNG outputs из других ячеек ноутбука извлекаются как base64 и встраиваются в `report.html` как `<img src="data:image/png;base64,...">` (self-contained).

### state.results structure

После загрузки ipynb состояние:
```js
state.results = {
  raw_results: {...JSON_из_export_cell},     // immutable: то что пришло из ноутбука
  user_overrides: {field: value, ...},        // если пользователь правит поле руками — wins over raw
  images: [{base64_png, ...}],                // PNG из ipynb cells
  user_checks: {ship: bool|null, iterate: ..., kill: ...},  // manual checkboxes для decision rules
  user_decision: 'SHIP'|'ITERATE'|'KILL'|null,  // финальное решение (manual, ADR-004)
}

// effective = {...raw_results, ...user_overrides_non_null}
```

### Backward-compat

- Старые ipynb (Sprint 6 main + FIX iter 1/2, без export-cell) — парсер не находит tagged cell → warning «Это ноутбук без stat-plan-results cell» → форма ручного ввода.
- Sprint 7 main ipynb (без `significant`, с `novelty_flag: False` default) — парсятся OK, `significant` derived из `p < alpha`, novelty показывается зелёным «not detected» (формально верно для тех ноутбуков). Sprint 7 FIX iter 1+2 ipynb — полная поддержка.

---

## readout.md (Sprint 7)

Финальный артефакт, генерируется в /step4 после загрузки выполненного ipynb. Содержит YAML frontmatter + markdown структуру с TL;DR (significance + novelty badges + Δ rel/CI/p) + applied decision rules + поле «Принятое решение» **пустое** (ADR-004).

```markdown
---
test_id: arpu-v1
created: 2026-05-31
status: completed
results:
  control_n: 5000
  treatment_n: 5000
  delta_rel: 1.6411
  p_value: 0.2377
  ci_lower: -1.1353       # в ед. метрики (ARPU)
  ci_upper: 4.5771
  srm_pvalue: 1.0000
  novelty_flag: true       # tri-state — может быть true/false/null
decision: ""               # ВСЕГДА пусто (ADR-004) — пользователь заполняет руками
---

# Тест: ARPU

## TL;DR

**⚠ Not statistically significant** (p = 0.2377, α = 0.05)
**⚠ Novelty effect suspected**

Δ rel = 1.64%, 95% CI [-1.1353…4.5771] _(абс. разность, ед. ARPU)_, p = 0.2377.

## Results
- n control = 5000, n treatment = 5000
- Δ rel = 1.64%
- 95% CI = [-1.1353 … 4.5771]
- p-value = 0.2377

## Sanity checks
- ✓ SRM: p = 1.0000
- ⚠ Sample size vs план
- ✓ Направление эффекта vs MDE direction

## Decision rules application
- **SHIP**: ... — сработало/не сработало/не оценено
- **ITERATE**: ...
- **KILL**: ...

## Recommended next step
Сработали правила: KILL. Рекомендуемое следующее действие — KILL.
(Или: «Ни одно из decision rules не сработало. Решение остаётся за PM.»)

## Decision
_To be filled manually._
```

**Важно:** TL;DR строка имеет label `(абс. разность, ед. <metric_name>)` для CI — это потому что `ci_lower/upper` хранятся в абсолютных единицах метрики (см. ADR-015 amendment). Для proportion — `(абс. разность долей)`, для ratio — `(абс. разность ratio)`.

---

## report.html (Sprint 7)

Self-contained HTML one-pager, генерируется в /step4. Inline CSS dark palette stat·plan. PNG графики из ipynb встроены как `data:image/png;base64,...`. Открывается в любом браузере, печатается в PDF через Ctrl+P. Содержит те же секции что readout.md, плюс embedded PNG графики из выполненного ноутбука.

---

## Зарезервировано (НЕ генерируется текущей версией)

```markdown
# brief.md — отдельный артефакт, не реализован, обсуждаем нужность для v2
# validation.md — superseded ADR-013, не генерируется
```

---

## Enum-ы и валидация

### metric_type
- `proportion` — конверсия, бинарная метрика
- `continuous` — средние величины (ARPU, время на сайте)
- `ratio` — CTR, CR на сессию (числитель и знаменатель — разные)
- `count` — количество событий на пользователя

### test_method
- `z_test_proportions` — для proportion
- `t_test` — для continuous с нормальным распределением
- `welch_t_test` — для continuous с разными дисперсиями
- `mannwhitney` — для continuous с ненормальным распределением
- `bootstrap` — универсальный, для любых метрик с большой выборкой
- `delta_method` — для ratio-метрик

### randomization_unit
- `user` — пользователь
- `session` — сессия
- `cluster` — кластер (гео, кампания, домохозяйство)

### mde.unit
- `relative_percent` — относительный процент (8% от baseline)
- `absolute_percentage_points` — абсолютные п.п. (+0.5 п.п.)
- `absolute_value` — абсолютная величина (+5 минут, +100₽)

### Консистентность (валидаторы)

| Условие | Действие |
|---------|----------|
| `metric_type=proportion` && `test_method=t_test` | Warning: "Для proportion рекомендуется z_test" |
| `metric_type=ratio` && `test_method != delta_method && != bootstrap` | Warning: "Для ratio нужен delta_method или bootstrap" |
| `mde.value > 50` && `mde.unit=relative_percent` | Warning: "MDE 50%+ это очень крупный эффект, проверь baseline" |
| `sample_size_per_arm / (daily_traffic / 2) > 14` | Warning: "Тест займёт >14 дней" |
| `guardrails.length == 0` | Warning: "Не заданы guardrails" |
| `decision_rules` пуст или содержит только одно правило | Warning: "Decision rules неполные" |

Все валидаторы участвуют в скоринге (см. [SCORING.md](SCORING.md)).
