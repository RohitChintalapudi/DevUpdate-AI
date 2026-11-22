export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/[0.015] px-6 py-14 text-center ${className}`}
    >
      {Icon ? (
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-2xl bg-brand/20 blur-2xl" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brandlight">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-subtle">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
