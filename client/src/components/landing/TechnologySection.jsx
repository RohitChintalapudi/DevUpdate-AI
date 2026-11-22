import { motion } from 'framer-motion'
import {
  LuBrainCircuit,
  LuDatabase,
  LuGitBranch,
  LuGlobe,
  LuSearch,
  LuShieldAlert,
} from 'react-icons/lu'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const stack = [
  {
    category: 'Frontend',
    icon: LuGlobe,
    iconColor: 'text-sky-600 bg-sky-50 border-sky-100',
    techs: ['React', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Recharts'],
  },
  {
    category: 'Backend',
    icon: LuDatabase,
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    techs: ['Node.js', 'Express.js', 'MongoDB', 'Mongoose'],
  },
  {
    category: 'Repository Intelligence',
    icon: LuGitBranch,
    iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    techs: ['GitHub API', 'Octokit', 'Package registry APIs'],
  },
  {
    category: 'Artificial Intelligence',
    icon: LuBrainCircuit,
    iconColor: 'text-purple-600 bg-purple-50 border-purple-100',
    techs: ['Google Gemini', 'LangChain', 'LangGraph', 'Retrieval-Augmented Generation (RAG)'],
  },
  {
    category: 'Research & Memory',
    icon: LuSearch,
    iconColor: 'text-amber-600 bg-amber-50 border-amber-100',
    techs: ['Firecrawl', 'Memento', 'Vector Search', 'Embeddings'],
  },
  {
    category: 'Security Intelligence',
    icon: LuShieldAlert,
    iconColor: 'text-rose-600 bg-rose-50 border-rose-100',
    techs: ['OSV API', 'GitHub Advisory Database'],
  },
]

export default function TechnologySection() {
  return (
    <section id="technology" className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="BUILT WITH MODERN TECHNOLOGY"
          title="A Powerful Technology Stack Behind Intelligent Development."
          description="DevUpdate AI combines modern web technologies, developer APIs, and AI frameworks into a unified production architecture."
          theme="light"
        />

        {/* 6 Technology Categories in 2x3 or 3x2 Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {stack.map((item, index) => (
            <Reveal key={item.category} delay={index * 0.08}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col justify-between h-full rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all"
              >
                <div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${item.iconColor} mb-5`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>

                  <h3 className="text-lg font-bold text-slate-950">{item.category}</h3>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.techs.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full border border-slate-200/90 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>

        {/* Supporting statement */}
        <Reveal delay={0.2}>
          <div className="mt-12 text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Architecture Principle
            </p>
            <p className="mt-1.5 text-sm text-slate-600 font-medium">
              Designed around modular services, reliable data extraction, evidence-based AI analysis,
              and extensible architecture.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
