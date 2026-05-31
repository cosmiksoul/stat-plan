# MindMap для NotebookLM — промт и резервная иерархия

> Промт для генерации кастомной MindMap в NotebookLM Studio + резервная иерархия на случай, если автогенерация не даст желаемой структуры. Ограничение NotebookLM: **максимум 3 уровня вложенности** (корень → 1-й уровень → 2-й уровень → 3-й уровень).

## Как использовать

1. Открой [AI-компаньон stat·plan в NotebookLM](https://notebooklm.google.com/notebook/040498fe-3843-4562-a854-863d2101a0d8)
2. Убедись что `docs-methodology.md` загружен как источник (если нет — Sources → Add → Upload, выбери файл)
3. Studio → MindMap → нажми **Customize**
4. Вставь промт из секции ниже
5. Generate → проверь что иерархия соответствует ожидаемой (3 уровня, ветки разбиты адекватно)
6. Если результат не подходит — есть резервная иерархия ниже, её можно вставить вручную

---

## Prompt для NotebookLM Customize

> Скопируй текст между `---` целиком и вставь в окно Customize MindMap в NotebookLM Studio.

---

Сгенерируй MindMap по структуре методологии stat·plan со следующими constraints:

**ROOT:** «Методология stat·plan — A/B-тесты без сюрпризов»

**1-й уровень (ровно 6 ветвей):**
1. Выбор test_method
2. Sample size
3. Sanity checks (SRM, balance)
4. Контроль качества теста (Novelty, Guardrails)
5. Decision rules
6. Что мы НЕ делаем

**2-й уровень — детальная разбивка под каждой 1-st ветвью:**

Под «Выбор test_method»:
- proportion → z-test
- continuous → t-test / Welch
- continuous heavy-tail → Mann-Whitney
- ratio → delta method / bootstrap fallback
- count → t-test / bootstrap

Под «Sample size»:
- Fleiss formula (proportion)
- Cohen's d (continuous)
- Delta method variance (ratio)
- Mann-Whitney поправка ×1.157
- Bootstrap fallback и его warnings
- Edge cases (n<30, n>10M, duration>90, MDE>50%)

Под «Sanity checks»:
- SRM chi² test
- p<0.001 threshold (per Kohavi)
- Sample size vs план
- Direction match vs MDE

Под «Контроль качества теста»:
- Novelty effect (early vs later)
- Tri-state semantics (suspected / not detected / N/A)
- Guardrails (max / min direction)
- Stop conditions при breach

Под «Decision rules»:
- Синтаксис (operator, variable, threshold)
- Aliases (CI lower / нижняя граница / Δ rel / lift / эффект)
- Unicode операторы (≤ ≥ −)
- Unit-aware `% rel` через baseline
- Auto-eval + manual checkbox fallback

Под «Что мы НЕ делаем»:
- Sequential testing / mSPRT
- HTE / causal forests
- Causal inference (DiD / IV / RDD)
- Bayesian A/B
- Independent CSV validation
- Integrations (BigQuery / Amplitude)
- LLM в продакшен-флоу

**3-й уровень — только где даёт depth (опционально):**

Под «Fleiss formula»: формула, пример (baseline=3.1%, MDE=10%, n≈3500)
Под «Delta method variance»: компоненты (Var(N), Var(D), Cov(N,D))
Под «SRM chi² test»: причины (bucketing bias, redirect loss, фильтры ботов)
Под «Novelty tri-state»: True / False / None семантика
Под «Aliases»: список aliases по группам
Под каждым «Что мы НЕ делаем» пунктом: 1-2 sub-узла «почему» + «когда v2»

**Стиль узлов:**
- Короткие labels (1-5 слов)
- Без сложного жаргона где можно
- Иконки/emoji допустимы где помогают: 🎯 для test_method, 📐 для формул, ⚠ для guardrails, 🚫 для disclaimer
- Связи горизонтальные (cross-refs) — пропустить, NotebookLM плохо рендерит

**Источники для содержимого:** docs-methodology.md (этот notebook), Kohavi et al. *Trustworthy Online Controlled Experiments*, Evan Miller essays, CXL whitepapers, Microsoft ExP papers, Booking.com Tech Blog.

Сгенерируй чёткую иерархическую структуру для визуального изучения методологии. Цель — PM может за 30 секунд найти нужный концепт и углубиться через клик.

---

## Резервная иерархия (для ручной правки, если автогенерация выдала не то)

Если автогенерация не даёт желаемую структуру — можно отредактировать вручную в NotebookLM, опираясь на эту иерархию как на образец.

**ROOT:** Методология stat·plan

```
├── 🎯 Выбор test_method
│   ├── proportion → z-test
│   ├── continuous → t-test / Welch
│   ├── continuous heavy-tail → Mann-Whitney
│   ├── ratio → delta method
│   │   └── bootstrap fallback
│   └── count → t-test / bootstrap
│
├── 📐 Sample size
│   ├── Fleiss formula (proportion)
│   │   └── Пример baseline 3.1% MDE 10% → n≈3500
│   ├── Cohen's d (continuous)
│   ├── Delta method variance (ratio)
│   │   └── Var(N), Var(D), Cov(N,D)
│   ├── Mann-Whitney поправка ×1.157
│   ├── Bootstrap fallback (без σ)
│   └── Edge cases
│       ├── n<30 too small
│       ├── n>10M unrealistic
│       ├── duration>90d too long
│       └── MDE>50% too optimistic
│
├── ✓ Sanity checks
│   ├── SRM chi² test
│   │   ├── Причины: bucketing bias / redirect loss / фильтры
│   │   └── p<0.001 threshold (Kohavi)
│   ├── Sample size vs план (total_n match)
│   └── Direction match vs MDE
│
├── ⚠ Контроль качества теста
│   ├── Novelty effect
│   │   ├── early days (1-2) vs later (3+)
│   │   └── Tri-state: True / False / None
│   ├── Guardrails
│   │   ├── direction: max / min
│   │   ├── threshold в % rel
│   │   └── breach detection
│   └── Stop conditions
│       ├── SRM detected
│       └── Guardrail breach > 24h
│
├── 📋 Decision rules
│   ├── Синтаксис: variable operator threshold
│   ├── Aliases
│   │   ├── CI lower / нижняя граница
│   │   ├── CI upper / верхняя граница
│   │   ├── delta_rel / Δ rel / lift / эффект
│   │   └── p_value / p-value / p-значение
│   ├── Unicode операторы ≤ ≥ −
│   ├── Unit-aware % rel
│   │   └── derived ci_*_pct_rel через control_mean
│   └── Auto-eval + manual checkbox
│
└── 🚫 Что мы НЕ делаем
    ├── Sequential testing / mSPRT
    │   └── v2 candidate (нужна методология)
    ├── HTE / causal forests
    │   └── Слишком тяжело client-side
    ├── Causal inference (DiD / IV / RDD)
    │   └── Другая дисциплина
    ├── Bayesian A/B
    │   └── v2 если будет запрос
    ├── Independent CSV validation
    │   └── Circular validation
    ├── Integrations (BigQuery / Amplitude)
    │   └── Противоречит no backend
    └── LLM в продакшен-флоу
        └── Нужна предсказуемость; LLM как теория в AI-компаньоне
```

---

## После генерации MindMap

1. **Audio Overview** — Studio → Audio Overview → Generate. NotebookLM сгенерит обзор методологии в формате подкаста (5-15 минут).
2. **Slide Deck** — Studio → Slide Deck. Структурированная презентация.
3. **Video Overview** — Studio → Video Overview (если доступно). Визуальное повествование.
4. **Flashcards** — Studio → Flashcards. Карточки «термин → определение» по ключевым понятиям методологии. Подходят для повторения и onboarding.

### Промт для Flashcards (опционально)

Если автогенерация даёт слишком общие карточки — можно подсказать конкретный список терминов через Customize:

```
Сгенерируй флэш-карточки по ключевым терминам методологии A/B-тестирования из stat·plan.
Формат каждой карточки: front — термин (1-3 слова), back — определение (1-3 предложения, простым языком, без жаргона где можно).

Обязательно покрыть термины:
- Sample size, MDE, α (alpha), power (1-β), baseline
- Z-test для пропорций, t-test, Welch t-test, Mann-Whitney
- Delta method, bootstrap
- SRM (Sample Ratio Mismatch), chi² test
- Novelty effect, guardrails, stop conditions
- Decision rules (SHIP / ITERATE / KILL)
- Confidence interval (CI), p-value, statistical significance
- Random assignment unit (user / session / cluster)
- Data Peek, distribution check, skewness, kurtosis
- CUPED variance reduction
- Sequential testing, HTE (heterogeneous treatment effects)

Источник: docs-methodology.md и публикации Kohavi, Evan Miller, CXL.

Цель: PM может прогнать колоду за 10 минут и закрепить терминологию перед запуском теста.
```

**Studio артефакты могут использоваться для:**
- Введение новых членов команды в курс дела («послушай обзор 10 минут — поймёшь как работает наш A/B-тул»)
- Презентация заинтересованным сторонам или руководству («вот методология, на которой основан тул»)
- Самостоятельное обучение PM-ов, осваивающих A/B-методологию
- Закрепление терминологии через карточки (flashcards) — особенно полезно при возвращении к продукту после паузы

---

## Связано

- `docs/content/docs-methodology.md` — source для prompt
- `outputs/stat-plan-concept-for-notebooklm.md` — draft для оформления обложки notebook'а
- [NotebookLM «stat·plan: A/B & CRO companion»](https://notebooklm.google.com/notebook/040498fe-3843-4562-a854-863d2101a0d8) — сам notebook
