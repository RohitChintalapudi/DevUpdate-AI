export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = '',
}) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-bold tracking-wider text-sky-700 bg-sky-50 border border-sky-200/80 uppercase mb-2">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="text-2xl font-bold tracking-[-0.035em] text-slate-950 sm:text-[28px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
