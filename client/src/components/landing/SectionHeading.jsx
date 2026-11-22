import Reveal from '../common/Reveal'

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  theme = 'light',
}) {
  const alignment = align === 'left' ? 'text-left' : 'mx-auto text-center'
  const isLight = theme === 'light'

  return (
    <Reveal className={`max-w-2xl ${alignment}`}>
      {eyebrow ? (
        <div className="mb-3">
          <span
            className={`inline-block text-[11px] font-bold tracking-[0.16em] uppercase ${
              isLight
                ? 'text-sky-600 bg-sky-50 border border-sky-200/60 px-3 py-1 rounded-full'
                : 'text-brandlight'
            }`}
          >
            {eyebrow}
          </span>
        </div>
      ) : null}
      <h2
        className={`text-[32px] leading-[1.15] font-bold tracking-[-0.04em] sm:text-[42px] ${
          isLight ? 'text-slate-950' : 'text-ink'
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-4 text-[15px] leading-relaxed ${
            isLight ? 'text-slate-500' : 'text-subtle'
          }`}
        >
          {description}
        </p>
      ) : null}
    </Reveal>
  )
}
