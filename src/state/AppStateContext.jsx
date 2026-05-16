import { createContext, useContext, useEffect, useReducer } from 'react'
import { initialState, reducer, Actions } from './reducer.js'
import { loadState, saveState } from '../lib/storage.js'

const AppStateContext = createContext(null)

export function AppStateProvider({ children }) {
  // Lazy init: read persisted state once at mount.
  const [state, dispatch] = useReducer(reducer, initialState, loadState)

  // After restore, plan.derived/score are empty (we don't persist them).
  // Recompute once so PlanPage has data even on a cold reload.
  useEffect(() => {
    dispatch({ type: Actions.RECOMPUTE_PLAN })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist on every state change.
  useEffect(() => {
    saveState(state)
  }, [state])

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) {
    throw new Error('useAppState must be used inside AppStateProvider')
  }
  return ctx
}
