import { LuCheck } from 'react-icons/lu'
import SectionHeading from './SectionHeading'

const securityPoints = [
  'Secure GitHub authorization.',
  'Repository-level access control.',
  'Server-side API key management.',
  'User-specific data isolation.',
  'Protected backend endpoints.',
  'Safe handling of external documentation.',
  'Evidence-backed AI recommendations.',
  'Transparent uncertainty when information is unavailable.',
]

export default function SecurityAndTrust() {
  return (
    <section id="security" className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="BUILT WITH RESPONSIBILITY"
          title="Intelligent Analysis. Developer Control."
          description="Your repositories and development decisions deserve careful handling."
          theme="light"
        />

        <div className="mt-14 max-w-4xl mx-auto rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50/60 to-white p-8 sm:p-12 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            {securityPoints.map((point) => (
              <div key={point} className="flex items-start gap-3 rounded-xl p-3 bg-white/80 border border-slate-100">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs mt-0.5">
                  <LuCheck className="h-3 w-3" />
                </span>
                <span className="text-sm font-semibold text-slate-800">{point}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-slate-200/70 pt-6 text-center space-y-1">
            <p className="text-sm text-slate-600 font-medium">
              AI recommendations are decision-support tools, not guarantees of compatibility.
            </p>
            <p className="text-sm font-bold text-slate-950">
              Developers remain in control of every upgrade decision.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
