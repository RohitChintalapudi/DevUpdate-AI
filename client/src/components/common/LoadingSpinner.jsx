export default function LoadingSpinner({ size = 'md', label = '', className = '' }) {
  const dimensions = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-[3px]',
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} role="status">
      <span
        className={`${dimensions[size] ?? dimensions.md} animate-spin rounded-full border-white/20 border-t-brandlight`}
      />
      {label ? <span className="text-sm text-subtle">{label}</span> : null}
      <span className="sr-only">Loading</span>
    </span>
  )
}
