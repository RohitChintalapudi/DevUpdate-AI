import { useState } from 'react'
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { useAuth } from '../context/AuthContext'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '', remember: false })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  if (!authLoading && isAuthenticated) {
    return <Navigate to={location.state?.from || '/dashboard'} replace />
  }

  const validate = () => {
    const next = {}
    if (!form.email.trim()) next.email = 'Email address is required.'
    else if (!emailPattern.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (!form.password) next.password = 'Password is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setServerError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      await login({ email: form.email.trim(), password: form.password, remember: form.remember })
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (error) {
      setServerError(
        error?.response?.data?.message || 'Unable to sign in. Check your credentials and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome Back."
      description="Your projects. Your dependencies. Your intelligence."
      badge="Secure workspace access"
      footer={
        <p className="text-[13px] text-muted">
          New to DevUpdate AI?{' '}
          <Link to="/signup" className="font-semibold text-brandlight hover:text-ink">
            Create a workspace
          </Link>
        </p>
      }
    >
      <div className="rounded-2xl border border-line bg-card/70 p-6 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-8">
        <div className="mb-7">
          <h2 className="text-xl font-bold tracking-[-0.03em] text-ink">Sign in to your account</h2>
          <p className="mt-1.5 text-[13px] text-subtle">Enter your details to continue.</p>
        </div>

        {serverError ? (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-3 text-[13px] text-danger"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            icon={Mail}
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            error={errors.email}
          />

          <div>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              icon={LockKeyhole}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              error={errors.password}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-white/5 hover:text-ink"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-subtle">
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(event) => setForm({ ...form, remember: event.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-canvas accent-brand"
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              className="text-[13px] font-medium text-brandlight transition hover:text-ink"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" fullWidth size="lg" loading={submitting} className="btn-shine">
            Sign In <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">
          Protected by HTTP-only cookies, JWT sessions and rate limiting.
        </p>
      </div>
    </AuthLayout>
  )
}
