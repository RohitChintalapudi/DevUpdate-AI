export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
}

export function RepositoryCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-card/60 p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-4 w-2/3" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
      <div className="mt-6 flex gap-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="mt-5 h-10 w-full" />
    </div>
  )
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-lg border border-line/50 bg-white/[0.01] p-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="hidden h-3 w-20 sm:block" />
          <Skeleton className="ml-auto hidden h-3 w-16 md:block" />
        </div>
      ))}
    </div>
  )
}
