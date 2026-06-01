# Sprint 1 — Foundation (React + Vite + Tailwind) + Start Screen + Step 1 Skeleton

**Type:** Code sprint
**Estimated:** 4-5 дней работы

---

## Overview

Первый спринт проекта. Поднимаем стек React 19 + Vite + Tailwind по ADR-010, настраиваем деплой через GitHub Actions на GitHub Pages, делаем стартовый экран с развилкой, степпер на 5 шагов и пустую страницу шага 1 (бриф) — но без вопросов.

Цель — получить рабочий деплой, на котором можно навигировать «старт → шаг 1» и понять блокировку остальных шагов. Никакой бизнес-логики (парсинг md, расчёт sample size, scoring) в этом спринте нет.

---

## Scope (user stories из JTBD.md)

Из § 1 «Старт и навигация»:

- ★ Стартовый экран с понятным выбором («Начать с брифа» / «У меня уже есть план») `[ui]`
- ★ Степпер с пятью шагами `[ui]`
- ★ Будущие шаги заблокированы до выполнения предыдущих `[ui]`

Из § 2 «Бриф»:

- ★ Прогресс N/10 в виде полоски — **только UI shell** (показывает 0/10) `[ui]`

Из § 3 «Карта вопросов»:

- ★ ◆ Карта всех вопросов справа — **только UI shell** (10 пунктов из BRIEF_TREE.md, без значений, без интерактива) `[ui]`

**Что НЕ закрываем:** парсинг загруженного `test_plan.md`, localStorage, тур-плашки (только toggle кнопки), вопросы брифа, кликабельность карты, страницы шагов 2-5.

---

## Tasks

### 1. Инициализация проекта

**Важно: первый коммит репозитория уже сделан** (содержит docs/, mockups/, CLAUDE.md, README.md, .gitignore). Скаффолдим Vite-проект **внутри существующей папки**, не перезатирая существующее.

```
npm create vite@latest . -- --template react
```

(подтвердить «Ignore files and continue» если спросит — существующая `docs/` и проч. должны остаться)

Установить и настроить:
- **React 19** (последняя стабильная) — приедет с шаблоном
- **Tailwind** (последняя стабильная — если v4, ставить по официальным docs v4 с `@import "tailwindcss"` в CSS; если v3 — через `postcss.config.js` + `tailwind.config.js`). **Выбери ту версию, которую npm поставит как latest, и следуй её актуальной install-документации.**
- **react-router-dom** v7 — `npm install react-router-dom`
- **Vitest** — `npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom`

Скрипты в `package.json`:
- `npm run dev` — Vite dev server
- `npm run build` — production build в `dist/`
- `npm run preview` — preview собранного
- `npm test` — Vitest однократно
- `npm run test:watch` — Vitest в watch

### 2. Конфиг Vite под GitHub Pages

В `vite.config.js`:

```javascript
export default defineConfig({
  plugins: [react()],
  base: '/stat-plan/',   // имя репозитория на github
})
```

**⚠ Важно:** имя репозитория на GitHub — `stat-plan` (с дефисом, не подчёркиванием). Если пользователь его переименует, `base` нужно обновить.

### 3. GitHub Actions workflow

Создать `.github/workflows/deploy.yml`. Деплой на push в `main`:

1. checkout
2. setup Node (LTS)
3. `npm ci`
4. `npm test` (если падает — workflow падает, деплой не идёт)
5. `npm run build`
6. upload `dist/` как Pages artifact
7. deploy

Использовать актуальные actions: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4` (проверить актуальность на момент написания).

Workflow должен иметь permissions `pages: write`, `id-token: write` и `concurrency` группу под Pages.

### 4. Структура `src/`

Согласно `docs/context/ARCHITECTURE.md`:

```
src/
├── main.jsx                # ReactDOM.createRoot
├── App.jsx                 # HashRouter + Layout
├── components/
│   ├── Header.jsx          # шапка с кнопкой «? Включить тур»
│   └── Stepper.jsx         # 5 шагов, состояния current/locked
├── pages/
│   ├── StartScreen.jsx     # стартовый экран с двумя карточками
│   └── BriefPage.jsx       # шаг 1 placeholder
├── state/
│   ├── AppStateContext.jsx # Context + Provider
│   └── reducer.js          # reducer + types + initial state
└── styles/
    └── index.css           # Tailwind directives + глобальное
```

Подпапки `src/lib/`, `tests/lib/`, `templates/`, `public/demo/` создавать **не нужно** в этом спринте.

### 5. State

Минимальное состояние, через `useReducer` + Context (`src/state/`):

```javascript
const initialState = {
  started: false,
  currentStep: 1,
  tourEnabled: false,
}

// actions: START_BRIEF, TOGGLE_TOUR
```

**Никакого localStorage в этом спринте.** State живёт только в памяти. Перезагрузка = всё сбрасывается.

### 6. Routing

`HashRouter` из `react-router-dom`. Роуты:

- `/` — StartScreen (если `state.started`, можно или редирект на `/step1`, или оставить — на твоё усмотрение)
- `/step1` — BriefPage, но **если `state.started === false` → редирект на `/`**

Роуты `/step2` ... `/step5` **не реализуем**. Степпер должен показывать эти пункты как заблокированные, без перехода.

### 7. Компоненты

**`Header.jsx`**
- Видна всегда (на стартовом и на шаге 1)
- Слева — название «stat·plan»
- Справа — кнопка `? Включить тур` / `✕ Закрыть тур` (по `state.tourEnabled`). При клике диспатчит `TOGGLE_TOUR`. На `<body>` или корневом div ставится класс `tour` когда включено. Сами плашки — следующий спринт; в этом достаточно факта, что toggle работает.

**`Stepper.jsx`**
- 5 шагов: «Бриф», «Тест-план», «Конструктор», «Анализ», «Read-out»
- Props: `currentStep`
- Шаги, у которых `index < currentStep` — пройденные (визуально отличаются), `index === currentStep` — текущий (выделен), `index > currentStep` — заблокированы (приглушены, `cursor-not-allowed`, клик ничего не делает)
- На стартовом экране **не отображается** (см. ADR-005)

**`StartScreen.jsx`**
- Заголовок и краткое описание (взять начало из `README.md`, без фанатизма)
- Две карточки бок о бок (на десктопе — flex/grid, на мобильном — стек):
  - «Начать с брифа» — карточка-кнопка, клик диспатчит `START_BRIEF` + навигация на `/step1`
  - «У меня уже есть план» — карточка с drag-and-drop зоной. Принимает файл (через `onDrop`), но показывает сообщение «Парсинг загруженного плана будет реализован в Sprint 2/3. Пока используй „Начать с брифа“.» State не меняется.

**`BriefPage.jsx`**
- Использует общий `Stepper` (current = 1)
- Прогресс-бар: «0 / 10 вопросов» — статичный, цифры захардкожены
- Layout (на десктопе): слева/в центре — main area с placeholder-текстом «Здесь появятся вопросы брифа. Реализация — следующий спринт.», справа — карта вопросов из 10 пунктов:
  ```
  01 Цель теста
  02 Гипотеза
  03 Тип метрики
  04 Имя метрики
  05 Baseline
  06 Единица рандомизации
  07 MDE
  08 Доступный трафик
  09 Guardrails
  10 Stop & Decision rules
  ```
  Без статуса, без расхлопывания, без клика — просто список с номерами. Формулировки взять из `docs/context/BRIEF_TREE.md`.

### 8. Стили

Tailwind utility-классы. Дизайн-направление — посмотри `mockups/ab_planner_mockup_v4.html` как референс (открывается в браузере отдельным файлом). **Не пытайся скопировать мокап один-в-один** — достаточно близкого ощущения. Палитра, шрифты, отступы — на твоё усмотрение, главное единообразно.

Обязательное:
- Stepper выглядит как stepper (5 пунктов в ряд, разделители, состояния различимы)
- Карточки стартового экрана крупные, кликабельные, видно что это кнопки
- Drag-and-drop зона визуально отличается (пунктирная рамка, hover-эффект)
- Прогресс-бар — полоска с заливкой
- Карта вопросов — компактный список

Опционально (можно отложить):
- Mobile responsive — можно declare desktop-only в этом спринте
- Анимации переходов между шагами
- Тёмная / светлая тема — пока одна (light проще)

### 9. Тесты

Vitest должен **запускаться** командой `npm test`. В этом спринте достаточно одного простого smoke-теста:

```javascript
// tests/smoke.test.js
import { describe, it, expect } from 'vitest'
describe('smoke', () => {
  it('runs', () => expect(true).toBe(true))
})
```

Это нужно, чтобы CI workflow с `npm test` проходил, и инфраструктура тестов была готова к будущим спринтам.

### 10. Проверка деплоя

После пуша в `main`:
1. Зайти на вкладку Actions репозитория, убедиться, что workflow запустился и прошёл зелёным.
2. Открыть `https://<user>.github.io/stat-plan/` — должен показать стартовый экран.
3. Smoke: клик на «Начать с брифа» → виден шаг 1 со степпером, прогресс-баром, картой вопросов.

Если workflow падает на каком-то шаге — отдельный пункт в Known Issues sprint-report'а, с понятным описанием.

---

## Technical Notes

### Версии библиотек

Бери последние стабильные, фиксируются автоматически в `package-lock.json`. Не нужно подбирать «правильные» версии — ставь то, что npm даёт как latest, и читай актуальные docs.

### Tailwind

В мае 2026 актуальна Tailwind v4 с упрощённым setup'ом (`@import "tailwindcss"` в CSS, конфиг через `@theme`/`@config` директивы). Если ставится v4 — используй v4-подход; если по какой-то причине v3 — классический setup с `postcss.config.js`. **Не смешивай подходы из разных версий.** Следуй официальной документации той версии, которую npm поставил.

### HashRouter, не BrowserRouter

См. ADR-010 и `ARCHITECTURE.md`. На GitHub Pages нет server-side fallback, BrowserRouter сломается на любом URL кроме `/`.

### State

`useReducer` + Context — достаточно для всего. Никакого Redux, Zustand, MobX, Jotai, Valtio без отдельного ADR.

### Тур

В этом спринте — только toggle класса `tour` на body/root. Содержимое плашек, их позиционирование, поведение при переключении шагов — будущий спринт. Не уходи туда «заодно».

### Зависимости — минимум

Не подключай `js-yaml`, `papaparse`, `simple-statistics`, `recharts`, `JSZip`, `html2pdf`, `html-to-image`. Всё это придёт в специально посвящённых спринтах, когда станет нужно. См. ADR-010 пункт 6.

### Иконки

Если нужны иконки — можно `lucide-react` (как в `retention-calculator`) или unicode-символы (✓ ✕ ? →). Если ставишь `lucide-react` — это осознанная зависимость, упомяни в sprint-report'е.

---

## ADR Constraints

| ADR | Что значит для этого спринта |
|---|---|
| ADR-001 (no backend) | Никаких fetch на сервер, всё статически. |
| ADR-005 (5-шаговый флоу с развилкой) | На стартовом экране — две карточки, степпер скрыт. |
| ADR-006 (статусы плана draft/approved) | Шаги 3-5 заблокированы в степпере. В этом спринте — статичная блокировка. |
| ADR-008 (тур-плашки без подсветки) | Кнопка тура в шапке + toggle класса. Плашки — будущий спринт. |
| **ADR-010 (стек)** | **React 19 + Vite + Tailwind, HashRouter, деплой через GitHub Actions.** Никаких сторонних state-менеджеров. Зависимости — по необходимости. |

Полные тексты ADR — в `docs/context/decisions-log.md`. Прочитай ADR-010 целиком перед началом — там детали по структуре и принципам подключения зависимостей.

---

## Files involved

**Создаём:**
- `package.json`, `package-lock.json`
- `vite.config.js`
- `tailwind.config.js` + `postcss.config.js` (если Tailwind v3) **или** конфиг внутри CSS (если v4)
- `vitest.config.js` (или внутри `vite.config.js`)
- `index.html` (Vite entry, в корне)
- `src/main.jsx`, `src/App.jsx`
- `src/components/Header.jsx`, `src/components/Stepper.jsx`
- `src/pages/StartScreen.jsx`, `src/pages/BriefPage.jsx`
- `src/state/AppStateContext.jsx`, `src/state/reducer.js`
- `src/styles/index.css`
- `tests/smoke.test.js`
- `.github/workflows/deploy.yml`

**Не трогаем:**
- `docs/` — вся проектная документация
- `mockups/` — референс, не код
- `CLAUDE.md`, `README.md`
- `.gitignore` (уже настроен под React+Vite)

---

## Acceptance criteria (smoke-тест)

**Деплой:**

1. После push в `main` workflow `.github/workflows/deploy.yml` отрабатывает зелёным (Actions tab → последний run = success).
2. Сайт открывается на `https://<user>.github.io/stat-plan/` (или с другим path, если репозиторий переименован).

**UI:**

3. Стартовый экран: виден заголовок, описание, две карточки. Степпер НЕ отображён.
4. В шапке видна кнопка `? Включить тур`. Клик переключает класс (визуальное состояние — на твоё усмотрение).
5. Клик «Начать с брифа» → переход на `#/step1`. Виден: степпер (текущий = «Бриф», шаги 2-5 заблокированы visual + `cursor: not-allowed` + клик не работает), прогресс-бар «0 / 10», placeholder в основном поле, карта из 10 вопросов справа.
6. Открыть `https://…/#/step1` вручную с reload — редиректит на стартовый экран (state не сохранён, по дизайну).
7. На карточке «У меня уже есть план» drag-and-drop принимает файл, показывает сообщение-заглушку, не падает с ошибкой, state не меняется.

**Локально:**

8. `npm install && npm run dev` запускает dev server, сайт работает на `http://localhost:5173/stat-plan/` (или другом порту, который Vite выберет).
9. `npm test` проходит зелёным (smoke-тест).
10. `npm run build` собирает `dist/` без ошибок.

**Браузеры:**

11. Открыть в Chrome и Firefox — выглядит корректно. Safari опционально (если есть mac).

---

## DO NOT

- ❌ **Не парсить** загруженный `test_plan.md`. Drag-and-drop только показывает сообщение-заглушку.
- ❌ **Не использовать localStorage** для сохранения состояния. State живёт только в памяти.
- ❌ **Не реализовывать тур-плашки** — только кнопка-toggle класса.
- ❌ **Не подключать дополнительные JS-библиотеки** кроме перечисленных в Tasks (React, react-router-dom, Tailwind, Vitest + связанные dev-deps). Никаких `js-yaml`, `recharts`, `papaparse`, `JSZip`, `simple-statistics` — это будущие спринты.
- ❌ **Не делать сторонние state-менеджеры** (Redux, Zustand, MobX, Jotai). useReducer + Context достаточно.
- ❌ **Не делать вопросы брифа.** Шаг 1 — только placeholder.
- ❌ **Не делать страницы шагов 2-5.** Только заблокированные пункты в степпере.
- ❌ **Не делать sample size, scoring, генерацию ipynb, парсинг csv** — это всё другие шаги, другие спринты.
- ❌ **Не трогать `docs/`, `mockups/`, `CLAUDE.md`, `README.md`.** Только новые файлы.
- ❌ **Не «заодно» рефакторить** или добавлять «полезные мелочи» — Surgical Changes, см. CLAUDE.md правило 3.
- ❌ **Не настраивать ESLint/Prettier** в этом спринте, если они не приехали с шаблоном Vite. Если приехали — оставь как есть, не правь конфиги.
- ❌ **Не писать UI-тесты** (React Testing Library, Playwright и т.п.). Тестируем только чистую логику в `src/lib/` — а в этом спринте `lib/` ещё нет. Один smoke-тест в `tests/smoke.test.js` достаточен, чтобы инфра работала.

---

## Sprint Report — что ожидаем

По завершении создай `docs/project/sprints/sprint-report-1.md` по шаблону из `docs/project/Code-Onboarding.md`. В нём обязательно:

- Что реально работает в браузере (по списку acceptance criteria)
- Финальная структура файлов после спринта (что появилось, что не появилось)
- Точные версии React / Vite / Tailwind / react-router-dom / Vitest, которые npm поставил (из `package.json`)
- Какие архитектурные решения пришлось принять локально (например, какой подход к state в Context, какая иерархия компонентов) — Cowork посмотрит, не нужен ли ADR
- Что не сделано (Known Issues)
- Вопросы, всплывшие по ходу, для обсуждения с Cowork/пользователем
- Ссылка на успешный Pages-деплой (URL)
