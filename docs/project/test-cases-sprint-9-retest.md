# Test cases — Sprint 9 RETEST (browser smoke)

> Полный smoke на 6 K-items + чек-лист Phase 3 NotebookLM. После прохождения — **Sprint 9 CLOSE = v1 RELEASE**.
>
> Время: ~10-15 минут на browser, ~10-15 минут на NotebookLM (Phase 3 — на твоей стороне).

---

## Pre-flight

- [ ] Code запушил Sprint 9 (commits 6462c18 + 3072451)
- [ ] `git pull origin main` если ещё не подтянул
- [ ] Dev server поднят (`npm run dev`) → `http://localhost:5173/stat-plan/`
- [ ] localStorage.clear() в DevTools Console → reload (чистый старт)
- [ ] Hard reload (Ctrl+Shift+R)

---

## Часть 1 — K-1 StartScreen (~1 мин)

1. Открыть `/`.
2. Проверить:
   - [ ] **H1**: «Управляем процессом тестирования без сюрпризов» (не «Тест-план без сюрпризов»)
   - [ ] **Subtitle (p)**: длинный текст с двумя кликабельными inline-ссылками — «документацию» и «AI-компаньоном»
   - [ ] **Footer внизу**: «ВСЕ ДАННЫЕ ХРАНЯТСЯ ЛОКАЛЬНО НА ВАШЕМ КОМПЬЮТЕРЕ» (не «ВСЁ ХРАНИТСЯ ЛОКАЛЬНО · NO BACKEND»)
3. Клик по слову «документацию» → переход на `/docs` index.
4. Backspace → клик по «AI-компаньоном» → открывается **новая вкладка** с NotebookLM URL.

---

## Часть 2 — K-4 Docs pages рендер (~3 мин)

5. На `/docs` — 3 cards: «С чего начать», «Туториалы», «Методология». Кликабельны, hover работает.

6. **`/docs/start`** — клик на «С чего начать»:
   - [ ] Breadcrumb «← К документации» сверху
   - [ ] H1 «С чего начать»
   - [ ] Markdown таблица «Флоу из 4 шагов» с границами — выглядит читаемой (не raw text)
   - [ ] Bullet lists ровные
   - [ ] Inline `code` (например `test_plan.md`) выделен accent цветом на тёмном фоне
   - [ ] Ссылки в конце страницы кликабельны: `/docs/tutorial`, `/docs/methodology`, NotebookLM external

7. Назад → **`/docs/tutorial`**:
   - [ ] H1 «Туториалы»
   - [ ] 3 секции «Сценарий 1/2/3» с таблицами Q01-Q10
   - [ ] **Блок «↓ DEMO CSV»** с тремя download-кнопками: `demo_proportion.csv`, `demo_continuous.csv`, `demo_ratio.csv`
   - [ ] Клик на любую download-кнопку → скачивается CSV. Открыть в редакторе — первые строки header'а соответствуют туториалу (`user_id,variant,cr_first_deposit,day,bounce_rate` для proportion)
   - [ ] Anchor `#demo-данные` в начале страницы — клик прокрутит к секции «## Demo-данные»

8. Назад → **`/docs/methodology`**:
   - [ ] H1 «Методология»
   - [ ] 9 разделов от «Как мы выбираем test_method» до «Источники»
   - [ ] Таблицы (например матрица metric_type × test_method) рендерятся правильно
   - [ ] Code-блоки (формулы sample size) на тёмном фоне с границей, монохромный шрифт
   - [ ] Anchor `#aliases` в разделе Decision rules — клик прокрутит к «### Aliases»
   - [ ] Ссылка на NotebookLM AI-компаньон в конце — открывается в новой вкладке

---

## Часть 3 — K-2 + K-6 /step3 (~2 мин)

9. Пройти короткий бриф (можно с минимумом полей, главное `metric_type=proportion`, Q03 sub-question если ratio).
10. Утвердить план → попасть на `/step3`.
11. Проверить:
    - [ ] **H1 «Конструктор»** + subtitle сверху страницы (как на /step2, /step4)
    - [ ] **Approval banner** ниже H1 (как было после Sprint 8 P-3)
    - [ ] Card «Конструктор ноутбука» с метриками
    - [ ] Включить optional cell **«Сегментный анализ»** (раньше «Сегменты (geo)»)
12. После включения сегментов:
    - [ ] **NEW: SegmentColumnPicker** появился под опциональными ячейками: dropdown «По какому полю сегментировать?» с options `geo / device / country / plan / segment / Другое…`
    - [ ] Выбрать `device` → expected schema table внизу автоматически обновляется (`geo` → `device` в column name)
    - [ ] Выбрать «Другое…» → появляется text input, ввести `crm_tag` → schema снова обновляется
    - [ ] Скачать ipynb → открыть в редакторе → найти segments cell → `segment_col = 'crm_tag'` (или `device` если оставил)

---

## Часть 4 — K-3 Demo CSV unification (~1 мин)

13. На /step3 справа карточка «DEMO CSV»:
    - [ ] **3 активные опции**: demo_proportion / demo_continuous / **demo_ratio** (раньше был stub «появится в следующем спринте»)
    - [ ] Описания обновлены: proportion ~9k cr_first_deposit CR 3.1%/4.0%, continuous ~10k arpu, ratio ~7k clicks/sessions CTR 9.0%/11.1%
    - [ ] demo_count — остаётся stub «появится» (нет count-сценария в туториалах)
14. Клик «↓ СКАЧАТЬ DEMO-CSV» (auto-выбран под текущий metric_type):
    - [ ] Файл скачался, синяя кнопка (`bg-download`)
15. Открыть скачанный CSV → заголовок столбцов совпадает с туториалом

---

## Часть 5 — K-5 a11y / mobile (~2 мин)

16. На `/` нажать **Tab** несколько раз — focus visible (синяя обводка) на nav-link, кнопках:
    - [ ] Можно полностью пройти keyboard-only от Header до «Начать с брифа»
17. На `/step2` ScoringCard:
    - [ ] Chevron `▸` рядом с группой — есть. Tab → можно открыть/закрыть через Enter/Space
    - [ ] Chevron корректно скрыт от screen readers (aria-hidden) — невидимо в audit, но проверь что Tab наeg him не приземляется отдельно
18. Resize окна браузера до **375px** (DevTools → Toggle device toolbar → iPhone SE):
    - [ ] `/step1` — вопрос full-width, карта вопросов сворачивается (или становится колонкой ниже)
    - [ ] `/step3` schema table — есть horizontal scroll, не ломает layout
    - [ ] `/step4` — секции single-column
    - [ ] Header — 3 nav-link + restart умещаются (или wrap'ятся на 2 строки, это OK)
    - [ ] `/docs/methodology` — длинные таблицы scrollable

---

## Regression case — round-trip plan не сломан

19. /step2 → скачать `test_plan.md`. Reset → upload → проверить что бриф восстановился.

---

## Phase 3 — NotebookLM external (твоё, после browser smoke)

См. `docs/content/notebooklm-mindmap-prompt.md` для готовых промтов.

20. **NB-1 Upload methodology MD как source**:
    - [ ] Открыть NotebookLM «stat·plan: A/B & CRO companion»
    - [ ] Sources → Add → Upload → выбрать `docs/content/docs-methodology.md`
    - [ ] Reindex (автоматически)

21. **NB-2 MindMap по prompt**:
    - [ ] Studio → MindMap → Customize → вставить промт из `notebooklm-mindmap-prompt.md` секции «Промт для NotebookLM Customize»
    - [ ] Generate → проверить 3 уровня вложенности, 6 веток первого уровня
    - [ ] Если выдало плохо — использовать резервную иерархию из того же файла

22. **NB-3 Audio Overview / Slide Deck / Video Overview**:
    - [ ] Studio → Audio Overview → Generate (на выбор русский или English)
    - [ ] Опционально: Slide Deck (если поддерживает русский)
    - [ ] Опционально: Video Overview

23. **NB-4 Flashcards**:
    - [ ] Studio → Flashcards → Customize → вставить промт из `notebooklm-mindmap-prompt.md` секции «Промт для Flashcards»
    - [ ] Generate → проверить покрытие ключевых терминов
    - [ ] Несколько проверочных карточек: «SRM», «MDE», «delta method» — определения корректны

---

## Если найдены баги

```
**BUG-9-N. [Название]**
- Severity: P0/P1/P2/P3
- Шаги: ...
- Ожидалось: ...
- Получили: ...
- Скрин: ...
```

---

## После прохождения

Если все K-1..K-6 + Phase 3 NB-1..NB-4 зелёные:

- [ ] **Sprint 9 готов к CLOSE phase = v1 RELEASE.** Cowork обновит:
  - `docs/project/JTBD.md` — §1 (Pv9-NEW-3 /step3 H1 + Pv9-NEW-4 StartScreen texts закрыты), §9 (все 6 methodology stories + NotebookLM MindMap + Flashcards закрыты + Pv9-NEW-2 explicit segment dropdown)
  - `docs/project/CONTEXT.md` — Sprint 9 timeline entry (Phase 1 content + Phase 2 code + Phase 3 external)
  - `docs/project/PROJECT_STATUS.md` — **v1 RELEASE 🎯**, table спринтов 1-9 closed, roadmap pivot на post-v1 backlog
  - `docs/project/polish-pack-v2.md` — все Pv9 sections помечены closed
- [ ] **Финальный коммит**: Cowork-зона batch'ем (Sprint 9 CLOSE + code review + retest + content fix #scoring)
- [ ] **Push** → GitHub Pages деплоит v1 на прод
- [ ] **Открыть бутылку** 🥂 — продукт в v1
