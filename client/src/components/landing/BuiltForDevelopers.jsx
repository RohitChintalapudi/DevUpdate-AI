import { motion } from 'framer-motion'
import {
  LuCode,
  LuFolderGit2,
  LuGraduationCap,
  LuLayers,
  LuUsers,
} from 'react-icons/lu'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const personas = [
  {
    title: 'Individual Developers',
    desc: 'Spend less time researching dependency updates and more time building.',
    icon: LuCode,
    color: 'bg-sky-50 text-sky-600 border-sky-100',
  },
  {
    title: 'Full-Stack Developers',
    desc: 'Understand how dependency changes may affect frontend, backend, and application architecture.',
    icon: LuLayers,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  },
  {
    title: 'Development Teams',
    desc: 'Maintain better visibility into repository dependencies, upgrade risks, and technical decisions.',
    icon: LuUsers,
    color: 'bg-purple-50 text-purple-600 border-purple-100',
  },
  {
    title: 'Open-Source Maintainers',
    desc: 'Monitor package updates and understand potential changes across repositories.',
    icon: LuFolderGit2,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  },
  {
    title: 'Students and Researchers',
    desc: 'Explore dependency ecosystems, software maintenance, and AI-powered developer tooling.',
    icon: LuGraduationCap,
    color: 'bg-amber-50 text-amber-600 border-amber-100',
  },
]

export default function BuiltForDevelopers() {
  return (
    <section id="about" className="relative overflow-hidden bg-canvas py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="WHO IS IT FOR?"
          title="Designed for Developers Who Care About Software Quality."
          description="Whether you maintain solo side projects or coordinate enterprise multi-service repositories, DevUpdate AI scales to your workflow."
          theme="light"
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {personas.map((persona, index) => (
            <Reveal key={persona.title} delay={index * 0.08}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col justify-between h-full rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all"
              >
                <div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${persona.color} mb-5`}
                  >
                    <persona.icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-lg font-bold text-slate-950">{persona.title}</h3>

                  <p className="mt-2.5 text-[14px] leading-relaxed text-slate-500">
                    {persona.desc}
                  </p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
