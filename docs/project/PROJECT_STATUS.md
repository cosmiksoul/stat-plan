# Project Status — stat·plan

**Дата:** 2026-05-16
**Автор:** Cowork
**Назначение:** оперативный снимок состояния проекта на момент остановки CLOSE-фазы Sprint 2. **Не часть постоянной документации** — служит только чтобы пользователь и любой следующий инстанс Cowork быстро вошли в контекст.

---

## Стадия проекта

Sprint 2 — **в фазе CLOSE, не дозакрыт**. Код и фичи готовы, запушены, деплой работает. Не закрыта только Cowork-документация (4 файла, см. ниже).

| Sprint | Type | Status |
|---|---|---|
| 1 | Code | CLOSED (2026-05-14 / 2026-05-15) |
| 2 | Code | **CLOSE-фаза в работе** — main work done, docs pending |

---

## Что готово и запушено в `main`

**Sprint 1** — полностью закрыт. Foundation: React 19 + Vite + Tailwind + react-router-dom + Vitest. Стартовый экран с развилкой, степпер на 5 шагов, шаг 1 skeleton. Деплой через GitHub Actions на Pages.

**Sprint 2 главная работа** — полный бриф из 10 вопросов с реактивной картой:
- Q01-Q10 с soft валидацией, парсером 4 слотов гипотезы (Unicode-aware boundaries, 16 unit-тестов)
- Динамические guardrails с 2 карточками-предложениями
- Advanced параметры (collapsible 6 полей)
- Карта вопросов с кликами, статусами, inline preview через ▸/▾
- Реактивный progress-bar N/10
- Stop conditions + decision rules с дефолтами через `applyEnterDefaults`

**Sprint 2 FIX-фаза** — закрыта (всё запушено):
- BUG-1 + BUG-3: guardrail row layout (6-колоночный grid + min-w-0)
- BUG-2: короткие labels Q08 unit options
- Concern #1: useEffect-defaults → reducer-action (через `src/lib/brief/defaults.js`, +8 unit-тестов)

**Тестов в проекте:** 47/47 зелёных (39 + 8 в FIX). Build чистый, gzip ~87 KB JS / ~5 KB CSS.

**Последний коммит на origin:** `56c2914 docs(sprint-2): cowork artifacts (prompt, review, test cases, fix prompt) + CLAUDE.md P-1 commit-zones rule + JTBD additions + vite watch ignore + obsidian gitignore`

---

## Что не закрыто (CLOSE-фаза Sprint 2)

Эти 4 файла **должны быть обновлены и закоммичены**, чтобы Sprint 2 формально закрылся:

| Файл | Что нужно дописать |
|---|---|
| `docs/project/Dev-Cycle.md` | Строка Sprint 2 в state table → CLOSED, добавить финальные метрики |
| `CLAUDE.md` | Добавить в P-1 правило (зоны коммитов) исключение для `sprint-report-N.md` и `sprint-N-fix-report.md` — это Code-зона, не Cowork |
| `docs/project/JTBD.md` | Расставить `[x]` / `[~]` checkboxes для всех Sprint 2 закрытых user stories (§2 «Бриф вопросы», §3 «Карта вопросов», §9 keyboard hints) |
| `docs/project/CONTEXT.md` | Полная запись Sprint 2 в Timeline (Goal / Closed / Key decisions / Tech debt / Metrics / Notes) + обновить Recurring questions, Tech Debt |

Эти правки уже **частично пробовал внести**, но напоролся на технический блокер (см. ниже).

---

## Технический блокер

### Симптом

При попытках внести правки в .md файлы с кириллицей **через мой инструмент Edit** — файлы обрезаются на UTF-8 multi-byte boundary. Видимый паттерн: вместо записи полного нового текста файл получает только часть, обрывается на середине символа (видны broken UTF-8 байты на конце).

### Что проверено и точно НЕ является причиной

- ❌ Obsidian (пользователь закрывал, проблема воспроизводилась)
- ❌ Line endings CRLF vs LF (нормализация LF через `.gitattributes` + `git config core.autocrlf false` + renormalize — выполнена, проблема воспроизвелась)
- ❌ OneDrive sync (папка не в OneDrive — проверено)

### Что подтверждено как РАБОТАЮЩЕЕ

- ✅ Мой инструмент **Write** (полная перезапись файла) — записывает корректно. Доказано двумя canary-тестами (small 288 B + medium 4025 B с кириллицей, маркеры конца найдены, последний байт = `0a`)
- ✅ **Read** инструмент через MCP читает реальный Windows-side файл (видит 41137 байт Dev-Cycle.md)
- ✅ Бэш + Python с `open(..., 'rb')` работают, но **читают stale sandbox view** (41093 B вместо 41137 B — отстаёт на 44 байта)

### Гипотеза

Bug в моём инструменте **Edit**: где-то в diff-pipeline считается char-count вместо byte-count. На ASCII char = byte → работает. На UTF-8 Cyrillic 1 char = 2 byte → счёт сдвигается → diff применяется на сжатом байтовом интервале → результат обрезан.

### Обходной путь (план для CLOSE)

1. **Не использовать Edit** для .md файлов с кириллицей.
2. **Использовать Write** с полным содержимым файла (Read → собрать новое содержимое → Write полностью).
3. **Не верифицировать через sandbox bash** — у него stale view, может ввести в заблуждение. Верификация через Read tool (видит реальный Windows файл) или через `tail -1` на Windows стороне пользователя.

---

## Решения, принятые сегодня и важные на будущее

1. **CLAUDE.md правило P-1** (зафиксировано в коммите 56c2914):
   Зоны коммитов: Code = `src/`, `tests/`, build configs; Cowork = `docs/`, `CLAUDE.md`, `.gitignore`, `.gitattributes`, `mockups/`. Sprint reports — исключение, Code-зона.

2. **`.gitattributes` с `* text=auto eol=lf`** и `core.autocrlf=false` — нормализованы все line endings к LF в working tree и в репо. Сделано для решения предполагаемой (на тот момент) проблемы коррупции. По итогу не решило именно мою проблему, но всё равно правильное состояние для кросс-платформенного проекта.

3. **`.obsidian/` добавлен в `.gitignore`** — папка редактора Obsidian не должна попадать в репо.

4. **`vite.config.js` `server.watch.ignored`** — Vite dev server не реагирует на изменения в `docs/`, `mockups/`, `tests/`. Решает проблему «приложение перезагружается во время QA когда заполняешь test-cases».

5. **5 новых user stories в JTBD** (из Sprint 2 brainstorm):
   - §1: «Начать сначала» в шапке (для перезапуска флоу не дойдя до финала)
   - §2: Sensitivity helper в Q07 (MDE × duration слайдер/таблица)
   - §2: Snake_case транслит кириллицы для metric_column (low-priority)
   - §9: Шрифты из bundle вместо Google Fonts CDN (low-priority)
   - §10 (новая секция): Methodology раздел — отдельная страница `/#/methodology` с TOC, 6 user stories

6. **Sprint 2 метрики** (для CONTEXT.md):
   - DEV: 28 мин
   - QA: ~60 мин
   - FIX: 25 мин
   - Total: ~2.5 ч
   - Багов: 3 (1 High BUG-3, 2 Medium BUG-1/2 — все закрыты)
   - User stories закрыто `[x]`: 18
   - Unit-тестов в проекте: 47

---

## Что я сделал НЕ так в этой сессии (мини-ретро)

Открыто и для пользы будущих сессий:

1. **Несколько раз менял диагноз** про источник file corruption: сначала Obsidian, потом line endings, потом sandbox stale view, потом snake-case-cyrillic в Edit. Каждый раз с уверенностью. Это создавало хаос.
2. **Доверял sandbox bash** для верификации .md файлов, хотя его view stale на 44 байта. Это ввело в заблуждение и меня, и потенциально пользователя.
3. **Должен был раньше понять**: проблема в Edit (а не в системе пользователя), и сразу перейти на Write. Canary-тест надо было запустить **в первый же раз**, а не после серии ложных диагнозов.

Пользователь правильно остановил меня и сказал «у тебя течёт чердак».

---

## Что делать дальше (рекомендованный план)

**Когда возобновляем CLOSE Sprint 2:**

1. Закрываем 4 оставшихся файла через Write (полная перезапись каждого):
   - Dev-Cycle.md
   - CLAUDE.md
   - JTBD.md
   - CONTEXT.md
2. Каждая запись = Read (получить актуальное содержимое) → Write (записать обновлённое целиком).
3. Верификация после каждого Write — через **Read tool**, не через bash sandbox.
4. По завершении — Cowork-коммит и push с сообщением `docs(sprint-2): close — JTBD checkboxes, CONTEXT timeline, P-1 exception, Dev-Cycle CLOSED`.

**После CLOSE Sprint 2 — обсуждение Sprint 3 PLAN.** Кандидаты в скоуп (на стол, не все возьмём):

- Sample size + duration derive после Q07/Q08 (формулы из SAMPLE_SIZE_CALC.md, ADR-009)
- MDE direction derive из глагола Q02
- localStorage persistence
- «Начать сначала» в шапке
- Разблокировка шага 2 (unlock on briefSubmitted)
- Methodology раздел (`/#/methodology`)
- Sensitivity helper Q07
- Click→file picker fallback для drag-and-drop
- @fontsource swap
- Mobile responsive для GuardrailsList

---

## Recovery state на момент остановки

- `git status` на стороне пользователя: clean, branch up to date with origin/main
- Sandbox-bash view устаревший на 44 байта (НЕ использовать для верификации .md)
- HEAD = коммит `56c2914` (Cowork artifacts + dev-infra)
- Working tree = совпадает с HEAD (пользователь делал `git checkout HEAD --` после моих неудачных Edit'ов)
- Запушенный сайт на `https://cosmiksoul.github.io/stat-plan/` работает с FIX-фазами Sprint 2 (47 тестов зелёных, build чистый, все 3 бага закрыты)
