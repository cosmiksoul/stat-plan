import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header.jsx'
import StartScreen from './pages/StartScreen.jsx'
import BriefPage from './pages/BriefPage.jsx'
import { useAppState } from './state/AppStateContext.jsx'

function ProtectedStep({ children }) {
  const { state } = useAppState()
  if (!state.started) return <Navigate to="/" replace />
  return children
}

function TourBodyClass() {
  const { state } = useAppState()
  useEffect(() => {
    document.body.classList.toggle('tour', state.tourEnabled)
  }, [state.tourEnabled])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <TourBodyClass />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-[1240px] mx-auto px-6 md:px-8 pb-20">
          <Routes>
            <Route path="/" element={<StartScreen />} />
            <Route
              path="/step1"
              element={
                <ProtectedStep>
                  <BriefPage />
                </ProtectedStep>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
