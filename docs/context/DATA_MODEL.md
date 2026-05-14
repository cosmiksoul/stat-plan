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

### Шаблон

```markdown
---
test_id: bm-main-cta-v2
title: New BK recommendations block on main page
created: 2026-05-12
status: draft  # draft | approved
approved_at: null  # timestamp когда переведён в approved

# Test design
metric_type: proportion  # proportion | continuous | ratio | count
metric_name: cr_to_partner_click
baseline: 0.031
test_method: z_test_proportions  # z_test_proportions | t_test | mannwhitney | bootstrap | delta_method
randomization_unit: user  # user | session | cluster
alpha: 0.05
power: 0.80

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

# Guardrails (отдельная секция в md ниже дублирует это структурированно)
guardrails:
  - name: bounce_rate
    direction: max
    threshold: 5
    unit: relative_percent
  - name: time_on_site
    direction: min
    threshold: -10
    unit: relative_percent

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

# Test Plan: {{title}}

## Hypothesis
{{hypothesis_text}}

## Guardrails
- bounce_rate (max +5% rel.)
- time_on_site (min −10% rel.)

## Stop conditions
- SRM detected (chi² p < 0.001)
- Guardrail breach > 24h
- Length cap: 10 days

## Decision rules
- SHIP если CI not crossing 0 и нижняя граница ≥ +3% rel.
- ITERATE если ns но direction positive в 2+ сегментах
- KILL если guardrail breach или CI ≤ −3% rel.

## Notes
{{free_text_notes}}
```

### Парсинг обратно в state

1. **Frontmatter** — стандартный YAML, парсится через js-yaml. Все поля валидируются по enum/типу. Невалидные поля помечаются в `state.plan.parse_warnings`.
2. **Секция `## Hypothesis`** — текст до следующего `##`. Применяется эвристика по 4 слотам.
3. **Секции `## Guardrails`, `## Stop conditions`, `## Decision rules`** — приоритет у frontmatter, текст секций используется только для отображения.
4. **Секция `## Notes`** — свободный текст, сохраняется как есть в `state.plan.notes`.

Если frontmatter и текст секции противоречат (например, в `guardrails:` 2 элемента, а в тексте 3) — берём frontmatter и показываем warning.

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
