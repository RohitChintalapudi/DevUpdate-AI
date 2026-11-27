import Card from '../common/Card'
import { SETTINGS_TABS } from '../../constants/settingsTabs'

export default function SettingsNav({ active, onSelect }) {
  return (
    <>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Settings sections">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
              active === tab.id
                ? 'border-slate-950 bg-slate-950 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      <Card padded={false} className="hidden overflow-hidden lg:block lg:sticky lg:top-24">
        <div className="border-b border-slate-100 px-4 py-4">
          <p className="label-caps">Workspace settings</p>
          <p className="mt-1 text-[11px] text-slate-500">Everything in one place</p>
        </div>
        <nav className="space-y-0.5 p-2" aria-label="Settings sections">
          {SETTINGS_TABS.map((tab) => {
            const selected = active === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelect(tab.id)}
                aria-current={selected ? 'page' : undefined}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  selected ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <tab.icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{tab.label}</span>
                  <span className={`mt-0.5 block text-[10.5px] leading-snug ${selected ? 'text-slate-300' : 'text-slate-400'}`}>
                    {tab.hint}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>
      </Card>
    </>
  )
}
