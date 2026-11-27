import {
  LuBell,
  LuCheck,
  LuCircleAlert,
  LuRefreshCw,
  LuShieldAlert,
  LuSparkles,
  LuTriangleAlert,
} from 'react-icons/lu'
import { categoryForType } from '../../utils/notificationHelpers'

export const NOTIFICATION_META = {
  MAJOR_UPDATE: {
    label: 'Major update',
    short: 'Major',
    icon: LuSparkles,
    tone: 'violet',
    tile: 'bg-violet-50 text-violet-600 ring-violet-100',
    bar: 'bg-violet-400',
  },
  SECURITY_VULNERABILITY: {
    label: 'Security advisory',
    short: 'Security',
    icon: LuShieldAlert,
    tone: 'danger',
    tile: 'bg-rose-50 text-rose-600 ring-rose-100',
    bar: 'bg-rose-400',
  },
  DEPRECATED_PACKAGE: {
    label: 'Deprecated package',
    short: 'Deprecated',
    icon: LuTriangleAlert,
    tone: 'warning',
    tile: 'bg-amber-50 text-amber-700 ring-amber-100',
    bar: 'bg-amber-400',
  },
  AI_ANALYSIS_COMPLETED: {
    label: 'Analysis ready',
    short: 'AI',
    icon: LuCheck,
    tone: 'success',
    tile: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    bar: 'bg-emerald-400',
  },
  AI_ANALYSIS_FAILED: {
    label: 'Analysis failed',
    short: 'AI',
    icon: LuCircleAlert,
    tone: 'danger',
    tile: 'bg-rose-50 text-rose-600 ring-rose-100',
    bar: 'bg-rose-400',
  },
  SCAN_FAILED: {
    label: 'Scan failed',
    short: 'Scan',
    icon: LuRefreshCw,
    tone: 'danger',
    tile: 'bg-rose-50 text-rose-600 ring-rose-100',
    bar: 'bg-rose-400',
  },
  VULNERABILITY_FIXED: {
    label: 'Vulnerability fixed',
    short: 'Fixed',
    icon: LuShieldAlert,
    tone: 'success',
    tile: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    bar: 'bg-emerald-400',
  },
  RECOMMENDATION_CHANGED: {
    label: 'Recommendation changed',
    short: 'AI',
    icon: LuSparkles,
    tone: 'cyan',
    tile: 'bg-sky-50 text-sky-600 ring-sky-100',
    bar: 'bg-sky-400',
  },
}

const FALLBACK_META = {
  label: 'Event',
  short: 'Event',
  icon: LuBell,
  tone: 'neutral',
  tile: 'bg-slate-100 text-slate-500 ring-slate-200',
  bar: 'bg-slate-300',
}

function humanize(type) {
  return String(type || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function getNotificationMeta(type) {
  if (NOTIFICATION_META[type]) return NOTIFICATION_META[type]
  return { ...FALLBACK_META, label: humanize(type) || 'Event', short: humanize(type) || 'Event' }
}

export function getNotificationCategory(type) {
  return categoryForType(type)
}
