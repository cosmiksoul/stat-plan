# Sprint 5 FIX iter 1 — отчёт Claude Code

> Источник прицеливания: `docs/project/sprints/sprint-5-fix-prompt.md` (C-1..C-4). План в чате (без отдельного `.claude/plans` файла — диффы маленькие, ExitPlanMode не понадобился).

## Trace-ability

| ID | Файл/строка | Что изменено |
|---|---|---|
| **C-1** | `src/lib/plan/sample-size.js::normalizeBaseline` (L92) | Удалена ветка `unit === 'percent'` |
| **C-1** | `src/lib/plan/scoring.js::normalizeBaseline` (L330) | Та же ветка удалена |
| **C-1** | `src/lib/plan/render.js::normalizeBaselineForYaml` (L125) | Та же ветка удалена |
| **C-2** | `src/lib/plan/render.js` substitutions (~L174) | `metric_label` пишется **только** если `brief.metric_column` truthy |
| **C-3** | `src/lib/plan/parse.js` (L224) | Добавлен `&& fm.metric_label !== ''` к проверке assign-блока |
| **C-4** | `src/lib/plan/notebook-builder.js::buildHeaderCell` (L225) | `# ${deriveTitle(state)}` (убран prefix `Analysis: `) |

## Round-trip status — **5/5 ✓**

`tests/lib/plan/round-trip.test.js`:

1. ✅ `preserves ratio + cluster + custom rules + advanced opts in one go` — `metric_column='ctr'` заполнен → C-2 не влияет, всё как раньше.
2. ✅ `preserves goal_description length with cyrillic + ё (BUG-9b sanity check)` — не задевает metric_*.
3. ✅ `preserves length_cap_days=14 and recovers length cap from YAML, not body`.
4. ✅ `preserves non-default decision_rules (no overwrite by parser defaults)`.
5. ✅ **NEW** `preserves empty metric_column round-trip via P-7 legacy heuristic (C-2)` — пустой `metric_column` + натуральный `metric_name='конверсия в первый депозит'` → YAML содержит `metric_name: конверсия в первый депозит` + `metric_label: null` → parse через P-7 heuristic восстанавливает оба поля симметрично + warning о legacy.

## Тесты и сборка

- **Baseline после Sprint 5:** 266 pass / 14 files.
- **После FIX iter 1:** **267 pass / 14 files** (+1 net).
  - **+1** `tests/lib/plan/round-trip.test.js` (C-2 5-й canonical case)
  - **+1** `tests/lib/plan/parse.test.js` (C-3 edge case `metric_label=""`)
  - **−1** `tests/lib/plan/sample-size.test.js` — удалён тест `'supports baseline.unit=percent (value scaled by 100)'` (см. side-finding ниже)
  - **обновлён** inline snapshot в `tests/lib/plan/render.test.js`: `metric_label: cr_to_partner_click` → `metric_label: null` (ожидаемое следствие C-2 — фикстура `fullState()` не имеет `metric_column`, после C-2 label больше не подменяется).
  - **обновлён** header-assert в `tests/lib/plan/notebook-builder.test.js`: `# Analysis: Тест: CR в клик` → `# Тест: CR в клик` + явный `not.toContain('# Analysis:')` (C-4 regression guard).
- **`npm run build` чистый.** Bundle:
  - До: 401.24 KB raw / 124.94 KB gzip
  - После: **401.17 KB raw / 124.93 KB gzip**
  - **−0.07 KB raw / −0.01 KB gzip** — практически 0 (как ожидалось).

## Side-finding (Code-flagged)

В рамках C-1 был обнаружен **отдельный тест**, специально вызывающий нормализатор с `baseline.unit='percent'`:

```js
// tests/lib/plan/sample-size.test.js:147-157 (был)
it('supports baseline.unit=percent (value scaled by 100)', () => {
  const res = calculateSampleSize(brief({
    metric_type: 'proportion',
    baseline_value: 3.1,
    baseline_unit: 'percent',
    mde_value: 8,
  }))
  expect(approx(res.sample_size_per_arm, 81014, 10)).toBe(true)
})
```

Тест искусственно ставил `baseline_unit: 'percent'` (через test-helper `brief()`), чтобы пройти по удалённой ветке нормализатора. **В production unit='percent' не достижим** — `parse.js::coerceBaseline` ставит только `'fraction'` или `null`, в YAML unit не сериализуется. То есть тест валидировал dead path.

Prompt предвидел эту возможность («если в каком-то тесте баланс был тестируем именно через unit='percent' (что было бы странно) — fix это тоже flag»). Удалил тест полностью (Option A) — оставил комментарий в файле, что покрытие удалено осознанно вместе с C-1. Альтернатива (Option B — превратить в guard «percent теперь игнорируется → значение трактуется как fraction») рассмотрена и отвергнута: код-путь, который тест проверял бы, никем не вызывается, а сам guard потребовал бы магических констант для нового ожидаемого результата.

Если в будущем кто-то решит вернуть концепцию `unit='percent'` (например, для UI-ввода в процентах) — добавлять надо одновременно и парсер, и нормализатор, и тест; точечный возврат только нормализатора снова станет dead code.

## Коммит

Один commit, охватывает: 5 файлов `src/lib/plan/*`, 4 тест-файла, отчёт.

## Time tracking

- PROMPT-чтение + чек round-trip контракта: ~5 мин
- DEV (C-1..C-4 правки): ~10 мин
- Self-test + расследование двух fail (sample-size + snapshot) + решение: ~10 мин
- Доп. тесты C-2/C-3: ~5 мин
- Отчёт + commit: ~10 мин

**Total active:** ~40 мин. В коридоре ожидания 30-45 мин.

## Open questions

- Нет. Все четыре concern'а закрыты. Side-finding (удалённый sample-size тест) задокументирован выше — решение принято внутри scope FIX'а, без эскалации.
