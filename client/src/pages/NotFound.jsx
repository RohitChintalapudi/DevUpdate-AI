import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonStyles } from '../components/common/buttonStyles'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-canvas px-5 text-center">
      <div className="radial-glow pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brandlight">
        <Compass className="h-7 w-7" />
      </div>
      <p className="label-caps relative mt-7">404</p>
      <h1 className="relative mt-2 text-4xl font-bold tracking-[-0.04em] text-ink">
        This page went off the map.
      </h1>
      <p className="relative mt-3 max-w-md text-sm text-subtle">
        The route you're looking for doesn't exist in DevUpdate AI.
      </p>
      <Link to="/" className={buttonStyles({ size: 'lg', className: 'mt-8' })}>
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>
    </div>
  )
}
