import { createContext, useContext, useReducer } from 'react'
import { initialState, reducer } from './reducer.js'

const AppStateContext = createContext(null)

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
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
