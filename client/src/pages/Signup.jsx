import { useState } from 'react'
import { LuArrowRight, LuCheck, LuCircleAlert, LuCircleCheck, LuEye, LuEyeOff, LuLockKeyhole, LuMail, LuUserRound } from 'react-icons/lu'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import Input from '../components/common/Input'
import LoadingSpinner from '../components/common/LoadingSpinner'
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
const strengthColors = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500']

export default function Signup() {
  const { signup, isAuthenticated, loading: authLoading, getErrorMessage } = useAuth()
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
    if (!form.name.trim()) next.name = 'Name is required.'
    else if (form.name.trim().length < 2) next.name = 'Min 2 characters.'
    if (!form.email.trim()) next.email = 'Email is required.'
    else if (!emailPattern.test(form.email.trim())) next.email = 'Enter a valid email.'
    if (!form.password) next.password = 'Password is required.'
    else if (form.password.length < 8) next.password = 'Min 8 characters.'
    else if (strength < 2) next.password = 'Choose stronger password.'
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
      setServerError(getErrorMessage(error, 'Could not create account.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create Your Account"
      description="Start your dependency intelligence workspace in seconds."
      badge="Free workspace"
      footer={
        <p className="text-[11.5px] text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700">
            Sign in
          </Link>
        </p>
      }
    >
      {serverError ? (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700"
        >
          <LuCircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] text-emerald-800"
        >
          <LuCircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span>Account created. Redirecting to dashboard…</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-2.5">
        {/* Row 1: Full Name & Email side-by-side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Input
            theme="light"
            label="Full name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            icon={LuUserRound}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={errors.name}
            disabled={submitting}
          />
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
            disabled={submitting}
          />
        </div>

        {/* Row 2: Password & Confirm Password side-by-side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Input
            theme="light"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Min 8 characters"
            icon={LuLockKeyhole}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            error={errors.password}
            disabled={submitting}
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
          <Input
            theme="light"
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat password"
            icon={LuLockKeyhole}
            value={form.confirmPassword}
            onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
            error={errors.confirmPassword}
            disabled={submitting}
          />
        </div>

        {/* Password Strength Indicator */}
        <div className="flex items-center justify-between px-0.5 pt-0.5">
          <div className="flex gap-1 w-24">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index < strength ? strengthColors[strength] : 'bg-slate-100'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-slate-400">
            Strength:{' '}
            <span className={strength >= 3 ? 'text-emerald-600 font-semibold' : 'text-slate-600'}>
              {strengthLabels[strength]}
            </span>
          </span>
        </div>

        {/* Terms Checkbox */}
        <div className="pt-0.5">
          <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-tight text-slate-600">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={(event) => setForm({ ...form, terms: event.target.checked })}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-slate-950 focus:ring-slate-950/20"
            />
            <span>I agree to the Terms of Service & Privacy Policy.</span>
          </label>
          {errors.terms ? <p className="mt-0.5 text-[10.5px] font-semibold text-rose-600">{errors.terms}</p> : null}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={success || submitting}
          className="mt-1 inline-flex h-10.5 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        >
          {submitting ? (
            <LoadingSpinner size="sm" />
          ) : success ? (
            <>
              <LuCheck className="h-4 w-4 text-emerald-400" /> Account created
            </>
          ) : (
            <>
              Create Account <LuArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
