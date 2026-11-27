import { Link } from 'react-router-dom'
import {
  LuBell,
  LuCheck,
  LuFolderGit2,
  LuLayoutDashboard,
  LuPackage,
  LuSearch,
  LuShieldCheck,
  LuSparkles,
} from 'react-icons/lu'
import Reveal from '../common/Reveal'
import Logo from '../common/Logo'

export default function FullDashboardShowcase() {
  return (
    <section className="relative overflow-hidden bg-canvas pt-24 pb-20 sm:pt-32 sm:pb-28">
      {/* Background soft ambient glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[550px] w-[950px] rounded-full bg-sky-200/25 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {/* Centered Top Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[34px] font-bold tracking-[-0.04em] text-slate-950 sm:text-[46px] leading-[1.12]">
            Smart dependency intelligence
            <br />
            for growing teams
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
            Organize projects, assign updates, and monitor vulnerability progress with a smart platform
            built to improve productivity and developer velocity.
          </p>

          {/* Buttons: Black Pill + White Pill */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-full bg-slate-950 px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Get started free
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
            >
              Talk to sales team
            </a>
          </div>
        </div>

        {/* Expansive Full Dashboard UI Mockup matching image */}
        <Reveal delay={0.15}>
          <div className="relative mx-auto mt-16 max-w-6xl rounded-3xl border border-slate-200/90 bg-white shadow-[0_25px_80px_-20px_rgba(0,0,0,0.1)] overflow-hidden">
            {/* Top Browser Bar */}
            <div className="flex h-12 items-center justify-between border-b border-slate-100 bg-slate-50 px-5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-1 text-xs text-slate-500 font-mono shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>app.devupdate.ai/dashboard/dependencies</span>
              </div>
              <div className="h-3 w-12" />
            </div>

            {/* Dashboard Workspace Layout: Sidebar + Main Content */}
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[580px]">
              {/* Left Sidebar */}
              <div className="hidden md:flex flex-col border-r border-slate-100 bg-white p-5 justify-between">
                <div>
                  <div className="mb-8">
                    <Logo theme="light" />
                  </div>

                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Menu
                  </p>
                  <nav className="space-y-1">
                    <div className="flex items-center gap-2.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900">
                      <LuLayoutDashboard className="h-4 w-4 text-slate-900" />
                      <span>Dashboard</span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition">
                      <LuFolderGit2 className="h-4 w-4" />
                      <span>Repositories</span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition">
                      <LuPackage className="h-4 w-4" />
                      <span>Dependencies</span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition">
                      <LuShieldCheck className="h-4 w-4" />
                      <span>Security & CVEs</span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition">
                      <LuSparkles className="h-4 w-4" />
                      <span>AI Insights</span>
                    </div>
                  </nav>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Free Plan</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                    4/5 repositories connected.
                  </p>
                  <Link
                    to="/signup"
                    className="mt-3 block w-full rounded-lg bg-slate-950 py-1.5 text-center text-[11px] font-semibold text-white hover:bg-slate-800 transition"
                  >
                    Upgrade
                  </Link>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex flex-col bg-slate-50">
                {/* Top Inner Navbar */}
                <div className="flex h-16 items-center justify-between border-b border-slate-100 bg-white px-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Dashboard</h3>
                    <p className="text-xs text-slate-400">Checklist • To Dos & Upgrade Intelligence</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative hidden sm:block">
                      <LuSearch className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        readOnly
                        value="Search dependencies..."
                        className="h-9 w-52 rounded-full border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-600 outline-none"
                      />
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-2xs">
                      <LuBell className="h-4 w-4" />
                    </span>
                    <div className="h-9 w-9 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-100">
                      WC
                    </div>
                  </div>
                </div>

                {/* Kanban / Task Columns matching the image bottom right */}
                <div className="p-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Column 1: To Do */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-900">To Review</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">
                          3
                        </span>
                      </div>

                      <div className="mt-3.5 space-y-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                            React 19.0.0
                          </span>
                          <p className="mt-1.5 text-xs font-semibold text-slate-800">
                            Major version bump available
                          </p>
                          <div className="mt-3 flex items-center justify-between text-[10.5px] text-slate-400">
                            <span>acme-dashboard</span>
                            <span className="text-emerald-600 font-semibold">Low Risk</span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Lodash 4.17.21
                          </span>
                          <p className="mt-1.5 text-xs font-semibold text-slate-800">
                            Security prototype pollution patch
                          </p>
                          <div className="mt-3 flex items-center justify-between text-[10.5px] text-slate-400">
                            <span>payments-api</span>
                            <span className="text-amber-600 font-semibold">CVE Patch</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: In Progress */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-900">In Progress</span>
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10.5px] font-semibold text-sky-600">
                          2
                        </span>
                      </div>

                      <div className="mt-3.5 space-y-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            Fastify v5.1.2
                          </span>
                          <p className="mt-1.5 text-xs font-semibold text-slate-800">
                            Running CI integration test suite
                          </p>
                          <div className="mt-3 flex items-center justify-between text-[10.5px] text-slate-400">
                            <span>backend-service</span>
                            <span className="text-sky-600 font-semibold">38/38 passing</span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            Prisma 6.0
                          </span>
                          <p className="mt-1.5 text-xs font-semibold text-slate-800">
                            Schema migration audit
                          </p>
                          <div className="mt-3 flex items-center justify-between text-[10.5px] text-slate-400">
                            <span>database-layer</span>
                            <span className="text-purple-600 font-semibold">Codemod ready</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Completed */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-900">Completed & Merged</span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-600">
                          12
                        </span>
                      </div>

                      <div className="mt-3.5 space-y-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Express 5.0
                          </span>
                          <p className="mt-1.5 text-xs font-semibold text-slate-800">
                            Merged into main via PR #138
                          </p>
                          <div className="mt-3 flex items-center justify-between text-[10.5px] text-slate-400">
                            <span>api-gateway</span>
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <LuCheck className="h-3 w-3" /> Deployed
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Axios 1.7.9
                          </span>
                          <p className="mt-1.5 text-xs font-semibold text-slate-800">
                            Automated bump and lockfile sync
                          </p>
                          <div className="mt-3 flex items-center justify-between text-[10.5px] text-slate-400">
                            <span>acme-dashboard</span>
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <LuCheck className="h-3 w-3" /> Deployed
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
