import { useId } from 'react'

export default function Input({
  label,
  error,
  hint,
  icon: Icon,
  rightElement,
  className = '',
  id,
  ...props
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={inputId} className="mb-2 block text-[13px] font-medium text-subtle">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
        ) : null}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={[
            'h-12 w-full rounded-xl border bg-canvas/60 pr-3 text-sm text-ink outline-none transition-all duration-200',
            'placeholder:text-muted/80 hover:border-white/20 focus:border-brandlight/60 focus:bg-canvas focus:ring-4 focus:ring-brand/10',
            Icon ? 'pl-11' : 'pl-4',
            rightElement ? 'pr-12' : '',
            error ? 'border-danger/60 focus:border-danger focus:ring-danger/10' : 'border-line',
          ].join(' ')}
          {...props}
        />
        {rightElement ? (
          <div className="absolute top-1/2 right-2 -translate-y-1/2">{rightElement}</div>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
