import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LuChevronDown } from 'react-icons/lu'
import Reveal from '../common/Reveal'
import SectionHeading from './SectionHeading'

const faqs = [
  {
    q: 'What is DevUpdate AI?',
    a: 'DevUpdate AI is an AI-powered dependency intelligence platform that analyzes GitHub repositories, identifies outdated dependencies, researches package changes, and generates project-aware upgrade recommendations.',
  },
  {
    q: 'How does DevUpdate AI connect to my repositories?',
    a: 'It uses GitHub integration to access authorized repositories and retrieve relevant repository metadata, dependency manifests, lockfiles, and source files required for analysis.',
  },
  {
    q: 'Which package ecosystems are supported?',
    a: 'The platform is designed for JavaScript, Python, Java, Rust, PHP, Ruby, Go, and .NET ecosystems.',
  },
  {
    q: 'Does DevUpdate AI automatically update my dependencies?',
    a: 'No. Its primary purpose is to provide dependency intelligence and upgrade guidance. Developers remain in control of applying changes.',
  },
  {
    q: 'How does AI understand breaking changes?',
    a: 'DevUpdate AI combines official release documentation, migration guides, dependency metadata, and relevant repository context using retrieval and AI analysis.',
  },
  {
    q: 'What is Firecrawl used for?',
    a: 'Firecrawl helps discover and extract relevant documentation, release notes, changelogs, and migration guides for dependency research.',
  },
  {
    q: 'What is Memento used for?',
    a: 'Memento provides a memory layer for retaining useful project knowledge, historical decisions, and previous dependency analysis context.',
  },
  {
    q: 'Does DevUpdate AI detect security vulnerabilities?',
    a: 'It integrates vulnerability intelligence sources such as OSV and, where supported, the GitHub Advisory Database to identify relevant known vulnerabilities.',
  },
  {
    q: 'Are AI recommendations guaranteed to be correct?',
    a: 'No. Recommendations depend on available documentation, repository context, and model analysis. DevUpdate AI should provide supporting evidence and communicate uncertainty where information is insufficient.',
  },
  {
    q: 'Can I analyze multiple repositories?',
    a: 'The platform is designed to support multiple repositories under an authenticated account, subject to GitHub permissions and configured usage limits.',
  },
  {
    q: 'Does DevUpdate AI replace developers?',
    a: 'No. It helps developers understand dependency changes and make informed decisions. Developers retain control over upgrades and code modifications.',
  },
]

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="FREQUENTLY ASKED QUESTIONS"
          title="Questions & Answers About DevUpdate AI."
          description="Everything you need to know about our GitHub integration, AI analysis engine, and platform security."
          theme="light"
        />

        <div className="mt-16 max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index

            return (
              <Reveal key={faq.q} delay={index * 0.03}>
                <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden transition-colors hover:border-slate-300">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-5 text-left transition"
                  >
                    <span className="text-[15px] font-bold text-slate-900 pr-4">
                      {faq.q}
                    </span>
                    <LuChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-slate-900' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="border-t border-slate-100 p-5 pt-3 text-[14px] leading-relaxed text-slate-600 bg-canvas">
                          {faq.a}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
