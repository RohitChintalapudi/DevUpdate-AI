import { useState } from 'react'
import { LuArrowLeft, LuClock3, LuInfo, LuMail, LuSend } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import Input from '../components/common/Input'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!email.trim()) {
      setError('Email address is required.')
      return
    }
    if (!emailPattern.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setError('')
    setSubmitted(true)
  }

  return (
    <AuthLayout
      title="Reset Password"
      description="Enter your email to receive recovery instructions."
      badge="Account recovery"
      footer={
        <p className="text-[11.5px] text-slate-500">
          Remember your password?{' '}
          <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700">
            Back to sign in
          </Link>
        </p>
      }
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-600 shadow-2xs mx-auto">
        <LuMail className="h-4 w-4" />
      </div>

      {submitted ? (
        <div
          role="status"
          className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3"
        >
          <div className="flex items-start gap-2">
            <LuClock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-xs font-bold text-amber-900">Recovery in preparation</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
                Password recovery email delivery is being prepared for production. You can return to login or create a new workspace.
              </p>
            </div>
          </div>
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
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (error) setError('')
          }}
          error={error}
        />
        <button
          type="submit"
          className="inline-flex h-10.5 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
        >
          <LuSend className="h-3.5 w-3.5" /> Send Reset Link
        </button>
      </form>

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2.5">
        <LuInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <p className="text-[10.5px] leading-relaxed text-slate-500">
          Reset tokens expire 1 hour after generation and can only be used once.
        </p>
      </div>

      <div className="mt-4 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-slate-950"
        >
          <LuArrowLeft className="h-3 w-3" /> Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
