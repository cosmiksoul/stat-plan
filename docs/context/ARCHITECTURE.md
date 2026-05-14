# Architecture

## Деплой

GitHub Pages. Один статический сайт, никакого сервера. Все операции — на клиенте.

## Стек

| Слой | Решение | Зачем |
|------|---------|-------|
| UI | HTML + CSS + vanilla JS (или + Alpine.js) | Минимум зависимостей, легко поддерживать |
| Парсинг md | [js-yaml](https://github.com/nodeca/js-yaml) + кастомный парсер секций | Чтение YAML frontmatter и markdown-секций |
| Статистика на клиенте | [simple-statistics](https://simplestatistics.org/) или [jStat](http://jstat.github.io/) | Расчёт z-test, CI, базовая описательная статистика |
| Визуализация | D3.js или Chart.js | Графики на странице анализа |
| Экспорт PDF | jsPDF или html2pdf | Скачивание отчёта валидации |
| Экспорт изображений | dom-to-image или html2canvas | Скачивание графиков как PNG |
| Сборка zip | [JSZip](https://stuk.github.io/jszip/) | Финальный пакет на шаге read-out |
| Хранение между шагами | localStorage | Состояние формы при перезагрузке |

**Pyodide рассматривался, но отвергнут для v1.** Тащить ~10MB рантайма ради того, что можно посчитать вручную — оверкилл. Если в будущем понадобится bootstrap-симуляция или сложный CUPED-расчёт прямо в браузере — можно добавить как отдельную опцию.

## Структура проекта

```
stat-plan/
├── index.html                  # точка входа, все 4 шага в одном SPA
├── assets/
│   ├── styles.css
│   ├── app.js                  # роутинг между шагами, общее состояние
│   ├── brief/
│   │   ├── questions.js        # дерево вопросов
│   │   ├── validators.js       # правила консистентности
│   │   └── data-peek.js        # парсинг загруженного csv для baseline
│   ├── plan/
│   │   ├── render.js           # генерация md из ответов
│   │   ├── parser.js           # парсинг загруженного md обратно в состояние
│   │   ├── scoring.js          # расчёт оценки
│   │   └── notebook-builder.js # сборка .ipynb из шаблонов ячеек
│   ├── analysis/
│   │   ├── csv-parser.js
│   │   ├── recalc.js           # независимый пересчёт метрик
│   │   ├── compare.js          # сравнение с цифрами из ноутбука
│   │   └── charts.js
│   └── readout/
│       ├── render.js
│       └── zip-builder.js
├── templates/
│   ├── test_plan.md.tmpl       # шаблон тест-плана с плейсхолдерами
│   ├── readout.md.tmpl
│   └── notebook/
│       ├── 01-load.ipynb.json  # шаблонные ячейки ноутбука
│       ├── 02-srm.ipynb.json
│       ├── 03-balance.ipynb.json
│       └── ...
└── docs/                       # эти файлы
```

## Состояние приложения

Одна JS-структура, которая живёт в памяти и опционально сохраняется в localStorage:

```javascript
{
  test_id: "bm-main-cta-v2",
  created: "2026-05-12",
  brief: {
    goal_type: "ux",
    metric_type: "proportion",
    baseline: 0.031,
    randomization_unit: "user",
    mde: { value: 8, unit: "relative_percent" },
    daily_traffic: 42000,
    hypothesis: {
      raw: "Если показать новый блок...",
      slots: { change: true, metric: true, direction_magnitude: true, mechanism: true }
    },
    guardrails: [
      { name: "bounce_rate", direction: "max", threshold: 5, unit: "relative_percent" },
      { name: "time_on_site", direction: "min", threshold: -10, unit: "relative_percent" }
    ],
    stop_conditions: [...],
    decision_rules: { ship: "...", iterate: "...", kill: "..." },
    data_peek: {
      uploaded: true,
      filename: "historical.csv",
      computed_baseline: 0.031,
      distribution_check: "ok"
    }
  },
  plan: {
    derived: {
      test_method: "z_test_proportions",
      sample_size_per_arm: 38400,
      duration_days: 5
    },
    score: { total: 78, breakdown: {...} },
    edited_externally: false  // true если пользователь загрузил отредактированный md
  },
  notebook_config: {
    cells_enabled: ["load", "srm", "balance", "novelty", "main_test", "guardrails"],
    cells_optional: ["segments", "bootstrap_ci", "cuped"]
  },
  results: {
    uploaded: false,
    csv_filename: null,
    user_provided_stats: null,    // что было в ноутбуке (если пользователь ввёл)
    recalculated_stats: null,     // что мы пересчитали
    mismatches: []
  }
}
```

## Поток данных между шагами

```
[Бриф]
  пользователь отвечает на вопросы
  опционально загружает historical.csv → парсим в браузере → корректируем baseline
  → state.brief заполняется
  → генерируется brief.md (опционально)

[Тест-план]
  на основе state.brief → derived поля (sample size, метод)
  → рендерим test_plan.md из шаблона
  → запускаем scoring → state.plan.score
  
  если пользователь загружает отредактированный test_plan.md:
    парсим YAML frontmatter + секции
    обновляем state.brief и state.plan
    пересчитываем score
  
  конструктор ноутбука: пользователь тоглит ячейки → state.notebook_config
  → собираем .ipynb из шаблонных JSON-ячеек → скачивание

[Анализ]
  пользователь загружает experiment_results.csv
  парсим, считаем независимо: CR по группам, Δ, CI, p, SRM
  опционально пользователь вводит цифры из своего ноутбука для сравнения
  рендерим таблицу сравнения и визуализации
  → state.results
  
  экспорт: PNG графика, PDF отчёт, validation.md

[Read-out]
  собираем все артефакты в zip
  рендерим readout.md из шаблона с TL;DR и follow-up
  кнопка «скачать всё»
```

## Связность артефактов

Все md-файлы используют общий `test_id` в YAML frontmatter. Это позволяет:
- При загрузке `test_plan.md` на странице анализа проверить, что это правильный план
- В zip-пакете все файлы логически связаны одним id
- Пользователь может коммитить артефакты в свой git и они легко группируются

## Ограничения, о которых надо помнить

- **Размер csv в браузере.** Парсить 100MB файлов на клиенте — не очень. Ставим лимит 50MB и предупреждаем пользователя.
- **Точность статистики в JS.** Для большинства задач simple-statistics достаточно, но для bootstrap-CI на больших выборках лучше отправлять в ноутбук.
- **localStorage квота** — 5-10MB, csv туда не пихаем, только state.brief и state.plan.
