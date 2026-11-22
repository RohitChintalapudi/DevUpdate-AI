export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = '',
}) {
  return (
    <div className={`mb-7 ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="label-caps mb-2.5">{eyebrow}</p> : null}
          <h1 className="text-2xl font-bold tracking-[-0.035em] text-ink sm:text-[28px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-subtle">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
