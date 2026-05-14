# Sprint 1 Report — Foundation (React + Vite + Tailwind) + Start Screen + Step 1 Skeleton

**Dates:** 2026-05-15
**Status:** Complete

## Goal

Поднять стек React 19 + Vite + Tailwind по ADR-010, настроить деплой через GitHub Actions на GitHub Pages, реализовать стартовый экран с развилкой, степпер на 5 шагов и пустую страницу шага 1 (бриф) без бизнес-логики.

## What was built

**Стартовый экран (`/`)**
- Заголовок и краткое описание тула.
- Две карточки: «Начать с брифа» (диспатчит `START_BRIEF`, переход на `/step1`) и «У меня уже есть план» (drag-and-drop зона, принимает файл, показывает сообщение-заглушку «Парсинг будет реализован в Sprint 2/3», state не меняется).
- Степпер скрыт (ADR-005).

**Шапка (Header)**
- Видна на стартовом и на шаге 1.
- Слева — `stat·plan` с акцентной точкой.
- Справа — toggle `? Включить тур` / `✕ Закрыть тур`. При включении на `document.body` ставится класс `tour` (это инфраструктура для будущих тур-плашек, ADR-008).

**Степпер**
- 5 шагов: «Бриф», «Тест-план», «Конструктор», «Анализ», «Read-out».
- Состояния: `done` (✓), `active` (выделен, нижняя полоска акцентным цветом, лаймовый номер) и `locked` (opacity-45, `cursor-not-allowed`, без обработчиков клика). На шаге 1 шаги 2-5 — все `locked`.

**Шаг 1 — Бриф (`/#/step1`)**
- Защищён: если `state.started === false` → редирект на `/`.
- Виден общий Stepper (current = 1).
- Заголовок «Бриф» и прогресс «0 / 10 вопросов» (статичные числа).
- Полоска прогресса с шириной 0%.
- В основной колонке — placeholder «Здесь появятся вопросы брифа. Реализация — следующий спринт.».
- Справа — «КАРТА ВОПРОСОВ» с 10 пунктами из `docs/context/BRIEF_TREE.md` (Цель теста / Гипотеза / Тип метрики / Имя метрики / Baseline / Единица рандомизации / MDE / Доступный трафик / Guardrails / Stop & Decision rules). Без интерактива, без значений.

**State**
- `useReducer` + Context (`src/state/AppStateContext.jsx`, `src/state/reducer.js`).
- Поля: `started`, `currentStep`, `tourEnabled`.
- Actions: `START_BRIEF`, `TOGGLE_TOUR`.
- Никакого `localStorage` (по требованию промпта).

**Routing**
- `HashRouter` из `react-router-dom@7`.
- `/` → `StartScreen`, `/step1` → `BriefPage` (защищён), `*` → редирект на `/`.

**Деплой**
- `.github/workflows/deploy.yml`: checkout → setup-node (lts/*) → `npm ci` → `npm test` → `npm run build` → upload `dist/` как Pages artifact → deploy. Permissions `pages: write`, `id-token: write`. Concurrency-группа `pages`.

**Тесты**
- `tests/smoke.test.js` — единственный smoke-тест, чтобы Vitest-инфраструктура работала и CI проходил.

## Files Created

| File | Purpose |
|------|---------|
| `package.json` | Перезаписан: `type: module`, скрипты `dev`/`build`/`preview`/`test`/`test:watch`/`test:ui`, deps |
| `package-lock.json` | Лок-файл от `npm install` |
| `vite.config.js` | `base: '/stat-plan/'`, плагины react + tailwindcss, vitest config (jsdom, globals) |
| `index.html` | Vite entry, подключение шрифтов Fraunces / Inter / JetBrains Mono из Google Fonts |
| `src/main.jsx` | ReactDOM root, оборачивает `App` в `AppStateProvider` |
| `src/App.jsx` | HashRouter + Layout (Header, main), Routes, `ProtectedStep`, `TourBodyClass` |
| `src/state/reducer.js` | `initialState`, `Actions`, `reducer` |
| `src/state/AppStateContext.jsx` | `AppStateProvider`, `useAppState` hook |
| `src/components/Header.jsx` | Шапка с brand и toggle тура |
| `src/components/Stepper.jsx` | 5-шаговый степпер с состояниями |
| `src/pages/StartScreen.jsx` | Стартовый экран с двумя карточками и drag-and-drop заглушкой |
| `src/pages/BriefPage.jsx` | Шаг 1: stepper + прогресс + placeholder + карта вопросов |
| `src/styles/index.css` | Tailwind v4 `@import`, `@theme` с палитрой и шрифтами, базовые стили `body` (тёмная тема + radial-gradient фон) |
| `tests/smoke.test.js` | Smoke-тест Vitest |
| `.github/workflows/deploy.yml` | GitHub Actions deploy → Pages |

## Files Modified

| File | Changes |
|------|---------|
| (нет правок существующих файлов) | `CLAUDE.md`, `README.md`, `.gitignore`, `docs/**`, `mockups/**` не трогались |

В git status видна модификация `docs/project/Dev-Cycle.md` — это не мои правки (вероятно CRLF/LF normalization от первого checkout), не включал в коммиты этого спринта.

## ADR Compliance

| ADR | Соблюдение |
|---|---|
| **ADR-001** (no backend) | Никаких fetch на сервер. Всё статически. |
| **ADR-005** (5-шаговый флоу с развилкой, степпер скрыт на старте) | Stepper рендерится только на странице шага 1, на StartScreen — нет. Две карточки на старте. |
| **ADR-006** (статусы плана, шаги 3-5 заблокированы в степпере) | В этом спринте — статичная блокировка: все шаги после `currentStep` в Stepper.jsx помечаются как `locked` с `opacity-45`, `cursor-not-allowed`, без onClick. |
| **ADR-008** (тур-плашки без подсветки) | Кнопка тура в Header диспатчит `TOGGLE_TOUR`, на `body` ставится класс `tour`. Плашек самих нет (следующий спринт). |
| **ADR-010** (стек) | React 19.2.6 + Vite 8.0.13 + Tailwind 4.3.0 + react-router-dom 7.15.1 + Vitest 4.1.6, HashRouter, no localStorage, no state-libs, `base: '/stat-plan/'`, деплой через GitHub Actions с источником «GitHub Actions». |

Никаких обходов / отклонений от ADR. Никаких сторонних state-менеджеров. Никаких лишних зависимостей (не подключал `js-yaml`, `papaparse`, `recharts`, `JSZip`, `lucide-react`, `simple-statistics`).

## Локальные решения, которые стоит обсудить

1. **Tailwind v4 без `tailwind.config.js`.** В v4 актуальный паттерн — конфиг через `@theme` директиву прямо в CSS. Так и сделано: палитра (`--color-bg`, `--color-accent`, ...) и шрифты заданы в `src/styles/index.css`. Файла `tailwind.config.js` нет. Если нужно расширять — добавлять токены в `@theme`. Это рабочий стандарт v4 и в актуальной документации, но фиксирую явно: запись о том, что мы на v4 и в этом стеке нет `tailwind.config.js` / `postcss.config.js`, имеет смысл оставить в архитектурном чейнджлоге.

2. **Тёмная тема как единственная (light не делал).** Промпт оставлял тему опционально («light проще, тёмная/светлая на твоё усмотрение»). Раз `mockups/ab_planner_mockup_v4.html` тёмный и пользователь подтвердил мокап как валидный референс по UX — взял палитру в его направлении (фон `#0f1115`, акцент `#c9f25c`, серифные заголовки Fraunces). Без светлой темы и без toggle — в задачи это не входило.

3. **Vitest конфиг внутри `vite.config.js`.** Вынесен в поле `test` основного конфига, не в отдельный `vitest.config.js`. Это допустимо по докам vitest и проще поддерживать.

4. **Шрифты — через Google Fonts по CDN.** Fraunces / Inter / JetBrains Mono подгружаются через `<link>` в `index.html`. Альтернатива — самохостинг через `npm i @fontsource/*`, но это лишний bundle. CDN — простой путь.

5. **`ProtectedStep` + `TourBodyClass` живут в `App.jsx`.** Не вынесены в отдельные файлы, потому что используются строго один раз и тривиальны (3-5 строк). Если появятся другие защищённые шаги, рефакторнем в `components/`.

6. **Header — на полную ширину, main — в контейнере `max-w-[1240px]`.** Это даёт сплошную бордерную линию под шапкой через всю ширину viewport, как в мокапе. Внутри Header есть собственный `max-w-[1240px]` контейнер для контента.

## Known Issues

1. **`docs/project/Dev-Cycle.md` модифицирован в git** — не моё изменение. Видимо, CRLF/LF normalization при первом `git status` после клонирования на Windows. В коммиты этого спринта не включал.
2. **Mobile responsive не тестирован.** Layout сделан с `md:` breakpoints для grid (на узких экранах — single column), но реальной проверки на мобильных устройствах не было.
3. **A11y минимум.** Поставил `aria-current="step"`, `aria-disabled`, `aria-pressed` на toggle тура, `role="progressbar"` с `aria-value*` на полоске прогресса. Полного аудита (фокусные стили, контраст, клавиатурная навигация по карточкам) не проводил.
4. **Drag-and-drop пуст без перетаскивания.** Если пользователь кликнет по карточке «У меня уже есть план» — ничего не произойдёт (нет `<input type="file">` как fallback). По прoмпту тут только drag-and-drop, но в реальном UX будет странно без клика. Кандидат на следующий спринт — добавить обычный file input по клику.
5. **Hover-эффект кнопки `Закрыть тур` использует rgba inline в Tailwind arbitrary value** (`hover:bg-[rgba(122,180,255,0.2)]`). Работает, но если будет много таких — лучше вынести в `@theme` как `--color-tour-hover`.
6. **Деплой я не запускал** — у меня нет write-доступа к GitHub. Workflow прописан, но проверить, что Pages-деплой действительно зелёный, можно будет только после `git push`. Acceptance criteria 1, 2, 11 (браузерная проверка после деплоя) остаются на пользователе.
7. **`StrictMode` оборачивает приложение** — это удваивает рендеры в dev, что для будущих эффектов с side-effects может требовать осторожности. Не баг, но фиксирую.

## Notes

**Что хорошо проверилось локально:**
- `npm test` — зелёный, smoke-тест Vitest проходит.
- `npm run build` — собирается в `dist/` без ошибок (CSS 16.2KB, JS 241KB, gzip ~78KB).
- `npm run preview --port 4173` — отдаёт `http://localhost:4173/stat-plan/` со 200, JS/CSS подгружаются, в CSS-бандле присутствуют классы из кастомного `@theme` (`bg-accent`, `text-fg-dim`, `border-border`, `--color-accent: #c9f25c`) — это подтверждает, что Tailwind v4 + `@theme` работают как ожидалось.

**Что НЕ проверил локально (нужен живой браузер):**
- Визуальную целостность стартового экрана и шага 1 (только дамп HTML/CSS, не отрендеренный layout).
- Что toggle тура реально переключает класс `tour` на body (логика очевидная, но не подтверждена кликом).
- Drag-and-drop — обработчик есть, файл должен показывать сообщение-заглушку.
- Browser compat (Chrome / Firefox / Safari).

**Вопросы для Cowork:**
- Тёмная тема — окей как единственная, или будет ADR на «обе темы + toggle»? Если второе, лучше зафиксировать до того, как палитра расползётся по компонентам.
- Tailwind v4 без `tailwind.config.js`/`postcss.config.js` — отразить в `ARCHITECTURE.md` (там есть пункт «`tailwind.config.js` либо `@config` в CSS» — у нас второй вариант)?
- `.claude/` появилась в git status как untracked. Если эта папка должна игнорироваться репозиторием — добавить её в `.gitignore`.

**Ссылка на Pages-деплой:**
Будет известна после `git push` пользователя. Ожидаемый URL: `https://cosmiksoul.github.io/stat-plan/`.
