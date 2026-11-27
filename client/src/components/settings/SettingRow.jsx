export default function SettingRow({ icon: Icon, title, description, meta, children }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 gap-3">
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900">{title}</p>
          {description ? <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{description}</p> : null}
          {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
      </div>
      {children ? <div className="shrink-0 sm:pl-4">{children}</div> : null}
    </div>
  )
}
