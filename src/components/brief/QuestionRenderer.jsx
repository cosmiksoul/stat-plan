import { useState } from 'react'
import SingleSelect from './SingleSelect.jsx'
import TextInput from './TextInput.jsx'
import NumberWithUnit from './NumberWithUnit.jsx'
import HypothesisInput from './HypothesisInput.jsx'
import GuardrailsList from './GuardrailsList.jsx'
import StopAndDecisionRules from './StopAndDecisionRules.jsx'
import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'
import { baselineUnitOptionsFor } from '../../lib/brief/questions.js'

function toSnakeCase(s) {
  return (s ?? '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .trim()
    .replace(/[\s_]+/g, '_')
}

function MetricNameInput() {
  const { state, dispatch } = useAppState()
  const { brief } = state
  const [columnTouched, setColumnTouched] = useState(
    () => brief.metric_column?.trim() !== '',
  )

  function handleNameChange(value) {
    dispatch({ type: Actions.ANSWER_QUESTION, field: 'metric_name', value })
    if (!columnTouched) {
      dispatch({
        type: Actions.ANSWER_QUESTION,
        field: 'metric_column',
        value: toSnakeCase(value),
      })
    }
  }

  function handleColumnChange(value) {
    setColumnTouched(true)
    dispatch({
      type: Actions.ANSWER_QUESTION,
      field: 'metric_column',
      value,
    })
  }

  return (
    <div className="space-y-4">
      <TextInput
        value={brief.metric_name}
        onChange={handleNameChange}
        label="НАЗВАНИЕ"
        placeholder="например: CR в клик по партнёрке"
      />
      <TextInput
        value={brief.metric_column}
        onChange={handleColumnChange}
        label="КОЛОНКА В CSV (snake_case)"
        placeholder="cr_to_partner_click"
        hint={
          columnTouched
            ? 'Используем твоё значение'
            : 'Авто-генерируется из названия, можешь изменить'
        }
      />
    </div>
  )
}

function RatioPair({ subQuestion }) {
  const { state, dispatch } = useAppState()
  const ratio = state.brief.ratio_components ?? {}

  function update(patch) {
    dispatch({
      type: Actions.ANSWER_QUESTION,
      field: 'ratio_components',
      value: { ...ratio, ...patch },
    })
  }

  return (
    <div className="mt-4 pt-4 border-t border-border-soft">
      <div className="mono-label text-fg-faint mb-2">{subQuestion.title}</div>
      <div className="grid md:grid-cols-2 gap-3">
        <TextInput
          value={ratio.numerator}
          onChange={(v) => update({ numerator: v })}
          label="ЧИСЛИТЕЛЬ"
          placeholder="clicks"
        />
        <TextInput
          value={ratio.denominator}
          onChange={(v) => update({ denominator: v })}
          label="ЗНАМЕНАТЕЛЬ"
          placeholder="sessions"
        />
      </div>
      {subQuestion.hint && (
        <div className="text-xs text-fg-faint mt-2">{subQuestion.hint}</div>
      )}
    </div>
  )
}

function ClusterField({ subQuestion }) {
  const { state, dispatch } = useAppState()
  return (
    <div className="mt-4 pt-4 border-t border-border-soft">
      <TextInput
        value={state.brief.cluster_field}
        onChange={(v) =>
          dispatch({
            type: Actions.ANSWER_QUESTION,
            field: 'cluster_field',
            value: v,
          })
        }
        label={subQuestion.title.toUpperCase()}
        placeholder="geo, household_id, campaign_id"
        hint={subQuestion.hint}
      />
    </div>
  )
}

function GoalDescription({ subQuestion }) {
  const { state, dispatch } = useAppState()
  return (
    <div className="mt-4 pt-4 border-t border-border-soft">
      <TextInput
        value={state.brief.goal_description}
        onChange={(v) =>
          dispatch({
            type: Actions.ANSWER_QUESTION,
            field: 'goal_description',
            value: v,
          })
        }
        label={subQuestion.title.toUpperCase()}
        placeholder="например: тестируем размер баннера на главной"
        hint={subQuestion.hint}
      />
    </div>
  )
}

function BaselineInput() {
  const { state, dispatch } = useAppState()
  const { brief } = state
  const unitOptions = baselineUnitOptionsFor(brief.metric_type)
  const freeUnit = unitOptions === null

  return (
    <NumberWithUnit
      value={brief.baseline.value}
      unit={brief.baseline.unit}
      unitOptions={unitOptions ?? []}
      freeUnit={freeUnit}
      onChange={(next) =>
        dispatch({
          type: Actions.ANSWER_QUESTION,
          field: 'baseline',
          value: next,
        })
      }
      placeholder={
        brief.metric_type === 'proportion' ? 'например: 3.1' : 'например: 250'
      }
    />
  )
}

export default function QuestionRenderer({ question }) {
  const { state, dispatch } = useAppState()
  const { brief } = state

  function answer(field, value) {
    dispatch({ type: Actions.ANSWER_QUESTION, field, value })
  }

  function renderSubQuestions() {
    const subs = question.subQuestions ?? []
    return subs
      .filter((sq) => brief[question.id] === sq.revealsWhen)
      .map((sq) => {
        if (sq.type === 'ratio_pair') {
          return <RatioPair key={sq.id} subQuestion={sq} />
        }
        if (sq.type === 'cluster_field') {
          return <ClusterField key={sq.id} subQuestion={sq} />
        }
        if (sq.type === 'goal_description') {
          return <GoalDescription key={sq.id} subQuestion={sq} />
        }
        return null
      })
  }

  switch (question.type) {
    case 'single_select':
      return (
        <div>
          <SingleSelect
            value={brief[question.id]}
            defaultValue={question.default}
            options={question.options}
            onChange={(v) => answer(question.id, v)}
          />
          {renderSubQuestions()}
        </div>
      )

    case 'hypothesis':
      return (
        <HypothesisInput
          text={brief.hypothesis.text}
          slots={brief.hypothesis.slots}
          template={question.template}
          onChange={(text) =>
            dispatch({ type: Actions.UPDATE_HYPOTHESIS, text })
          }
        />
      )

    case 'text_with_column':
      return <MetricNameInput />

    case 'number_with_unit': {
      if (question.id === 'baseline') return <BaselineInput />
      // mde / daily_traffic
      const stateValue = brief[question.id]
      return (
        <NumberWithUnit
          value={stateValue.value}
          unit={stateValue.unit}
          unitOptions={question.unitOptions}
          onChange={(next) =>
            answer(question.id, { ...stateValue, ...next })
          }
          placeholder={
            question.id === 'mde' ? 'например: 8' : 'например: 42000'
          }
        />
      )
    }

    case 'guardrails_list':
      return <GuardrailsList question={question} />

    case 'stop_decision':
      return <StopAndDecisionRules question={question} />

    default:
      return (
        <div className="text-fg-faint text-sm">
          Тип «{question.type}» пока не реализован.
        </div>
      )
  }
}
