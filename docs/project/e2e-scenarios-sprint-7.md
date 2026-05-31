# E2E сценарии для QA Sprint 7

**Дата:** 2026-05-30
**Цель:** проверить **полный цикл продукта** Sprint 1-7 на трёх реалистичных продуктовых кейсах. От стартового экрана до скачанного `report.html`.

**Каждый сценарий проходится за ~10-15 минут:**
1. Бриф (Q01-Q10) с конкретными ответами
2. Утверждение плана
3. Шаг 3 — конструктор ноутбука (опц. ячейки, editable schema)
4. Скачать `analysis.ipynb`
5. Выполнить в Colab/Jupyter на прилагаемом CSV
6. Сохранить выполненный `.ipynb`
7. Drag-drop на /step4
8. Сравнить с **Expected report** ниже

**Готовые CSV-файлы для QA (present_files после md):**

| Файл | Сценарий | Кратко |
|---|---|---|
| `e2e_a_first_deposit.csv` | A (proportion SHIP) | 9 000 строк, CR control=3.1%, treatment=4.0%, Δ ≈ +29% rel |
| `e2e_b_arpu.csv` | B (continuous inconclusive) | 10 000 строк, ARPU control=104.9, treatment=106.6, Δ ≈ +1.6% (недотест) |
| `e2e_c_partner_ctr.csv` | C (ratio winner) | 7 000 users / 57 640 sessions, CTR control=9.0%, treatment=11.1%, Δ ≈ +23% rel |

**Подготовка:**
1. Запусти dev-сервер: `npm run dev` → `http://localhost:5173/stat-plan/`.
2. **`localStorage.clear()`** в DevTools Console → reload (чистый старт).
3. Скачай 3 CSV из present-files ниже.
4. Открой [Google Colab](https://colab.research.google.com) в соседней вкладке — там будем запускать ноутбуки. Альтернатива — локальный Jupyter если есть.

---

## Как пользоваться

Для каждого сценария — заполняй статус секций: `ok` / `bug` / `n/a`. В конце — резюме. Если bug — добавь в Bugs found.

---

# Сценарий A — Proportion + SHIP (winner test)

## Контекст

Маркетинг-команда переделала onboarding-флоу первого депозита. **Гипотеза:** новый флоу повысит конверсию в first deposit на ≥10% rel. **Baseline CR ≈ 3%**, целевой MDE +10%.

**Прилагаемый CSV `e2e_a_first_deposit.csv`** имитирует реально прогнанный тест: **9 000 строк** (4500/4500). **Реальный** Δ в CSV ≈ +29% rel (control CR=3.09%, treatment CR=3.96%) — намного сильнее MDE +10%. Даже с n=4500/arm (вместо теоретических ~51k) z-test даст **p ≈ 0.025** → significant → SHIP. Это **демо-сценарий** — для e2e flow нам нужен значимый результат, а полный recommended sample size в demo CSV избыточен.

## Шаг 1 — Бриф

Стартовый экран → «Начать с брифа». Пройди вопросы:

| Q | Поле | Значение |
|---|---|---|
| Q01 | Цель теста | **Изменение продукта (фича, UX)** (preselect — просто «Дальше») |
| Q02 | Гипотеза | `Если переделать onboarding-флоу первого депозита, то конверсия first deposit вырастет на 10% rel, потому что меньше дроп-офф на шаге подтверждения` |
| Q03 | Тип метрики | **Конверсия / proportion (0 или 1)** |
| Q04 | Название | `First deposit conversion`; Колонка в CSV: `cr_first_deposit` |
| Q05 | Baseline | `0.031` (CR fraction, dropdown «доля» или подобное) |
| Q06 | Единица рандомизации | **Пользователь** (preselect) |
| Q07 | MDE | `10`, единицы `Относительный %` |
| Q08 | Доступный трафик | `60000` (пользователей/день) — крупный consumer-сервис |
| Q09 | Guardrails | Один guardrail: `bounce_rate`, направление `max`, threshold `5`, единицы `relative_percent` |
| Q10 | Stop & Decision rules | Можно оставить defaults |

**Ожидаемый расчёт под Q08:** sample size ≈ **~51 000 per arm** (для low-baseline CR 3.1% + MDE 10% rel — нужно много данных), длительность ≈ **~2 дня** при traffic 60 000/день, метод `z_test_proportions`. **Sanity:** если поставишь Q08 = `1000` — план покажет ~103 дня с warning «нереалистично» (продукт честно говорит «недостаточно трафика»). Это **не баг, а правильное поведение** — для proof-of-concept e2e flow поднимаем traffic.

| Section | Status |
|---|---|
| Q01-Q10 пройдены, sample size показан | |

## Шаг 2 — Утвердить план

На `/step2` посмотри preview test_plan.md (YAML + markdown), score должен быть в диапазоне **80-95/100** (полный бриф = высокий score). Нажми **«✓ Утвердить план»**.

| Section | Status |
|---|---|
| Score ≥ 80, план утверждён | |

## Шаг 3 — Конструктор ноутбука

На `/step3` (Конструктор):
- Обязательные ячейки: оставь все включёнными (load, srm, balance, novelty, main_test, guardrails, export).
- Опциональные: **включи `segments`** (для сегментного анализа по `day`).
- **Editable schema** (новая фича Sprint 7): попробуй переименовать колонку `bounce_rate` → `bounce_rate` (т.е. ничего не менять — это просто проверка что UI работает). Или поэкспериментируй с rename для одной строки и потом reset.
- Скачай **`analysis.ipynb`**.

| Section | Status |
|---|---|
| ipynb скачан | |
| Editable schema работает | |

## Шаг 4 — Запустить ноутбук в Colab

1. Открой [colab.research.google.com](https://colab.research.google.com) → File → Upload notebook → выбери скачанный `analysis.ipynb`.
2. На левой панели Colab → Files → Upload → выбери `e2e_a_first_deposit.csv` (он окажется в `/content/`).
3. В первой code-cell измени `CSV_PATH = 'experiment_results.csv'` на `CSV_PATH = '/content/e2e_a_first_deposit.csv'`.
4. Runtime → **Run all** (или Ctrl+F9).
5. Дождись пока все ячейки выполнятся (~10-30 секунд).
6. Проверь что **последняя ячейка** (с тегом `stat-plan-results`) показала JSON output вида:
   ```json
   {
     "control_n": 4500,
     "treatment_n": 4500,
     "delta_rel": 0.28...,
     "p_value": <very small, e.g. 0.005>,
     "ci_lower": <positive>,
     "ci_upper": <positive>,
     ...
   }
   ```
7. File → Download → **Download .ipynb** → сохрани локально.

| Section | Status |
|---|---|
| Все cells выполнились без error | |
| stat-plan-results JSON output виден | |
| Скачан выполненный .ipynb | |

## Шаг 5 — Загрузить отчёт в stat·plan

1. На `/step4` (Stepper → «04 Валидация и отчёт»).
2. Drag-drop выполненный `.ipynb` на upload-зону.
3. Badge **✓ Результаты извлечены** появляется зелёным.
4. Все 6 секций ниже заполнены автоматически:

### Expected report

| Секция | Что должно быть |
|---|---|
| **Source badge** | ✓ Результаты извлечены из `<filename>.ipynb` |
| **2. Результаты** | control_n=4500, treatment_n=4500, delta_rel ≈ +28-29%, p_value < 0.001, ci_lower и ci_upper > 0 (оба позитивные) |
| **3. Sanity checks** | SRM ✓ pass (pvalue ~0.5-1.0, balanced 4500/4500). Sanity total_n match ✓ (9000 ≈ 2× plan), direction_match ✓ (positive delta совпадает с MDE direction=increase) |
| **4. Decision rules** | Правила из брифа (если дефолты или ввёл свои). Парсер пытается auto-flag. Поставь dropdown «SHIP» — это рекомендация |
| **5. Графики из ноутбука** | 1-3 matplotlib PNG (зависит от ячеек) — bar chart counts, может быть histogram CR по дням, etc |
| **6. Скачать артефакты** | 3 кнопки: HTML / MD / ZIP |

5. Нажми **«↓ Скачать report.html»**. Открой в новой вкладке.

### Expected HTML отчёт

- Тёмная палитра под stat·plan UI
- Header `# {test_id}`
- TL;DR auto-generated: что-то вроде «Δ = +28.8%, CI [+19.5%, +38.5%], p < 0.001. Recommendation: SHIP»
- Section «Результаты» с числами и встроенными matplotlib PNG графиками
- Section «Sanity checks» с ✓
- Section «Decision rules» с SHIP-рекомендацией
- Section «Принятое решение» — пустая (заполняешь руками)
- Footer «Generated by stat·plan ...»

| Section | Status |
|---|---|
| ipynb автозаполнил форму | |
| Графики из ноутбука встроены в HTML | |
| HTML self-contained (работает оффлайн) | |

---

# Сценарий B — Continuous + INCONCLUSIVE

## Контекст

Команда добавила новый ценовой блок на checkout. **Гипотеза:** новый блок повысит ARPU на ≥5% rel. **Baseline ARPU ≈ 100₽**. Тест прошёл **недо-power'ленный**: реальный эффект ~1-2%, что меньше MDE → p будет high, **inconclusive**.

**Прилагаемый CSV `e2e_b_arpu.csv`:** 10 000 строк (5000/5000 split), ARPU control=104.9, treatment=106.6, Δ ≈ +1.6% rel. σ ≈ 80.

## Шаг 1 — Бриф

| Q | Поле | Значение |
|---|---|---|
| Q01 | Цель | **Изменение продукта** |
| Q02 | Гипотеза | `Если показать новый ценовой блок на checkout, то ARPU вырастет на 5% rel, потому что лучше воспринимаемая ценность` |
| Q03 | Тип метрики | **Средняя величина (continuous)** |
| Q04 | Название | `ARPU`; Колонка: `arpu` |
| Q05 | Baseline | `100` (без dropdown — Phase F: continuous = только number input) |
| Q06 | Randomization unit | **Пользователь** |
| Q07 | MDE | `5`, единицы `Относительный %` (увидишь approx-info на ratio/continuous из Sprint 5 P-4) |
| Q08 | Daily traffic | `1000` |
| Q09 | Guardrails | `time_on_site`, направление `min`, threshold `10`, единицы `relative_percent` |
| Q10 | Stop & Decision rules | defaults |

**Ожидаемый расчёт:** sample size ≈ **~5000 per arm** (для σ=80, baseline=100, MDE 5%), длительность ~10 дней, метод `t_test`. **Без Data Peek** даст warning о bootstrap fallback (σ неизвестна) — **опционально загрузи `peek_continuous.csv` из Sprint 6** в DataPeekBlock на Q08, чтобы получить точный расчёт.

| Section | Status |
|---|---|
| Q01-Q10 пройдены | |
| (Опц.) Data Peek загружен → точный sample size | |

## Шаг 2 — Утверждение + Шаг 3 — Скачать ipynb

Утверди план. На Шаге 3 — оставь дефолты, скачай `analysis.ipynb`.

## Шаг 4 — Запустить в Colab

Аналогично сценарию A. CSV → `e2e_b_arpu.csv`, в первой code-cell поменяй `CSV_PATH`. Run all.

**Ожидаемые числа в stat-plan-results:**
```json
{
  "control_n": 5000,
  "treatment_n": 5000,
  "delta_rel": ~0.016,            // small effect ~1.6%
  "p_value": <high, > 0.1>,      // not significant
  "ci_lower": <negative or small>,
  "ci_upper": <positive>,
  ...
}
```

## Шаг 5 — Отчёт

### Expected report

| Секция | Что должно быть |
|---|---|
| Результаты | delta_rel ≈ +1.6%, p_value > 0.1 (high), CI пересекает 0 (lower < 0 < upper) |
| Sanity checks | SRM ✓ pass, sample size match ✓, direction ✓ (positive, но slabый) |
| Decision rules | Рекомендация **ITERATE** или «Решение остаётся за PM» (если правила не сработали) |
| HTML отчёт | TL;DR: «эффект статистически незначим, требуется больше данных или другая гипотеза» |

| Section | Status |
|---|---|
| Inconclusive verdict корректно отражён | |

---

# Сценарий C — Ratio + WINNER (delta method)

## Контекст

Партнёрский баннер на странице товара. **Гипотеза:** новый баннер повысит CTR на партнёрский клик на ≥15% rel. **Baseline CTR ≈ 9%** (clicks/sessions per user). Реальный Δ в CSV ≈ +23% rel.

**Прилагаемый CSV `e2e_c_partner_ctr.csv`:** 7 000 users (3500/3500), user-level (clicks + sessions per user). Control CTR=9.03%, treatment CTR=11.09%.

## Шаг 1 — Бриф

| Q | Поле | Значение |
|---|---|---|
| Q01 | Цель | **Изменение продукта** |
| Q02 | Гипотеза | `Если показать новый партнёрский баннер на странице товара, то CTR на партнёрский клик вырастет на 15% rel, потому что выше CTA visibility` |
| Q03 | Тип метрики | **Ratio (числитель/знаменатель из разных юнитов)** |
| Q03.1 | numerator | `clicks` |
| Q03.1 | denominator | `sessions` |
| Q04 | Название | `Partner CTR`; Колонка: `partner_ctr` |
| Q05 | Baseline | `0.09` (доля) |
| Q06 | Randomization unit | **Пользователь** |
| Q07 | MDE | `15`, единицы `Относительный %` |
| Q08 | Daily traffic | `500` (users/день) |
| Q09 | Guardrails | можно пропустить |
| Q10 | defaults | |

**Без Data Peek** для ratio sample size упадёт на bootstrap fallback с warning. **Опционально:** загрузи `peek_ratio.csv` из Sprint 6 — получишь точный delta_method.

| Section | Status |
|---|---|
| Q01-Q10 пройдены, Q03.1 numerator/denominator заполнены | |

## Шаг 2-3 — Утвердить + скачать ipynb

Аналогично. На Шаге 3 — посмотри что в Expected schema у тебя **две** колонки `clicks` и `sessions` (а не одна `partner_ctr`). Скачай ipynb.

## Шаг 4 — Запустить в Colab

CSV → `e2e_c_partner_ctr.csv`. Run all.

**Ожидаемые числа:**
```json
{
  "control_n": 3500,
  "treatment_n": 3500,
  "delta_rel": ~0.22-0.23,         // +23%
  "p_value": <small, ~ 0.001>,
  "ci_lower": <positive>,
  "ci_upper": <positive>,
  ...
}
```

## Шаг 5 — Отчёт

### Expected report

| Секция | Что должно быть |
|---|---|
| Результаты | delta_rel ≈ +23%, p_value < 0.01, CI обе границы > 0 |
| Sanity checks | SRM ✓ pass (3500/3500), total_n match ✓ |
| Decision rules | Рекомендация SHIP |
| HTML отчёт | TL;DR положительный, графики из ноутбука (вероятно CTR по дням) |

| Section | Status |
|---|---|
| Ratio + delta method работает end-to-end | |

---

# Кросс-сценарные проверки

| # | Что | Status |
|---|---|---|
| X1 | После любого сценария — кнопка **«↺ Сбросить результаты»** на /step4 действительно очищает state.results (включая base64 PNG) | |
| X2 | После любого сценария — кнопка **«↺ Начать сначала»** в шапке очищает **всё** (бриф, план, результаты) | |
| X3 | **Backward-compat:** одно из 3 — open Sprint 6 ipynb без `stat-plan-results` cell (если есть из прошлого теста) → fallback на форму, PNG всё равно подцепляются | |
| X4 | Скачивание `.zip` — внутри 4 файла (`test_plan.md`, `analysis.ipynb`, `report.html`, `readout.md`) | |
| X5 | Stepper всегда **4 шага** (нет «05 Скачать артефакты») | |

---

# Bugs found

| # | Severity | Что не работает | Где | Сценарий + repro |
|---|---|---|---|---|
| | | | | |

---

# Резюме

**Дата прохождения:** ___
**Время:** ___ мин (на 3 сценария + кросс-проверки)
**Сценариев:** A=___ / B=___ / C=___ / X1-X5=___

**Что узнал нового про продукт (из прохождения e2e):**

___

**Что осталось доработать (для polish-pack v2 или Sprint 8):**

___

**Следующая фаза:**
- Если все scenarios + X1-X5 = ok → **Sprint 7 CLOSE** (Cowork-зона): DATA_MODEL.md schema, JTBD §7+§6 [x], CONTEXT timeline, PROJECT_STATUS, FLOW.md лёгкая корректировка.
- Если bugs > 0 → Sprint 7 FIX iter 1 prompt.
