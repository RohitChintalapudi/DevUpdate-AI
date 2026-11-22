import { motion } from 'framer-motion'
import {
  LuBrainCircuit,
  LuFileCode,
  LuGitPullRequest,
  LuHistory,
  LuLayers,
  LuShieldAlert,
} from 'react-icons/lu'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const questions = [
  {
    q: 'What changed?',
    desc: 'Release notes, commits, and changelogs distilled into structured bullet points.',
    icon: LuLayers,
    color: 'text-sky-600 bg-sky-50 border-sky-100',
  },
  {
    q: 'Why does it matter?',
    desc: 'Distinguish routine bug fixes from critical CVE patches and architectural shifts.',
    icon: LuShieldAlert,
    color: 'text-rose-600 bg-rose-50 border-rose-100',
  },
  {
    q: 'Could it affect your project?',
    desc: 'Detect breaking API removals against the specific functions imported in your code.',
    icon: LuBrainCircuit,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  },
  {
    q: 'Which areas of your codebase deserve attention?',
    desc: 'Pinpoint exact files, components, and service modules that require testing.',
    icon: LuFileCode,
    color: 'text-amber-600 bg-amber-50 border-amber-100',
  },
  {
    q: 'What should you do before upgrading?',
    desc: 'Receive structured, step-by-step migration checklists and codemod recommendations.',
    icon: LuGitPullRequest,
    color: 'text-purple-600 bg-purple-50 border-purple-100',
  },
  {
    q: 'What did you learn from previous decisions?',
    desc: 'Recall past compatibility hurdles and team notes with persistent Memento memory.',
    icon: LuHistory,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
]

export default function SolutionSection() {
  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="INTRODUCING DEVUPDATE AI"
          title="From Dependency Detection to Intelligent Upgrade Decisions."
          description="DevUpdate AI brings dependency discovery, release research, security intelligence, project-aware analysis, and persistent memory into one unified platform. Instead of simply telling you that an update exists, DevUpdate AI helps you understand:"
          theme="light"
        />

        {/* 6 Questions Grid */}
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {questions.map((item, index) => (
            <Reveal key={item.q} delay={index * 0.07}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col justify-between h-full rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-300"
              >
                <div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${item.color} mb-5`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>

                  <h3 className="text-[17px] font-bold text-slate-950 flex items-center gap-1.5">
                    {item.q}
                  </h3>

                  <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>

        {/* Supporting statement bar */}
        <Reveal delay={0.2}>
          <div className="mt-14 mx-auto max-w-3xl rounded-2xl border border-slate-200/90 bg-[#F8FAFC] p-5 text-center">
            <p className="text-[15px] font-bold text-slate-900 flex items-center justify-center gap-2 flex-wrap">
              <span className="text-sky-600 font-extrabold">Less manual research.</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-950 font-extrabold">Better technical understanding.</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-600 font-extrabold">More confident upgrade decisions.</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
