import { useId } from 'react'

export default function Input({
  label,
  error,
  hint,
  icon: Icon,
  rightElement,
  className = '',
  id,
  theme = 'light',
  ...props
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const isLight = theme === 'light'

  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={inputId}
          className={`mb-1 block text-xs font-semibold tracking-tight ${
            isLight ? 'text-slate-700' : 'text-subtle'
          }`}
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        {Icon ? (
          <Icon
            className={`pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 ${
              isLight ? 'text-slate-400' : 'text-muted'
            }`}
            aria-hidden="true"
          />
        ) : null}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={[
            'w-full rounded-xl border text-[13.5px] outline-none transition-all duration-200',
            isLight
              ? [
                  'h-10 bg-white text-slate-900 placeholder:text-slate-400',
                  'hover:border-slate-300 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5',
                  error
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                    : 'border-slate-200',
                ].join(' ')
              : [
                  'h-11 bg-canvas/60 text-ink placeholder:text-muted/80',
                  'hover:border-white/20 focus:border-brandlight/60 focus:bg-canvas focus:ring-4 focus:ring-brand/10',
                  error
                    ? 'border-danger/60 focus:border-danger focus:ring-danger/10'
                    : 'border-line',
                ].join(' '),
            Icon ? 'pl-9' : 'pl-3',
            rightElement ? 'pr-9' : 'pr-3',
          ].join(' ')}
          {...props}
        />
        {rightElement ? (
          <div className="absolute top-1/2 right-2 -translate-y-1/2">{rightElement}</div>
        ) : null}
      </div>
      {error ? (
        <p
          id={`${inputId}-error`}
          className={`mt-1 text-[11px] font-medium ${isLight ? 'text-rose-600' : 'text-danger'}`}
          role="alert"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${inputId}-hint`}
          className={`mt-1 text-[11px] ${isLight ? 'text-slate-500' : 'text-muted'}`}
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}
