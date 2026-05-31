# Методология

> Как stat·plan выбирает критерии и считает sample size, что значат SRM и novelty checks, как пишутся decision rules — и что мы намеренно не делаем и почему.

Этот раздел — для тех, кто хочет понимать **что под капотом**, а не просто доверять рекомендациям. Если хочется обсудить конкретный кейс или зайти глубже — задай вопрос [AI-компаньону в NotebookLM](https://notebooklm.google.com/notebook/040498fe-3843-4562-a854-863d2101a0d8): у него в базе 90+ материалов Kohavi, Evan Miller, CXL, Booking, Optimizely.

---

## 1. Как мы выбираем test_method

Тип статистического критерия определяется типом метрики (`metric_type`) и характеристиками распределения. stat·plan делает рекомендацию автоматически, но это можно переопределить в продвинутых параметрах брифа.

### Матрица соответствия

| metric_type | Рекомендуемый метод | Когда |
|---|---|---|
| **proportion** | `z_test_proportions` | Бинарная метрика (converted 0/1). Размер выборки достаточен для CLT (`n * p > 5` и `n * (1-p) > 5`) |
| **continuous** | `t_test` (равные дисперсии) | Средние величины (ARPU, время на сайте). Распределение примерно нормальное или симметричное |
| **continuous (heavy tail)** | `welch_t_test` | Continuous с неравными дисперсиями между группами или signs of скошенности |
| **continuous (extreme)** | `mannwhitney` (или bootstrap) | Сильно ненормальное распределение (skewness > 2, kurtosis > 7). MW даёт rank-based p-value без assumption нормальности |
| **ratio** | `delta_method` | Метрика — отношение двух сумм (CTR per user, sessions per visit). Учитывает ковариацию числителя и знаменателя |
| **ratio (fallback)** | `bootstrap` | Если delta method не подходит (heavy tail) или нет данных для оценки ковариации |
| **count** | `t_test` или `bootstrap` | Счётчики (events per user). Часто Poisson-like, для больших n переходит к t-test через CLT |

**Скоринг** проверяет соответствие выбранного метода типу метрики (см. [Группа 3 «Методологическая консистентность»](#scoring) ниже). Если выбрал `t_test` для proportion — увидишь предупреждение и часть очков отнимется.

### Почему именно так

- **proportion → z-test:** для долей нет σ как отдельного параметра — он выводится из самой p (`sqrt(p(1-p))`). Z-тест эффективнее t-теста при больших выборках, и для конверсий выборка обычно large.
- **continuous → t-test:** classic выбор, robust к небольшим отклонениям от нормальности (`n > 30` обычно достаточно по CLT).
- **continuous heavy-tail → Welch или MW:** equal-variance t-test даёт inflated false-positive rate при heteroscedasticity. Welch корректирует df. MW не делает предположений о форме распределения, ценой потери ~5-15% мощности.
- **ratio → delta method:** наивно посчитанная sum(clicks) / sum(sessions) как «средняя CTR» теряет информацию о per-user variance. Delta method даёт правильный CI через линеаризацию: `Var(N/D) ≈ Var(N)/μ_D² − 2·μ_N·Cov(N,D)/μ_D³ + μ_N²·Var(D)/μ_D⁴`.

---

## 2. Sample size — формулы

Расчёт `sample_size_per_arm` происходит реактивно на Шаге 01 (после Q05 baseline + Q07 MDE + Q08 traffic). Все вычисления — на клиенте, без сервера.

**Общая модель:** sample size = функция от α, power, эффекта δ, дисперсии σ². Длительность теста: `duration_days = ceil(sample_size_per_arm × 2 / daily_traffic)`.

### Z-test для пропорций (Fleiss formula)

```
p₁ = baseline                           (контрольная конверсия)
p₂ = p₁ × (1 + MDE_relative)            (если MDE в относительных %)
δ  = p₂ − p₁                            (абсолютная разница)
p̄  = (p₁ + p₂) / 2

n_per_arm = ((z_{α/2} × √(2 × p̄ × (1 − p̄)) + z_β × √(p₁(1−p₁) + p₂(1−p₂))) / δ)²
```

Где `z_{α/2} = Φ⁻¹(1 − α/2)` (для α=0.05 двустороннего — 1.96), `z_β = Φ⁻¹(power)` (для power=0.8 — 0.84).

**Пример:** baseline 3.1%, MDE +10% rel, α=0.05, power=0.8. n ≈ 17 500 на ветку.

### T-test для continuous (равные дисперсии)

```
n_per_arm = 2 × ((z_{α/2} + z_β) × σ / δ)²

где σ — стандартное отклонение метрики, δ = baseline × MDE_relative
```

**Зависимость от σ:** удвоение σ → учетверение размера выборки. Поэтому Data Peek критически важен для continuous — без точной σ тул откатывается на bootstrap-приближение.

### Welch t-test

Та же формула, но с поправкой Satterthwaite на df. Sample size почти не меняется при не сильно различающихся дисперсиях; ощутимая разница появляется когда `σ₁ / σ₂ > 2`.

### Mann-Whitney (приближение)

```
n_per_arm_MW ≈ n_per_arm_t × 1.157
```

Поправка ARE (Asymptotic Relative Efficiency) — на нормальных данных MW теряет ~15% мощности vs t-test. На skewed данных может быть наоборот выгоднее.

### Delta method для ratio

```
σ²_ratio = Var(N)/μ_D² − 2·μ_N·Cov(N,D)/μ_D³ + μ_N²·Var(D)/μ_D⁴
n_per_arm = 2 × ((z_{α/2} + z_β) × σ_ratio / δ)²
```

Где `μ_N, μ_D` — средние числителя и знаменателя per unit; `Var(N), Var(D), Cov(N,D)` — выборочные оценки. Без Data Peek для ratio тул использует `σ²_ratio ≈ μ²_ratio` (CV=1 fallback) и помечает расчёт как приближённый.

### Bootstrap-приближение

Когда формул нет (heavy-tail continuous без σ, ratio без ковариации), тул помечает sample size как «приближённый ±20-30%» с предупреждением. Реальный размер выборки в этом случае стоит проверить через Data Peek или симуляцию.

### Крайние случаи — предупреждения

Тул показывает встроенное предупреждение под Q08 если:
- `sample_size_per_arm × 2 / daily_traffic > 90` дней — тест слишком долгий
- `sample_size_per_arm < 30` — выборка слишком мала для нормальной аппроксимации
- `sample_size_per_arm > 10 000 000` — нереалистичная цифра (вероятно ошибка в baseline или MDE)
- `MDE_relative > 50%` — слишком оптимистичный эффект, проверь baseline

---

## 3. SRM — Sample Ratio Mismatch

**Что это:** проверка, что реальное соотношение размеров control/treatment групп совпадает с ожидаемым (обычно 50/50). Если соотношение значимо отклоняется — рандомизация **сломана**, и результатам теста доверять нельзя.

**Откуда возникает SRM:**
- Bucketing bias (хэширование user_id даёт неравномерное распределение)
- Redirect loss (часть юзеров одной группы не дошла до landing из-за слома редиректа)
- Фильтрация ботов делается **после** рандомизации и неравномерно затрагивает группы
- Bias в выборке (например, treatment показывается только на определённых устройствах)

**Как проверяется:**

```
χ² = Σ ((observed − expected)² / expected)
df = 1 (для двух групп)
p_SRM = 1 − CDF_χ²(χ², df=1)
```

`expected` для 50/50 = `(n_control + n_treatment) / 2` на каждую группу. Считается через нижнюю incomplete gamma function + Lanczos approximation gammaLn — без scipy (Sprint 7 S3, нативно в JS).

**Threshold:** `p_SRM < 0.001` (per Kohavi et al., Microsoft ExP). Не `0.05` — потому что false positive здесь критичен: ложное «SRM detected» останавливает все тесты команды на расследование.

**Что делать когда SRM сработал:**
1. **Остановиться.** Не интерпретировать результаты — они biased.
2. Проверить **точку расхождения**: bucketing layer, redirect, фильтры.
3. Перезапустить тест после фикса.

stat·plan показывает SRM check на Шаге 04 в секции «3. Sanity checks». Также ноутбук вычисляет SRM в отдельной cell и выводит `chi2_srm` + `srm_pvalue` в export-cell.

---

## 4. Novelty effect

**Что это:** пользователи реагируют на **новизну** изменения, а не на его суть. Эффект сильный в первые 1-2 дня, ослабевает к 3+. Если тест короткий — рискуешь принять «эффект новизны» за «настоящий».

**Как детектируется:**

В ноутбуке считается лифт по двум окнам:
- `lift_early` = лифт на днях 1-2
- `lift_later` = лифт на днях 3+

```
novelty_flag = True, если |lift_early − lift_later| > 0.5 × |lift_later|
```

То есть «раннее значение отличается от позднего на >50% относительно позднего». Грубая эвристика — но дешёвая и часто ловит явные случаи.

**Tri-state semantics (Sprint 7 FIX iter 2):**
- `True` — расхождение зафиксировано, **⚠ suspected**
- `False` — расхождение в пределах нормы, **✓ not detected**
- `None` — проверки не было (duration < 3 дней, или нет данных по early/later окнам)

Badge на /step4: жёлтый для true, зелёный для false, серый «N/A» для null.

**Что делать когда novelty suspected:**
1. **Продлить тест.** Хотя бы до 7-10 дней — посмотреть, стабилизировался ли эффект.
2. Изучить **по-дневной график** (балансовая ячейка): если эффект монотонно убывает — это novelty wearing off.
3. Если эффект стабилизировался на меньшем уровне — оценить **honest delta_rel** на днях 3+ как реальную метрику.

---

## 5. Guardrails

**Что это:** параллельные метрики, которые **не должны пострадать** при тесте основной метрики. Если treatment повышает конверсию на 10%, но bounce rate растёт на 20% — это плохой размен, тест надо остановить.

**Direction:**
- `max` — guardrail не должен расти больше threshold (например `bounce_rate max +5%`)
- `min` — guardrail не должен падать ниже threshold (например `time_on_site min −10%`)

**Threshold** — в `relative_percent` (% от baseline guardrail метрики).

**Как обрабатываются:**

В ноутбуке для каждого guardrail считается:
```
guardrail_results.append({
  'name': name,
  'value': treatment_mean,
  'rel_change_%': (treatment − control) / control × 100,
  'threshold_%': threshold,
  'direction': direction,
  'breached': (direction == 'max' and rel_change_% > threshold) or
              (direction == 'min' and rel_change_% < threshold),
})
```

В export-cell → JSON. На /step4 в секции «5. Графики» показывается barh chart с breach=red / ok=green.

**По умолчанию** тул предлагает два guardrails: `bounce_rate` (max +5%) и `time_on_site` (min −10%). Можно убрать или заменить на свои.

**Что делать когда guardrail breached:**
- **Stop conditions** в брифе должны включать «Guardrail breach > 24h → остановка». Если так — останавливаешь тест и расследуешь.
- В decision rules можно явно прописать `KILL: Guardrail breach или CI ≤ −2.5% rel.`

---

## 6. Decision rules

**Что это:** правила, по которым PM **до запуска** теста фиксирует «что я сделаю при каком результате». Три исхода: SHIP / ITERATE / KILL.

**Зачем фиксировать до запуска:** убрать пост-фактум рационализацию. Если правило сработало — действуем по правилу, а не выдумываем причину отойти от него.

### Синтаксис

Простые правила:
```
ci_lower >= 5
p_value < 0.05
delta_rel > 0
```

Поддерживаются [синонимы](#aliases) — `lift`, `эффект`, `Δ rel`, `p value`, `нижняя граница`, `верхняя граница`, голое `CI`.

Unicode операторы: `≤ ≥ −` (нормализуются в `<= >= -`).

Суффиксы единиц: `% rel`, `% relative` — включают unit-aware сравнение через baseline (см. ниже).

### Aliases

| Распознаётся как | Canonical variable |
|---|---|
| `ci_lower`, `ci lower`, `нижняя граница` | `ci_lower` |
| `ci_upper`, `ci upper`, `верхняя граница` | `ci_upper` |
| `CI` (голое) с `≤/<` | `ci_upper` (CI лежит ниже X = верхняя граница ≤ X) |
| `CI` (голое) с `≥/>` | `ci_lower` (CI лежит выше X = нижняя граница ≥ X) |
| `delta_rel`, `Δ rel`, `lift`, `эффект`, `relative effect` | `delta_rel` |
| `p_value`, `p-value`, `p value`, `p-значение` | `p_value` |

**Пример:** правило `Guardrail breach или CI ≤ −5% rel.` парсится как `ci_upper ≤ −5` (CI весь ниже −5% — strong negative для KILL).

### Unit-aware `% rel` (Sprint 8 P-14)

Decision rules часто пишут в `% rel`, но `ci_lower/ci_upper` хранятся в **абсолютных единицах метрики** (доли для proportion, валюта для continuous, ratio difference для ratio). Прямое сравнение не работает для continuous: `ci_upper = 4.58` (₽) и threshold `−2.5%` несопоставимы.

Решение — canonical binding `control_mean` в main_test cells ноутбука + derived `ci_lower_pct_rel = ci_lower / control_mean × 100` в effective.js. Парсер распознаёт суффикс `% rel` и сравнивает с `_pct_rel` версией.

**Пример:** правило `CI ≤ −2.5% rel.` для continuous ARPU (control_mean = 105). ci_upper = 4.58₽ → derived `ci_upper_pct_rel = 4.58 / 105 × 100 ≈ 4.36%`. Сравнение `4.36 ≤ −2.5` = false → правило не сработало.

Без суффикса `% rel` — raw сравнение в абсолютных единицах.

### Recommended next step

После прогона на Шаге 04:
1. Для каждого parsed правила вычисляется auto-eval (true/false/null)
2. Unparseable правила (например `Статистически незначимо, но направление positive в 2+ сегментах`) — manual checkbox («сработало» / «не сработало»)
3. Если сработали несколько — приоритет `SHIP → ITERATE → KILL`
4. Генерируется параграф «Recommended next step» в `readout.md`

**ADR-004:** тул **не подменяет** PM-решение. Поле «Принятое решение» остаётся пустым — заполняешь сам. Рекомендация — подсказка, не приказ.

---

## 7. Data Peek

**Что это:** опциональная загрузка CSV с историческими данными **до запуска** теста. Тул посчитает baseline и σ из реальных данных вместо твоих предположений.

**Зачем:**
- **Continuous:** σ из формулы напрямую влияет на размер выборки. Без peek используется bootstrap-приближение ±20-30%. С peek — точный расчёт через t-test.
- **Ratio:** ковариация числителя/знаменателя для delta method. Без peek — CV=1 приближение.
- **Proportion:** для пропорций σ выводится из p (`sqrt(p(1-p))`), peek полезен только для уточнения baseline.

**Что считается:**
- `baseline_computed` — реальный baseline из данных
- `std_computed` — σ метрики (для continuous)
- `ratio_variance` — через delta method (для ratio)
- `skewness, kurtosis` — проверка распределения (если skewness > 2 или kurtosis > 7 → предупреждение «нужен MW или bootstrap»)
- `cv_value` — daily CV для stability check (CV < 0.3 = stable, > 0.3 = volatile)
- `raw_values` (reservoir sample до 1000) — для histogram

**Distribution check** возвращает один из 4 лейблов:
- `ok` — приблизительно нормальное
- `skewed` — |skewness| > 1
- `heavy_tailed` — excess kurtosis > 3
- `skewed_heavy` — оба

Эти лейблы влияют на рекомендацию test_method (например `skewed_heavy continuous` → welch или MW вместо t_test).

---

## 8. Что мы НЕ делаем — намеренно

Это не «технический долг», это **осознанные решения об охвате продукта**. Каждое — с обоснованием.

### Sequential testing / always-valid CI

**Что это:** методы, позволяющие «подглядывать» в результаты теста до достижения plan sample size и принимать решение раньше, при этом сохраняя контроль false positive rate (mSPRT, Optimizely Stats Engine).

**Почему не делаем в v1:**
- Требует серьёзной методологической работы
- Малый user base в v1 — не понятно стоит ли фича разработки
- Существуют качественные коммерческие альтернативы (Optimizely / Eppo)

**Кандидат на v2.** См. ADR-009.

### Heterogeneous treatment effects (HTE) / segmented ATE

**Что это:** не «средний эффект по всем юзерам», а «у разных сегментов разный эффект» (causal forests, uplift models).

**Почему не делаем:**
- Тяжело реализовать на клиенте
- Требуется высокий уровень понимания  — multiple testing на сегментах без корректировки даёт ложные находки
- В stat·plan есть **простой сегментный анализ** (опциональная ячейка) — описательный, не для решений

### Causal inference (DiD, IV, RDD)

**Что это:** методы для квази-экспериментов, когда полная рандомизация невозможна (geo-эксперименты, instrumental variables, regression discontinuity).

**Почему не делаем:** stat·plan про **A/B-тесты с рандомизацией**. Quasi-experiments — отдельная дисциплина с другими допущениями. 

### Bayesian A/B testing

**Что это:** альтернативный фреймворк — вместо p-value и CI используем prior + posterior distribution, decision criterion = `P(treatment > control)`.

**Почему не делаем в v1:**
- Большинство PM-ов работают в frequentist парадигме (тренинг, инструменты)
- Bayesian требует prior — отдельный вопрос «откуда взять prior», который добавляет сложности обработки в брифе
- AI-компаньон NotebookLM покрывает Bayesian как теорию

**Кандидат на v2** если будет реальный запрос.

### Cross-validation

**Что это:** в исходном дизайне Шага 04 планировался независимый пересчёт Δ/p/CI из CSV (тул считает заново, сверяет с тем что прислал пользователь).

**Почему отказались:** это **circular validation** — пересчитывать теми же формулами, которыми генерировали ноутбук, не защищает от наших же багов. Если в нашем коде есть ошибка — она будет в обоих местах.

Альтернативы (Bayesian параллельно, sequential testing, permutation tests) требуют обновление сервиса и методологии. 

### Интеграции с DWH / системами аналитики

**Что не делаем:** OAuth, server-side connectors, SQL templates.

**Почему:** противоречит no backend principle. Пользователь сам выгружает CSV. Это медленнее на ~5 минут, но даёт **отчуждаемые артефакты** и **никаких данных наружу**.

### LLM в продакшен-флоу

**Что не делаем:** LLM не выбирает test_method, не пишет decision rules, не интерпретирует результаты. Все правила в коде детерминированные и проверяемые.

**Почему:** тул должен быть **предсказуемым**. PM должен понимать «почему мне рекомендовали этот метод» — для этого формула в коде проверяема. LLM-рекомендация — black box.

**LLM как помощь по теории** — отдельный resource, AI-компаньон в NotebookLM как **методологический справочник**.

---

## 9. Источники

Методология stat·plan опирается на опыт продуктовых команд и публикации, ставшие стандартом в области A/B-тестирования. Ключевые источники:

- **Ron Kohavi, Diane Tang, Ya Xu** — *Trustworthy Online Controlled Experiments* (Cambridge, 2020). Основа методологии Microsoft ExP, самый практичный справочник по A/B-тестам в отрасли.
- **Evan Miller** — [evanmiller.org](https://www.evanmiller.org/) — серия эссе про «подглядывание» (peeking), последовательные тесты, расчёт размера выборки. Особенно «How not to run an A/B test».
- **CXL Institute** — курсы и whitepapers по A/B-тестам для CRO-команд.
- **Booking.com Tech Blog** — серия постов про реальные experiments at scale (SRM diagnostics, novelty в travel-сезонности).
- **Microsoft ExP papers** — Kohavi et al. на arXiv: «Online Controlled Experiments at Large Scale» (2013), «Diagnosing Sample Ratio Mismatch» (2019).
- **Eppo, Statsig, Optimizely docs** — методологические разделы их платформ.

Для conversational углубления и поиска по этим источникам — **[AI-компаньон в NotebookLM](https://notebooklm.google.com/notebook/040498fe-3843-4562-a854-863d2101a0d8)**. Туда загружены 90+ статей, можно задавать вопросы естественным языком и получать ответы с citation на конкретные источники.

---

## Связанные ресурсы

- 📖 [С чего начать](/docs/start) — overview продукта
- 📖 [Туториалы](/docs/tutorial) — три e2e сценария
- ↗ [AI-компаньон](https://notebooklm.google.com/notebook/040498fe-3843-4562-a854-863d2101a0d8) — теория с цитатами
- ↑ Начни свой тест — стартовый экран
