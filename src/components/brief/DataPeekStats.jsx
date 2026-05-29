import { useAppState } from '../../state/AppStateContext.jsx'
import { Actions } from '../../state/reducer.js'
import { baselineMatch } from '../../lib/data-peek/baselineMatch.js'

function fmtNum(v, digits = 4) {
  if (v == null || !Number.isFinite(v)) return '—'
  return Number(v).toLocaleString('ru-RU', {
    maximumFractionDigits: digits,
  })
}

function distributionRu(label) {
  switch (label) {
    case 'ok':
      return 'симметричное, нормальное'
    case 'skewed':
      return 'асимметричное (|skew| > 1)'
    case 'heavy_tailed':
      return 'тяжёлые хвосты (excess kurt > 3)'
    case 'skewed_heavy':
      return 'асимметричное + тяжёлые хвосты'
    default:
      return '—'
  }
}

export default function DataPeekStats() {
  const { state, dispatch } = useAppState()
  const dp = state.brief.data_peek
  if (!dp) return null
  const userBaseline = state.brief.baseline?.value
  const delta =
    userBaseline != null && dp.baseline_computed != null && userBaseline !== 0
      ? ((dp.baseline_computed - userBaseline) / Math.abs(userBaseline)) * 100
      : null
  // C-1: live-сравнение вместо frozen dp.baseline_match_user_input.
  // После клика «↳ ПОДСТАВИТЬ В Q05» state.brief.baseline.value меняется и
  // liveMatch мгновенно переключается на true → ⚠ → ✓, кнопка исчезает.
  // dp.baseline_match_user_input остаётся в state — scoring.js читает его как
  // snapshot момента peek (+5 pts).
  const liveMatch = baselineMatch(dp.baseline_computed, userBaseline)

  function applyBaseline() {
    dispatch({
      type: Actions.ANSWER_QUESTION,
      field: 'baseline',
      value: { ...state.brief.baseline, value: dp.baseline_computed },
    })
  }

  return (
    <div className="bg-bg-elev border border-border rounded-md px-4 py-3 space-y-3 text-sm">
      <Row label="ИСТОЧНИК">{dp.source === 'manual' ? 'ручной ввод' : 'CSV'}</Row>

      {dp.baseline_computed != null && (
        <Row label="BASELINE">
          <span className="font-mono">{fmtNum(dp.baseline_computed, 6)}</span>
          {userBaseline != null && (
            <>
              {' '}
              <span className="text-fg-faint">vs твой</span>{' '}
              <span className="font-mono">{fmtNum(userBaseline, 6)}</span>
              {delta != null && (
                <span
                  className={
                    liveMatch ? 'text-ok ml-2' : 'text-warn ml-2'
                  }
                >
                  {liveMatch ? '✓' : '⚠'} Δ ={' '}
                  {delta.toFixed(1)}%
                </span>
              )}
              {liveMatch === false && (
                <button
                  type="button"
                  onClick={applyBaseline}
                  className="ml-3 mono-label text-accent hover:underline cursor-pointer"
                >
                  ↳ ПОДСТАВИТЬ В Q05
                </button>
              )}
            </>
          )}
        </Row>
      )}

      {dp.std_computed != null && (
        <Row label="σ">
          <span className="font-mono">{fmtNum(dp.std_computed)}</span>
        </Row>
      )}

      {dp.ratio_variance != null && (
        <Row label="Var(N/D)">
          <span className="font-mono">{fmtNum(dp.ratio_variance, 6)}</span>
          {dp.ratio_mean_numerator != null && (
            <span className="text-fg-faint ml-3">
              μN={fmtNum(dp.ratio_mean_numerator)} · μD=
              {fmtNum(dp.ratio_mean_denominator)} · Cov=
              {fmtNum(dp.ratio_cov_nd, 6)}
            </span>
          )}
        </Row>
      )}

      {(dp.skewness != null || dp.kurtosis != null) && (
        <Row label="РАСПРЕДЕЛЕНИЕ">
          <span
            className={dp.distribution_check === 'ok' ? 'text-ok' : 'text-warn'}
          >
            {dp.distribution_check === 'ok' ? '✓' : '⚠'}{' '}
            {distributionRu(dp.distribution_check)}
          </span>
          <span className="text-fg-faint ml-3 font-mono text-xs">
            skew={fmtNum(dp.skewness, 2)} · kurt={fmtNum(dp.kurtosis, 2)}
          </span>
        </Row>
      )}

      {dp.cv_value != null && (
        <Row label="CV ПО ДНЯМ">
          <span
            className={
              dp.stability_cv_under_threshold ? 'text-ok' : 'text-warn'
            }
          >
            {dp.stability_cv_under_threshold ? '✓' : '⚠'} {fmtNum(dp.cv_value, 3)}{' '}
            {dp.stability_cv_under_threshold
              ? '(стабильно, CV < 0.3)'
              : '(волатильно, CV ≥ 0.3)'}
          </span>
        </Row>
      )}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div>
      <span className="mono-label text-fg-faint mr-2">{label}</span>
      <span className="text-fg">{children}</span>
    </div>
  )
}
