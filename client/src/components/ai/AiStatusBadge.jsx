import Badge from '../common/Badge'

const map = {
  COMPLETED: { tone: 'success', label: 'Completed' },
  RUNNING: { tone: 'cyan', label: 'Running' },
  QUEUED: { tone: 'warning', label: 'Queued' },
  FAILED: { tone: 'danger', label: 'Failed' },
  CANCELLED: { tone: 'neutral', label: 'Cancelled' },
  INSUFFICIENT_EVIDENCE: { tone: 'warning', label: 'Insufficient evidence' },
  UPGRADE_RECOMMENDED: { tone: 'success', label: 'Upgrade recommended' },
  UPGRADE_WITH_CAUTION: { tone: 'cyan', label: 'Upgrade with caution' },
  REVIEW_BEFORE_UPGRADE: { tone: 'warning', label: 'Review before upgrade' },
  DEFER_UPGRADE: { tone: 'danger', label: 'Defer upgrade' },
  LOW: { tone: 'success', label: 'Low risk' },
  MEDIUM: { tone: 'warning', label: 'Medium risk' },
  HIGH: { tone: 'danger', label: 'High risk' },
  CRITICAL: { tone: 'danger', label: 'Critical risk' },
  UNKNOWN: { tone: 'neutral', label: 'Unknown' },
  VERIFIED: { tone: 'success', label: 'Verified' },
  PARTIALLY_VERIFIED: { tone: 'warning', label: 'Partially verified' },
  UNVERIFIED: { tone: 'neutral', label: 'Unverified' },
}

function humanize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function AiStatusBadge({ value, label, dot = true }) {
  const config = map[value] || { tone: 'neutral', label: humanize(value) }
  return <Badge tone={config.tone} dot={dot}>{label || config.label}</Badge>
}
