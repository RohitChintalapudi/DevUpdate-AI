import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import LoadingSpinner from './components/common/LoadingSpinner'
import DashboardLayout from './layouts/DashboardLayout'
import { useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import NotFound from './pages/NotFound'
import Overview from './pages/dashboard/Overview'
import Repositories from './pages/dashboard/Repositories'
import RepositoryDetails from './pages/dashboard/RepositoryDetails'
import Dependencies from './pages/dashboard/Dependencies'
import UpdateIntelligence from './pages/dashboard/UpdateIntelligence'
import DependencyUpdates from './pages/dashboard/DependencyUpdates'
import RepositoryUpdateDetails from './pages/dashboard/RepositoryUpdateDetails'
import DependencyUpdateDetail from './pages/dashboard/DependencyUpdateDetail'
import Vulnerabilities from './pages/dashboard/Vulnerabilities'
import Memory from './pages/dashboard/Memory'
import History from './pages/dashboard/History'
import Feedback from './pages/dashboard/Feedback'
import Notifications from './pages/dashboard/Notifications'
import Reports from './pages/dashboard/Reports'
import Settings from './pages/dashboard/Settings'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingSpinner size="lg" label="Preparing your workspace…" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return children
}

function LandingRoute() {
  const location = useLocation()
  if (location.search.includes('github=')) {
    return <Navigate to={`/dashboard/repositories${location.search}`} replace />
  }
  return <Landing />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="repositories" element={<Repositories />} />
        <Route path="repositories/:id" element={<RepositoryDetails />} />
        <Route path="dependencies" element={<Dependencies />} />
        <Route path="intelligence" element={<UpdateIntelligence />} />
        <Route path="updates" element={<DependencyUpdates />} />
        <Route path="updates/repository/:repositoryId" element={<RepositoryUpdateDetails />} />
        <Route path="updates/:dependencyId" element={<DependencyUpdateDetail />} />
        <Route path="vulnerabilities" element={<Vulnerabilities />} />
        <Route path="ai" element={<Navigate to="/dashboard/updates" replace />} />
        <Route path="ai/*" element={<Navigate to="/dashboard/updates" replace />} />
        <Route path="recommendations" element={<Navigate to="/dashboard/updates" replace />} />
        <Route path="memory" element={<Memory />} />
        <Route path="history" element={<Navigate to="/dashboard/memory" replace />} />
        <Route path="feedback" element={<Navigate to="/dashboard/memory" replace />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
