import { useState } from 'react'
import { useAppState } from '../../state/AppStateContext.jsx'
import DataPeekCsvUpload from './DataPeekCsvUpload.jsx'
import DataPeekManualForm from './DataPeekManualForm.jsx'

export default function DataPeekTabs() {
  const { state } = useAppState()
  const [tab, setTab] = useState('csv')
  const metricType = state.brief.metric_type
  // Proportion has no manual calculator (handled in DataPeekBlock).
  const showManual = metricType !== 'proportion'

  return (
    <div>
      <div className="flex gap-1 border-b border-border-soft -mx-4 px-4 mb-3">
        <TabButton active={tab === 'csv'} onClick={() => setTab('csv')}>
          CSV
        </TabButton>
        {showManual && (
          <TabButton
            active={tab === 'manual'}
            onClick={() => setTab('manual')}
          >
            Ручной ввод
          </TabButton>
        )}
      </div>

      {tab === 'csv' ? <DataPeekCsvUpload /> : <DataPeekManualForm />}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mono-label px-3 py-2 cursor-pointer transition-colors border-b-2 -mb-px ${
        active
          ? 'text-accent border-accent'
          : 'text-fg-faint border-transparent hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}
