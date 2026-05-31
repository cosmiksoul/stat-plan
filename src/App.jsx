import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header.jsx'
import StartScreen from './pages/StartScreen.jsx'
import BriefPage from './pages/BriefPage.jsx'
import PlanPage from './pages/PlanPage.jsx'
import NotebookBuilderPage from './pages/NotebookBuilderPage.jsx'
import TutorialPage from './pages/TutorialPage.jsx'
import MethodologyPage from './pages/MethodologyPage.jsx'
import { useAppState } from './state/AppStateContext.jsx'

// Sprint 7: Step 4 lazy-loaded — ipynb parser + html/md/zip builders ≈ 60-80 KB
// gzip + jszip (~30 KB). Большинство юзеров проводят основное время на Steps
// 1-3; Step 4 — финальная фаза, 1-2 секунды загрузки приемлемы.
const ValidationReportPage = lazy(() => import('./pages/ValidationReportPage.jsx'))

function PageLoading() {
  return (
    <div className="text-sm text-fg-faint p-8 text-center">Загрузка…</div>
  )
}

function ProtectedStep({ requires = 'started', children }) {
  const { state } = useAppState()
  if (!state.started) return <Navigate to="/" replace />
  if (requires === 'briefSubmitted' && !state.plan.briefSubmitted) {
    return <Navigate to="/step1" replace />
  }
  if (requires === 'approved' && state.plan.status !== 'approved') {
    return <Navigate to="/step2" replace />
  }
  return children
}

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-[1240px] mx-auto px-6 md:px-8 pb-20">
          <Routes>
            <Route path="/" element={<StartScreen />} />
            <Route path="/tutorial" element={<TutorialPage />} />
            <Route path="/methodology" element={<MethodologyPage />} />
            <Route
              path="/step1"
              element={
                <ProtectedStep>
                  <BriefPage />
                </ProtectedStep>
              }
            />
            <Route
              path="/step2"
              element={
                <ProtectedStep requires="briefSubmitted">
                  <PlanPage />
                </ProtectedStep>
              }
            />
            <Route
              path="/step3"
              element={
                <ProtectedStep requires="approved">
                  <NotebookBuilderPage />
                </ProtectedStep>
              }
            />
            <Route
              path="/step4"
              element={
                <ProtectedStep requires="approved">
                  <Suspense fallback={<PageLoading />}>
                    <ValidationReportPage />
                  </Suspense>
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
