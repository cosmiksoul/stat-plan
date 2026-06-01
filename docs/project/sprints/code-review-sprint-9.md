# Code Review — Sprint 9 Phase 2 (Code DEV)

> **Verdict:** ✅ APPROVED. Все 6 K-items сделаны чисто, K-6 over-delivered (был «опционально» в prompt). 1 minor concern про слаг #scoring — поправил сам в content. Готов к browser smoke + Phase 3 NotebookLM external.

**Источник:** `docs/project/sprints/sprint-9-prompt.md` Phase 2 (K-1..K-6) + `docs/project/sprints/sprint-9-report.md`.
**Reviewed:** ключевые правки — `StartScreen.jsx`, `MarkdownArticle.jsx` (целиком, новый компонент), `SegmentColumnPicker.jsx` (целиком, новый), Code-отчёт.

---

## Trace-ability K-1..K-6

| K | Что обещано | Что в коде | Verdict |
|---|---|---|---|
| K-1 | StartScreen 3 правки | H1 «Управляем процессом тестирования без сюрпризов» ✓, p с `<Link to="/docs">документацию</Link>` + external AI-компаньон ✓, footer rename ✓ | ✅ |
| K-2 | /step3 H1 + subtitle | `<header>` с H1 «Конструктор» + subtitle, стиль = /step2,4 (font-serif text-3xl) | ✅ |
| K-3 | Demo CSV unification | mv e2e_* → demo_*, 3 файла в `public/demo/` + `demo_ratio.csv` активирован. Node-проверка stats совпадает с туториалом (CR 3.09/3.96, ARPU 104.86/106.58, CTR 9.03/11.09). | ✅ |
| K-4 | Inline docs content | NEW MarkdownArticle.jsx (react-markdown + remark-gfm), 3 Docs*Page lazy-loaded, `?raw` import из docs/content/ работает | ✅ + over-deliver (lazy chunking) |
| K-5 | a11y / mobile audit | aria-current на Stepper, aria-label на nav, focus-visible global, chevron aria-hidden. Code: «Mobile 375px — на стороне пользователя» | ✅ (minimal pass per spec) |
| K-6 | (Опц) Explicit segment dropdown | NEW SegmentColumnPicker.jsx, переиспользует `schema_overrides['geo']` без нового state. Включён в CellsList при segments enabled | ✅ **over-delivered** (K-6 был «опционально») |

**Tests:** 467/467 (delta 0 — UI/content/CSV без unit-tests, по конвенции). ✅
**Bundle:** initial 136.59 KB gzip — **без изменений** (markdown lazy chunk 47.61 KB подгружается только на /docs). ✅
**Round-trip:** 6/6 не задет (правки не касались YAML test_plan.md). ✅
**Time:** ~1.5 ч активной работы. ✅ (план был 1.5-2 ч)

---

## Качественная оценка ключевых решений

**K-4 MarkdownArticle component design.** Чистый element map под Tailwind:
- Slugify поддерживает кириллицу (regex `[^\wа-яё\s-]/gi`) — корректно
- `scroll-mt-24` на h1-h3 — учитывает sticky-header при anchor-навигации
- External vs internal link автодетект через regex `/^https?:\/\//`
- Inline vs block code разные стили — important для читаемости
- Tables wrapped в `overflow-x-auto` — mobile-friendly
- Lazy chunking — `+react-markdown` не ударяет по initial bundle (47 KB только на /docs)

Это **более качественная реализация чем я предложил в prompt** — я писал «Code решает A/B/C/D approach», Code выбрал B (react-markdown) и сделал чисто с явным маппингом без `@tailwindcss/typography` плагина. Sound.

**K-6 SegmentColumnPicker — clean state design.** Переиспользует `schema_overrides['geo']` без нового state — нет двух источников истины. `geo` как lookup key сохранён per ADR (backward-compat). UI: presets (geo/device/country/plan/segment) + «Другое…» с text input. Подсказка под select про синхронизацию с expected schema. Это **точное execution** Pv9-NEW-2 спеки из polish-pack-v2.md.

**K-3 demo CSV verification через node.** Code не просто перенёс файлы, но и **верифицировал stats** через node-скрипт что они матчат туториал (CR 3.09/3.96, ARPU 104.86/106.58, CTR 9.03/11.09). Это закрывает edge-case «случайно подменили CSV неправильным». Хорошая инициатива не из spec.

**K-4 ?raw import из docs/ — works!** Я в prompt предположил что может потребоваться fallback в `src/content/` если Vite не может `?raw` импортить из `docs/`. Code попробовал, подтвердил build'ом что работает. Меньше дублирования файлов.

**Build PARSE_ERROR catch.** Code «поймал и исправил дубль `import { useAppState }` в App.jsx (первый build падал, vitest не парсит App.jsx)». Это **важный пример** — unit-тесты не покрыли code-quality issue, build-test поймал. Прозрачное reporting. Урок для будущего.

---

## Cross-zone observations

**docs/content/ tracking saga.** Code в первоначальном отчёте написал «закоммитить docs/content/ — build-блокер», потом проверил `git ls-files`, увидел что всё уже tracked, поправил отчёт во втором коммите. Honest reporting, не блокер для пользователя.

**Content импорт на build-time.** Любые правки `docs/content/*.md` Cowork'ом автоматически попадают в страницы при следующем build (через `?raw` Vite plugin). Это значит **CLOSE-фаза правки content** не требуют новых Code-коммитов — пересборка обновит pages.

---

## Concerns

### CR-1 (minor, сам поправил) — anchor `#scoring` не работал

В `docs-methodology.md` line 25 была ссылка `[Группа 3 «Методологическая консистентность»](#scoring)`, но заголовка с slug «scoring» нет. Code корректно отметил: «ссылка просто не прыгнет, не падает».

**Fix:** заменил на inline-описание без ссылки — «(группа «Методологическая консистентность» в оценке тест-плана даёт 30 баллов)». Другие 2 anchor (`#demo-данные`, `#aliases`) — проверил, заголовки существуют, slugify их корректно генерит.

**Severity:** P3, не блокер. Уже закрыт content-правкой.

---

## Что НЕ проверял (для full audit)

- Не запускал `npm test` локально — полагаюсь на Code-отчёт 467/467
- Не запускал `npm run build` — полагаюсь на Code-отчёт чистый build + verified initial bundle 136.59 KB
- Не вычитывал целиком CellsList.jsx integration SegmentColumnPicker — Code чётко описал переиспользование `schema_overrides['geo']`, в SegmentColumnPicker.jsx это видно
- Не вычитывал DocsTutorialPage.jsx с блоком download — Code описал реализацию через `import.meta.env.BASE_URL`

Если хочешь deeper audit конкретного места — скажи.

---

## Готов к browser smoke?

Да. Test cases — `test-cases-sprint-9-retest.md` (отдельный документ). Smoke ~10-15 мин:
1. StartScreen новые тексты + кликабельные ссылки
2. /step3 H1 + segment dropdown sync с expected schema
3. /docs/* рендер markdown + tables + anchors
4. Demo CSV скачивание совпадает с туториалом

После smoke + Phase 3 NotebookLM — **Sprint 9 CLOSE = v1 RELEASE** 🎯

---

## Related

- `docs/project/sprints/sprint-9-prompt.md` — spec Phase 2 K-1..K-6
- `docs/project/sprints/sprint-9-report.md` — Code отчёт (2 коммита: 6462c18 main + 3072451 report correction)
- `docs/project/sprints/test-cases-sprint-9-retest.md` — runnable browser smoke (TBD)
- `docs/content/*.md` — Cowork content, импортируется в pages через `?raw`
- `docs/project/polish-pack-v2.md` — Pv9-NEW-2 (explicit segment dropdown) реализован как K-6
