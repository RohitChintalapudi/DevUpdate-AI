export default function Card({
  children,
  className = '',
  glow = false,
  hover = false,
  padded = true,
  as: Tag = 'div',
  ...props
}) {
  return (
    <Tag
      className={[
        'rounded-2xl',
        padded ? 'p-5 sm:p-6' : '',
        glow ? 'glow-border' : 'surface-card',
        hover
          ? 'transition-all duration-300 hover:-translate-y-1 hover:border-brandlight/30 hover:shadow-violet'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Tag>
  )
}
