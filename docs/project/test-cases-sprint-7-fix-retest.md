# Test cases — Sprint 7 FIX iter 1 RETEST

> **Цель:** проверить что 3 gap'а из e2e сценария A закрыты — графики в ноутбуке, significant в TL;DR, novelty visible badge. Полный flow ~10-15 минут.
>
> Используем тот же CSV что в основной QA — `outputs/e2e_a_first_deposit.csv` из `e2e-scenarios-sprint-7.md`.

---

## Pre-flight

- [ ] Code запушил FIX iter 1 (см. `sprint-7-fix-report.md`).
- [ ] Dev server поднят (`npm run dev`) или открыт прод GitHub Pages.
- [ ] Браузер открыт, DevTools Network → Disable cache (Ctrl+Shift+R на /step1).
- [ ] CSV `e2e_a_first_deposit.csv` под рукой (если нет — see e2e-scenarios-sprint-7.md §A.2 как сгенерировать).

---

## Сценарий — A (proportion SHIP), полный e2e

### Часть 1 — Бриф (~2 мин)

1. Открыть /step1.
2. Q01 «цель»: **Привлечение** → Далее.
3. Q02 «гипотеза»: вставить шаблон, минимально заполнить — «если показать onboarding tutorial, то first_deposit вырастет, потому что пользователь поймёт что делать» → Далее.
4. Q03 «тип метрики»: **Конверсия (proportion)** → Далее.
5. Q04 «имя метрики»: `first_deposit` → Далее.
6. Q05 «baseline»: 10% → Далее.
7. Q06 «единица рандомизации»: **user** → Далее.
8. Q07 «MDE»: 10% relative → Далее.
9. Q08 «трафик»: 60000 users/day → Далее.
10. Q09 «guardrails»: skip → Далее.
11. Q10 «decision rules»: skip → **Готово**.

**Ожидаемо:** на шаге 2 (тест-план) есть оценка ≥ 70/100, sample size ≈ 1500-1700 per arm, длительность ≤ 1 день.

### Часть 2 — Конструктор + скачать ноутбук (~1 мин)

12. Перейти на /step3.
13. Cells включены по умолчанию: load, balance, srm, novelty, main_test, guardrails, export.
14. **Editable schema**: проверить что `day` присутствует в expected columns (нужен для novelty).
15. Жмём **Скачать analysis.ipynb**.

**Ожидаемо:** скачан `analysis.ipynb`, ~13 ячеек.

### Часть 3 — Открыть ноутбук и убедиться что есть plt.show()

16. Открыть .ipynb в любом текстовом редакторе или VSCode.
17. Проверить **наличие** `plt.show()` в ячейках:
   - [ ] balance — есть `plt.show()` + 2 subplot bars
   - [ ] srm — есть `plt.show()` + grouped bars observed/expected
   - [ ] main_test (одна из z_test/t_test/welch/bootstrap) — есть `ax.errorbar(...)`, `axvline(0)`, `plt.show()`
   - [ ] guardrails — есть `ax.barh(...)`, `plt.show()` (если guardrails не пустые — но в нашем брифе пустые, можно skip)
   - [ ] novelty — есть `ax.bar(...)` early vs later, `plt.show()`

**Если хоть один `plt.show()` отсутствует** — баг, репорти.

### Часть 4 — Прогнать в Colab (~3 мин)

18. Открыть colab.research.google.com → New notebook → File → Upload notebook → выбрать `analysis.ipynb`.
19. Залить `e2e_a_first_deposit.csv` через левую панель (Files → upload).
20. В первой ячейке load исправить путь к CSV если отличается (`pd.read_csv('e2e_a_first_deposit.csv')`).
21. Runtime → Run all.

**Ожидаемо после Run all:**
- [ ] balance-ячейка показывает **2 bar chart-а** (counts + means).
- [ ] srm-ячейка показывает **grouped bars** observed vs expected, в title χ² и p.
- [ ] main_test ячейка показывает **точечный график** с errorbar, dashed line на 0, title с Δrel%, CI, p.
- [ ] guardrails — **пусто** (нет guardrails в брифе) — это OK.
- [ ] novelty — **bar early vs later** с title "✓ no novelty effect" или "⚠ NOVELTY suspected".
- [ ] export-ячейка — в конце выводит JSON со списком ключей включая `'significant': true`.

### Часть 5 — Скачать выполненный ipynb и загрузить в /step4

22. В Colab: File → Download → Download .ipynb. Скачается `analysis (1).ipynb` или подобное.
23. Открыть /step4 stat·plan.
24. Drag-drop скачанный `.ipynb` на upload-зону.

**Ожидаемо:**
- [ ] Секция «1. Загрузка» — зелёный success state, имя файла отображается.
- [ ] Секция «2. Результаты» — поля **автозаполнены**: control_n, treatment_n, delta_rel, p_value, ci_lower, ci_upper, srm_pvalue.
- [ ] **Над полями** — readonly chip: «✅ Statistically significant (p = 0.0257)» или «⚠ Not significant (p = ...)» в зависимости от данных.
- [ ] **Под полями** — секция NOVELTY с readonly chip «✓ Novelty: not detected» (или ⚠ suspected). Маленький `<details>override</details>` снизу.
- [ ] Секция «3. Sanity checks» — SRM ✓, sample size match ✓ или ⚠, направление ✓.
- [ ] Секция «4. Decision rules» — «пустые правила» или применённые если ты их заполнил в Q10.
- [ ] Секция «5. Графики из ноутбука» — **4-6 PNG inline**.
- [ ] Секция «6. Экспорт» — кнопки `Скачать report.html`, `Скачать readout.md`, `Скачать zip`.

### Часть 6 — HTML отчёт

25. Скачать `report.html`.
26. Открыть в новой вкладке браузера (не через preview в VSCode — нужен реальный браузер для проверки шрифтов и img-tag).

**Ожидаемо:**
- [ ] Тема тёмная, шрифт sans-serif, max-width ~920px.
- [ ] Заголовок — название теста + test_id + дата.
- [ ] **Секция TL;DR**:
  - [ ] Первый элемент — `✅ Statistically significant (p = 0.0257, α = 0.05)` (зелёный фон) или `⚠ Not statistically significant` (жёлтый).
  - [ ] Второй элемент — `✓ No novelty effect detected` (зелёный) или `⚠ Novelty effect suspected` (жёлтый).
  - [ ] Третий элемент — обычная фраза `Δ rel = X%, 95% CI [...]`.
- [ ] Секция «Результаты» — таблица + **4-6 inline PNG** (графики из Colab).
- [ ] Секция «Sanity checks» — список с ✓/⚠/—.
- [ ] Секция «Decision rules» — пусто или с recommendation.
- [ ] Секция «Принятое решение» — placeholder `[Заполни вручную]`.
- [ ] Все картинки **загружаются** (никаких broken-image icons). Если использовать «Save as HTML complete» → файл self-contained, без папки.

### Часть 7 — Markdown readout

27. Скачать `readout.md`.
28. Открыть в редакторе с markdown preview (VSCode, Obsidian).

**Ожидаемо:**
- [ ] YAML frontmatter — `test_id`, `created`, `status: completed`, `results: {...}`, `decision: ""` (пустая строка).
- [ ] `# Заголовок` теста.
- [ ] `## TL;DR` — **первые две строки bold**:
  - `**✅ Statistically significant (p = 0.0257, α = 0.05)**`
  - `**✓ No novelty effect detected**`
  - Третья строка — `Δ rel = X%, 95% CI [...]`.
- [ ] `## Results`, `## Sanity checks`, `## Decision rules`, `## Принятое решение` — секции присутствуют.

---

## Regression cases (быстрая проверка)

### R-1. Manual flow без ipynb

29. Открыть /step4 в новой вкладке (или Reset state кнопкой если есть).
30. **НЕ** загружать ipynb. Просто заполнить поля вручную:
   - control_n: 5000, treatment_n: 5000
   - delta_rel: 2.3
   - p_value: 0.04
   - ci_lower: 0.001, ci_upper: 0.04
   - srm_pvalue: 0.8
31. Проверить:
   - [ ] Чип significant виден: «✅ Statistically significant (p = 0.0400)» (т.к. p < 0.05).
   - [ ] Novelty чип: «N/A — нет данных» (нейтральный серый), `<details>` всё ещё доступен.
32. Изменить p_value на 0.08:
   - [ ] Чип меняется на «⚠ Not significant (p = 0.0800)» (жёлтый).

### R-2. Manual flow + novelty override

33. В том же экране открыть `<details>override</details>` под NOVELTY.
34. Поставить чекбокс «эффект новизны замечен».
35. Проверить:
   - [ ] Чип NOVELTY меняется на «⚠ Novelty: suspected» (жёлтый).
   - [ ] В скачанном `report.html` появляется novelty-badge warn.
36. Снять чекбокс — novelty снова `N/A` (т.к. novelty_flag = false после override clear? тут поведение **уточнить** — Code в storage хранит `novelty_flag = false` или `undefined`?).
   - Если меняется на `✓ Novelty: not detected` — то Code хранит `false`. OK.
   - Если меняется на `N/A` — то Code очищает override. Тоже OK.

### R-3. Round-trip plan не сломан

37. Перейти на /step2.
38. Скачать `test_plan.md`.
39. Скачать второй раз (без изменений) — содержимое должно быть **идентично**.
40. Reset → upload `test_plan.md` → перейти на /step2 — все поля восстановились.

---

## Известное «не страшно» (не считаем багами)

- **Initial bundle +1.75 KB gzip** — Code объяснил, ОК.
- **D-2 midpoint vs точная оценка** — для z_test wald-CI совпадает, для bootstrap может слегка отличаться. Визуально приемлемо. См. `code-review-sprint-7-fix.md` CR-1.
- **guardrails-секция пустая в этом сценарии** — мы не задавали guardrails в брифе. Если хочется проверить — добавить guardrail в Q09 и пройти заново.
- **PNG ширина в HTML** — `max-width: 100%`, на retina могут выглядеть слегка пиксельными. Ожидаемо.

---

## Если найдены баги

Зафиксируй каждый в формате:

```
**BUG-X. [Короткое название]**
- Severity: P0 / P1 / P2
- Шаги: 1. ... 2. ... 3. ...
- Ожидалось: [что должно было быть]
- Получили: [что получили]
- Скрин: [если визуальный]
```

И передавай как блок в чат — я добавлю в `sprint-7-fix-iter2-prompt.md` (если потребуется второй iter) или в `sprint-7-close-notes.md` (если P2-mинор для будущего polish).

---

## После прохождения

Если все 7 пунктов smoke зелёные + regression R-1/R-2/R-3 зелёные:

- [ ] Готовы к CLOSE-phase Sprint 7
- [ ] Я (Cowork) обновлю DATA_MODEL.md (ADR-015 + significant поле), JTBD §7 + §6, CONTEXT timeline, PROJECT_STATUS
- [ ] Пользователь делает финальный коммит (или 2 коммита: Cowork-зона отдельно, потом push)
