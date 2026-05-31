# Sprint 8 FIX iter 2 — Segments rename + Demo CSV download + ScoringCard kликабельность

**Type:** Code FIX (three-item, focused)
**Estimated:** ~30-35 мин active
**Источник:** browser smoke Sprint 8 FIX iter 1 пользователем 2026-05-31. 3 issue:
1. **F-7** — segments cell захардкожена на «geo», но user может сегментировать по device/CRM-метке/plan/country/etc.
2. **F-8** — Sprint 8 FIX iter 1 F-6 cross-page refactor пропустил кнопку «↓ СКАЧАТЬ DEMO-CSV» на /step3 (DemoCsvCard.jsx). Сейчас она `bg-accent` (green primary) — должна быть `bg-download` (blue filled) по новому design pattern.
3. **F-9** — ScoringCard: Sprint 8 P-11 признал что фича уже была реализована (`<details open>` в GroupRow), но **2 UX-проблемы остались** не замечены: (а) нет visual chevron (`list-none` убирает default disclosure triangle) — пользователь не понимает что карточки кликабельны, (б) при 100/100 score нет remarks → клик ничего не показывает (empty `<ul>` скрыт guard'ом).

---

## Overview

Sprint 7 S10 editable schema позволяет переименовать `geo` column в expected schema table → placeholder `{{geo_column}}` корректно подставляется в notebook code. **Архитектурно функционал есть**. Но **UX-labels всё ещё говорят «geo»** — это вводит в заблуждение пользователя который хочет сегментировать по device или CRM-метке.

**Минимальный fix:** убрать hardcoded «geo» из labels/description/markdown ноутбука. Editable schema даёт power переименовать column, UI больше не «лжёт».

**Что НЕ делаем в этом iter:** explicit segment dropdown на /step3 (см. JTBD §6 ◆ story «Sprint 9 candidate — explicit UI control для segment column»). Это уже мини-feature, требует state changes + UI.

---

## Scope (F-7 + F-8 + F-9)

### F-7. Segments cell — rename labels + placeholder

#### F-7a. `templates/notebook/segments.cells.json`

**Current:**
```json
{
  "id": "segments",
  "name": "Сегменты (geo)",
  "description": "Сегментный анализ по `geo` — лифт по каждому сегменту отдельно, без формальных мульти-тестов.",
  ...
  "cells": [
    {
      "cell_type": "markdown",
      "source": [
        "## Сегментный анализ (опционально)\n",
        "\n",
        "Лифт по `geo` — sanity-check, что эффект не сидит в одном сегменте. **Не используем для решений**..."
      ]
    },
    {
      "cell_type": "code",
      "source": [
        "metric_col = '{{metric_column}}'\n",
        "segment_col = '{{geo_column}}'\n",
        ...
      ]
    }
  ]
}
```

**New:**
```json
{
  "id": "segments",
  "name": "Сегментный анализ",
  "description": "Лифт по любой категориальной колонке (geo, device, plan, CRM-метка) — sanity-check, что эффект не сидит в одном сегменте. Колонку можно переопределить в expected schema ниже.",
  ...
  "cells": [
    {
      "cell_type": "markdown",
      "source": [
        "## Сегментный анализ (опционально)\n",
        "\n",
        "Лифт по `{{segment_column}}` — sanity-check, что эффект не сидит в одном сегменте. **Не используем для решений** (multi-testing не корректируется): только для постановки гипотез на следующий тест."
      ]
    },
    {
      "cell_type": "code",
      "source": [
        "metric_col = '{{metric_column}}'\n",
        "segment_col = '{{segment_column}}'\n",
        ...
      ]
    }
  ]
}
```

**Изменения:**
- `name`: «Сегменты (geo)» → **«Сегментный анализ»**
- `description`: explicit что колонка может быть любой + указание на editable schema
- `markdown source`: «по `geo`» → **«по `{{segment_column}}`»** (placeholder, не hardcoded)
- `code source`: `{{geo_column}}` → **`{{segment_column}}`** (rename placeholder для consistency)

#### F-7b. `src/lib/plan/notebook-builder.js` — placeholder rename

В `buildPlaceholderMap` (около line 231):

**Current:**
```js
geo_column: resolveCol('geo', overrides),
```

**New:**
```js
segment_column: resolveCol('geo', overrides),
```

**Default column остаётся `geo`** (для backward-compat с existing test_plan'ами + старыми overrides). User через editable schema может переименовать. `resolveCol('geo', overrides)` — это **lookup key**, не output value. Если в overrides есть `{ geo: 'device_type' }` → placeholder получит `device_type`. Это уже работает.

#### F-7c. Expected schema row (~line 184-188)

Текущий код:
```js
if (cellsEnabled.includes('segments')) {
  rows.push({
    original: 'geo',
    column: resolveCol('geo', overrides),
    type: resolveType('geo', 'string', overrides),
    required: true,
    description: 'Сегмент (geo / device / plan / country / CRM-метка...)',
  })
}
```

**Что обновить:** description строки — explicit examples что это **не только geo**.

`original: 'geo'` оставить как lookup key (стабильный internal identifier, не показывается пользователю напрямую). `column` (отображаемое имя) уже подменяется через `resolveCol(overrides)` если user переименовал.

---

### F-8. DemoCsvCard — missed `bg-download` migration

**Current** (`src/components/notebook/DemoCsvCard.jsx:104`):
```jsx
<a
  ...
  download={`${chosen}.csv`}
  className="block text-center mono-label font-semibold bg-accent text-bg rounded-md px-4 py-2 hover:opacity-90 transition-opacity"
>
  ↓ СКАЧАТЬ DEMO-CSV
</a>
```

**New** — заменить `bg-accent` на `bg-download`:
```jsx
className="block text-center mono-label font-semibold bg-download text-bg rounded-md px-4 py-2 hover:opacity-90 transition-opacity"
```

**Контекст:** Sprint 8 FIX iter 1 F-6 ввёл cross-page download pattern (blue filled `bg-download`). Cowork-аудит после iter 1 retest показал — все остальные download правильно мигрированы (PlanActions test_plan.md, NotebookBuilderPage ipynb, ValidationReportPage footer zip, ExportButtons section 6 × 3), но Code пропустил кнопку «↓ СКАЧАТЬ DEMO-CSV» в `DemoCsvCard`. Этот F-item закрывает gap.

**Tests:** UI без unit-tests. Если есть snapshot test на DemoCsvCard — обновится автоматически.

**Acceptance:** на /step3 в DemoCsvCard кнопка «↓ Скачать demo-csv» — **blue filled** (одинакова со «↓ Скачать ipynb» в footer).

### F-9. ScoringCard — visible chevron + smart open + empty fallback

**Контекст:** Sprint 8 P-11 был помечен как «already implemented» — `<details open>` + `<summary cursor-pointer>` уже были в `GroupRow`. Технически работает (клик закроет/откроет details), но 2 UX-gap'а пропущены в Sprint 8 review.

**Current** (`src/components/plan/ScoringCard.jsx:23-58` `GroupRow` component):
```jsx
<details className="border border-border-soft rounded-md bg-bg-elev-2" open>
  <summary className="px-4 py-3 cursor-pointer flex items-center justify-between gap-3 list-none">
    <div className="flex items-center gap-3 min-w-0">
      <span className="mono-label text-fg-dim flex-shrink-0">{pts.toString().padStart(2, '0')}/{max}</span>
      <span className="text-sm text-fg truncate">{GROUP_LABELS[name]}</span>
    </div>
    <div className="flex-1 max-w-[120px] h-1.5 bg-bg rounded-full overflow-hidden">
      <div className="h-full bg-accent" style={{ width: `${filledPct}%` }} />
    </div>
  </summary>
  {groupRemarks.length > 0 && (
    <ul className="px-4 pb-3 m-0 list-none space-y-1.5">
      {groupRemarks.map((r) => (
        <li key={r.id} className={`...severity styles...`}>
          <span className="mono-label inline-block mr-2">{SEVERITY_ICON[r.severity]}</span>
          {r.message}
        </li>
      ))}
    </ul>
  )}
</details>
```

#### F-9a. Visible chevron (▸/▾) в summary

`list-none` убирает default disclosure triangle. Добавить custom chevron, который **поворачивается** при open/close:

```jsx
<summary className="px-4 py-3 cursor-pointer flex items-center justify-between gap-3 list-none [&::-webkit-details-marker]:hidden">
  <div className="flex items-center gap-3 min-w-0">
    <span className="text-fg-faint text-xs flex-shrink-0 group-open:rotate-90 transition-transform">▸</span>
    <span className="mono-label text-fg-dim flex-shrink-0">{pts.toString().padStart(2, '0')}/{max}</span>
    <span className="text-sm text-fg truncate">{GROUP_LABELS[name]}</span>
  </div>
  ...
</summary>
```

И на `<details>` — добавить `group` class для Tailwind group-modifier:

```jsx
<details className="group border border-border-soft rounded-md bg-bg-elev-2" ...>
```

Альтернатива (если `group-open:` не работает в Tailwind v4 как ожидается) — JavaScript state с `useState(open)` + onToggle, и conditional render `{isOpen ? '▾' : '▸'}`. Code решает что чище.

**Tailwind v4 nuance:** `group-open:` modifier зависит от `data-state` / `[open]` selector. Если не работает — можно `[&:not([open])_.chevron]:rotate-0 [&[open]_.chevron]:rotate-90` через arbitrary variants.

#### F-9b. Smart default-open — открыто только если есть remarks

**Current:** `<details open>` — все 4 группы всегда раскрыты, даже на 100/100 score (где `groupRemarks.length === 0` → пустой UL).

**New:** открыто только когда есть что показать:
```jsx
<details
  className="group border border-border-soft rounded-md bg-bg-elev-2"
  open={groupRemarks.length > 0}
>
```

Логика: 100/100 группа = «всё ок, нет замечаний» → закрыта по умолчанию (минимизирует визуальный шум). Группа с remarks (`< max points`) — открыта (показывает что именно потерялось).

#### F-9c. Empty fallback — «Без замечаний» при клике на закрытую группу

Когда user **вручную** открывает группу без remarks (100/100, click out of curiosity), сейчас показывается пустота. Добавить fallback:

```jsx
{groupRemarks.length > 0 ? (
  <ul className="px-4 pb-3 m-0 list-none space-y-1.5">
    {groupRemarks.map((r) => (
      <li key={r.id} className={`...severity styles...`}>
        <span className="mono-label inline-block mr-2">{SEVERITY_ICON[r.severity]}</span>
        {r.message}
      </li>
    ))}
  </ul>
) : (
  <div className="px-4 pb-3 text-xs text-fg-faint">
    ✓ Без замечаний — всё ок.
  </div>
)}
```

**Tests:** UI без unit tests (конвенция). Если есть snapshot test на ScoringCard — обновится автоматически.

**Acceptance:**
- /step2 ScoringCard: каждая группа показывает **`▸` chevron** слева от score (хорошо видимая affordance что кликабельно)
- При open chevron поворачивается → `▾`
- Группа с remarks (например 15/20 «Полнота гипотезы») — **открыта** по умолчанию
- Группа 20/20 / 30/30 — **закрыта** по умолчанию (минимум визуального шума)
- Клик на закрытую 30/30 → раскрывается → показывает «✓ Без замечаний — всё ок» (не пустое пространство)

---

## Что НЕ делаем (DO NOT)

- ❌ **Не добавляем** explicit dropdown на /step3 для segment column. Это **B-вариант** из обсуждения 2026-05-31 — Sprint 9 candidate если будет реальный запрос.
- ❌ **Не трогаем** `resolveCol` логику — она уже корректно достаёт column name из overrides.
- ❌ **Не меняем** lookup key `'geo'` в `resolveCol('geo', ...)` — это backend identifier, стабильный.
- ❌ **Не трогаем** другие cells (load/srm/balance/novelty/main_test/guardrails) — у них своя hardcoded column logic (variant, user_id, day) которая корректна.

---

## Files involved

**Модифицируем:**
- `templates/notebook/segments.cells.json` (F-7a)
- `src/lib/plan/notebook-builder.js` (F-7b + F-7c)
- `src/components/notebook/DemoCsvCard.jsx` (F-8, 1 className change)
- `src/components/plan/ScoringCard.jsx` (F-9a + F-9b + F-9c — chevron, smart-open, empty fallback в `GroupRow`)

**Tests:**
- `tests/lib/plan/notebook-builder.test.js` — обновить если есть тест на placeholder `geo_column` (заменить на `segment_column`). Тест на `original: 'geo'` row остаётся как есть.

---

## Acceptance criteria

1. `npm test` зелёный. Обновлены только existing тесты на placeholder rename (`geo_column` → `segment_column`).
2. `npm run build` чистый. Bundle delta ≈ 0 (text changes).
3. **Browser smoke (~2 мин):**
   - /step3: checkbox cell показывает **«Сегментный анализ»** (без «(geo)»). Description упоминает «geo, device, plan, CRM-метка».
   - Expected schema table: строка с column `geo` присутствует если segments enabled.
   - Inline rename column `geo` → `device_type` в schema table.
   - Скачать ipynb → открыть → segments cell:
     - Markdown header: `## Сегментный анализ` + текст «Лифт по `device_type`» (не geo)
     - Code: `segment_col = 'device_type'`
4. **Backward-compat:** старый test_plan.md с overrides `{ geo: 'something' }` парсится OK, переменная подставляется правильно.

---

## Sprint FIX Report — что ожидаем

В `docs/project/sprint-8-fix-iter2-report.md` (короткий):

- F-7a: diff `segments.cells.json`
- F-7b: diff `notebook-builder.js` (placeholder rename)
- F-7c: новая description для expected schema row
- Tests count delta (вероятно 0-1 update)
- Time tracking — ~15-20 мин

---

## Related

- `docs/project/sprint-8-fix-prompt.md` — Sprint 8 FIX iter 1 (6 F-items)
- `docs/project/sprint-8-fix-report.md` — Code-отчёт iter 1 (TBD когда Code запушит)
- `docs/project/polish-pack-v2.md` Sprint 9 backlog — добавить ◆ story «B. Explicit segment dropdown» (Cowork сделает после этого FIX)
- `docs/project/JTBD.md` §6 — закрытие текущей ◆ + добавление новой про explicit dropdown
