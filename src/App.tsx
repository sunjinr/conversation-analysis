import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth'
import LoginPage from '@/pages/LoginPage'
import AnalysisLayout from '@/components/analysis/AnalysisLayout'
import DashboardPage from '@/pages/analysis/DashboardPage'
import SessionsPage from '@/pages/analysis/SessionsPage'
import SessionDetailPage from '@/pages/analysis/SessionDetailPage'
import DimensionsPage from '@/pages/analysis/DimensionsPage'
import NewRunPage from '@/pages/analysis/NewRunPage'
import RunsPage from '@/pages/analysis/RunsPage'
import RunDetailPage from '@/pages/analysis/RunDetailPage'
import SettingsPage from '@/pages/analysis/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/analysis" element={<ProtectedRoute><AnalysisLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/:id" element={<SessionDetailPage />} />
            <Route path="dimensions" element={<DimensionsPage />} />
            <Route path="runs" element={<RunsPage />} />
            <Route path="runs/new" element={<NewRunPage />} />
            <Route path="runs/:id" element={<RunDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/analysis" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

export default App
