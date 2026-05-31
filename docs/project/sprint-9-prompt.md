# Sprint 9 — Documentation content + Demo CSV unification + StartScreen + /step3 + NotebookLM finalization

**Type:** Mixed (Cowork content-heavy + Code DEV + Cowork external) — последний sprint до v1
**Estimated:** ~5-6 ч active (Cowork ~3.5-4 ч + Code ~1.5-2 ч + external 30 мин)
**Источник:** обсуждение 2026-06-01 после Sprint 8 CLOSE. Polish-pack v2 Pv9 sections (NEW, NEW-3, NEW-4) + StartScreen rewrite + Demo CSV unification + Documentation content fill (/docs/start, /docs/tutorial, /docs/methodology) + NotebookLM finalization.

---

## Overview

Sprint 8 закрыл UX и technical polish — продукт v1-presentation-ready. Sprint 9 закрывает **content gap**: docs routes сейчас stub'ы, demo CSV не матчат туториалы, StartScreen тексты не отражают финальное value proposition. После Sprint 9 — **полная v1**.

**Главные блоки:**

1. **StartScreen rewrite** — H1/subtitle/footer тексты (правки от user 2026-06-01)
2. **/step3 H1 + subtitle** — Pv9-NEW-3 (закрывает layout inconsistency)
3. **Demo CSV unification** — заменить текущие demo на e2e сценарии (решение user 2026-06-01: «e2e становятся demo»). Закрывает mismatch «туториал учит cr_first_deposit, demo показывает converted».
4. **Docs content** (3 раздела):
   - **С чего начать** — high-level overview + per-step описание + артефакты. Также копировать в README.md.
   - **Туториалы** — 3 e2e сценария user-facing (rewrite e2e-scenarios-sprint-7.md)
   - **Методология** — большая статья (deep dive по test_method, sample size, SRM, novelty, guardrails, decision rules, disclaimer «Что мы НЕ делаем»)
5. **MindMap prompt для NotebookLM** — отдельный artifact. Max 3 уровня (constraint NotebookLM).
6. **NotebookLM finalization** (external, user сам): upload methodology MD как source → генерация MindMap по prompt → Audio Overview через Studio.

**Phasing:** Cowork content prep + Code DEV идут **параллельно**. Code в финале inline-ит готовый markdown content в pages.

---

## Phase 1 — Cowork content prep (5 items, ~3.5-4 ч)

### C-1. StartScreen тексты (spec для Code)

**Файл:** spec в этом prompt, реализация в Phase 2 K-1.

**Текущие тексты** (`src/pages/StartScreen.jsx`):
- H1: `Тест-план без сюрпризов`
- p: `Пройди бриф, получи методологически проверенный план A/B-теста и готовый Jupyter-ноутбук для анализа. Без серверов и регистрации.`
- footer: `ВСЁ ХРАНИТСЯ ЛОКАЛЬНО · NO BACKEND`

**Новые тексты** (от user 2026-06-01):
- H1: **`Управляем процессом тестирования без сюрпризов`**
- p: **`Пройди бриф, получи методологически проверенный план A/B-теста, сгенерируй Jupyter-ноутбук для анализа, упакуй результаты в отчет. Есть вопросы — загляни в `<Link to="/docs">документацию</Link>` или проконсультируйся с `<a href="…">AI-компаньоном</a>`.`** (с inline-ссылками, не plain text)
- footer: **`ВСЕ ДАННЫЕ ХРАНЯТСЯ ЛОКАЛЬНО НА ВАШЕМ КОМПЬЮТЕРЕ`**

**Tone notes для p:** ссылки inline в тексте, не дублирующие кнопки в Header. Стиль = accent text link (`text-accent hover:underline`).

### C-2. «С чего начать» content (для /docs/start + README.md)

**Файл:** `docs/content/docs-start.md` (новый, Cowork готовит, Code inline'ит в Phase 2 K-4).

**Структура:**
1. **Что это** — 2 абзаца. stat·plan = открытый клиентский инструмент для PM-ов. Решает 2 pain: «методологическая слепота калькуляторов» + «высокий порог входа в стат». 4-шаговый flow.
2. **Флоу из 4 шагов** — таблица + per-step описание (~3-4 предложения каждый):
   - **01 Бриф** — 10 вопросов, реактивный sample size, опц. Data Peek
   - **02 Тест-план** — preview test_plan.md + scoring, скачивание/upload
   - **03 Конструктор** — выбор ячеек, editable schema, скачивание analysis.ipynb
   - **04 Валидация и отчёт** — drag-drop выполненного ipynb, SRM/sanity, decision rules auto-eval, HTML report + ZIP
3. **Артефакты** — список с описаниями: `test_plan.md`, `analysis.ipynb`, `report.html`, `readout.md`, `analysis.zip`
4. **Принципы продукта** — no backend, артефакты как переносимое состояние, тул не решает за PM, открытость formul (cross-ref на /docs/methodology)
5. **Что НЕ делаем** — sequential testing, HTE, integrations (cross-ref на disclaimer в /docs/methodology)
6. **Связанные resources** — ссылки на /docs/tutorial, /docs/methodology, NotebookLM AI-компаньон

**Copy to README.md:** этот же content (или sub-set: 1-3 + ссылки) копируется в README.md проекта. Минимум: «Что это» + 4-шаговый flow + ссылки. Это нужно для GitHub repo «лицо проекта».

### C-3. «Туториалы» content (для /docs/tutorial)

**Файл:** `docs/content/docs-tutorial.md` (новый).

**Источник:** `docs/project/e2e-scenarios-sprint-7.md` — 3 сценария (A proportion / B continuous / C ratio) с готовыми CSV. **Rewrite в user-facing формате:**
- Убрать QA-структуру («Status», «Section», «Bugs found»)
- Добавить product narrative (зачем этот сценарий, что узнает PM из него)
- Шаги обозначить numbered с screenshot-references (можно без скриншотов изначально, добавим позже если нужно)
- Каждый сценарий = self-contained walkthrough (~7-10 минут на проход)

**Структура:**
1. **Введение** — для кого туториалы, как пользоваться, что нужно (Colab аккаунт или local Jupyter)
2. **Сценарий 1 — Конверсия (proportion)** — first_deposit. Demo CSV `demo_proportion.csv` (= e2e_a_first_deposit.csv после Phase 2 K-3). Expected: SHIP.
3. **Сценарий 2 — Средняя величина (continuous)** — ARPU. Demo CSV `demo_continuous.csv` (= e2e_b_arpu.csv). Expected: inconclusive/недотест.
4. **Сценарий 3 — Отношение (ratio)** — partner CTR. Demo CSV `demo_ratio.csv` (= e2e_c_partner_ctr.csv). Expected: winner.

**Каждый сценарий — единая структура:**
- Контекст (продуктовая ситуация)
- Бриф (Q01-Q10 table)
- Утверждение плана (ожидаемый score)
- Конструктор (какие ячейки + editable schema)
- Запуск в Colab (упрощённая инструкция)
- Загрузка в /step4 + что увидеть в HTML отчёте

**Downloadable demo CSV** — после Phase 2 K-3 demo и tutorial используют одни файлы.

### C-4. «Методология» content (для /docs/methodology)

**Файл:** `docs/content/docs-methodology.md` (новый). **Большая статья ~1500-2500 слов.**

**Структура (для consistency с MindMap из C-5 — 3 уровня вложенности):**

**Раздел 1 — Как мы выбираем test_method**
- Матрица `metric_type × test_method` с обоснованиями
  - Proportion → z_test_proportions
  - Continuous → t_test (вариация welch для unequal variance)
  - Ratio → delta method / bootstrap fallback
  - Count → t_test или Poisson regression

**Раздел 2 — Sample size формулы**
- Power analysis basics (α, power, MDE)
- Formula для proportion (Fleiss)
- Formula для continuous (Cohen's d)
- Delta method для ratio
- Bootstrap fallback когда нет σ
- Корректировки: Mann-Whitney ×1.157, edge cases (n<30, n>10M, duration>90)

**Раздел 3 — SRM (Sample Ratio Mismatch)**
- Что это и почему важно
- Chi² test с df=1
- p<0.001 threshold (per Kohavi)
- Что делать когда SRM сработал

**Раздел 4 — Novelty effect**
- Что это
- Как детектируется (early days vs later)
- Tri-state (suspected / not detected / N/A)
- Что делать когда suspected

**Раздел 5 — Guardrails**
- Зачем
- Direction (max/min), threshold
- Decision: останавливать тест или продолжать

**Раздел 6 — Decision rules**
- Как писать (синтаксис)
- Unit-aware `% rel` через baseline
- Recommended next step генерация

**Раздел 7 — Data Peek**
- Зачем нужен (точные расчёты vs bootstrap fallback)
- CSV upload или manual
- Distribution check (skewness/kurtosis)
- Stability CV по дням

**Раздел 8 — Что мы НЕ делаем (disclaimer)**
- Sequential testing / mSPRT
- HTE (heterogeneous treatment effects)
- Causal inference (DiD, IV, RDD)
- Bayesian (отложено)
- Почему — методологический долг vs scope (см. ADR-009)

**Раздел 9 — Источники**
- Kohavi/Tang/Xu (Microsoft ExP)
- Evan Miller
- CXL Institute
- Booking.com Tech Blog
- Cross-ref на NotebookLM AI-компаньон для conversational углубления

**Style guidelines:**
- Технически точно но без overload formul
- Каждый раздел = ~150-300 слов
- Inline-формулы через KaTeX-формат (если поддерживается в рендере markdown) или ASCII
- Avoid AI-templated phrases («it's important to note», «furthermore»)

### C-5. MindMap prompt для NotebookLM

**Файл:** `docs/content/notebooklm-mindmap-prompt.md` (новый).

**Constraint:** NotebookLM MindMap customization поддерживает **максимум 3 уровня вложенности** (root → 1st level → 2nd level → 3rd level). User даёт промт в NotebookLM Studio → MindMap → Customize.

**Структура prompt (template для user'а):**

```
Сгенерируй MindMap по структуре методологии stat·plan со следующими constraints:

ROOT: «Методология stat·plan — A/B тесты без сюрпризов»

1-st level (6 ветвей):
- Выбор test_method
- Sample size
- Sanity checks (SRM, balance)
- Контроль качества теста (Novelty, Guardrails)
- Decision rules
- Что мы НЕ делаем

2-nd level (под каждой):
[детальная разбивка 3-5 sub-topics на каждую 1st-level ветвь — см. структуру methodology article]

3-rd level (опционально, где есть depth):
[конкретные формулы, examples, references — keep concise]

Стиль узлов:
- Короткие labels (1-4 слова)
- Без жаргона где можно
- Иконки/emoji только где помогают (опционально)

Источники для содержимого: docs-methodology.md (загружен в notebook), Kohavi et al., Evan Miller, CXL.
```

**Также генерим reference markdown** в этом же файле — список всех 1st/2nd/3rd-level узлов в hierarchy. Это template для user'а если NotebookLM custom prompt не даёт желаемой структуры — можно скопировать иерархию вручную.

---

## Phase 2 — Code DEV (6 items, ~1.5-2 ч)

### K-1. StartScreen 3 правки (per C-1 spec)

**Файл:** `src/pages/StartScreen.jsx`

```jsx
// H1
<h1 ...>Управляем процессом тестирования без сюрпризов</h1>

// p с inline links
<p ...>
  Пройди бриф, получи методологически проверенный план A/B-теста,
  сгенерируй Jupyter-ноутбук для анализа, упакуй результаты в отчет.
  Есть вопросы — загляни в{' '}
  <Link to="/docs" className="text-accent hover:underline">документацию</Link>
  {' '}или проконсультируйся с{' '}
  <a
    href="https://notebooklm.google.com/notebook/040498fe-3843-4562-a854-863d2101a0d8"
    target="_blank"
    rel="noopener noreferrer"
    className="text-accent hover:underline"
  >AI-компаньоном</a>.
</p>

// footer
<div className="mono-label text-fg-faint text-center mt-7">
  ВСЕ ДАННЫЕ ХРАНЯТСЯ ЛОКАЛЬНО НА ВАШЕМ КОМПЬЮТЕРЕ
</div>
```

Import `Link` если ещё не импортирован (`react-router-dom`).

**Acceptance:** на / новые тексты, ссылки кликабельны (internal `/docs`, external NotebookLM в новой вкладке).

### K-2. /step3 H1 + subtitle (Pv9-NEW-3)

**Файл:** `src/pages/NotebookBuilderPage.jsx`

Добавить сверху страницы (над approval banner от P-3):

```jsx
<header className="mb-6">
  <h1 className="text-2xl font-serif font-semibold">Конструктор</h1>
  <p className="text-sm text-fg-faint mt-1">
    Выбери ячейки анализа, посмотри ожидаемую схему данных,
    скачай готовый Jupyter-ноутбук под свой тест-план.
  </p>
</header>
```

Стиль = /step1/2/4 (consistency).

**Acceptance:** на /step3 сверху виден H1 «Конструктор» + subtitle. Layout consistency со всеми 4 шагами.

### K-3. Demo CSV unification (user выбрал вариант A — e2e становятся demo)

**Операции:**

1. **Заменить** `public/demo/demo_proportion.csv` на содержимое `e2e_a_first_deposit.csv` (9k строк, columns `user_id,variant,cr_first_deposit,day,bounce_rate`). Имя файла остаётся `demo_proportion.csv` (consistency со старой ссылкой).
2. **Заменить** `public/demo/demo_continuous.csv` на содержимое `e2e_b_arpu.csv` (10k строк, columns `user_id,variant,arpu,day,time_on_site`). Имя остаётся.
3. **Создать** `public/demo/demo_ratio.csv` = содержимое `e2e_c_partner_ctr.csv` (7k строк, columns `user_id,variant,clicks,sessions,day`).
4. **Можно опционально создать** `public/demo/demo_count.csv` — но в текущих e2e нет count-сценария. Оставить stub «появится» или удалить (см. K-3a).

**DemoCsvCard.jsx обновления:**

В `src/components/notebook/DemoCsvCard.jsx`:
- `demo_ratio.csv` — убрать stub «появится в следующем спринте», добавить как реальную опцию с описанием `~7k user_id × variant × clicks/sessions (CTR control=9.0% / 11.1%)`
- `demo_proportion.csv` description обновить: было `~75k user_id × variant × converted (CR 3.1% / 3.4%)` → стать `~9k user_id × variant × cr_first_deposit (CR 3.1% / 4.0%)`
- `demo_continuous.csv` description обновить: было `~75k user_id × variant × arpu (μ 100 / 106, σ ≈ 80)` → стать `~10k user_id × variant × arpu (μ 104.9 / 106.6, σ ≈ ?)`

**K-3a. demo_count.csv decision:**

Оставить stub «появится в следующем спринте» (нет count-сценария в Sprint 7 e2e). Или удалить кнопку совсем (cleanup). **Code решает** — рекомендую оставить stub для consistency UI (4 опции metric_type → 4 demo placeholders).

**Tests:**
- `tests/components/notebook/DemoCsvCard.test.js` (если есть) — обновить assertions под новые descriptions.

**Acceptance:** на /step3 4 demo: proportion / continuous / ratio (новый, активный) / count (заглушка). Скачать каждый из 3 активных → file matches e2e CSV для соответствующего туториала.

### K-4. Inline content в 3 docs pages

**После Phase 1 готовности content markdown:**

1. `src/pages/DocsStartPage.jsx` — заменить stub на rendered markdown из `docs/content/docs-start.md`. Использовать тот же markdown renderer что MdPreview на /step2 (если есть) или простой `dangerouslySetInnerHTML` с pre-processed HTML, или библиотека `react-markdown` (если уже в deps; иначе не добавлять — render manually через JSX from markdown).
2. `src/pages/DocsTutorialPage.jsx` — то же из `docs/content/docs-tutorial.md`.
3. `src/pages/DocsMethodologyPage.jsx` — то же из `docs/content/docs-methodology.md`.

**Approach choice:**
- **A: Build-time markdown → JSX** через Vite plugin (`vite-plugin-markdown` или подобное). Чисто, но добавляет dep.
- **B: Runtime markdown** через `react-markdown` если уже в deps. Чисто, но runtime cost.
- **C: Manual JSX rewrite** — Cowork готовит markdown, Code переписывает в JSX вручную. Без deps, без runtime cost, но трудозатратно.
- **D: `?raw` import** + dangerouslySetInnerHTML после простой markdown-to-html через micromark (если уже есть).

**Code решает.** Рекомендую **B (react-markdown)** если ещё нет — это standard tool, ~30 KB gzip. Альтернатива — **D** если хочется минимум deps.

**Tutorial page** должен также иметь downloadable demo CSV links (cross-link на `public/demo/demo_*.csv`).

**Acceptance:** /docs/start, /docs/tutorial, /docs/methodology — реальный content, не stub. Внутри страниц working internal links (anchor navigation для длинной methodology) + external links (NotebookLM).

### K-5. a11y / mobile audit (минимальный pass)

**Что проверить:**

**a11y:**
- Tab navigation работает на всех страницах (focus visible)
- `aria-label` на interactive elements без visible text (chevron, close icons)
- Контраст текста (text-fg vs background — должен быть ≥ 4.5:1 для body, ≥ 3:1 для large text)
- Stepper — `aria-current="step"` для текущего шага

**Mobile (read-only режим):**
- Responsive grid на /step1 (вопрос + карта вопросов) — на <640px вопрос full-width, карта свёрнута
- /step3 schema table — horizontal scroll если узкий viewport
- /step4 секции — single column flow на mobile
- Header — 3 nav-link + restart umещаются или wrap (Code сам решает)

**Не критично для v1:** полный WCAG 2.1 AA — это для post-v1 work.

**Acceptance:** Visual smoke на /step1 в 375px viewport (iPhone SE size) и keyboard-only navigation по всем 4 шагам без блокеров.

### K-6 (опционально). Explicit segment dropdown (Pv9-NEW-2)

Если есть время — добавить explicit dropdown на /step3 рядом с segments checkbox. См. полный spec в `polish-pack-v2.md` Pv9-NEW-2.

**Skip if Phase 1+2 already > 4 ч total — оставить в backlog для post-v1.**

---

## Phase 3 — Cowork external content (NotebookLM, ~30 мин)

User делает самостоятельно после Sprint 9 CLOSE:

### NB-1. Upload methodology MD как source в NotebookLM
- Открыть NotebookLM «stat·plan: A/B & CRO companion»
- Add source → upload `docs/content/docs-methodology.md`
- Reindex sources

### NB-2. Генерация кастомного MindMap
- Studio → MindMap → Customize
- Вставить prompt из `docs/content/notebooklm-mindmap-prompt.md`
- Generate → проверить иерархию (3 уровня)
- Сохранить

### NB-3. Audio Overview / Slide Deck / Video Overview
- Studio → Audio Overview → Generate (English или Русский — на выбор)
- Опционально: Slide Deck + Video Overview (если NotebookLM поддерживает Cyrillic content)

### NB-4. Flashcards по терминам методологии
- Studio → Flashcards → Customize → вставить prompt из `notebooklm-mindmap-prompt.md` раздел «Промт для Flashcards»
- Generate → проверить покрытие ключевых терминов (sample size, MDE, SRM, novelty, decision rules, CI, p-value, delta method, bootstrap, и т.д.)
- Использовать для onboarding и закрепления терминологии

**Эти tasks вне scope code/test — это external content. После выполнения user даёт фидбек, при необходимости — корректируем markdown content.**

---

## Что НЕ делаем (DO NOT)

- ❌ **Не вводим** новых npm-deps кроме `react-markdown` (опционально для K-4 approach B). Если Code выбирает A/C/D — никаких new deps.
- ❌ **Не делаем** полный WCAG 2.1 AA audit — только минимальный pass (K-5).
- ❌ **Не делаем** mobile editor mode — read-only достаточно (per concept.md).
- ❌ **Не трогаем** templates/notebook/ — после Sprint 8 P-12/P-13/P-14 работает корректно.
- ❌ **Не трогаем** Stepper / decision rules logic / ADR-015 contract.
- ❌ **Не делаем** explicit segment dropdown если K-1..K-5 уже заняли >4 ч (Pv9-NEW-2 → post-v1 backlog).

---

## Files involved

**Создаём (Cowork content):**
- `docs/content/docs-start.md` (C-2)
- `docs/content/docs-tutorial.md` (C-3)
- `docs/content/docs-methodology.md` (C-4)
- `docs/content/notebooklm-mindmap-prompt.md` (C-5)
- `README.md` (обновить или создать новый — высокоуровневый из C-2)

**Создаём (Code):**
- `public/demo/demo_ratio.csv` (K-3, копия e2e_c_partner_ctr.csv)

**Заменяем (Code):**
- `public/demo/demo_proportion.csv` (K-3, на e2e_a_first_deposit.csv)
- `public/demo/demo_continuous.csv` (K-3, на e2e_b_arpu.csv)

**Модифицируем (Code):**
- `src/pages/StartScreen.jsx` (K-1)
- `src/pages/NotebookBuilderPage.jsx` (K-2)
- `src/components/notebook/DemoCsvCard.jsx` (K-3, descriptions + remove «появится» для ratio)
- `src/pages/DocsStartPage.jsx` (K-4)
- `src/pages/DocsTutorialPage.jsx` (K-4)
- `src/pages/DocsMethodologyPage.jsx` (K-4)
- (опционально) `package.json` если добавляем react-markdown
- Header / pages для a11y aria-labels если нужно (K-5)

**Tests:**
- `tests/components/notebook/DemoCsvCard.test.js` — обновить если есть assertions на descriptions
- UI без unit tests (конвенция).

---

## Acceptance criteria

1. `npm test` зелёный (без новых тестов, разве что DemoCsvCard description update).
2. `npm run build` чистый. Bundle delta < +30 KB gzip если добавляли react-markdown; иначе ≈ 0.
3. **Browser smoke (~10 мин):**
   - **/** : H1 «Управляем процессом тестирования без сюрпризов», p с кликабельными ссылками на /docs и NotebookLM, footer «ВСЕ ДАННЫЕ ХРАНЯТСЯ ЛОКАЛЬНО НА ВАШЕМ КОМПЬЮТЕРЕ»
   - **/docs** : index page с 3 cards (как было)
   - **/docs/start** : real content (overview + 4 шага + артефакты + принципы + cross-refs)
   - **/docs/tutorial** : 3 сценария с downloadable CSV links, working
   - **/docs/methodology** : длинная статья 9 разделов + sticky TOC (опц) + cross-ref на AI-компаньон
   - **/step3** : H1 «Конструктор» + subtitle над approval banner
   - **/step3 DemoCsvCard** : 3 активные опции (proportion / continuous / ratio), скачивание работает, файлы матчат туториалы
   - **Mobile** (375px): нет horizontal scroll за исключением schema table

4. **README.md** обновлён с overview из C-2 (минимум — что это + 4 шага + ссылки).

5. **External NotebookLM (NB-1..NB-3):** done by user после CLOSE.

---

## Sprint Report — что ожидаем

В `docs/project/sprint-9-report.md` (Code пишет):

- Trace-ability K-1..K-5 → файлы + diffs
- K-3: дельта public/demo CSV (replaced + created)
- K-4: какой markdown rendering approach (A/B/C/D)
- K-5: a11y findings + что фикснул, что отложил в backlog
- Tests count delta
- Bundle delta (особенно если +react-markdown)
- Time tracking — ожидаемый ~1.5-2 ч (Code-зона)

Cowork content artifacts отдельным batch'ем (через `docs/content/` файлы и `README.md`) — не в Code report'е.

---

## Sprint CLOSE expectations (Cowork после QA)

1. **ADR**: нет новых ADR в Sprint 9 (content + minor UI, не архитектурные изменения).
2. **JTBD §9** — закрыть все 6 methodology stories ([x] /docs/methodology + tooltips опционально), tutorial routes story, README story.
3. **JTBD §1** — закрыть Pv9-NEW-3 (/step3 H1) + Pv9-NEW-4 (StartScreen texts).
4. **CONTEXT.md** — Sprint 9 timeline entry (content + code + NotebookLM external).
5. **PROJECT_STATUS.md** — **v1 RELEASE**: Sprint 9 closed → продукт в v1. Update roadmap (post-v1 candidates).
6. **polish-pack-v2.md** — пометить Pv9 sections как закрытые.

---

## Related

- `docs/project/polish-pack-v2.md` — Pv9-NEW (NotebookLM finalization), Pv9-NEW-3 (/step3 H1), Pv9-NEW-4 (StartScreen texts), Pv9-NEW-2 (explicit segment dropdown — опц)
- `docs/project/e2e-scenarios-sprint-7.md` — source для C-3 tutorial rewrite
- `outputs/stat-plan-concept-for-notebooklm.md` — draft обложки NotebookLM (Sprint 7 CLOSE prep)
- `docs/context/concept.md` — source для C-2 «Что это» раздела
- `docs/context/decisions-log.md` — source для C-4 «Что мы НЕ делаем» disclaimer (ADR-009 sequential, ADR-001 no backend, ADR-004 no AI decisions)
- `docs/context/SAMPLE_SIZE_CALC.md` — source для C-4 раздел 2 формулы
- `docs/context/SCORING.md` — может быть полезно для C-4 раздел 6 decision rules
