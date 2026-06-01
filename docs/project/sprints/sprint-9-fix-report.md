# Sprint 9 FIX iter 1 — Report (Code)

**Дата:** 2026-06-01
**Источник:** `docs/project/sprints/sprint-9-fix-prompt.md` (S-1..S-4)
**Результат:** 4/4 сделаны. `npm test` 468/468 ✓ (+1 кейс), `npm run build` чистый, initial bundle без изменений.

---

## S-1 + S-3 — meta-теги `index.html`
Добавлено в `<head>` (после viewport, перед шрифтами), `<body>`/`<script>`/layout не тронуты:
- `<title>` → «stat·plan — A/B тест без сюрпризов» (было «планировщик A/B тестов»).
- `meta description` + `meta author` + `link rel=canonical`.
- **Open Graph** — 12 тегов (type, site_name, locale + alternate, url, title, description, image + image:type/width/height/alt). `og:image` — абсолютный `https://cosmiksoul.github.io/stat-plan/og-image.png`, width=1200 height=630.
- **Twitter Cards** — 5 тегов (card=summary_large_image, title, description, image, image:alt).
- `meta theme-color #0e1014` (S-3).
- Verify: `dist/index.html` — 19 совпадений по `og:|twitter:|canonical|description`; `<title>` обновлён. Favicon — skip (per prompt, Cowork отдельно).

## S-2 — `public/og-image.png` перегенерён в ровно 1200×630
- **Вариант: headless Chrome re-render** (не вариант A sharp, не вариант B online — но **без новых deps**, как требует B). Существующий PNG был 1210×640 → пересоздан в 1200×630.
- Метод: временный HTML-wrapper инлайнит `og-image.svg` + `@import` Google Fonts (Fraunces/Inter/JetBrains Mono) → `chrome --headless=new --window-size=1200,630 --force-device-scale-factor=1 --virtual-time-budget=6000 --screenshot`. CDN-шрифты подгрузились (брендовая типографика сохранена, не fallback — проверено визуально: Fraunces-логотип, italic-tagline, Inter-буллеты, JetBrains Mono-лейблы рендерятся корректно).
- Системных конвертеров (magick/inkscape/rsvg/sharp) нет; проектные шрифты в системе не установлены — поэтому CDN-инъекция через браузер.
- Финал: `public/og-image.png` — **PNG 1200×630, RGB, 76 103 bytes** (было 109 533 / 1210×640). Временный wrapper удалён, рабочее дерево чистое.

## S-4 — print-friendly `report.html` (`src/lib/results/report-html.js`)
- В конец `STYLES`-литерала добавлен `@media print { … }` light-theme override: body белый `#fff` / текст `#1a1a1a`; h2 `#166534` (dark forest green, родственный accent); borders `#d4d4d8`; meta/muted `#525252/#737373`; `.tldr` `#f5f5f4`; `.ok/.warn/.bad` тёмные читаемые; бейджи значимости/novelty — светлый фон + тёмный текст + border.
- Print-правила: `page-break-inside: avoid` на `section` и `img.graph`; `page-break-after: avoid` на `h2`.
- Экранный вид (без печати) не изменился — dark theme нетронут.
- **Тест** (`tests/lib/results/report-html.test.js`, +1): проверяет наличие `@media print` и `body { background: #ffffff` внутри блока.

---

## Files
**Modify:** `index.html`, `src/lib/results/report-html.js`, `tests/lib/results/report-html.test.js`
**Regenerate:** `public/og-image.png` (1200×630)
**Commit (были untracked, Code-зона public/):** `public/og-image.svg` (Cowork-source), `public/og-image.png`
**НЕ трогал:** body/script/layout index.html, templates, reducer, docs/content; новых deps нет; favicon.

## Verification
- `npm test` → **468 passed** (было 467, +1 print-кейс).
- `npm run build` → чистый, 946 модулей. `dist/index.html` 3.22 KB (gzip 1.11). **Initial `index` bundle 136.68 KB gzip — без изменений.** report-html.js в ValidationReportPage-chunk (gzip 6.46, +~0.1 KB print-стили). `dist/og-image.png` — 1200×630 ✓.
- Print-preview (Ctrl+P) и OG-валидаторы (после деплоя) — визуальная проверка на стороне пользователя.

## Time tracking
~20 мин active.

## Для Cowork (info)
- `public/og-image.svg` — Cowork-source, лежит в `public/` (Code-зона коммитов) → закоммичен Code'ом вместе с PNG. Если SVG правится позже — PNG нужно перегенерить тем же методом (headless Chrome + CDN fonts).
- OG-валидация (LinkedIn Post Inspector / FB Debugger / Twitter Card Validator) на `https://cosmiksoul.github.io/stat-plan/` — после деплоя.
