# Sprint 9 FIX iter 1 — OG-теги + preview-image + print-friendly report

**Type:** Code FIX (one-phase, focused)
**Estimated:** ~25-30 мин active
**Источник:** запрос пользователя 2026-06-01 после Sprint 9 Phase 2 — (1) добавить микроразметку Open Graph + Twitter Cards и preview-картинку для шеринга в LinkedIn (reference: `cosmiksoul.github.io/retention-calculator`), (2) `report.html` при печати в PDF имеет слишком тёмный/малоконтрастный текст (browser убирает тёмный background но оставляет светлый текст).

---

## Overview

`index.html` сейчас минимальный — нет `description`, `canonical`, OG-тегов, Twitter Cards. При шеринге ссылки `cosmiksoul.github.io/stat-plan/` в LinkedIn/Twitter/Facebook появляется generic preview без картинки. Добавить полный набор meta-тегов + готовую OG-картинку (Cowork подготовил SVG → нужна PNG-конверсия).

---

## Scope (S-1..S-4)

### S-1. Meta-теги в `index.html`

**Current** (`index.html`):
```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>stat·plan — планировщик A/B тестов</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**New** (после meta description / canonical / OG / Twitter / favicons):

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>stat·plan — A/B тест без сюрпризов</title>
    <meta name="description" content="Открытый клиентский планировщик A/B-тестов. Бриф → проверенный план → Jupyter-ноутбук → HTML-отчёт. SRM, novelty, guardrails, decision rules — автоматически из плана. Без бэкенда, всё локально в браузере." />
    <meta name="author" content="Kanstantsin Hupalau" />
    <link rel="canonical" href="https://cosmiksoul.github.io/stat-plan/" />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="stat·plan" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta property="og:url" content="https://cosmiksoul.github.io/stat-plan/" />
    <meta property="og:title" content="stat·plan — A/B тест без сюрпризов" />
    <meta property="og:description" content="Бриф → проверенный план → Jupyter-ноутбук → HTML-отчёт. SRM, novelty, guardrails, decision rules — автоматически из плана. Open source, client-side, no backend." />
    <meta property="og:image" content="https://cosmiksoul.github.io/stat-plan/og-image.png" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="stat·plan — A/B planner. Skipping surprises with structured brief, generated notebook, HTML report." />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="stat·plan — A/B тест без сюрпризов" />
    <meta name="twitter:description" content="Бриф → проверенный план → Jupyter-ноутбук → HTML-отчёт. SRM, novelty, guardrails, decision rules — автоматически. Open source." />
    <meta name="twitter:image" content="https://cosmiksoul.github.io/stat-plan/og-image.png" />
    <meta name="twitter:image:alt" content="stat·plan — A/B planner. Skipping surprises with structured brief, generated notebook, HTML report." />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Что добавлено:**
1. `<title>` обновлён с таглайном
2. `meta name="description"` — общее описание
3. `meta name="author"`
4. `link rel="canonical"` — каноническая ссылка
5. Open Graph block — 10 тегов (type, site_name, locale + alternate, url, title, description, image + image:type/width/height/alt)
6. Twitter Cards block — 5 тегов (card, title, description, image + image:alt)

**Note:** `og:image` URL — абсолютный `https://cosmiksoul.github.io/stat-plan/og-image.png`. Это **обязательно** — соцсети не умеют резолвить относительные пути.

### S-2. PNG `og-image.png` в `public/`

Cowork подготовил `public/og-image.svg` (1200×630, темный фон stat·plan palette, левая часть — logo + tagline + 4 bullets, правая часть — TL;DR-карточка как в HTML-отчёте продукта). Нужна конверсия в PNG.

**Варианты конверсии** (Code выбирает):

**A. Sharp (Node.js, добавить как build-step dev-dep):**
```bash
npm install --save-dev sharp
```
```js
// scripts/build-og-image.js
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'

const svg = readFileSync('public/og-image.svg')
const png = await sharp(svg, { density: 300 }).resize(1200, 630).png().toBuffer()
writeFileSync('public/og-image.png', png)
console.log('og-image.png generated:', png.length, 'bytes')
```
```json
// package.json scripts
"build:og-image": "node scripts/build-og-image.js",
"prebuild": "npm run build:og-image"
```

**Pros:** автоматически перегенерится при правках SVG. Не нужно коммитить PNG.
**Cons:** +sharp dep (большая, нативная), +build step.

**B. Pre-generated PNG, закоммитить в `public/og-image.png`:**

Конверсия через CLI (одноразово локально, пользователь сам):
- Inkscape: `inkscape public/og-image.svg --export-png=public/og-image.png -w 1200 -h 630`
- ImageMagick: `magick -background none -size 1200x630 public/og-image.svg public/og-image.png`
- Online: cloudconvert.com, convertio.co (загрузить SVG → конвертация SVG→PNG → 1200×630 → скачать)
- Chrome DevTools: открыть SVG в Chrome → F12 → Command palette (Ctrl+Shift+P) → "Capture full size screenshot"

После генерации — `public/og-image.png` коммитится в репо.

**Pros:** нет deps, нет build step, простой контроль. PNG не пересоберётся случайно.
**Cons:** при правках SVG нужно вручную пересгенерить PNG.

**Рекомендую B** для простоты — OG-картинка меняется редко (раз в полгода в product update'е), `sharp` ради этого — overkill.

**Шрифты в SVG:** SVG ссылается на `Fraunces`, `Inter`, `JetBrains Mono` через `font-family`. Если конвертер (sharp / Inkscape / ImageMagick) не имеет доступа к этим шрифтам — fallback на дефолтные serif/sans/mono (всё равно читаемо). Для pixel-perfect рендера:
- Установить шрифты локально перед конверсией (через Google Fonts download или OS-level install)
- Или использовать Chrome screenshot — у Chrome шрифты подгрузятся из CDN при открытии SVG

**Sharp без шрифтов** — на GH Actions runner'ах шрифтов нет, рендер будет с fallback'ом. Если Code выбирает A — учесть.

### S-3. Также мелкие index.html полировки

- `<title>` text: `stat·plan — A/B тест без сюрпризов` (вместо `планировщик A/B тестов`)
- Опционально: `<meta name="theme-color" content="#0e1014">` — задаёт цвет адресной строки в мобильных браузерах
- Опционально: `<link rel="icon" type="image/svg+xml" href="/stat-plan/favicon.svg">` — если Cowork позже подготовит favicon. **На сейчас skip**, favicon уже идёт от Vite по умолчанию.

### S-4. Print-friendly HTML отчёт

**Проблема:** `report.html` сделан под dark theme (фон `#0e1014`, текст `#ededed`). При `Ctrl+P` → Save as PDF Chrome по умолчанию **убирает** background colors (для экономии чернил), но текст остаётся светлым `#ededed` → почти невидим на белом фоне. Заголовки `h2` цвета `#a3e635` тоже не контрастные на белом. На скриншоте Print Preview видно: текст еле читается, цвета размыты.

**Решение:** добавить `@media print` блок с light theme overrides в STYLES `report-html.js`.

**Current** (`src/lib/results/report-html.js:10-33`):
```js
const STYLES = `
  body { background: #0e1014; color: #ededed; ... }
  h1 { ... color: #ededed; }
  h2 { ... color: #a3e635; border-bottom: 1px solid #2a2d33; }
  .meta { color: #a8a8a8; ... }
  th { color: #a8a8a8; ... }
  .tldr { background: #1a1d23; border-left: 3px solid #a3e635; ... }
  .ok { color: #a3e635; }
  .warn { color: #fbbf24; }
  .bad { color: #f87171; }
  .muted { color: #6b7280; ... }
  img.graph { ... border: 1px solid #2a2d33; ... background: #1a1d23; }
  footer { ... border-top: 1px solid #2a2d33; color: #6b7280; ... }
  .final-decision { background: #1a1d23; border: 1px dashed #3a3f47; ... }
  .significance-badge.ok, .novelty-badge.ok { background: #1a3a1a; color: #a3e635; }
  .significance-badge.warn, .novelty-badge.warn { background: #3a2a1a; color: #fbbf24; }
`
```

**Add at the end of STYLES template literal** (перед закрывающим backtick):

```css
@media print {
  body { background: #ffffff; color: #1a1a1a; padding: 24px; }
  header { border-bottom-color: #d4d4d8; }
  h1 { color: #1a1a1a; }
  h2 { color: #166534; border-bottom-color: #d4d4d8; }
  .meta { color: #525252; }
  table { font-size: 12px; }
  th, td { border-bottom-color: #d4d4d8; }
  th { color: #404040; }
  .tldr { background: #f5f5f4; border-left-color: #166534; color: #1a1a1a; }
  .ok { color: #166534; }
  .warn { color: #b45309; }
  .bad { color: #b91c1c; }
  .muted { color: #737373; }
  img.graph { border-color: #d4d4d8; background: #fafafa; page-break-inside: avoid; }
  footer { border-top-color: #d4d4d8; color: #737373; }
  .final-decision { background: #fafafa; border-color: #a3a3a3; color: #1a1a1a; }
  .significance-badge.ok, .novelty-badge.ok { background: #dcfce7; color: #14532d; border: 1px solid #86efac; }
  .significance-badge.warn, .novelty-badge.warn { background: #fef3c7; color: #78350f; border: 1px solid #fcd34d; }
  section { page-break-inside: avoid; }
  h2 { page-break-after: avoid; }
}
```

**Палитра** (light theme дополняющая дизайн stat·plan):
- background → `#ffffff` (white)
- text → `#1a1a1a` (near-black, не чисто черный для меньшего contrast strain)
- h2 «зеленый акцент» → `#166534` (dark green forest, читается на белом, родственный `#a3e635` accent)
- borders → `#d4d4d8` (light grey)
- meta/muted text → `#525252` / `#737373` (mid-grey)
- TL;DR card background → `#f5f5f4` (warm light grey)
- badge OK → светло-зеленый фон + темно-зеленый текст + границы для visibility
- badge WARN → светло-янтарный фон + темно-янтарный текст
- graph images → светло-серая обводка, page-break-inside: avoid (картинка не разрывается между страницами)

**Полезные print-only правила:**
- `page-break-inside: avoid` на `<section>` и `<img.graph>` — секции не рвутся посреди
- `page-break-after: avoid` на `<h2>` — заголовок не отрывается от следующего параграфа

**Tests:** `tests/lib/results/report-html.test.js` (+1 case опц.):
```js
test('STYLES include @media print block', () => {
  const html = buildReportHtml(...)
  expect(html).toContain('@media print')
  expect(html).toMatch(/@media print[\s\S]*body\s*{\s*background:\s*#ffffff/)
})
```

**Acceptance:**
- Открыть report.html → Ctrl+P → Print Preview: фон белый, текст чёрный, заголовки h2 тёмно-зелёные, бейджи значимости/novelty с явными бордерами, графики не разрываются между страницами
- На экране (без печати) — отчёт остаётся в dark theme, никаких визуальных изменений
- Сохранить как PDF — все элементы читаемы, нет «прозрачного текста на белом»

---

## Что НЕ делаем (DO NOT)

- ❌ **Не трогаем** `<script>`, `<body>`, основной layout — только `<head>` и `public/og-image.*`
- ❌ **Не добавляем** прочие meta-теги (robots, msapplication, apple-mobile-web-app — не критично для шеринга)
- ❌ **Не делаем** OG-image autoresize для разных платформ (LinkedIn / X / Telegram) — 1200×630 универсально для всех
- ❌ **Не пишем** favicon (Cowork отдельно при необходимости)
- ❌ **Не вводим** новых deps если выбираем вариант B для PNG (рекомендуемый)

---

## Files involved

**Модифицируем:**
- `index.html` (S-1, S-3)
- `src/lib/results/report-html.js` (S-4, добавить @media print в STYLES)

**Создаём:**
- `public/og-image.png` (S-2, pre-generated через CLI Cowork'ом или sharp Code'ом)

**Tests (опционально):**
- `tests/lib/results/report-html.test.js` (S-4, +1 case проверка наличия `@media print` блока)

**Cowork уже подготовил:**
- `public/og-image.svg` (source для конверсии)

**Опционально (если вариант A для PNG):**
- `package.json` (+sharp dep + build:og-image script + prebuild hook)
- `scripts/build-og-image.js`
- `public/og-image.png` (auto-generated)

---

## Acceptance criteria

1. `npm test` зелёный (delta 0, нет unit-tests на index.html / public/).
2. `npm run build` чистый. Если выбран вариант A — `build:og-image` отрабатывает первым.
3. Открыть `dist/index.html` в браузере — visual check:
   - `<title>` обновлён
   - `View Source` показывает все meta-теги (OG / Twitter / canonical / description)
4. `dist/og-image.png` существует, открывается, 1200×630, выглядит как `public/og-image.svg`.
5. **OG validation** (опционально, после деплоя):
   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
   - Вставить URL `https://cosmiksoul.github.io/stat-plan/` → preview должен показать stat·plan og-image + title + description

---

## Sprint Fix Report — что ожидаем

В `docs/project/sprints/sprint-9-fix-report.md` короткий отчёт:
- Какой вариант для PNG (A sharp / B pre-generated)
- Diff `index.html` (+meta tags)
- Размер og-image.png в bytes
- Bundle delta (вероятно 0 — index.html не идёт в JS bundle)
- Time tracking — ~15-20 мин

---

## Related

- `public/og-image.svg` — source (Cowork подготовил)
- `index.html` — entrypoint
- Reference: `cosmiksoul.github.io/retention-calculator` (прошлый проект пользователя с тем же паттерном — посмотреть их `index.html` через `view-source:` для сверки tag names)
