# Test cases — Sprint 8 (Polish v2) RETEST

> **Цель:** проверить 14 P-items на ранее протестированных сценариях A + B + новых routes (/tutorial, /methodology). Не требует regenerate ноутбуков (для UX-проверок), executed ipynb из Sprint 7 RETEST подойдут.
>
> **Время:** ~12-15 минут.

---

## Pre-flight

- [ ] Code запушил Sprint 8 (см. `sprint-8-report.md`).
- [ ] Dev server поднят (`npm run dev`).
- [ ] Под рукой:
  - `cr_first_deposit_v1_analysis_new_ready.ipynb` (Scenario A — proportion, без novelty cell, duration=2)
  - `arpu_v1_analysis-ready.ipynb` (Scenario B — continuous ARPU, novelty есть, duration=7)
- [ ] Hard reload (Ctrl+Shift+R) — гарантия что новый JS bundle подхватился.

---

## Часть 1 — P-1 Header rewrite (~1 мин)

1. Открыть /step1 (или любой другой шаг).
2. Проверить шапку:
   - [ ] **НЕТ** кнопки `? Включить тур` (была раньше с tour-цветом)
   - [ ] Есть 3 nav-link справа: `📖 Туториал`, `📘 Методология`, `↗ CRO Эксперт` (последний — accent цвет border-tour)
   - [ ] Есть `↺ НАЧАТЬ СНАЧАЛА` правее nav-link (если state.started)
3. Hover на каждом link — должна быть transition (border color change).
4. Клик `📖 Туториал` → переход на /tutorial. Видна stub-страница с текстом «Туториал готовится».
5. Браузер back → клик `📘 Методология` → /methodology, видна stub «Раздел готовится в Sprint 9».
6. Клик `↗ CRO Эксперт`:
   - [ ] Открывается **новая вкладка** (target="_blank")
   - [ ] URL = `https://notebooklm.google.com/notebook/040498fe-3843-4562-a854-863d2101a0d8`
   - [ ] NotebookLM «stat·plan: A/B & CRO companion» открывается

---

## Часть 2 — P-2/P-3/P-5 Layout consistency (~1 мин)

7. /step1 (или вернуться).
8. Проверить:
   - [ ] **H1 «Бриф»** + subtitle «Опиши тест в 10 вопросах — sample size и план посчитаются автоматически» сверху страницы (новое — P-2)
   - [ ] Если plan approved — accent banner с ✓ icon «План утверждён...» (через новый Banner компонент — P-5)

9. /step2:
   - [ ] H1 «Тест-план» + subtitle (как было)
   - [ ] Accent banner с ✓ icon «План утверждён. Бриф переключён в режим только-чтения...» с CTA-кнопкой справа (P-5 refactor — должна выглядеть как раньше визуально, но через новый Banner)

10. /step3:
    - [ ] **НОВЫЙ banner** с ✓ icon «План утверждён. Конструируешь ноутбук...» с link «верни план в черновик на Шаге 2 →» (P-3)
    - [ ] Этого banner'а раньше не было

11. /step4:
    - [ ] Info banner с **ℹ icon** (не ✓) «Что здесь происходит: тул не пересчитывает Δ, p, CI...» (P-5 — type=info, нейтральный border-soft, не accent green)
    - [ ] Визуально отличается от status banners (другой icon + цвет)

---

## Часть 3 — P-4/P-7/P-10 ValidationReportPage UX (~2 мин)

12. На /step4 (без drag-drop ipynb пока):
    - [ ] **Sticky bottom footer** с primary `↓ СКАЧАТЬ ВСЁ (.zip)` кнопкой (P-4)
    - [ ] При скролле страницы footer остаётся видимым
13. В page header справа `🗑 ОЧИСТИТЬ ФОРМУ` (вместо `↺ Сбросить результаты` из Sprint 7) — P-7.
14. Drag-drop `arpu_v1_analysis-ready.ipynb` на upload-зону.
15. Скролл вниз до section 6, дальше до section с `↺ НОВЫЙ ТЕСТ` (новая — P-10) под footer text «Готов начать следующий тест?».
16. Клик `🗑 ОЧИСТИТЬ ФОРМУ`:
    - [ ] ConfirmDialog «Очистить форму результатов?» с явным scope «Бриф и тест-план останутся неизменными»
    - [ ] Cancel → ничего не происходит. Confirm → форма очищается, бриф/план НЕ затронуты (проверить через возврат на /step1 — бриф сохранён).
17. Drag-drop тот же ipynb снова.
18. Клик `↺ НОВЫЙ ТЕСТ`:
    - [ ] ConfirmDialog «Начать новый тест?» с destructive стилем
    - [ ] Confirm → полный reset → redirect на /
19. Sticky footer ZIP клик: скачивается тот же zip что section 6 button — **проверить что файл идентичен** (содержит test_plan.md + ipynb + readout.md + report.html).

---

## Часть 4 — P-6/P-8/P-9 Micro polish (~1 мин)

20. /step2 (если test_plan загружен из файла):
    - [ ] Badge `↳ ИЗ ФАЙЛА` (вместо `↳ ЗАГРУЖЕН`) — P-6
    - [ ] Title attribute (hover): «Этот план загружен из внешнего .md файла»
21. /step2 в MdPreview:
    - [ ] Scrollbar **тёмный, узкий, accent thumb** (P-9), не белый default
22. /step1 заполнить Q08 с CSV upload (continuous метрика) → раскрыть Data Peek:
    - [ ] BASELINE COMPUTED показывается с **2 знаками** (например `100.43`), не 6 (`100.431813`) — P-8
    - [ ] Если значение < 1 (например для proportion) — **4 знака** (`0.0312`)

---

## Часть 5 — P-12/P-13/P-14 Decision rules + main_test (~2-3 мин)

23. Regenerate ноутбук:
    - [ ] /step3 → клик `↓ СКАЧАТЬ ARPU-V1_ANALYSIS.IPYNB`
24. Открыть скачанный ipynb в редакторе.
25. Найти ячейку main_test (например t_test для continuous):
    - [ ] Содержит **`observed_diff = float(...)`** binding (P-12)
    - [ ] Содержит **`control_mean = float(...)`** binding (P-14a)
    - [ ] В errorbar блоке `center = observed_diff` (вместо midpoint CI)
26. Найти export-cell:
    - [ ] В `results` dict содержит **`'control_mean': _safe(globals().get('control_mean'))`** (P-14b)

27. На /step4 (с загруженным Scenario B `arpu_v1_analysis-ready.ipynb`):
    - [ ] Section «4. Decision rules»: правило `Guardrail breach или CI ≤ −2.5% rel.` парсится как auto-eval **не сработало** (через `ci_upper_pct_rel = 4.58/100*100 ≈ 4.31%`, не <= -2.5). Если **сработало** — bug P-14, repro!

28. **Сценарий C — добавить новое правило с aliases** (P-13). Вернуться на /step2, return-to-draft, /step1 → отредактировать decision_rule SHIP на `Lift ≥ +5%` (или другую alias-форму):
    - [ ] Snapshot test_plan.md — содержит `ship: "Lift ≥ +5%"`
    - [ ] Approve plan → /step3 → /step4 → drag-drop ipynb
    - [ ] Section «4. Decision rules» SHIP — **парсится** auto-eval (не «не распознано как условие»)
29. Аналогично попробовать:
    - [ ] `Эффект > 0` → парсится как `delta_rel > 0`
    - [ ] `Δ rel >= 5` → парсится как `delta_rel >= 5`
    - [ ] `p value < 0.05` → парсится как `p_value < 0.05`

---

## Часть 6 — Regression backward-compat (~1-2 мин)

30. **Старый ipynb без `control_mean`** (например из Sprint 7 RETEST — `cr_first_deposit_v1_analysis_new_ready.ipynb`):
    - [ ] Drag-drop на /step4 → парсится OK, no warnings
    - [ ] Decision rule `CI ≤ -2.5% rel` (если есть) → **manual checkbox fallback** (потому что derived `ci_upper_pct_rel` undefined — control_mean не было)
    - [ ] auto-eval показывает «не распознано как условие — отметь вручную»
31. **HTML report для старого ipynb:**
    - [ ] Скачать, открыть — TL;DR должен корректно отрендериться (через канонический effectiveResults — P-14 DRY)

---

## Regression case — round-trip plan не сломан

32. /step2 → скачать `test_plan.md`. Reset → upload → проверить что всё восстановилось.

---

## Известное «не страшно»

- **TutorialPage / MethodologyPage — stubs.** Это OK для Sprint 8. Tutorial content rewrite — Cowork follow-up (отдельный коммит) или Sprint 9.
- **CR-1 (отчёт):** Cowork обещал tutorial content параллельно — не сделал. Решит после retest.
- **--color-tour* tokens остались** — Code репурпозил под CRO link, не нарушение спеки.
- **Семантика P-14:** `% rel` правила теперь через `ci_*_pct_rel` derived. Для old test_plan'ов с правилами в абс. единицах — поведение не меняется (без `% rel` suffix → raw сравнение).

---

## Если найдены баги

```
**BUG-8-N. [Название]**
- Severity: P0/P1/P2/P3
- Шаги: ...
- Ожидалось: ...
- Получили: ...
- Скрин: ...
```

---

## После прохождения

Если все P-1..P-14 + regression зелёные:

- [ ] **Sprint 8 готов к CLOSE phase.** Cowork обновит:
  - `docs/context/decisions-log.md` — ADR-015 amendment пункт 3 (control_mean, см. текст в sprint-8-report.md)
  - `docs/project/JTBD.md` — §1 (новые tutorial/methodology routes), §9 (NotebookLM CRO Эксперт → [x] закрыто Sprint 8, MindMap → новый ◆ для Sprint 9), §7 P-14 cross-ref
  - `docs/project/CONTEXT.md` — Sprint 8 в Development Timeline (timeline entry)
  - `docs/project/PROJECT_STATUS.md` — Sprint 8 → closed, roadmap update
  - `docs/project/polish-pack-v2.md` — пометить items закрытыми (Pv2-1..18 → [x])
  - **Tutorial content rewrite** (отдельный mini-task ~1.5 ч) — может пойти как Sprint 8.5 commit или в Sprint 9
- [ ] Финальный коммит: сначала Cowork-зона batch'ем (`docs/**`, `CLAUDE.md`), потом push.
