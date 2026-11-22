import { useState } from 'react'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const categories = ['All Stacks', 'Frontend', 'Backend & Cloud', 'Package Registries']

const technologies = [
  { name: 'React', category: 'Frontend', color: '#61DAFB', letter: 'Re' },
  { name: 'Next.js', category: 'Frontend', color: '#000000', letter: 'Nx' },
  { name: 'TypeScript', category: 'Frontend', color: '#3178C6', letter: 'TS' },
  { name: 'Node.js', category: 'Backend & Cloud', color: '#68A063', letter: 'Nd' },
  { name: 'Python', category: 'Backend & Cloud', color: '#F7C948', letter: 'Py' },
  { name: 'FastAPI', category: 'Backend & Cloud', color: '#059669', letter: 'FA' },
  { name: 'Go', category: 'Backend & Cloud', color: '#00ADD8', letter: 'Go' },
  { name: 'Rust', category: 'Backend & Cloud', color: '#DEA584', letter: 'Rs' },
  { name: 'Docker', category: 'Backend & Cloud', color: '#2496ED', letter: 'Dk' },
  { name: 'Kubernetes', category: 'Backend & Cloud', color: '#326CE5', letter: 'K8' },
  { name: 'npm', category: 'Package Registries', color: '#CB3837', letter: 'npm' },
  { name: 'PyPI', category: 'Package Registries', color: '#3775A9', letter: 'Py' },
  { name: 'Cargo', category: 'Package Registries', color: '#F46800', letter: 'Cr' },
  { name: 'AWS', category: 'Backend & Cloud', color: '#FF9900', letter: 'AWS' },
  { name: 'PostgreSQL', category: 'Backend & Cloud', color: '#4169E1', letter: 'PG' },
  { name: 'MongoDB', category: 'Backend & Cloud', color: '#47A248', letter: 'Mg' },
]

export default function TechEcosystem() {
  const [activeCategory, setActiveCategory] = useState('All Stacks')

  const filtered =
    activeCategory === 'All Stacks'
      ? technologies
      : technologies.filter((t) => t.category === activeCategory)

  return (
    <section id="ecosystem" className="relative overflow-hidden bg-slate-50/50 py-24 sm:py-28">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Universal Ecosystem"
          title="Engineered for Every Stack You Build With."
          description="DevUpdate AI integrates natively with the languages, frameworks, package registries, and container engines your team relies on daily."
          theme="light"
        />

        {/* Category Filter Pills */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-slate-950 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tech Chips Grid */}
        <Reveal className="mt-10">
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {filtered.map((tech) => (
              <div
                key={tech.name}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md cursor-default"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-xl text-[11px] font-bold font-mono"
                  style={{ backgroundColor: `${tech.color}15`, color: tech.color }}
                >
                  {tech.letter}
                </span>
                <span className="text-[13.5px] font-semibold text-slate-800 transition group-hover:text-black">
                  {tech.name}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
