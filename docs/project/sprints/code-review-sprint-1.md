# Code Review Sprint 1 — Foundation (React + Vite + Tailwind) + Start Screen + Step 1 Skeleton

**Reviewer:** Cowork
**Date:** 2026-05-15

---

## Summary

Спринт сделан в скоупе и без обходов ADR. Структура папок соответствует `ARCHITECTURE.md`, разделение `pages/` vs `components/` корректное, state через `useReducer` + Context — ровно как требовалось. CI workflow стандартный, base-path корректный.

Один **🔴 блокер** про обрезанные документы в working tree — не код, но критично перед push'ем. Несколько 🟡 concerns по тонким стилевым моментам и пара 🟢 notes. По существу — спринт готов к QA после устранения блокера.

---

## Concerns

### 🔴 Blockers (требуют fix до QA)

| # | Где | Что не так | Какой ADR/правило |
|---|-----|-----------|-------------------|
| 1 | `.gitignore`, `CLAUDE.md`, `README.md` (working tree, не закоммичено) | Файлы обрезаны на середине UTF-8 символа. В `CLAUDE.md` и `README.md` последние строки заканчиваются на `�` — broken byte. В `.gitignore` пропали `*.tmp` и `.env.*.local` (и финальный newline). HEAD-версия (последний коммит `946e6fd`) корректна — повреждение произошло после commit. | CLAUDE.md правило 3 (Surgical Changes — нельзя «заодно» трогать соседние файлы). Code в sprint-report заявил, что не трогал эти файлы; `git diff` показывает обратное. Природа правки (обрезание байтов) выглядит как побочный эффект какого-то инструмента/процесса, а не сознательное действие — но факт остаётся: working tree корруптен. |

**Fix:** до push'а — `git checkout HEAD -- .gitignore CLAUDE.md README.md`. Это восстановит файлы из последнего коммита (моих правок по ADR-010). После этого `git status` должен показать чистое working tree (плюс `Dev-Cycle.md` — мой легитимный edit с табло, его коммитим отдельно).

---

### 🟡 Concerns (обсуждаемые)

| # | Где | В чём concern |
|---|-----|---------------|
| 1 | `src/components/Header.jsx:24` | Hover-цвет вынесен как arbitrary value `hover:bg-[rgba(122,180,255,0.2)]` напрямую. Code сам отметил это в Known Issues #5. Симметрия с `--color-tour` и `--color-tour-soft` нарушена — есть токены под цвет и soft-вариант, но hover-state живёт отдельно. **Concern:** не накапливать такой паттерн в будущих компонентах. Не критично для Sprint 1, но в Sprint 2 при появлении новых hover-состояний — вынести в `@theme` (`--color-tour-hover`). Записываю как tech-debt в CONTEXT. |
| 2 | `src/pages/StartScreen.jsx:91-93` | Аналогичный паттерн: `bg-[rgba(255,184,102,0.08)]` и `border-[rgba(255,184,102,0.25)]` для warn-toast — inline rgba вместо токена. Существует `--color-warn`, но нет `--color-warn-soft` / `--color-warn-border`. Та же тема, что и #1. Не блокер. |
| 3 | `index.html` | Шрифты Fraunces / Inter / JetBrains Mono подключены через Google Fonts CDN. Это противоречит **духу** ADR-001 «всё на клиенте» — каждый visitor делает запрос к `fonts.googleapis.com` и `fonts.gstatic.com`. Эти запросы видны в DevTools и формально нарушают «никаких внешних запросов». **Concern:** обсудить — либо принять как осознанный trade-off (CDN-шрифты проще, чем `@fontsource`), либо переключиться на `@fontsource/*`. Это пограничный случай — формально не Blocker (ADR-001 не запрещает CDN явно, говорит про backend), но стоит зафиксировать решение, чтобы не возникало в каждом code review. |
| 4 | `src/pages/StartScreen.jsx` (карточка «У меня уже есть план») | Drag-and-drop работает, но **клик по карточке ничего не делает** — нет `<input type="file">` fallback. Code сам отметил в Known Issues #4. **Concern:** real-world UX-вопрос. Не в скоупе Sprint 1 (промпт требовал только drag-and-drop), но в JTBD надо завести новую user story «клик по карточке открывает file picker как альтернатива drag-and-drop». Пользователь точно столкнётся с этим при первом тесте. |
| 5 | `src/state/AppStateContext.jsx:13-15` | `useAppState` throw'ает если вызван вне Provider'а — это хорошая практика, но throw в render-фазе React 19 уведёт всё приложение в Error Boundary, которого пока нет. Сейчас не воспроизведётся (Provider оборачивает App в `main.jsx`), но при тестах через `render(<Component />)` без Provider'а тест упадёт с непонятным сообщением. **Concern:** добавить простой ErrorBoundary, когда появятся React Testing Library тесты (не сейчас, на будущее). |

---

### 🟢 Notes (наблюдения, не требуют фикса в этом спринте)

| # | Где | Заметка |
|---|-----|---------|
| 1 | `src/App.jsx:7-22` | `ProtectedStep` и `TourBodyClass` живут inline в `App.jsx`. Code сам отметил, что вынесет когда появится >1 кейс. Согласен. |
| 2 | `vite.config.js` | Vitest конфиг внутри `vite.config.js` (поле `test`). Допустимо для проекта такого размера. Если будут две разные конфигурации (например, e2e + unit) — разделим. Не сейчас. |
| 3 | `src/pages/BriefPage.jsx:13-15` | `ANSWERED = 0`, `PROGRESS_PERCENT = 0` захардкожены. Это ожидаемо для Sprint 1 (placeholder), и в следующем спринте они станут derived state. Просто отметка, чтобы не забыть выпилить константы. |
| 4 | `tests/smoke.test.js` | Инфраструктура работает. Когда появятся `src/lib/`-модули — Vitest подхватит. Структура `tests/lib/...` зеркалит `src/lib/...` — следовать ей. |
| 5 | `package.json` | Версии (React 19.2.6 / Vite 8.0.13 / Tailwind 4.3.0 / Vitest 4.1.6 / react-router-dom 7.15.1) — последние стабильные на дату спринта по `npm install`. `npm test` и `npm run build` локально проходят, значит совместимость рабочая. |

---

## ADR Compliance Check

| ADR | Статус | Комментарий |
|---|---|---|
| **ADR-001** (no backend) | 🟡 в основном ✅, см. Concern #3 | Никаких бэкенд-фетчей в коде. Единственный внешний запрос — Google Fonts CDN, что требует обсуждения. |
| **ADR-005** (5-шаговый флоу с развилкой) | ✅ | Stepper не рендерится на StartScreen. Две карточки на старте. `*` route редиректит на `/`. |
| **ADR-006** (статусы плана, шаги 3-5 заблокированы) | ✅ | Все шаги после `currentStep` помечены `locked`, `opacity-45`, `cursor-not-allowed`, без onClick. На Sprint 1 это статичная блокировка, в будущем — реакция на `state.plan.status`. |
| **ADR-008** (тур без подсветки) | ✅ | Кнопка в Header диспатчит `TOGGLE_TOUR`, на `body` ставится класс `tour`. Плашек самих нет — следующий спринт. |
| **ADR-010** (React 19 + Vite + Tailwind v4, GitHub Actions) | ✅ | Стек собран ровно по ADR. HashRouter использован. `base: '/stat-plan/'` корректен. Workflow стандартный с правильными permissions и concurrency-группой. Никаких сторонних state-менеджеров, никаких внеплановых зависимостей. Tailwind v4 настроен через `@theme` в CSS, без `tailwind.config.js` — это актуальный паттерн v4. |

Нарушений ADR нет.

---

## Scope Compliance

✅ Все изменения в `src/`, `tests/`, `index.html`, `package.json`, `vite.config.js`, `.github/workflows/deploy.yml`, `package-lock.json` трассируются к Tasks в `sprint-1-prompt.md`.

🔴 **Изменения в `.gitignore`, `CLAUDE.md`, `README.md`** не трассируются к Sprint 1 prompt — там явно стояло «не трогать». См. Blocker #1 (обрезание байтов, не сознательное редактирование, но факт повреждения зафиксирован).

🟢 `docs/project/Dev-Cycle.md` modified — это **мой** edit (Cowork) с табло «Текущее состояние», legitimate. Коммитится отдельно после code review.

🟢 `.claude/` untracked — локальная папка Claude Code, добавляется в `.gitignore` (см. ответы на открытые вопросы ниже).

---

## Ответы на открытые вопросы Claude Code

**Q: Тёмная тема как единственная — окей, или будет ADR на «обе темы + toggle»?**

**A:** Окей как есть. В `OPEN_QUESTIONS.md` пункт #10 («Темы оформления») остаётся открытым, но не требует решения сейчас. Когда (и если) появится реальная потребность в light-теме — будет отдельный ADR. До тех пор палитра в `@theme` — единственный источник правды цветов, никаких альтернатив не делаем.

**Q: Tailwind v4 без `tailwind.config.js` / `postcss.config.js` — обновить `ARCHITECTURE.md`?**

**A:** Да, разумно. Сейчас в `ARCHITECTURE.md` написано «либо `tailwind.config.js`, либо `@config` в CSS если v4». По факту мы на v4 через `@theme` без отдельного config-файла. Обновлю формулировку в фазе CLOSE как часть актуализации документации. Не требует отдельного ADR — это уточнение, не решение.

**Q: `.claude/` в `.gitignore`?**

**A:** Да, добавить. Это локальная папка Claude Code с настройками/состоянием агента, не должна попадать в репо. Добавлю при восстановлении `.gitignore` из HEAD (см. Blocker #1).

---

## Decision Log

Диалог пользователь ↔ Cowork от 2026-05-15.

| # | Concern | Решение | Куда зафиксировано |
|---|---------|---------|--------------------|
| 🔴 1 | `.gitignore`, `CLAUDE.md`, `README.md` обрезаны | **Fix.** Пользователь восстановил через `git checkout HEAD -- ...` локально. Причина повреждения не диагностирована (вероятно encoding-related, не CRLF). Если повторится — отдельно расследуем. | Восстановлено локально, без новых коммитов. |
| 🟡 2 | Hardcoded rgba цвета в `Header.jsx` и `StartScreen.jsx` | **Defer как tech debt.** В Sprint 2 при добавлении новых hover/state-цветов выносим в `@theme` (`--color-tour-hover`, `--color-warn-soft`, `--color-warn-border`). В текущем спринте не правим. | `docs/project/CONTEXT.md` секция Tech Debt. |
| 🟡 3 | Google Fonts CDN противоречит духу ADR-001 | **Defer как low-priority в JTBD** (пересмотрено после QA 2026-05-15). Пользователь оценил приоритет как «минорный» — нет багов из QA, фактический эффект CDN несущественный. Переносится как отдельная небольшая user story в JTBD §9 без привязки к спринту. | `docs/project/JTBD.md` §9 — кросс-функциональные требования. |
| 🟡 4 | Drag-and-drop карточка без click-fallback | **New user story.** Не FIX этого спринта, а полноценная фича. Добавляется в `JTBD.md` §1 «Старт и навигация». Скоуп для Sprint 2 или 3 (на выбор PLAN-фазы). | `docs/project/JTBD.md`, новая user story в §1. |
| 🟡 5 | `useAppState` throw без Provider'а | **Note для будущего.** Не правим сейчас. Когда появятся RTL-тесты в `src/lib/`-направленных компонентах — добавим минимальный ErrorBoundary или тестовый Provider-wrapper. | `docs/project/CONTEXT.md` секция Recurring questions / Tech debt. |
| 🟢 1-5 | Notes (см. таблицу выше) | Никаких изменений в этом спринте, оставлены как наблюдения. | — |

**Итог:** концерны разобраны. После QA (0 багов) FIX-фаза не понадобилась — @fontsource переклассифицирован в minor task в JTBD §9. Одна новая user story добавлена в backlog, два пункта tech debt зафиксированы. Спринт закрывается без FIX-итерации.

---

## Что делать дальше

1. **Восстановить файлы:**
   ```bash
   git checkout HEAD -- .gitignore CLAUDE.md README.md
   ```
   После этого добавить `.claude/` в `.gitignore` отдельной строкой и закоммитить:
   ```bash
   echo "" >> .gitignore && echo "# Claude Code local state" >> .gitignore && echo ".claude/" >> .gitignore
   git add .gitignore
   git commit -m "chore: add .claude/ to gitignore"
   ```
2. **Закоммитить Cowork-правки** (Dev-Cycle табло + этот code-review):
   ```bash
   git add docs/project/Dev-Cycle.md docs/project/sprints/code-review-sprint-1.md
   git commit -m "docs(sprint-1): cowork tracking + code review"
   ```
3. **Push:**
   ```bash
   git push -u origin main
   ```
4. **Проверить Actions** на github — workflow должен зелёным деплоить на Pages.
5. **Завести issue в JTBD** на «click→file picker fallback для карточки В» (Concern #4).
6. Возврат в Cowork → переходим к **TEST PREP** (готовлю `test-cases-sprint-1.md`).

---

## Метрика длительности DEV-фазы

| Точка | Время | Δ |
|---|---|---|
| Передача в Claude Code | 2026-05-14 23:54 | — |
| Получение sprint-report | 2026-05-15 00:07 | **13 минут** |

⚠ Очень быстро. Для каркасного спринта на знакомом стеке это правдоподобно, но в CLOSE-фазе зафиксирую цифру в `CONTEXT.md` Timeline как baseline для будущих сравнений.
