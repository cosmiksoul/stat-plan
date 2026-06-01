# Sprint 6 FIX iter 1 — Browser RETEST (runnable)

**Дата:** 2026-05-29
**Тестируемое:** локально через `npm run dev` → `http://localhost:5173/stat-plan/`
**Стратегия:** ~10 мин, 7 кейсов click-by-click. Цель — закрыть Phase A/B/D/E + 1 regression sanity + 1 round-trip.

**Перед стартом:**
1. `npm run dev` в проекте.
2. Открой `http://localhost:5173/stat-plan/`.
3. **Hard reload** (Cmd+Shift+R / Ctrl+Shift+R) — чтобы Vite перезагрузил pre-bundled recharts.
4. **Очисти localStorage** для чистого старта: в DevTools Console → `localStorage.clear()` → перезагрузить страницу. Это уберёт мусорное состояние baseline=0.1 fraction для continuous из прошлой сессии.
5. **Открой DevTools Console** — оставь видимой, чтобы ловить ошибки (особенно Phase A recharts).
6. **Скачай CSV-файлы:** `peek_continuous.csv`, `peek_continuous_skewed.csv`, `peek_ratio.csv` из тех файлов, что я presents'ил в прошлый раз (`peek_*.csv`).

---

## Как пользоваться

1. Заполняешь статус: `ok` / `bug` / `n/a`.
2. Если `bug` — кратко опиши что не так в Bugs found внизу.
3. Не пропускай кейсы — каждый строится на предыдущем (state переиспользуется).

---

## Кейс 1 — Phase A: recharts не падает, Q08 реактивен

**Что делаем:**

1. Стартовый экран → нажми **«Начать с брифа»**.
2. **Q01 Цель теста** — выбери первый вариант (например «Изменение продукта») → **Дальше**.
3. **Q02 Гипотеза** — введи любой текст по шаблону: `Если уменьшим время загрузки, то ARPU вырастет на 5%, потому что меньше abandonment` → **Дальше**.
4. **Q03 Тип метрики** — выбери **«Средняя величина (ARPU, время на сайте)»** → **Дальше**.
5. **Q04 Имя метрики** — Название: `ARPU`, Колонка: `arpu` → **Дальше**.
6. **Q05 Baseline** — value `100`, unit dropdown должен быть **«абс.»** (см. кейс 2). Введи `100`, выбери `абс.` → **Дальше**.
7. **Q06 Единица рандомизации** — оставь **«Пользователь»** preselected → **Дальше**.
8. **Q07 MDE** — value `5`, unit `Относительный %` → **Дальше**.
9. **Q08 Доступный трафик** — value `60000`, unit `польз./день`.
10. Под полем ввода Q08 должен быть **SAMPLE/ARM** display + блок **DATA PEEK** (open by default для continuous без peek).
11. В DATA PEEK блоке → tab **CSV** → drag-drop `peek_continuous.csv`.

**Expected:**

- ✅ **Histogram отрисован** — один большой колоколообразный (нормальное распределение). **Console чистый — никаких `require_isUnsafeProperty` ошибок.**
- ✅ **SAMPLE/ARM немедленно обновлён** (без reload) — должно быть в порядке ~5000 per arm, длительность ~0.2 дня (округлено до 1 дня). Если показывается ~700M / 279K дней — BUG-Q4 не закрыт, флагни.
- ✅ DataPeekStats показывает: ИСТОЧНИК CSV, BASELINE ~100.43 vs 100 → ✓ Δ ≈ +0.4%, σ ~80, РАСПРЕДЕЛЕНИЕ ✓ нормальное.

| Phase | Status |
|---|---|
| A (recharts) | |
| BUG-Q4 (sample size) | |
| BUG-Q3 (реактивность Q08) | |

---

## Кейс 2 — Phase B + F: dropdown units на Q05 для всех metric_type (continuous БЕЗ dropdown)

**ВАЖНО:** Phase F (добавлен 2026-05-29) убирает dropdown для continuous. Q05 для continuous теперь — только числовой инпут + подсказка про единицы метрики. Если в коде ещё Phase B (dropdown «абс.») — flag bug и проси Code добить Phase F.

**Что делаем (без перезагрузки, продолжаем с кейса 1):**

1. Кликни в шапке на **01 Бриф** → возврат на Q01.
2. В карте вопросов справа кликни на **Q05 Baseline** — должен открыться вопрос.
3. Посмотри на поле Q05. Для **continuous** (твой текущий выбор) — должно быть **только number input** + подсказка / placeholder про единицы («в единицах метрики (₽, сек, ARPU)» или похожее). **Никакого dropdown.**
4. В карте вопросов кликни на **Q03 Тип метрики** → смени выбор на **«Конверсия / proportion»** → подожди → вернись в Q05.
5. Поле value Q05 — должен появиться **dropdown с опциями `% / доля / число`** (одну из них — текущую).
6. В карте вопросов снова Q03 → смени на **«Ratio»** → подожди → Q05.
7. Поле value Q05 — **dropdown** с `% / доля / число`.
8. Снова Q03 → смени на **«Количество событий (count)»** → Q05.
9. Поле value Q05 — **dropdown** с `на юзера`.
10. Вернись на Q03 → выбери обратно **continuous** → Q05.
11. Q05 снова **без dropdown** — только число + подсказка.

**Expected:**

- ✅ proportion / ratio / count: Q05 показывает **dropdown** с правильными units.
- ✅ continuous: Q05 показывает **только number input** (без dropdown, без free-text-инпута для unit).

**Side concern для проверки (Phase F session migration):** если в localStorage от прошлой Phase B сессии остался `baseline.unit='absolute'` для continuous — после reload должно автоматически стать `null` (unit-поля нет, value сохранился). **Флагни если** value сохранился, а где-то в state остаётся `'absolute'` (можно проверить в DevTools → Application → Local Storage → ключ `stat-plan:v1:state`).

| Что | Status |
|---|---|
| Phase B+F: dropdown для proportion/ratio/count | |
| Phase F: continuous БЕЗ dropdown (только число) | |
| Phase F: session migration (старый unit='absolute' → null) | |

---

## Кейс 3 — Phase B session preserve

**Что делаем:**

1. Без сохранения / approve — просто закрой вкладку браузера.
2. Открой `http://localhost:5173/stat-plan/` заново.
3. Должен попасть туда, где остановился (через localStorage).
4. Кликни в карте вопросов на **Q05 Baseline** и **Q07 MDE** — посмотри сохранены ли значения и units.

**Expected:**

- ✅ Q05 baseline value сохранился + unit сохранился (как было перед закрытием вкладки).
- ✅ Q07 MDE сохранился (value + relative_percent unit).

| Status |
|---|
| |

---

## Кейс 4 — Phase D: visual refresh после «↳ ПОДСТАВИТЬ В Q05»

**Что делаем (свежий старт):**

1. В Console: `localStorage.clear()` → reload.
2. Стартовый → Начать с брифа → пройди Q01-Q07 быстро (любые валидные значения для continuous).
3. На **Q05 Baseline**: введи value = `54`, unit = `абс.`. (54 близко к median log-normal.)
4. На **Q07 MDE**: `5%` relative.
5. На **Q08 traffic**: `60000`.
6. DATA PEEK блок → tab CSV → drag-drop **`peek_continuous_skewed.csv`** (log-normal).
7. DataPeekStats должен показать: BASELINE ~93.12 vs **твой 54** → **⚠ Δ ≈ +72.4%** (mismatch) + кнопка **«↳ ПОДСТАВИТЬ В Q05»**.
8. **Кликни** на кнопку «↳ ПОДСТАВИТЬ В Q05».

**Expected:**

- ✅ Сразу после клика DataPeekStats показывает: BASELINE ~93.12 vs **твой 93.12** → **✓ Δ ≈ 0%** — иконка ✓ зелёная, **кнопка «ПОДСТАВИТЬ» исчезла**.
- ✅ В карте вопросов кликни на Q05 — value = `93.12` (округлено), unit = `абс.`.

**Если ⚠ остался / кнопка не пропала / value в Q05 не обновился** — bug C-1 не закрыт, флагни.

| Status |
|---|
| |

---

## Кейс 5 — Phase E: 3 малых histogram для ratio

**Что делаем (продолжаем с кейса 4, ничего не очищаем):**

1. В карте вопросов кликни **Q03 Тип метрики** → смени на **«Ratio»**.
2. Появится **Q03.1** (sub-question) с двумя полями. Введи: numerator = `clicks`, denominator = `sessions`.
3. Пройди до **Q05** baseline = `0.1`, unit = `доля` (или то что dropdown даёт).
4. Дойди до **Q08** (traffic тот же 60000).
5. DATA PEEK блок → tab CSV → **сначала сбрось текущий peek** кликом «↺ Сбросить data peek» (если активен).
6. Drag-drop **`peek_ratio.csv`**.

**Expected:**

- ✅ В DataPeekBlock после histogram — **3 малых histogram в одну строку** (на десктопе; на мобильном — вертикально):
  - Левый: подпись **«Числитель (clicks)»**
  - Средний: **«Знаменатель (sessions)»**
  - Правый: **«Ratio (clicks/sessions)»**
- ✅ SAMPLE/ARM на Q08 — без warning «bootstrap fallback», метод `delta_method`.

| Status |
|---|
| |

---

## Кейс 6 — Regression sanity: continuous CSV → 1 histogram, manual peek → нет histogram

**Что делаем:**

1. В карте → Q03 → смени обратно на **continuous**.
2. Q04 metric_column = `arpu`, Q05 baseline = `100` `абс.`, Q07 MDE = `5%`, Q08 traffic = `60000`.
3. DATA PEEK → tab CSV → сбрось текущий peek → drag-drop **`peek_continuous.csv`**.

**Expected:**

- ✅ **Один большой histogram** (как в кейсе 1, не 3).

**Затем:**

4. Сбрось peek → tab **Ручной ввод** → введи σ = `80` → submit.

**Expected:**

- ✅ DataPeekStats: ИСТОЧНИК `ручной ввод`, σ = 80, distribution/CV пусто.
- ✅ **Histogram не показывается** (raw_values нет).
- ✅ SAMPLE/ARM без warning, метод `t_test`.

| Status |
|---|
| |

---

## Кейс 7 — Round-trip 3 histogram через test_plan.md

**Что делаем (продолжаем с кейса 5 или 6 — нужно сначала сделать ratio + CSV peek):**

1. Если сейчас continuous (после кейса 6) — вернись в ratio с CSV peek (повтори кейс 5 чтобы был активный ratio peek).
2. Пройди Q09 (Guardrails — можно пропустить с дефолтами), Q10 (stop/decision — оставь дефолты).
3. Зеленая кнопка «**Дальше**» → попадаешь на /step2 Тест-план.
4. Нажми **«Утвердить план»** → подтверди → шаг 3 разблокирован.
5. Вернись на /step2 (через шапку) → нажми **«↓ Скачать test_plan.md»** → сохрани файл.
6. Открой скачанный test_plan.md в любом текстовом редакторе → найди секцию `data_peek:` → должны быть **строки `raw_values_numerator:` и `raw_values_denominator:`** (массивы по ~1000 чисел).
7. В Cowork-UI: нажми **«↺ Начать сначала»** в шапке → подтверди → вернёшься на стартовый экран.
8. Drag-drop скачанный test_plan.md на стартовый экран.
9. Должен попасть на /step3.
10. В шапке → 01 Бриф → Q08 → раскрой DataPeekBlock.

**Expected:**

- ✅ В скачанном `test_plan.md` есть `raw_values_numerator` и `raw_values_denominator` в секции `data_peek`.
- ✅ После reload через drag-drop — DataPeekBlock collapsed с badge `✓ Data Peek применён (csv)`.
- ✅ Открыв → **3 малых histogram** восстановлены (numerator + denominator + ratio).
- ✅ DataPeekStats показывает те же числа что до reload (BASELINE, Var(N/D), etc).

| Status |
|---|
| |

---

## Bugs found

| # | Severity | Что не работает | Где | Reproduction |
|---|---|---|---|---|
| | | | | |

---

## Резюме RETEST

**Дата:** ___
**Время:** ___ мин
**Кейсов:** 7 / pass: ___ / bug: ___

**Phase A (recharts):** ___
**Phase B (dropdown + side concern):** ___
**Phase D (visual refresh):** ___
**Phase E (3 histogram + round-trip):** ___
**BUG-Q3/Q4 закрыты автоматически:** ___

**Следующая фаза:**
- Если все ✅ → Sprint 6 закрыт. **CLOSE Sprint 6 (Cowork-зона):** CONTEXT timeline + PROJECT_STATUS roadmap + JTBD §4 закрыть `[x]` для реализованных user stories.
- Если есть concern из кейса 2 (preserve unit при смене metric_type) → решить нужен ли FIX iter 2.
- Если есть критичные bugs → FIX iter 2 prompt.
