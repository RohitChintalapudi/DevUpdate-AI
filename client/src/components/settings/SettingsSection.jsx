import Card from '../common/Card'

export default function SettingsSection({ eyebrow, title, description, actions, children, className = '' }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0">
          {eyebrow ? <p className="label-caps mb-1.5">{eyebrow}</p> : null}
          <h2 className="text-base font-semibold tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </Card>
  )
}
