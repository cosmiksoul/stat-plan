# Test cases — Sprint 7 FIX iter 2 RETEST

> **Цель:** проверить G-1..G-4 на ранее протестированных сценариях A + B. Не требует regenerate ноутбуков — используем executed .ipynb из предыдущих QA.
>
> **Время:** ~7-10 минут.

---

## Pre-flight

- [ ] Code запушил iter 2 (см. `sprint-7-fix-iter2-report.md`).
- [ ] Dev server поднят (`npm run dev`).
- [ ] Под рукой:
  - `cr_first_deposit_v1_analysis_new_ready.ipynb` (Scenario A — proportion, novelty cell skipped)
  - `arpu_v1_analysis-ready.ipynb` (Scenario B — continuous, novelty есть)
- [ ] Hard reload (Ctrl+Shift+R).

---

## Часть 1 — G-3 навигация Step 3 → Step 4 (~30 сек)

1. /step1 → быстро накликать любой бриф (Q01-Q10), не важно какой → /step3.
2. На /step3 проверить footer:
   - [ ] Слева — `← К ПЛАНУ` (как было)
   - [ ] **Посередине новое** — `К ВАЛИДАЦИИ →` (border, neutral text, меньше primary)
   - [ ] Справа — `↓ СКАЧАТЬ ...ipynb` (primary accent, как было)
3. Клик `К ВАЛИДАЦИИ →` → переход на /step4. ✓

---

## Часть 2 — G-2c графики в шаблонах (~1 мин)

4. Вернуться на /step3 → клик `↓ СКАЧАТЬ analysis.ipynb`.
5. Открыть скачанный .ipynb в редакторе.
6. Найти ячейку main_test (z_test/t_test/welch/bootstrap — зависит от брифа).
7. Проверить title графика:
   - [ ] Содержит `CI95 (абс. разность) [...]` (вместо старого `CI95 [...]`)
8. Открыть novelty cell (если duration ≥ 3 в брифе):
   - [ ] Логика `novelty_flag = None` default + `if lift_early is not None and lift_later is not None: novelty_flag = bool(...)`
9. Открыть export cell:
   - [ ] `'novelty_flag': _safe(globals().get('novelty_flag'), None)` (вместо `False`)

---

## Часть 3 — G-1 + G-2 на Scenario A (proportion, без novelty) (~2 мин)

10. Перейти на /step4.
11. Drag-drop `cr_first_deposit_v1_analysis_new_ready.ipynb`.
12. Проверить /step4:
    - [ ] Significance chip: `✅ Statistically significant (p = 0.0257)` — зелёный (как было).
    - [ ] NOVELTY badge **СЕРЫЙ** `N/A — нет данных` — **G-1 FIX** (раньше был зелёный «not detected»).
13. Скачать `report.html`, открыть в браузере.
14. Проверить TL;DR:
    - [ ] `✅ Statistically significant (p = 0.0257, α = 0.05)` — green badge
    - [ ] **Нет** novelty badge (`null` → скрыт) — **G-1 FIX**
    - [ ] Tldr-строка: `Δ rel = 28.06%, 95% CI [0.0011…0.0163] (абс. разность долей), p = 0.0257. Решение: ...` — **G-2 FIX** (label `(абс. разность долей)`)
15. Скачать `readout.md`:
    - [ ] YAML `novelty_flag` отсутствует ИЛИ `null` — **G-1 FIX** (не должно быть `false`)
    - [ ] В TL;DR `**✅ Statistically significant**` — есть
    - [ ] **Нет** строки с novelty — скрыто
    - [ ] Tldr: `Δ rel = 28.06%, 95% CI [0.0011…0.0163] _(абс. разность долей)_, p = ...`

---

## Часть 4 — G-2 на Scenario B (continuous ARPU, novelty есть) (~2 мин)

16. Reload /step4 (или другое окно).
17. Drag-drop `arpu_v1_analysis-ready.ipynb`.
18. Проверить /step4:
    - [ ] Significance chip: `⚠ Not significant (p = 0.2377)` — yellow
    - [ ] NOVELTY badge **ЖЁЛТЫЙ** `⚠ Novelty: suspected` (cell отработала с duration=7)
19. Скачать `report.html`, открыть:
    - [ ] TL;DR: `Δ rel = 1.64%, 95% CI [-1.1353…4.5771] (абс. разность, ед. arpu), p = 0.2377` — **G-2 critical check**
    - [ ] **CI НЕ умножен на 100!** Числа `[-1.1353…4.5771]` ровно как в ноутбуке
    - [ ] label `(абс. разность, ед. arpu)` — metric_name fallback (Code заметил что `metric_label` в схеме нет)
20. Скачать `readout.md`:
    - [ ] YAML `novelty_flag: true`
    - [ ] TL;DR `**⚠ Novelty effect suspected**`
    - [ ] `Δ rel = 1.64%, 95% CI [-1.1353…4.5771] _(абс. разность, ед. arpu)_`

---

## Часть 5 — G-4 decision rules parser (~2-3 мин)

Этот блок проще всего проверить **прямо в /step4** на уже загруженном Scenario B (там в брифе оба правила с unicode/русским).

21. На /step4 (Scenario B) в секции **«4. Decision rules»** проверить:
    - [ ] SHIP `CI не пересекает 0 и нижняя граница ≥ +2.5% rel.` — **более не «не распознано»**. Под текстом должно быть auto-eval: `не сработало` (т.к. ci_lower = -1.13, не >= 2.5).
    - [ ] KILL `Guardrail breach или CI ≤ −2.5% rel.` — **более не «не распознано»**. Auto-eval: `не сработало` (т.к. ci_upper = 4.58, не <= -2.5).
    - [ ] ITERATE `Статистически незначимо, но направление positive в 2+ сегментах — итерируем.` — `parsed: false` → manual checkbox (как и было — это semantic правило, не сравнение).

22. Под секцией Decision rules должен появиться **G-4c hint**:
    - [ ] Маленький текст типа `ⓘ threshold сравнивается с ci_lower/ci_upper в абс. единицах метрики (для % rel правил конвертация — на стороне пользователя)` (точная формулировка — на усмотрение Code).

23. **Regression** — снова Scenario A (proportion, ci_lower=0.001, ci_upper=0.016):
    - [ ] SHIP `CI не пересекает 0 и нижняя граница ≥ +5% rel.` → парсится как `ci_lower >= 5`. Auto-eval = `0.001 >= 5` = `false` → «не сработало». Если **user вручную** не ставил галку — теперь recommendation должна быть «Ни одно из decision rules не сработало. Решение остаётся за PM».
    - **Внимание:** ранее в Scenario A KILL был зелёным просто потому что user поставил вручную. Если ты заходил в /step4 после Sprint 7 main — checkbox мог остаться в storage. Если recommendation странная — проверь что чекбоксы все unchecked.

---

## Regression cases (если есть время)

### R-1. Старые явные правила работают

24. В каком-нибудь брифе вручную задать decision rule `ci_lower >= 0.005` (явное literal):
    - [ ] Парсится как `ci_lower >= 0.005`, **не** ремапается через bare-ci semantic logic.

### R-2. Round-trip plan не сломан

25. /step2 → скачать `test_plan.md`. Reset → upload → проверить что всё восстановилось.

---

## Известное «не страшно»

- **CR-1** (см. code review): нет support для `lift`, `Эффект`, `Δ rel` (unicode), `p value` без подчёркивания. Future polish, Sprint 8.
- **Mismatch единиц** в decision rules: правило `≥ 5% rel` сравнивается с raw `ci_lower` (доли). Hint про это есть в UI. Полная конверсия — Sprint 8.
- **Bundle delta**: +0.11/0.12/0.36 KB gzip. В пределах ≈ 0.

---

## Если найдены баги

Формат как раньше:
```
**BUG-7G-N. [Название]**
- Severity: P0/P1/P2/P3
- Шаги: ...
- Ожидалось: ...
- Получили: ...
- Скрин: ...
```

---

## После прохождения

Если все G-1..G-4 зелёные + R-1/R-2 зелёные:

- [ ] **Sprint 7 готов к CLOSE phase.** Cowork обновит:
  - `docs/context/decisions-log.md` — ADR-015 теперь tri-state `novelty_flag`
  - `docs/context/DATA_MODEL.md` — добавить `significant` поле, обновить `novelty_flag` semantics
  - `docs/project/JTBD.md` §7 — закрыть user stories Step 4 + Pending pending §6 если есть
  - `docs/project/CONTEXT.md` — добавить Sprint 7 в Development Timeline
  - `docs/project/PROJECT_STATUS.md` — Sprint 7 → closed
- [ ] Финальный коммит: сначала Cowork-зона (`docs/**`, `CLAUDE.md`), потом push (per P-1).
