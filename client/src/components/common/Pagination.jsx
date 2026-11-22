import Button from './Button'

export default function Pagination({ pagination, page, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null

  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        Previous
      </Button>
      <span className="text-xs text-muted">
        Page {pagination.page} of {pagination.pages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= pagination.pages}
        onClick={() => onPageChange(Math.min(pagination.pages, page + 1))}
      >
        Next
      </Button>
    </div>
  )
}
