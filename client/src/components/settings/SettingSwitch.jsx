import Badge from '../common/Badge'

export default function SettingSwitch({ checked, onChange, label, description, badge, disabled = false }) {
  return (
    <label
      className={`flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 transition ${
        disabled ? 'opacity-60' : 'cursor-pointer hover:border-slate-300'
      }`}
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-900">{label}</span>
          {badge ? <Badge tone="neutral">{badge}</Badge> : null}
        </span>
        {description ? <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-sky-600 peer-disabled:opacity-50 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  )
}
