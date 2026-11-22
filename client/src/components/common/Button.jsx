import LoadingSpinner from './LoadingSpinner'
import { buttonStyles } from './buttonStyles'

export default function Button({
  children,
  variant,
  size,
  className,
  fullWidth,
  loading = false,
  disabled,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonStyles({ variant, size, className, fullWidth, disabled: disabled || loading })}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : LeftIcon ? (
        <LeftIcon className="h-4 w-4" aria-hidden="true" />
      ) : null}
      {children}
      {!loading && RightIcon ? <RightIcon className="h-4 w-4" aria-hidden="true" /> : null}
    </button>
  )
}
