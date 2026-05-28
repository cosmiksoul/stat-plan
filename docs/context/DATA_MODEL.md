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

# Data peek info
data_peek:
  uploaded: true
  baseline_computed: 0.031
  std_computed: null              # для continuous-метрик, иначе null
  baseline_match_user_input: true
  distribution_check: ok

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

## validation.md

Артефакт, генерируется на шаге 3. Содержит результаты независимого пересчёта.

```markdown
---
test_id: bm-main-cta-v2
type: validation
validated_at: 2026-05-12T14:30:00Z
csv_filename: experiment_results.csv
csv_rows: 76814

# Independently recalculated stats
control_n: 38421
treatment_n: 38393
control_metric: 0.0312
treatment_metric: 0.0341
delta_relative: 0.093
ci_lower: 0.040
ci_upper: 0.146
p_value: 0.0008
srm_p_value: 0.79

# Decision rule check
ship_threshold_met: true
guardrails_breached: []
novelty_effect_detected: true
novelty_stable_from_day: 3

# Comparison with user's notebook (if provided)
user_provided_stats: true
all_match: true
mismatches: []
---

# Validation Report: {{test_id}}

## Independent recalculation
{{summary_table}}

## Decision rules check
{{decision_status}}

## Notes
{{warnings_and_observations}}
```

---

## readout.md

Финальный артефакт, генерируется на шаге 4.

```markdown
---
test_id: bm-main-cta-v2
type: readout
sealed: 2026-05-12
duration_days: 5
n_users: 76814
decision: null  # SHIP | ITERATE | KILL | null (пока не принято)
recommended_decision: SHIP  # рекомендация тула на основе decision rules
---

# Read-out: {{test_id}}

## TL;DR
{{auto_generated_summary}}

## Что знаем точно
{{confirmed_findings}}

## Чего не знаем
{{unknowns_and_limitations}}

## Follow-up
- [ ] {{suggested_followup_1}}
- [ ] {{suggested_followup_2}}

## Принятое решение
- [ ] SHIP
- [ ] ITERATE
- [ ] KILL

## Обоснование решения
{{free_text}}
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
