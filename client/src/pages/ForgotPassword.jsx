import { useState } from 'react'
import { ArrowLeft, Clock3, Info, Mail, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import Button from '../components/common/Button'
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
      title="Reset Your Password."
      description="A calm, secure way back into your workspace."
      badge="Account recovery"
      footer={
        <p className="text-[13px] text-muted">
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-brandlight hover:text-ink">
            Back to login
          </Link>
        </p>
      }
    >
      <div className="rounded-2xl border border-line bg-card/70 p-6 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brandlight">
          <Mail className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-bold tracking-[-0.03em] text-ink">Forgot your password?</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-subtle">
          Enter the email address associated with your account. Password recovery is being prepared
          for a future phase.
        </p>

        {submitted ? (
          <div
            role="status"
            className="mt-6 rounded-xl border border-warning/25 bg-warning/[0.06] p-4"
          >
            <div className="flex items-start gap-2.5">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="text-[13px] font-semibold text-warning">Recovery is coming soon</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-subtle">
                  No email has been sent. For now, you can return to the login page or create a new
                  workspace.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            icon={Mail}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (error) setError('')
            }}
            error={error}
          />
          <Button type="submit" fullWidth size="lg" className="btn-shine">
            <Send className="h-4 w-4" /> Send Reset Link
          </Button>
        </form>

        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-line bg-white/[0.02] px-3.5 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <p className="text-[11px] leading-relaxed text-muted">
            This page intentionally does not pretend to send an email. The reset workflow will be
            added with the email delivery service in a later phase.
          </p>
        </div>

        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-2 text-[13px] font-medium text-subtle transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </div>
    </AuthLayout>
  )
}
