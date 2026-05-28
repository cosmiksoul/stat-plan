# Polish Pack (Sprint 5 prep)

> Сборник мелких UX-фиксов и tech-debt задач, накопленных за Sprint 4 RETEST + после Sprint 4 FIX iter 1+2. Кандидат на отдельный mini-sprint перед Sprint 5 main code.

**Создан:** 2026-05-28 (CLOSE Sprint 4)
**Размер:** ~1.5-2 ч Code DEV суммарно
**Назначение:** разгрузить Sprint 4 от non-critical fixes, дать чистый closing. Polish-sprint можно прогнать одной фазой Code, без явных phase A/B/C.

---

## Состав

### UX / readability

**P-1. ✅ FIXED в Sprint 4 FIX iter 2** — user-sanctioned side-scope. Code сделал унификацию footer'а на step 1-3 (QuestionNav → StepFooter на page-level, sticky bottom со backdrop-blur). AdvancedParams переместился внутрь карточки вопроса. Polish-pack уменьшается с 7 до 6 пунктов.

~~**P-1. BUG-6 — Sticky bottom bar для controls на step 2 (mirror step 3)**~~

После Sprint 4 FIX iter 1 на step 3 кнопка скачивания .ipynb стала sticky bottom. На step 2 controls (Скачать, Загрузить, Вернуть в черновик, Перейти к конструктору) остались внизу страницы in-flow — требуют скролла. Пользователь явно попросил symmetric pattern: «либо стики как скачать».

- **Где:** `src/pages/PlanPage.jsx` или `src/components/plan/PlanActions.jsx`.
- **Реализация:** обернуть control bar в `<div className="sticky bottom-0 -mx-6 px-6 py-4 bg-bg/90 backdrop-blur border-t border-border-soft">` (паттерн уже есть в `NotebookBuilderPage.jsx`).
- **Эффект:** UX consistency между step 2 и step 3.

---

**P-2. BUG-7 — Colab-friendly CSV path в load template**

Шаблон `templates/notebook/load.cells.json` сейчас:
```python
df = pd.read_csv('experiment_results.csv')
```
В Colab/JupyterLab Hub/GH Codespaces файл не лежит в `/content/` — пользователь получает FileNotFoundError.

- **Где:** `templates/notebook/load.cells.json` — code cell + markdown инструкция.
- **Code cell:**
```python
import pandas as pd
import numpy as np

CSV_PATH = 'experiment_results.csv'  # рядом с ноутбуком, или укажи полный путь / URL
df = pd.read_csv(CSV_PATH)
print(f'rows: {len(df):,}')
df.info()
df.head()
```
- **Markdown инструкция:** «CSV должен лежать рядом с ноутбуком — или укажи в `CSV_PATH` полный путь / URL (для Colab — путь в `/content/` после upload или mount Google Drive)».
- **Покрывает 3 кейса:** локальный Jupyter, Colab (после upload), GitHub-CSV или public URL.

---

**P-3. BUG-8 — Filename / Header / test_id source разделение**

После semantic shift ADR-011 (`metric_name` = код snake_case, `metric_label` = натуральный текст) логично перевести `test_id` и filename на код. Header markdown — наоборот, на натуральный title.

| Артефакт | Источник | Пример |
|---|---|---|
| filename `.ipynb` | slug из `metric_column` | `cr-partner-click-v1_analysis.ipynb` |
| `YAML.test_id` (test_plan.md) | slug из `metric_column` | `cr-partner-click-v1` |
| `# Analysis: ...` в notebook header | `metric_name` (натуральный) | `# Analysis: CTR клика по партнёру` |
| `YAML.title` (test_plan.md) | `metric_name` (натуральный) | `title: "Тест: CTR клика по партнёру"` |

- **Файлы:**
  - `src/lib/plan/notebook-builder.js:73` (`deriveTestId`): приоритет `brief.metric_column` над `brief.metric_name`. Fallback на metric_name если column пуст.
  - `src/lib/plan/render.js:120` (`deriveTestId`): то же.
  - `src/lib/plan/notebook-builder.js:222` (`buildHeaderCell`): `# Analysis: ${deriveTitle(state)}` вместо `deriveTestId(state)`.
- **Подзаголовок ноутбука** «Test plan: рядом лежит test_plan.md» переписать на нейтральный: `> Test plan: см. test_plan.md, генерируется отдельно в stat·plan (шаг 2).` (то же misleading что и BUG-7).

---

**P-4. Inline-предупреждение о приближённом расчёте на Q03/Q07**

При выборе ratio/continuous пользователь сразу должен видеть: «для точного sample size нужен data peek; без него — приближение через bootstrap ±20-30%». Сейчас это срабатывает только в Q08 (поздно).

- **Где:** `src/components/brief/SingleSelect.jsx` или `src/components/brief/QuestionRenderer.jsx` (для Q03 при выборе ratio/continuous).
- **UI:** info-блок (`bg-info-soft border-info-border text-info-fg`, использовать existing tokens) под выбранной опцией, текст:
  > ⓘ Для точного sample size нужны параметры исторических данных (для ratio — ковариация числителя/знаменателя; для continuous — σ метрики). Если их нет — расчёт будет приближением через bootstrap (±20-30%). Точная цифра — после Data Peek (Sprint 3+).
- Принцип №6 «минимум ветвлений» не нарушается — это информирование, не дополнительный вопрос.

---

### Tech debt

**P-5. Dead code: `baseline.unit === 'percent'` ветка**

В `src/lib/plan/notebook-builder.js:173-175`:
```js
baseline: brief.baseline?.unit === 'percent'
  ? brief.baseline.value / 100
  : (brief.baseline?.value ?? 0),
```

По коду `parse.js coerceBaseline` ставит `unit: 'fraction'` для proportion и `unit: null` для остальных. Ветка `'percent'` не достижима.

- **Fix:** удалить условие, оставить `brief.baseline?.value ?? 0`.

---

**P-6. Slugify duplication**

Идентичный код в `src/lib/plan/render.js:110` и `src/lib/plan/notebook-builder.js:61`. Кандидат на unified utility.

- **Fix:** вынести в `src/lib/util/slugify.js`, импортировать в оба места.

---

### Round-trip nits

**P-7. Legacy YAML heuristic для metric_name**

После semantic shift (ADR-011) старые test_plan.md содержат `metric_name: «конверсия в первый депозит»` (натуральный текст). Новый парсер мапит это в `brief.metric_column` (как код, неверно), `brief.metric_name` = пустой.

- **Эвристика на парсе:** если `fm.metric_name` содержит пробелы / прописные / кириллицу → это legacy «натуральный текст», маппим в `metric_label` (а если есть отдельный `fm.metric_label` — конфликт, тогда пропускаем эвристику).
- **Где:** `src/lib/plan/parse.js mapFrontmatter`.
- **Тест:** legacy YAML с `metric_name: «...»` парсится с `brief.metric_name = ''`, `brief.metric_column = ''`, warning «обнаружен legacy формат — заполни код вручную».

---

## UX-RENAME (требует ADR-012, не часть polish-pack)

> Зафиксировано отдельно — это не fix, а семантическое переименование, согласованное с предстоящим Architecture sprint про redesign Шага 4.

- 04 «Анализ» → «Быстрая валидация»
- 05 «Read-out» → «Скачать артефакты»

Реализация:
- `src/components/Stepper.jsx` — labels (Code-зона).
- `docs/context/FLOW.md` — заголовки секций Шаг 4 / Шаг 5 + текст (Cowork-зона).
- `docs/context/concept.md` — если упомянуты шаги (Cowork-зона).
- `docs/project/JTBD.md` §7, §8 — заголовки (Cowork-зона).

Должно идти **синхронно** в Architecture sprint вместе с переосмыслением скоупа Шага 4 (см. open ADR-012 черновик).

---

## Что НЕ в polish-pack

Уходит в отдельные спринты:
- **Methodology раздел + demo/how-to** → Sprint 8 (JTBD §10, +1 новая story для demo/how-to). Толстый content sprint.
- **Data peek (calculator для ручного ввода σ/cov)** → Sprint 3+ (отдельный спринт по data peek с CSV upload).
- **Шаг 4 redesign** → Architecture sprint (ADR-012) перед Sprint 5 main.

---

## Acceptance polish-sprint

- `npm test` зелёный (+5-10 новых тестов).
- `npm run build` чистый.
- Browser smoke (~10 минут): step 2 sticky bottom; ratio test → inline warning на Q03; новый .ipynb с разделением filename/header; legacy test_plan.md парсится с warning.
- Cowork CLOSE polish-sprint с обновлением JTBD: отметить закрытые stories из polish-pack.
