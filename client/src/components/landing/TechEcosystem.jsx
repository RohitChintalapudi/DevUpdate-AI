import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const technologies = [
  { name: 'React', color: '#61DAFB', letter: 'R' },
  { name: 'Node.js', color: '#68A063', letter: 'N' },
  { name: 'Python', color: '#F7C948', letter: 'Py' },
  { name: 'Express', color: '#C7CCD1', letter: 'E' },
  { name: 'MongoDB', color: '#47A248', letter: 'M' },
  { name: 'Docker', color: '#2496ED', letter: 'D' },
  { name: 'Java', color: '#E76F00', letter: 'J' },
  { name: 'TypeScript', color: '#3178C6', letter: 'TS' },
  { name: 'PostgreSQL', color: '#4169E1', letter: 'P' },
  { name: 'Go', color: '#00ADD8', letter: 'Go' },
  { name: 'Rust', color: '#DEA584', letter: 'Rs' },
  { name: 'Kubernetes', color: '#326CE5', letter: 'K' },
]

export default function TechEcosystem() {
  return (
    <section id="about" className="relative overflow-hidden py-24 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-surface/30" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Built for modern stacks"
          title="Designed for Your Ecosystem."
          description="DevUpdate AI is being designed around the tools developers use every day. The chips below are planned ecosystem examples — not completed integrations."
        />

        <Reveal className="mt-12">
          <div className="flex flex-wrap justify-center gap-3">
            {technologies.map((tech) => (
              <div
                key={tech.name}
                className="group flex items-center gap-2.5 rounded-xl border border-line bg-card/60 px-4 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brandlight/30 hover:bg-elevated"
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold"
                  style={{ backgroundColor: `${tech.color}20`, color: tech.color }}
                >
                  {tech.letter}
                </span>
                <span className="text-[13px] font-medium text-subtle transition group-hover:text-ink">
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
