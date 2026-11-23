import { useState } from 'react'
import { LuArrowRight, LuCircleAlert, LuEye, LuEyeOff, LuLockKeyhole, LuMail } from 'react-icons/lu'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import Input from '../components/common/Input'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useAuth } from '../context/AuthContext'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { login, isAuthenticated, loading: authLoading, getErrorMessage } = useAuth()
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
      setServerError(getErrorMessage(error, 'Unable to sign in. Check your credentials and try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const isSessionExpired = location.search.includes('expired=1')

  return (
    <AuthLayout
      title="Welcome Back"
      description="Enter your email and password to access your dashboard."
      badge="Secure access"
      footer={
        <p className="text-[11.5px] text-slate-500">
          New to DevUpdate AI?{' '}
          <Link to="/signup" className="font-semibold text-sky-600 hover:text-sky-700">
            Create a workspace
          </Link>
        </p>
      }
    >
      {isSessionExpired && !serverError ? (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800"
        >
          <LuCircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>Your 24-hour security session has expired. Please sign in again to continue.</span>
        </div>
      ) : null}

      {serverError ? (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700"
        >
          <LuCircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <Input
          theme="light"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          icon={LuMail}
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          error={errors.email}
        />

        <div>
          <Input
            theme="light"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
            icon={LuLockKeyhole}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            error={errors.password}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                {showPassword ? <LuEyeOff className="h-3.5 w-3.5" /> : <LuEye className="h-3.5 w-3.5" />}
              </button>
            }
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-0.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600" title="Keeps you signed in up to 24 hours">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(event) => setForm({ ...form, remember: event.target.checked })}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-950 focus:ring-slate-950/20"
            />
            Remember me <span className="text-[10px] text-slate-400 font-normal">(24h)</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 inline-flex h-10.5 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        >
          {submitting ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              Sign In <LuArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
