# Sprint 8 — UX consistency + onboarding routes + feature polish

**Type:** Code (single phase)
**Estimated:** ~5-6 ч active
**Источник:** `docs/project/polish-pack-v2.md` (Pv2-1..18 минус Pv2-11, минус Pv2-4 закрытый) + `docs/project/ux-audit-2026-05-31.md`
**Положение в roadmap:** Sprint 8 (polish + onboarding routes). Methodology main content переехал в Sprint 9.

---

## Overview

Sprint 7 закрыл функциональное ядро (full value loop бриф → план → ноутбук → drag-drop → HTML отчёт). Этот sprint наводит UX-резкость прежде чем заходить в Sprint 9 content phase:

- **Чинит broken contract:** убирает фейковую кнопку «? Включить тур» (toggle работает, плашек нет с Sprint 1), заменяет двумя реальными onboarding routes (Tutorial / Methodology) + сквозной ссылкой на NotebookLM «CRO эксперт».
- **Унифицирует UX между шагами:** добавляет H1 на /step1, banner approval на /step3, sticky footer на /step4, разделяет «глобальный reset» и «локальный reset» на /step4.
- **Дочищает hot polish-stories** из Sprint 6+7 RETEST (4 ◆) + дописывает CR-concerns из Sprint 7 code reviews (3 items) + одну фичу (unit conversion для decision rules).

**Цель:** довести продукт до **v1-presentation-ready** state. После этого Sprint 9 — content (Methodology + a11y/mobile, при необходимости Tutorial deeper rewrite).

**Стратегия:** одна фаза, Code прогоняет весь scope один раз. После завершения — единый RETEST на 3 e2e-сценариях.

---

## Scope (P-1..P-14)

### P-1. Header rewrite — убрать broken tour + 3 nav-link [Pv2-12 + Pv2-7]

**Cleanup:**
- Удалить из `src/components/Header.jsx` весь блок tour-toggle (button с `Actions.TOGGLE_TOUR`).
- Удалить из `src/state/reducer.js`: `tourEnabled: false` в initialState (строка 117) + `TOGGLE_TOUR: 'TOGGLE_TOUR'` в Actions (134) + case (219-220).
- Удалить из `src/App.jsx`: `useEffect` с `document.body.classList.toggle('tour', state.tourEnabled)` (36-37).
- Удалить из `src/styles/index.css`: color tokens `--color-tour`, `--color-tour-soft`, `--color-tour-hover` (21-23).
- Удалить из `src/lib/storage.js` строку 13 comment про `tourEnabled` (per-session preference).
- Удалить из `tests/state/reducer.test.js` case'ы про TOGGLE_TOUR.

**Add:**
- В `Header.jsx` справа от логотипа (перед `↺ НАЧАТЬ СНАЧАЛА`) — 3 navigation link в одной flex group:

```jsx
<nav className="flex items-center gap-1.5 text-xs">
  <NavLink to="/tutorial" className="mono-label text-fg-faint hover:text-fg border border-border-soft rounded-md px-3 py-1.5 transition-colors">
    📖 Туториал
  </NavLink>
  <NavLink to="/methodology" className="mono-label text-fg-faint hover:text-fg border border-border-soft rounded-md px-3 py-1.5 transition-colors">
    📘 Методология
  </NavLink>
  <a
    href="https://notebooklm.google.com/notebook/040498fe-3843-4562-a854-863d2101a0d8"
    target="_blank"
    rel="noopener noreferrer"
    title="Внешний AI-ассистент по A/B методологии (NotebookLM)"
    className="mono-label text-tour border border-tour rounded-md px-3 py-1.5 hover:bg-tour-soft transition-colors"
  >
    ↗ CRO Эксперт
  </a>
</nav>
```

(можно реюзнуть `--color-tour*` tokens, если решишь сохранить их под external-link accent, а не удалять — тогда вычеркни их из cleanup-списка. Решает Code.)

**Routes:**
- В `src/App.jsx` добавить `<Route path="/tutorial" element={<TutorialPage />} />` и `<Route path="/methodology" element={<MethodologyPage />} />`.

**Stub pages:**
- `src/pages/TutorialPage.jsx` — заглушка с заголовком + текст «Туториал готовится. До завершения — посмотри сценарии в `docs/project/e2e-scenarios-sprint-7.md` репозитория». **ВАЖНО:** Cowork параллельно готовит финальный content в виде markdown — Code его потом инлайнит. На момент DEV-фазы — stub OK.
- `src/pages/MethodologyPage.jsx` — заглушка «Раздел готовится в Sprint 9».

Обе pages должны быть доступны без approval'а плана (не блокированы Stepper'ом).

**Tests:** `reducer.test.js` (−2 cases TOGGLE_TOUR), нет новых unit-tests (UI по конвенции без них).

**Acceptance:** Header показывает 3 nav link, клик на `📖 Туториал` → /tutorial, клик на `↗ CRO Эксперт` → новая вкладка NotebookLM. Старая кнопка тура убрана.

---

### P-2. /step1 — H1 «Бриф» + subtitle [Pv2-13]

В `src/pages/BriefPage.jsx` сверху страницы (над progress bar или вместо него — выбирает Code) добавить:

```jsx
<header className="mb-6">
  <h1 className="text-2xl font-serif font-semibold">Бриф</h1>
  <p className="text-sm text-fg-faint mt-1">Опиши тест в 10 вопросах — sample size и план посчитаются автоматически.</p>
</header>
```

Стиль H1 + subtitle совпадает с /step4 (там уже паттерн есть — посмотри `ValidationReportPage.jsx`).

**Acceptance:** на /step1 сверху виден `# Бриф` + subtitle. Шаг 1 больше не выбивается из ритма /step2-4.

---

### P-3. /step3 — banner с approval status [Pv2-14]

В `src/pages/NotebookBuilderPage.jsx` после Stepper и перед карточкой «Конструктор ноутбука» добавить banner симметричный со /step2:

```jsx
{plan?.status === 'approved' && (
  <Banner type="status" icon="✓">
    План утверждён. Конструируешь ноутбук на основе финального плана.
    Хочешь поменять — <Link to="/step2">верни план в черновик на Шаге 2 →</Link>.
  </Banner>
)}
```

Если `Banner` компонент ещё не вынесен — см. P-7 (banner styling). Можно сначала inline, потом в P-7 рефакторить в компонент.

**Acceptance:** на /step3 при approved plan виден accent green banner с напоминанием статуса.

---

### P-4. /step4 — sticky bottom footer [Pv2-15]

В `src/pages/ValidationReportPage.jsx` добавить sticky bottom footer аналогично /step2-3:

```jsx
<StepFooter
  back={<Link to="/step3">← К КОНСТРУКТОРУ</Link>}
  primary={
    <button onClick={handleDownloadZip} className="mono-label font-semibold bg-accent text-bg rounded-md px-6 py-3 text-base">
      ↓ СКАЧАТЬ ВСЁ (.zip)
    </button>
  }
/>
```

`handleDownloadZip` — переиспользовать existing handler из section 6 (ExportSection). Кнопка должна работать identically — это **дубль**, не отдельная логика.

**Acceptance:** на /step4 после скролла вниз виден sticky footer с primary ZIP-кнопкой. Клик скачивает то же что секция 6. Симметрия рамки страницы с /step1-3.

---

### P-5. Banner styling — разделить status (✓) и info (ℹ) [Pv2-18]

Вынести в новый компонент `src/components/layout/Banner.jsx`:

```jsx
export default function Banner({ type, icon, children, action }) {
  const variants = {
    status: 'bg-accent-soft border-accent text-fg',
    info: 'bg-bg-elev-2 border-border-soft text-fg-dim',
  }
  return (
    <div className={`flex items-start gap-3 p-3 rounded-md border ${variants[type]}`}>
      {icon && <span className="text-base shrink-0">{icon}</span>}
      <div className="flex-1 text-sm">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
```

Заменить inline banner'ы в `BriefPage.jsx` (approved banner) + `PlanPage.jsx` (approved banner с кнопкой «У меня есть выполненный ноутбук →») + `NotebookBuilderPage.jsx` (новый из P-3) + `ValidationReportPage.jsx` (info banner про «что здесь происходит») на `<Banner>` использование.

`type="status"` для approval-related, `type="info"` для descriptions. Icon — `✓` для status, `ℹ` для info.

**Acceptance:** все 4 banner'а в продукте используют один компонент. Status banners — зелёные с ✓, info banner — нейтральный с ℹ.

---

### P-6. Rename `↳ ЗАГРУЖЕН` → `↳ ИЗ ФАЙЛА` [Pv2-16]

Найти LoadedBadge компонент (`src/components/plan/LoadedBadge.jsx` или эквивалент), заменить label с `↳ ЗАГРУЖЕН` на `↳ ИЗ ФАЙЛА`. Title attribute обновить на «Этот план загружен из внешнего .md файла, а не сгенерирован из брифа».

**Acceptance:** badge на /step2 и /step3 показывает `↳ ИЗ ФАЙЛА`.

---

### P-7. /step4 — reset confusion fix [Pv2-17]

В `ValidationReportPage.jsx` найти текущий `↺ Сбросить результаты`, заменить:

```jsx
<button
  type="button"
  onClick={() => setShowConfirm(true)}
  className="text-xs text-fg-faint hover:text-fg transition-colors"
  title="Очистить только результаты Шага 4. Бриф и план останутся."
>
  🗑 ОЧИСТИТЬ ФОРМУ
</button>
<ConfirmDialog
  open={showConfirm}
  title="Очистить форму результатов?"
  message="Будут удалены: загруженный ноутбук, числа в форме, decision rule checkboxes, принятое решение. Бриф и тест-план останутся неизменными."
  confirmLabel="ОЧИСТИТЬ"
  cancelLabel="ОТМЕНА"
  onConfirm={handleReset}
  onCancel={() => setShowConfirm(false)}
/>
```

Иконка `🗑` (или `✕`) — explicit «destructive form-only», не глобальный reset. ConfirmDialog обязательный — потому что destructive (теряются результаты теста).

**Acceptance:** на /step4 рядом с заголовком кнопка `🗑 ОЧИСТИТЬ ФОРМУ` (вместо ↺ Сбросить). Клик → ConfirmDialog с явным scope. Кнопка `↺ НАЧАТЬ СНАЧАЛА` в Header — без изменений.

---

### P-8. `fmtNum` precision в DataPeekStats [Pv2-1]

В `src/components/brief/DataPeekStats.jsx::fmtNum` — переписать:

```js
function fmtNum(v) {
  if (!Number.isFinite(Number(v))) return '—'
  const n = Number(v)
  if (Math.abs(n) >= 1) return n.toFixed(2)
  return n.toFixed(4)
}
```

Edge cases: 0 → '0.00', null/undefined → '—', Infinity → '—'.

**Tests:** `tests/components/brief/DataPeekStats.test.js` (+ 4 case: ≥1, <1, 0, null/Infinity). Если файла нет — создать.

**Acceptance:** baseline_computed 100.431813 показывается как `100.43`, а 0.0312 как `0.0312`.

---

### P-9. MdPreview стилизованный scrollbar [Pv2-3]

В `src/components/plan/MdPreview.jsx` (или эквивалент — preview test_plan.md на /step2) добавить CSS для webkit scrollbar под тёмную тему:

```css
/* Inline в компоненте или в index.css */
.md-preview::-webkit-scrollbar { width: 8px; }
.md-preview::-webkit-scrollbar-track { background: var(--color-bg-elev-2); }
.md-preview::-webkit-scrollbar-thumb { background: var(--color-accent); border-radius: 4px; }
.md-preview::-webkit-scrollbar-thumb:hover { background: var(--color-accent-hover); }
/* Firefox */
.md-preview { scrollbar-width: thin; scrollbar-color: var(--color-accent) var(--color-bg-elev-2); }
```

**Acceptance:** scrollbar в preview на /step2 — тёмный, узкий, с accent thumb. Не белый default.

---

### P-10. Restart `↺ Новый тест` на /step4 после ExportSection [Pv2-6]

В `ValidationReportPage.jsx` после Section 6 (Скачать артефакты) добавить:

```jsx
<section className="mt-8 pt-6 border-t border-border-soft text-center">
  <p className="text-sm text-fg-faint mb-3">Готов начать следующий тест?</p>
  <button
    type="button"
    onClick={() => setShowRestartFromFinal(true)}
    className="mono-label text-fg-faint border border-border-soft rounded-md px-4 py-2 hover:text-fg transition-colors"
  >
    ↺ НОВЫЙ ТЕСТ
  </button>
  <ConfirmDialog
    open={showRestartFromFinal}
    title="Начать новый тест?"
    message="Все данные текущего теста (бриф, план, ноутбук, результаты) будут сброшены. Сохрани ZIP, если хочешь сохранить артефакты."
    confirmLabel="НАЧАТЬ НОВЫЙ"
    cancelLabel="ОТМЕНА"
    destructive
    onConfirm={handleFullRestart}
    onCancel={() => setShowRestartFromFinal(false)}
  />
</section>
```

`handleFullRestart` = тот же что в Header (`clearState() + RESET_STATE + navigate('/')`).

**Acceptance:** под секцией 6 на /step4 видна кнопка `↺ НОВЫЙ ТЕСТ`. Клик → ConfirmDialog → полный reset → / .

---

### P-11. ScoringCard детальный checklist [Pv2-2]

В `src/components/plan/ScoringCard.jsx` сделать каждую из 4 групп (Полнота гипотезы / Полнота дизайна / Методологическая консистентность / Pre-flight на данных) **раскрываемой** (через `<details>` или local useState):

```jsx
{groups.map(group => (
  <details key={group.id} className="border-t border-border-soft py-2">
    <summary className="flex justify-between cursor-pointer">
      <span className="mono-label">{group.score}/{group.maxScore} {group.label}</span>
      <ScoringBar value={group.score} max={group.maxScore} />
    </summary>
    <ul className="mt-2 space-y-1 pl-4">
      {group.remarks.map((r, i) => (
        <li key={i} className={`text-xs ${r.severity === 'critical' ? 'text-bad' : r.severity === 'warn' ? 'text-warn' : 'text-fg-faint'}`}>
          {r.severity === 'critical' ? '⚠' : r.severity === 'warn' ? '!' : 'ℹ'} {r.text}
        </li>
      ))}
      {group.remarks.length === 0 && <li className="text-xs text-fg-faint">Без замечаний — всё ок.</li>}
    </ul>
  </details>
))}
```

Данные уже есть в `scorePlan() remarks` (Sprint 3). Только UI render.

**Acceptance:** на /step2 каждая группа в ScoringCard раскрывается, показывает список remarks с цветной severity-маркировкой.

---

### P-12. D-2 midpoint refinement [Pv2-8]

В шаблонах `templates/notebook/main_test/{z_test,t_test,welch,bootstrap}.cells.json` заменить `center = (ci_lower + ci_upper) / 2` на canonical bindings:

- **z_test:** добавить `observed_diff = float(p_treatment - p_control)`, использовать как `center`
- **t_test:** добавить `observed_diff = float(treatment.mean() - control.mean())`
- **welch:** аналогично t_test
- **bootstrap:** добавить `observed_diff = float(observed)` (уже есть `observed` variable)

В errorbar блоке:
```python
center = observed_diff  # точечная оценка, не midpoint CI
fig, ax = plt.subplots(figsize=(8, 3))
ax.errorbar([center], [0], xerr=[[center - ci_lower], [ci_upper - center]], fmt='o', color='#a3e635', ecolor='#a3e635', capsize=10, markersize=12)
# ...
```

**Acceptance:** в z_test wald CI ничего не меняется (midpoint = observed). В bootstrap при асимметричном distribution точка визуально точнее. `npm test` зелёный (notebook-builder.test.js не падает).

---

### P-13. Decision rules parser aliases [Pv2-9]

В `src/lib/results/decision-rules.js::COND_REGEX` и `normalizeVariable` расширить:

```js
const COND_REGEX = new RegExp(
  '(ci_lower|ci_upper|p_value|delta_rel|ci\\s+lower|ci\\s+upper|' +
    'нижняя\\s+граница|верхняя\\s+граница|ci|' +
    // НОВОЕ:
    'lift|эффект|relative\\s+effect|delta\\s*rel|Δ\\s*rel|' +
    'p\\s*value|p-value|p-значение' +
    ')' +
    '\\s*(>=|<=|==|>|<)\\s*([+-]?\\d+(?:\\.\\d+)?)',
  'i'
)

function normalizeVariable(rawVar, operator) {
  const v = rawVar.toLowerCase().replace(/\s+/g, '_').replace(/^δ_?/, '')
  if (['ci_lower', 'ci_upper', 'p_value', 'delta_rel'].includes(v)) return v
  if (v === 'нижняя_граница') return 'ci_lower'
  if (v === 'верхняя_граница') return 'ci_upper'
  // НОВОЕ:
  if (['lift', 'эффект', 'relative_effect', 'delta_rel', 'rel'].includes(v)) return 'delta_rel'
  if (['p_value', 'p-value', 'p-значение'].includes(v) || v.startsWith('p')) return 'p_value'
  // ...bare ci semantic mapping как сейчас...
}
```

(Регекс/replace — на усмотрение Code, важно семантика mapping'ов.)

**Tests:** `decision-rules.test.js` (+ 4-6 case: `Lift ≥ +5% rel.` → `delta_rel >= 5`, `Эффект > 0` → `delta_rel > 0`, `Δ rel >= 5` → `delta_rel >= 5`, `p value < 0.05` → `p_value < 0.05`).

**Acceptance:** real PM-формулировки `Lift ≥ +5%`, `Эффект > 0`, `Δ rel >= 5` парсятся корректно.

---

### P-14. Unit conversion `% rel ↔ абс` через baseline [Pv2-10]

**Большая фича.** Требует multi-layer change:

#### P-14a. Canonical binding `control_mean` в main_test cells

В шаблонах `templates/notebook/main_test/{z_test,t_test,welch,bootstrap}.cells.json` добавить canonical binding:
- **z_test:** `control_mean = float(p_control)`
- **t_test, welch:** `control_mean = float(control.mean())`
- **bootstrap:** `control_mean = float(control.mean())`

#### P-14b. Export-cell field

В `templates/notebook/export.cells.json` добавить в results dict:
```python
'control_mean': _safe(globals().get('control_mean')),
```

#### P-14c. effective.js derived fields

В `src/lib/results/effective.js` добавить derived `ci_lower_pct_rel` и `ci_upper_pct_rel`:
```js
const cm = Number(out.control_mean)
if (Number.isFinite(cm) && cm !== 0) {
  if (Number.isFinite(Number(out.ci_lower))) out.ci_lower_pct_rel = (Number(out.ci_lower) / cm) * 100
  if (Number.isFinite(Number(out.ci_upper))) out.ci_upper_pct_rel = (Number(out.ci_upper) / cm) * 100
}
```

#### P-14d. Unit-aware parser в decision-rules.js

Расширить `parseDecisionRule` чтобы захватывать суффикс `% rel` / `% relative` / `%`:

```js
const COND_REGEX = new RegExp(
  '...(variable group)...' +
    '\\s*(>=|<=|==|>|<)\\s*' +
    '([+-]?\\d+(?:\\.\\d+)?)' +
    '\\s*(%\\s*rel|%\\s*relative|%)?' +  // суффикс
    '',
  'i'
)

// В parsed object добавить unit: 'pct_rel' | 'abs' | null
```

В `evaluateRule` — если `unit === 'pct_rel'` и variable является `ci_lower`/`ci_upper` → читать из results `ci_lower_pct_rel`/`ci_upper_pct_rel` вместо raw.

Backward-compat: если `control_mean` отсутствует (старый ipynb) → derived поля undefined → unit-aware сравнение возвращает null → manual checkbox fallback (existing behavior).

#### P-14e. UI hint обновить

В `DecisionRulesBlock.jsx` hint текущий «threshold в абс. единицах» расширить:
> ⓘ Правила с суффиксом `% rel` сравниваются автоматически через baseline из ноутбука. Без суффикса — threshold в абс. единицах метрики.

#### P-14f. ADR-015 amendment

В `docs/context/decisions-log.md` ADR-015 раздел Amendment добавить пункт 3:
> **3. `control_mean` (added in Sprint 8, P-14).** Optional float. Используется для derived `ci_lower_pct_rel` / `ci_upper_pct_rel` в `effective.js`, что позволяет decision rules в формате `CI ≤ −2.5% rel.` корректно сравниваться для всех metric_type. Backward-compat: если поле отсутствует — derived undefined, unit-aware comparison возвращает null.

**Tests:** `decision-rules.test.js` (+ 3 case: `ci_upper <= -2.5% rel` для proportion vs continuous → разные results но оба корректны), `effective.test.js` (+ 1 case: derived fields), `notebook-builder.test.js` (+ 1 case: control_mean в export-cell).

**Acceptance:** правило `CI ≤ −2.5% rel.` на Scenario B (continuous ARPU, baseline 106.31, ci_upper = 4.58) → derived `ci_upper_pct_rel = 4.58/106.31*100 = 4.31%`. Сравнение `4.31 <= -2.5` = false → правило не сработало (correct). Без `% rel`: `4.58 <= -2.5` = false тоже, но через сравнение с raw.

---

## Что НЕ делаем (DO NOT)

- ❌ **Не трогаем** Methodology page content — заглушка «Sprint 9» достаточно.
- ❌ **Не трогаем** Tutorial page content — Cowork готовит markdown параллельно, Code инлайнит его в финальный коммит. На момент DEV — stub.
- ❌ **Не вводим** новых npm-зависимостей. Все 14 P-items решаются существующим стеком.
- ❌ **Не делаем** Pv2-11 (semantic-rule hint expansion) — P3, текущий UX достаточен.
- ❌ **Не трогаем** ADR-013/015 семантику CI (абсолютные единицы) — P-14 только добавляет derived fields поверх.
- ❌ **Не трогаем** round-trip plan (P-14 → только results layer).
- ❌ **Не делаем** mobile responsive audit — Sprint 9.
- ❌ **Не делаем** a11y audit — Sprint 9.
- ❌ **Не делаем** tooltips на ключевых понятиях в брифе — заменено сквозной NotebookLM ссылкой в Header (P-1).

---

## Files involved

**Удаляем содержимое:**
- `src/components/Header.jsx` — tour button block (P-1)
- `src/state/reducer.js` — tourEnabled + TOGGLE_TOUR (P-1)
- `src/App.jsx` — tour classList useEffect (P-1)
- `src/styles/index.css` — color tokens `--color-tour*` (P-1, опционально)
- `src/lib/storage.js` — comment line 13 (P-1)

**Создаём новые файлы:**
- `src/pages/TutorialPage.jsx` (P-1)
- `src/pages/MethodologyPage.jsx` (P-1)
- `src/components/layout/Banner.jsx` (P-5)

**Модифицируем:**
- `src/components/Header.jsx` — 3 nav link (P-1)
- `src/App.jsx` — 2 новых route (P-1)
- `src/pages/BriefPage.jsx` — H1 + subtitle (P-2) + Banner refactor (P-5)
- `src/pages/PlanPage.jsx` — Banner refactor (P-5)
- `src/pages/NotebookBuilderPage.jsx` — approval banner (P-3) + Banner refactor (P-5)
- `src/pages/ValidationReportPage.jsx` — sticky footer (P-4) + reset rename (P-7) + restart на финале (P-10) + Banner refactor (P-5)
- `src/components/plan/LoadedBadge.jsx` — rename label (P-6)
- `src/components/brief/DataPeekStats.jsx` — fmtNum (P-8)
- `src/components/plan/MdPreview.jsx` (или эквивалент) — scrollbar styling (P-9)
- `src/components/plan/ScoringCard.jsx` — details checklist (P-11)
- `templates/notebook/main_test/{z_test,t_test,welch,bootstrap}.cells.json` — observed_diff + control_mean bindings + errorbar center fix (P-12 + P-14a)
- `templates/notebook/export.cells.json` — `control_mean` field (P-14b)
- `src/lib/results/effective.js` — derived `ci_*_pct_rel` (P-14c)
- `src/lib/results/decision-rules.js` — aliases в regex + normalizeVariable (P-13) + unit-aware parser (P-14d)
- `src/components/results/DecisionRulesBlock.jsx` — hint обновить (P-14e)
- `docs/context/decisions-log.md` — ADR-015 amendment пункт 3 (P-14f, **Code может править docs только для ADR — по согласованию с Cowork**, или эскалирует Cowork'у в отчёте, тот допишет в CLOSE)

**Тесты:**
- `tests/state/reducer.test.js` (−2 TOGGLE_TOUR)
- `tests/components/brief/DataPeekStats.test.js` (+4, new file)
- `tests/lib/plan/notebook-builder.test.js` (+2: observed_diff в main_test, control_mean в export)
- `tests/lib/results/decision-rules.test.js` (+10: 4-6 aliases + 3 unit-aware + sanity bare CI)
- `tests/lib/results/effective.test.js` (+1: derived pct_rel)

---

## Acceptance criteria

1. `npm test` зелёный, **+~15 новых тестов** (минус 2 удалённых TOGGLE_TOUR). Total: ~461+.
2. `npm run build` чистый. Bundle initial delta **< +5 KB gzip** (Banner компонент + новые pages stubs; main bulk text changes).
3. **Round-trip 6/6** не задет (YAML test_plan.md не меняется).
4. **Browser smoke (~10-15 мин):**
   - **Header:** 3 nav link + Restart utility. Tour button удалён. Клик «📖 Туториал» → /tutorial stub. Клик «↗ CRO Эксперт» → новая вкладка NotebookLM.
   - **/step1:** H1 «Бриф» + subtitle сверху. Banner approval (если plan approved) с ✓ icon.
   - **/step2:** Banner с ✓ icon. ScoringCard details раскрываются с remarks. MdPreview scrollbar тёмный.
   - **/step2 + /step3 badge:** `↳ ИЗ ФАЙЛА` (вместо `↳ ЗАГРУЖЕН`).
   - **/step3:** Новый banner approval (P-3).
   - **/step4:** Banner info с ℹ icon. `🗑 ОЧИСТИТЬ ФОРМУ` (вместо `↺ Сбросить результаты`) + ConfirmDialog. Sticky footer внизу с ↓ ZIP. Под section 6 — `↺ НОВЫЙ ТЕСТ` с ConfirmDialog.
   - **DataPeek (continuous):** baseline_computed показывается с 2 знаками (вместо 6).
   - **/step4 decision rules:** правило `Lift ≥ +5%` парсится. Правило `CI ≤ -2.5% rel` для continuous ARPU → derived `ci_*_pct_rel` корректное сравнение (не false-positive).
   - **Регенерация ноутбука** → main_test cell содержит `observed_diff = ...` + `control_mean = ...` bindings.
   - **Export-cell JSON** содержит `'control_mean': <число>`.

---

## Sprint Polish Report — что ожидаем

В `docs/project/sprint-polish-v2-report.md` (Code пишет, по образцу Sprint 7 FIX iter 2 report):

- Trace-ability P-1..P-14 → файлы + diffs.
- Решение по `--color-tour*` tokens — удалил или переиспользовал под external-link accent.
- `Banner` компонент API — какие props ввёл (type, icon, action, children).
- `ScoringCard details` — UX details (open by default? closed?).
- D-2 fix: какой именно `observed_diff` binding для каждого main_test.
- P-14 unit-aware decision rules — какие edge cases покрыл (отсутствие control_mean, deletion от 0, signed mismatch).
- Tests count delta + bundle delta.
- ADR-015 amendment текст — Code пишет в decisions-log.md (исключение Code-зоны §P-1) или эскалирует Cowork'у в отчёт.
- Time tracking — ожидаемый ~5-6 ч.

---

## Cowork параллельные задачи (НЕ в Code scope)

1. **Tutorial content rewrite** — переработать `docs/project/e2e-scenarios-sprint-7.md` в `docs/project/tutorial-content.md` (или прямо в `TutorialPage.jsx` markdown-инлайном) в формат user-facing walkthrough. CSV — downloadable. ~1.5 ч.
2. **Code review + retest prep** — после Code DEV.
3. **CLOSE phase** — обновить JTBD §1 (новые stories tutorial+methodology+CRO), §6+§7 (новые ◆ closures), CONTEXT timeline entry, PROJECT_STATUS, ADR-015 amendment если Code не сделал.

---

## Related

- `docs/project/polish-pack-v2.md` — полный backlog с приоритизацией
- `docs/project/ux-audit-2026-05-31.md` — UX audit findings A (tour) + B (consistency)
- `docs/project/sprint-7-fix-iter2-report.md` — origin для P-13 (parser aliases CR-1)
- `docs/project/code-review-sprint-7-fix.md` — origin для P-12 (D-2 midpoint CR-1)
- `docs/context/decisions-log.md` ADR-015 — будет дополнен P-14f
- `outputs/stat-plan-concept-for-notebooklm.md` — концепт-документ для оформления NotebookLM обложки (для Pv2-7 cross-context)
