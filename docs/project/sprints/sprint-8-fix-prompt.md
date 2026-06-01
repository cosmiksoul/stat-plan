# Sprint 8 FIX iter 1 — UX правки после browser smoke

**Type:** Code FIX (one phase)
**Estimated:** ~1.5-2 ч active
**Источник:** browser smoke Sprint 8 пользователем 2026-05-31, 6 точечных UX правок + новый дизайн-паттерн для navigation/download buttons

---

## Overview

Sprint 8 main закрыл функционально все 14 P-items. При первом browser smoke пользователь обнаружил 6 UX-улучшений — большинство тривиальные, два архитектурных (F-3 docs routing rewrite, F-6 footer design pattern).

**Главные изменения:**

1. **Onboarding architecture refactor:** /tutorial + /methodology stubs (Sprint 8 P-1) объединяются в `/docs` с 3 подразделами (С чего начать / Туториалы / Методология). Index page + отдельные routes. Логично сделать **до** content rewrite Sprint 9 — иначе придётся переделывать дважды.

2. **Footer button design pattern** (новое правило для всего проекта):
   - **Primary green** (`bg-accent text-bg`) = «переход к следующему шагу» (forward action в flow). Применяется только к navigation forward.
   - **Secondary blue filled** (NEW) = «скачать артефакт». Visual category «download artifact», унифицирует все 3 кнопки скачивания (test_plan.md, ipynb, ZIP).
   - **Tertiary amber/orange** = «destructive/reset» (как уже есть «Вернуть в черновик»). Применяется для «Начать сначала» в Header и «Новый тест» на /step4.
   - **Quaternary border-only** = «back navigation» (← К плану, ← К конструктору).

---

## Scope (F-1..F-6)

### F-1. Логотип `stat·plan` кликабельный → `/`

В `src/components/Header.jsx` обернуть logo block в `<Link to="/">`:

```jsx
<Link to="/" className="flex items-baseline gap-3 hover:opacity-80 transition-opacity">
  <span className="font-serif text-[26px] font-semibold tracking-tight">
    stat<span className="text-accent">·</span>plan
  </span>
  <span className="mono-label text-fg-faint hidden sm:inline">
    A/B planner
  </span>
</Link>
```

**Acceptance:** клик по логотипу → переход на стартовый экран. Hover — лёгкое opacity change.

**Edge case:** если пользователь на /step1 с заполненным брифом, клик возвращает на /. State не сбрасывается (это **navigation**, не reset). Если хочет сбросить — есть кнопка `↺ НАЧАТЬ СНАЧАЛА`.

---

### F-2. Rename «CRO Эксперт» → «AI-компаньон»

В `src/components/Header.jsx` в external link:
- Label: `↗ CRO Эксперт` → **`↗ AI-компаньон`**
- Title: «Внешний AI-ассистент по A/B методологии (NotebookLM)» → **«AI-компаньон по A/B методологии (внешний NotebookLM)»**

URL не меняется.

**Acceptance:** button shows «↗ AI-компаньон».

---

### F-3. /tutorial + /methodology → /docs с 3 подразделами

**Текущее (Sprint 8 P-1):**
- Header: `📖 Туториал` → /tutorial (stub), `📘 Методология` → /methodology (stub)
- Pages: TutorialPage.jsx, MethodologyPage.jsx

**Новое:**
- Header: один link **`📖 Документация`** → /docs
- Routes:
  - `/docs` — DocsIndexPage (NEW)
  - `/docs/start` — DocsStartPage (NEW)
  - `/docs/tutorial` — переименовать существующий TutorialPage → DocsTutorialPage (или оставить TutorialPage переехав в /docs/tutorial)
  - `/docs/methodology` — переименовать существующий MethodologyPage → DocsMethodologyPage

#### F-3a. DocsIndexPage — index с 3 cards

`src/pages/DocsIndexPage.jsx`:

```jsx
import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    to: '/docs/start',
    icon: '🚀',
    title: 'С чего начать',
    desc: 'Быстрый обзор продукта: 4 шага флоу, какие артефакты получаешь на выходе, как переходить между шагами.',
  },
  {
    to: '/docs/tutorial',
    icon: '📖',
    title: 'Туториалы',
    desc: 'Три end-to-end сценария: proportion (конверсия), continuous (ARPU), ratio (CTR). С CSV-данными и пошаговыми инструкциями.',
  },
  {
    to: '/docs/methodology',
    icon: '📘',
    title: 'Методология',
    desc: 'Глубокий разбор: выбор test_method, расчёт sample size, SRM, novelty, guardrails, decision rules. Что мы НЕ делаем и почему.',
  },
]

export default function DocsIndexPage() {
  return (
    <div className="max-w-[920px] mx-auto px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-serif font-semibold">Документация</h1>
        <p className="text-sm text-fg-faint mt-2">
          Всё про stat·plan: с чего начать, как пройти типовой сценарий, как устроена методология под капотом.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SECTIONS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="block p-5 rounded-lg border border-border-soft hover:border-accent hover:bg-bg-elev-2 transition-colors"
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <h2 className="text-base font-semibold mb-1">{s.title}</h2>
            <p className="text-xs text-fg-faint leading-relaxed">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

#### F-3b. Sub-pages — stub-структура с «← К документации»

Каждая из 3 sub-pages должна иметь общий header:

```jsx
<div className="max-w-[920px] mx-auto px-6">
  <div className="mb-4">
    <Link to="/docs" className="text-xs text-fg-faint hover:text-fg">← К документации</Link>
  </div>
  <h1 className="text-2xl font-serif font-semibold">{title}</h1>
  {/* content */}
</div>
```

Для `/docs/start` — content от Cowork (готовится параллельно, ~30 мин, см. `outputs/docs-start-content.md`).
Для `/docs/tutorial` — пока stub «Туториалы готовятся в Sprint 9», cross-ref на `docs/project/sprints/e2e-scenarios-sprint-7.md`.
Для `/docs/methodology` — stub «Методология готовится в Sprint 9».

#### F-3c. Routes в App.jsx

Удалить:
```jsx
<Route path="/tutorial" element={<TutorialPage />} />
<Route path="/methodology" element={<MethodologyPage />} />
```

Добавить:
```jsx
<Route path="/docs" element={<DocsIndexPage />} />
<Route path="/docs/start" element={<DocsStartPage />} />
<Route path="/docs/tutorial" element={<DocsTutorialPage />} />
<Route path="/docs/methodology" element={<DocsMethodologyPage />} />
```

Старые pages — переименовать или удалить (Code решает).

#### F-3d. Header navigation

В `src/components/Header.jsx`:

**Удалить:**
```jsx
<NavLink to="/tutorial">📖 Туториал</NavLink>
<NavLink to="/methodology">📘 Методология</NavLink>
```

**Добавить:**
```jsx
<NavLink to="/docs" className={NAV_LINK}>📖 Документация</NavLink>
```

Активный state — NavLink автоматически добавит `active` class когда на `/docs*` (через `end={false}`).

**Acceptance:** Header показывает 1 nav link «Документация» + external «AI-компаньон». Клик «Документация» → /docs index с 3 карточками. Каждая карточка → sub-route.

---

### F-4. «Начать сначала» — reset accent hue

Сейчас `↺ НАЧАТЬ СНАЧАЛА` стилизован как neutral (`text-fg-faint border-border-soft`) — теряется визуально.

Применить **reset pattern** как у «Вернуть в черновик» (amber/orange). В Tailwind v4 это `text-warn` или `text-amber-400` (точное имя token — Code посмотрит в `index.css`).

```jsx
<button
  type="button"
  onClick={() => setShowRestart(true)}
  className="mono-label text-warn border border-warn rounded-md px-3.5 py-1.5 hover:bg-warn-soft transition-colors cursor-pointer"
  title="Сбросить все ответы и начать заново"
>
  ↺ НАЧАТЬ СНАЧАЛА
</button>
```

Если `--color-warn` и `--color-warn-soft` уже есть (Sprint 2 tech debt closure) — переиспользуем. Если нет — добавить tokens.

**Acceptance:** кнопка визуально выделяется как destructive/reset, но не слишком ярко. Hover — bg-warn-soft.

---

### F-5. /step4 «↺ Новый тест» → переехать в footer

**Сейчас:** в `ValidationReportPage.jsx` `↺ НОВЫЙ ТЕСТ` рендерится **между section 6 и sticky footer** как отдельная inline-секция с `border-t` + центрированным placeholder text «Готов начать следующий тест?».

**Нужно:** переехать в footer. Footer станет:

```jsx
<StepFooter
  back={<Link to="/step3">← К КОНСТРУКТОРУ</Link>}
  secondary={
    <button
      onClick={() => setShowRestartFromFinal(true)}
      className="mono-label text-warn border border-warn rounded-md px-4 py-3 hover:bg-warn-soft text-sm"
    >
      ↺ НОВЫЙ ТЕСТ
    </button>
  }
  primary={
    <button onClick={handleDownloadZip} className="mono-label font-semibold bg-download text-bg rounded-md px-6 py-3 text-base">
      ↓ СКАЧАТЬ ВСЁ (.zip)
    </button>
  }
/>
```

(`bg-download` см. F-6 ниже — новый token для download buttons.)

Удалить inline-секцию с `↺ НОВЫЙ ТЕСТ` под section 6 — она больше не нужна (footer покрывает).

ConfirmDialog логика остаётся как есть (handleFullRestart + state).

**Acceptance:** на /step4 footer: `← К конструктору | ↺ Новый тест (amber) | ↓ Скачать всё (blue filled)`. Под section 6 нет дублирующей секции.

---

### F-6. Footer button design pattern — cross-page refactor

**Новое правило (зафиксировать в коде комментарием в Banner.jsx или новом файле `src/styles/button-patterns.md`):**

| Категория | Цвет | Класс пример | Применение |
|---|---|---|---|
| Forward navigation (next step) | green primary | `bg-accent text-bg` | «Дальше →», «Перейти к конструктору →», «К валидации →» |
| Download artifact | blue filled | `bg-download text-bg` (NEW token) | «↓ Скачать test_plan.md», «↓ Скачать ipynb», «↓ Скачать всё (.zip)» |
| Reset / destructive | amber | `text-warn border-warn hover:bg-warn-soft` | «↺ Начать сначала», «↺ Новый тест», «Вернуть в черновик» |
| Back navigation | border-only | `text-fg-faint border-border-soft` | «← К плану», «← К конструктору» |
| Secondary action | neutral border | `text-fg border-border` | manual override buttons |

#### F-6a. Добавить `--color-download` token

В `src/styles/index.css` в `@theme`:

```css
--color-download: #60a5fa;        /* такой же blue как --color-tour/AI-компаньон, но для filled */
--color-download-hover: #93c5fd;  /* lighter blue для hover */
```

Tailwind будет резолвить `bg-download` / `bg-download-hover` автоматически (Tailwind v4 reads `@theme`).

Можно репурпозить **существующий `--color-tour`** (по аналогии с F-2 AI-компаньон) — это тот же визуальный category «blue». Code решает: новый token или reuse `--color-tour` (rename → `--color-action-blue` для семантики).

#### F-6b. Cross-page refactor — заменить existing buttons

**`/step2` (`PlanPage.jsx`):**
- `↓ СКАЧАТЬ TEST_PLAN.MD` — был `bg-bg-elev-2 border-border-soft` → стать **`bg-download text-bg`** (primary visual для download)
- «Перейти к конструктору →» — был green primary → остаётся green primary ✓
- «Вернуть в черновик» — был amber ✓ остаётся

**`/step3` (`NotebookBuilderPage.jsx`) — переставить порядок:**

Сейчас: `← К ПЛАНУ | К ВАЛИДАЦИИ → | ↓ СКАЧАТЬ IPYNB`
Должно: `← К ПЛАНУ | ↓ СКАЧАТЬ IPYNB (blue filled) | К ВАЛИДАЦИИ → (green primary)`

Логика: следующий шаг должен быть **самым правым primary action** (рука к нему тянется естественно после download). Download — secondary visual category.

```jsx
<StepFooter
  back={<button onClick={() => navigate('/step2')}>← К ПЛАНУ</button>}
  secondary={
    <button onClick={handleDownload} className="mono-label font-semibold bg-download text-bg rounded-md px-6 py-3 text-base">
      ↓ СКАЧАТЬ {built.filename.toUpperCase()}
    </button>
  }
  primary={
    <button onClick={() => navigate('/step4')} className="mono-label font-semibold bg-accent text-bg rounded-md px-6 py-3 text-base">
      К ВАЛИДАЦИИ →
    </button>
  }
/>
```

**`/step4` (`ValidationReportPage.jsx`) — финальный шаг, нет «next» button:**

После F-5: `← К конструктору | ↺ Новый тест | ↓ Скачать всё`
- «Новый тест» — amber (reset pattern)
- «Скачать всё» — **blue filled** (download pattern)
- На последнем шаге нет green-кнопки «следующий шаг», потому что финал. Если нужен visual primary — download.

Также section 6 кнопки `↓ Скачать report.html`, `↓ Скачать readout.md`, `↓ Скачать всё (.zip)` — все три должны иметь **blue filled** стиль.

#### F-6c. StepFooter slot semantics

Если в `StepFooter.jsx` есть фиксированный порядок slots (back / secondary / primary), убедиться что:
- `back` → left
- `secondary` → center
- `primary` → right

Если порядок другой — обновить.

**Acceptance:** все footer'ы на /step2, /step3, /step4 единообразно показывают паттерн (download = blue filled, next step = green primary, reset = amber, back = link).

---

## Что НЕ делаем (DO NOT)

- ❌ **Не пишем** content для /docs/start, /docs/tutorial, /docs/methodology (stubs OK; реальный content — Cowork параллельно для `start`, Sprint 9 для остальных)
- ❌ **Не трогаем** decision rules, parser, effective.js (Sprint 8 main + F-1..F-6 не пересекаются)
- ❌ **Не трогаем** Templates ноутбука (.cells.json) — этот FIX чисто UI/routing
- ❌ **Не вводим** новых npm-deps
- ❌ **Не трогаем** Step 1 H1 и Banner styling (Sprint 8 main верно сделал)
- ❌ **Не редизайним** Stepper (текущий 4-шаговый OK)
- ❌ **Не трогаем** `docs/context/decisions-log.md` (Cowork-зона, ADR-015 amendment пункт 3 ещё пишется)

---

## Files involved

**Модифицируем:**
- `src/components/Header.jsx` — F-1 (Link wrap), F-2 (rename), F-3d (1 nav вместо 2), F-4 (amber accent reset)
- `src/App.jsx` — F-3c (4 routes вместо 2)
- `src/pages/ValidationReportPage.jsx` — F-5 (Новый тест в footer + удалить inline section)
- `src/pages/NotebookBuilderPage.jsx` — F-6 (порядок: back / download blue / К валидации green)
- `src/pages/PlanPage.jsx` — F-6 (Скачать test_plan.md → blue filled)
- `src/components/results/ExportSection.jsx` (или эквивалент section 6) — F-6 (3 download кнопки → blue filled)
- `src/styles/index.css` — F-6a (`--color-download*` tokens или repurpose `--color-tour*` → `--color-action-blue*`)
- `src/components/layout/StepFooter.jsx` — F-6c (slot semantics, если нужно)

**Создаём:**
- `src/pages/DocsIndexPage.jsx` (F-3a)
- `src/pages/DocsStartPage.jsx` (F-3b, stub с placeholder для Cowork content)
- `src/pages/DocsTutorialPage.jsx` (F-3b, можно переименовать существующий TutorialPage)
- `src/pages/DocsMethodologyPage.jsx` (F-3b, можно переименовать существующий MethodologyPage)

**Удаляем (или переименовываем):**
- `src/pages/TutorialPage.jsx` → переименовать в `DocsTutorialPage.jsx` (move в /docs/tutorial)
- `src/pages/MethodologyPage.jsx` → переименовать в `DocsMethodologyPage.jsx`

**Tests:**
- UI без unit tests (конвенция). Если ChunkRouter sanity test есть — обновить routes.

---

## Acceptance criteria

1. `npm test` зелёный (без новых тестов, UI без unit tests).
2. `npm run build` чистый. Bundle delta **< +2 KB gzip** (1 новая page + 2 переименованных + token).
3. **Browser smoke (~5 мин):**
   - **Header:** клик по логотипу → /. NavLink один: `📖 Документация`. Внешний `↗ AI-компаньон` (rename). `↺ НАЧАТЬ СНАЧАЛА` — amber accent (не серый).
   - **/docs:** index page с 3 cards. Каждая card — clickable, hover effect, переход на sub-route.
   - **/docs/start, /docs/tutorial, /docs/methodology:** stub-pages с «← К документации» link. Контент: либо stub-текст, либо Cowork-inline (если параллельно готов).
   - **/step2 footer:** download `test_plan.md` — blue filled. Перейти к конструктору — green primary. Вернуть в черновик — amber.
   - **/step3 footer:** **порядок** ← К плану | download ipynb blue filled | К валидации green primary. (Раньше было: ← К плану | К валидации secondary | download green.)
   - **/step4 footer:** ← К конструктору | ↺ Новый тест amber | ↓ Скачать всё blue filled. Inline-секция «Готов начать следующий тест?» удалена.
   - **/step4 section 6 кнопки:** все 3 download — blue filled (унифицированы).

---

## Sprint Fix Report — что ожидаем

В `docs/project/sprints/sprint-8-fix-report.md`:

- Trace-ability F-1..F-6 → файлы + diff.
- F-3 routing: реализация index + 3 sub-routes. Сделал ли переименование existing TutorialPage/MethodologyPage или удалил + создал заново.
- F-6 token: `--color-download*` (new) или `--color-action-blue*` (renamed from `--color-tour*`). Влияет ли на AI-компаньон link стиль.
- F-4 amber accent: использовал ли `--color-warn*` (Sprint 2 closure tech debt) или ввёл новый token.
- F-5 StepFooter slots: подтверждение что slot order back/secondary/primary works для всех 3 page footers.
- Tests count delta (вероятно 0, UI без unit-tests).
- Time tracking — ожидаемый ~1.5-2 ч.

---

## Cowork параллельные задачи

1. **Подготовить content для /docs/start** (~30 мин). Markdown с overview флоу: 4 шага, какие артефакты получаешь, как переходить между шагами. Inline в `DocsStartPage.jsx` или отдельный `outputs/docs-start-content.md` для Code-inline. Маленький — на одну страницу.
2. **Code review + retest prep** — после Code DEV.
3. **CLOSE phase** — обновить JTBD §1 (docs structure вместо tutorial+methodology), ADR-015 amendment, CONTEXT timeline, PROJECT_STATUS под Sprint 8 closed (main + FIX iter 1).

---

## Related

- `docs/project/sprints/sprint-8-prompt.md` — Sprint 8 main P-1..P-14
- `docs/project/sprints/sprint-8-report.md` — отчёт Code Sprint 8 main
- `docs/project/sprints/code-review-sprint-8.md` — review Sprint 8 main
- `docs/project/sprints/test-cases-sprint-8-retest.md` — retest Sprint 8 main (был запущен пользователем 2026-05-31, найдено 6 UX-улучшений)
- `docs/project/polish-pack-v2.md` — backlog (NotebookLM MindMap идея для Sprint 9)
