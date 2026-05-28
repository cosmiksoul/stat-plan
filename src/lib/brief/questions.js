// Registry of the 10 brief questions.
// Pure data, no React, no side effects.
// yamlPath values must match docs/context/DATA_MODEL.md so that the future
// test_plan.md parser (Sprint 5-6) can round-trip state.brief <-> YAML.

export const GOAL_OPTIONS = [
  { value: 'product_change', label: 'Изменение продукта (фича, UX)' },
  { value: 'content', label: 'Контент / креатив' },
  { value: 'algorithm', label: 'Алгоритм / ранжирование' },
  { value: 'marketing', label: 'Маркетинг / реклама' },
  { value: 'other', label: 'Другое' },
]

export const METRIC_TYPE_OPTIONS = [
  {
    value: 'proportion',
    label: 'Конверсия / proportion (0 или 1)',
    hint: 'Бинарная метрика на пользователя',
  },
  {
    value: 'continuous',
    label: 'Средняя величина',
    hint: 'ARPU, время на сайте',
  },
  {
    value: 'ratio',
    label: 'Ratio (числитель/знаменатель из разных юнитов)',
    hint: 'CTR, CR на сессию когда юнит — user',
  },
  {
    value: 'count',
    label: 'Количество событий',
    hint: 'Кликов на юзера',
  },
]

export const RANDOMIZATION_UNIT_OPTIONS = [
  { value: 'user', label: 'Пользователь (user_id)' },
  { value: 'session', label: 'Сессия' },
  { value: 'cluster', label: 'Кластер (гео, домохозяйство, кампания)' },
  { value: 'unknown', label: 'Не знаю / решит аналитик' },
]

export const MDE_UNIT_OPTIONS = [
  {
    value: 'relative_percent',
    label: 'Относительный %',
    hint: 'конверсия вырастет на 8% относительно baseline',
  },
  {
    value: 'absolute_percentage_points',
    label: 'Абсолютные п.п.',
    hint: 'только для proportion: конверсия вырастет на 0.3 п.п.',
  },
  {
    value: 'absolute_value',
    label: 'Абсолютная величина',
    hint: 'для continuous: ARPU вырастет на 50 ₽',
  },
]

export const TRAFFIC_UNIT_OPTIONS = [
  { value: 'user', label: 'польз./день' },
  { value: 'session', label: 'сессий/день' },
]

export function baselineUnitOptionsFor(metricType) {
  switch (metricType) {
    case 'proportion':
      return [
        { value: 'percent', label: '%' },
        { value: 'fraction', label: 'доля (0-1)' },
      ]
    case 'ratio':
      return [
        { value: 'percent', label: '%' },
        { value: 'fraction', label: 'доля' },
        { value: 'number', label: 'число' },
      ]
    case 'count':
      return [{ value: 'per_user', label: 'на юзера' }]
    case 'continuous':
    default:
      return null // свободная единица (text input)
  }
}

export const GUARDRAIL_SUGGESTIONS = [
  {
    name: 'bounce_rate',
    column: 'bounce_rate',
    direction: 'max',
    threshold: { value: 5, unit: 'relative_percent' },
    label: 'Bounce rate · max +5% rel.',
  },
  {
    name: 'time_on_site',
    column: 'time_on_site',
    direction: 'min',
    threshold: { value: -10, unit: 'relative_percent' },
    label: 'Time on site · min −10% rel.',
  },
]

export const QUESTIONS = [
  {
    num: 1,
    id: 'goal_type',
    type: 'single_select',
    required: true,
    title: 'Что мы тестируем?',
    hint: 'Не влияет на статистику, помогает аналитику понять контекст. Выбери ближайшее.',
    default: 'product_change',
    yamlPath: 'goal_type',
    options: GOAL_OPTIONS,
    subQuestions: [
      {
        id: 'goal_description',
        revealsWhen: 'other',
        type: 'goal_description',
        title: 'Опиши кратко что тестируешь',
        hint: 'Можно оставить пустым — поле не влияет на статистику.',
        yamlPath: 'goal_description',
      },
    ],
  },
  {
    num: 2,
    id: 'hypothesis',
    type: 'hypothesis',
    required: true,
    title: 'Сформулируй гипотезу',
    hint: 'Не оцениваем «качество идеи» — проверяем только структуру. Все четыре слота должны быть заполнены.',
    template:
      'Если [изменение], то [метрика] [направление] на [Δ], потому что [механизм]',
    default: '',
    yamlPath: 'hypothesis',
  },
  {
    num: 3,
    id: 'metric_type',
    type: 'single_select',
    required: true,
    title: 'Какого типа главная метрика?',
    hint: 'От этого зависит выбор статистического критерия.',
    default: null,
    yamlPath: 'metric_type',
    options: METRIC_TYPE_OPTIONS,
    subQuestions: [
      {
        id: 'ratio_components',
        revealsWhen: 'ratio',
        type: 'ratio_pair',
        title: 'Что в числителе и знаменателе?',
        hint: 'Например: clicks / sessions',
        yamlPath: 'ratio_components',
      },
    ],
  },
  {
    num: 4,
    id: 'metric_name',
    type: 'text_with_column',
    required: true,
    title: 'Как называется главная метрика?',
    hint: 'Используется в названиях колонок ноутбука и графиков отчёта.',
    default: '',
    yamlPath: 'metric_name',
    columnYamlPath: 'metric_column',
  },
  {
    num: 5,
    id: 'baseline',
    type: 'number_with_unit',
    required: true,
    title: 'Какое значение метрики сейчас?',
    hint: 'Можешь указать примерно — на следующем шаге уточним по реальным данным.',
    default: { value: null, unit: null },
    yamlPath: 'baseline',
  },
  {
    num: 6,
    id: 'randomization_unit',
    type: 'single_select',
    required: true,
    title: 'Что мы делим на группы?',
    hint: 'Уровень, на котором случайно распределяются пользователи между control и treatment.',
    default: 'user',
    yamlPath: 'randomization_unit',
    options: RANDOMIZATION_UNIT_OPTIONS,
    subQuestions: [
      {
        id: 'cluster_field',
        revealsWhen: 'cluster',
        type: 'cluster_field',
        title: 'По какому полю кластеризуем?',
        hint: 'Например: geo, household_id, campaign_id',
        yamlPath: 'cluster_field',
      },
    ],
  },
  {
    num: 7,
    id: 'mde',
    type: 'number_with_unit',
    required: true,
    title: 'Минимальный эффект, который имеет смысл ловить',
    hint: 'Меньший эффект тест не «увидит» с заданной мощностью. Слишком маленький MDE → нереально длинный тест.',
    default: { value: null, unit: 'relative_percent', direction: 'increase' },
    yamlPath: 'mde',
    unitOptions: MDE_UNIT_OPTIONS,
  },
  {
    num: 8,
    id: 'daily_traffic',
    type: 'number_with_unit',
    required: true,
    title: 'Сколько юзеров в день можно отдать в тест?',
    hint: 'Весь трафик, который пойдёт в эксперимент (control + treatment). От этого зависит длительность теста.',
    default: { value: null, unit: 'user' },
    yamlPath: 'daily_traffic',
    unitOptions: TRAFFIC_UNIT_OPTIONS,
  },
  {
    num: 9,
    id: 'guardrails',
    type: 'guardrails_list',
    required: false,
    title: 'Какие метрики не должны просесть?',
    hint: 'Метрики, которые мониторим параллельно с главной. Если они нарушаются — тест останавливаем, даже если главная метрика растёт.',
    default: [],
    yamlPath: 'guardrails',
    suggestions: GUARDRAIL_SUGGESTIONS,
  },
  {
    num: 10,
    id: 'stop_and_decisions',
    type: 'stop_decision',
    required: false,
    title: 'Когда останавливаем тест и как принимаем решение?',
    hint: 'Stop conditions = условия аварийного выхода. Decision rules = что считаем SHIP / ITERATE / KILL.',
    default: null,
    yamlPath: ['stop_conditions', 'decision_rules'],
  },
]

export function getQuestion(num) {
  return QUESTIONS.find((q) => q.num === num) ?? null
}

export const TOTAL_QUESTIONS = QUESTIONS.length
