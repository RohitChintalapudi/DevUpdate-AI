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
import Dependencies from './pages/dashboard/Dependencies'
import UpdateIntelligence from './pages/dashboard/UpdateIntelligence'
import Recommendations from './pages/dashboard/Recommendations'
import Memory from './pages/dashboard/Memory'
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
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
        <Route path="dependencies" element={<Dependencies />} />
        <Route path="intelligence" element={<UpdateIntelligence />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="memory" element={<Memory />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
