import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CircleCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { useAuth } from '../context/AuthContext'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getStrength(password) {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

const strengthLabels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
const strengthColors = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-brandlight', 'bg-success']

export default function Signup() {
  const { signup, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!authLoading && isAuthenticated && !success) {
    return <Navigate to="/dashboard" replace />
  }

  const strength = getStrength(form.password)

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = 'Full name is required.'
    else if (form.name.trim().length < 2) next.name = 'Enter at least 2 characters.'
    if (!form.email.trim()) next.email = 'Email address is required.'
    else if (!emailPattern.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (!form.password) next.password = 'Password is required.'
    else if (form.password.length < 8) next.password = 'Use at least 8 characters.'
    else if (strength < 2) next.password = 'Choose a stronger password.'
    if (!form.confirmPassword) next.confirmPassword = 'Confirm your password.'
    else if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match.'
    if (!form.terms) next.terms = 'Please accept the terms to continue.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setServerError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      setSuccess(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 900)
    } catch (error) {
      setServerError(error?.response?.data?.message || 'Could not create your account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Build Smarter Projects."
      description="Create your DevUpdate AI workspace."
      badge="Start with a free workspace"
      footer={
        <p className="text-[13px] text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brandlight hover:text-ink">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="rounded-2xl border border-line bg-card/70 p-6 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-8">
        <div className="mb-7">
          <h2 className="text-xl font-bold tracking-[-0.03em] text-ink">Create your account</h2>
          <p className="mt-1.5 text-[13px] text-subtle">Start your dependency intelligence workspace.</p>
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

        {success ? (
          <div
            role="status"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-success/25 bg-success/[0.07] px-3.5 py-3 text-[13px] text-success"
          >
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Account created. Taking you to your dashboard…</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            label="Full name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            icon={UserRound}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={errors.name}
            disabled={submitting}
          />
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            icon={Mail}
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            error={errors.email}
            disabled={submitting}
          />
          <div>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              icon={LockKeyhole}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              error={errors.password}
              disabled={submitting}
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
            <div className="mt-2.5">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={`h-1 flex-1 rounded-full transition-colors ${index < strength ? strengthColors[strength] : 'bg-white/8'}`}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                Password strength:{' '}
                <span className={strength >= 3 ? 'text-success' : 'text-subtle'}>
                  {strengthLabels[strength]}
                </span>
              </p>
            </div>
          </div>
          <Input
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat your password"
            icon={LockKeyhole}
            value={form.confirmPassword}
            onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
            error={errors.confirmPassword}
            disabled={submitting}
          />

          <div>
            <label className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-relaxed text-subtle">
              <input
                type="checkbox"
                checked={form.terms}
                onChange={(event) => setForm({ ...form, terms: event.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-canvas accent-brand"
              />
              <span>
                I agree to the Terms of Service and Privacy Policy for DevUpdate AI.
              </span>
            </label>
            {errors.terms ? <p className="mt-1.5 text-xs text-danger">{errors.terms}</p> : null}
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={success}
            loading={submitting}
            className="btn-shine"
          >
            {success ? <><Check className="h-4 w-4" /> Account created</> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted">
          Your password is hashed with bcrypt before it is stored.
        </p>
      </div>
    </AuthLayout>
  )
}
