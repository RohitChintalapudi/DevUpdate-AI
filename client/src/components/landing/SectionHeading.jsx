import Reveal from '../common/Reveal'

export default function SectionHeading({ eyebrow, title, description, align = 'center' }) {
  const alignment = align === 'left' ? 'text-left' : 'mx-auto text-center'

  return (
    <Reveal className={`max-w-2xl ${alignment}`}>
      {eyebrow ? <p className="label-caps mb-3 text-brandlight">{eyebrow}</p> : null}
      <h2 className="text-[32px] leading-[1.15] font-bold tracking-[-0.04em] text-ink sm:text-[42px]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-[15px] leading-relaxed text-subtle">{description}</p>
      ) : null}
    </Reveal>
  )
}
