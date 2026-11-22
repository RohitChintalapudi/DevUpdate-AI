/**
 * All data in this file is illustrative sample data for the Phase 1 UI preview.
 * It is never fetched from GitHub, package registries or any AI service.
 */

export const dashboardStats = [
  {
    label: 'Total Repositories',
    value: '04',
    description: 'Connected workspaces in this demo',
    icon: 'GitBranch',
    tone: 'violet',
    trend: '+1 this month',
  },
  {
    label: 'Total Dependencies',
    value: '128',
    description: 'Packages tracked across projects',
    icon: 'Package',
    tone: 'cyan',
    trend: '+12 this month',
  },
  {
    label: 'Updates Available',
    value: '16',
    description: 'Newer versions detected in preview',
    icon: 'ArrowUpCircle',
    tone: 'warning',
  },
  {
    label: 'Security Alerts',
    value: '03',
    description: 'Advisories that need a review',
    icon: 'ShieldAlert',
    tone: 'danger',
  },
]

export const updateActivityData = [
  { day: 'Mon', updates: 4, reviewed: 2 },
  { day: 'Tue', updates: 7, reviewed: 5 },
  { day: 'Wed', updates: 5, reviewed: 4 },
  { day: 'Thu', updates: 9, reviewed: 6 },
  { day: 'Fri', updates: 6, reviewed: 8 },
  { day: 'Sat', updates: 3, reviewed: 2 },
  { day: 'Sun', updates: 4, reviewed: 3 },
]

export const healthDistribution = [
  { name: 'Up to date', value: 96, color: '#34D399' },
  { name: 'Minor update', value: 20, color: '#22D3EE' },
  { name: 'Major update', value: 8, color: '#8B5CF6' },
  { name: 'Security risk', value: 4, color: '#FB7185' },
]

export const recentActivity = [
  {
    id: 1,
    type: 'update',
    title: 'React dependency update detected',
    detail: 'acme-dashboard · react 18.2.0 → 19.0.0',
    time: '12 min ago',
    icon: 'ArrowUpCircle',
    tone: 'violet',
  },
  {
    id: 2,
    type: 'review',
    title: 'Express version information reviewed',
    detail: 'payments-api · express 4.18.2 → 4.21.2',
    time: '2 hours ago',
    icon: 'FileSearch',
    tone: 'cyan',
  },
  {
    id: 3,
    type: 'security',
    title: 'Security advisory detected',
    detail: 'acme-dashboard · axios moderate severity',
    time: '5 hours ago',
    icon: 'ShieldAlert',
    tone: 'danger',
  },
  {
    id: 4,
    type: 'scan',
    title: 'Repository scan pending',
    detail: 'design-system · waiting for Phase 2 connector',
    time: 'Yesterday',
    icon: 'Radar',
    tone: 'warning',
  },
]

export const repositories = [
  {
    id: 1,
    name: 'acme-dashboard',
    description: 'Customer analytics dashboard and reporting workspace',
    language: 'TypeScript',
    languageColor: '#3178C6',
    lastScanned: '12 min ago',
    dependencies: 48,
    updates: 7,
    status: 'Active',
  },
  {
    id: 2,
    name: 'payments-api',
    description: 'Core payment processing service and webhooks',
    language: 'JavaScript',
    languageColor: '#F1E05A',
    lastScanned: '2 hours ago',
    dependencies: 36,
    updates: 4,
    status: 'Active',
  },
  {
    id: 3,
    name: 'design-system',
    description: 'Shared component library and design tokens',
    language: 'TypeScript',
    languageColor: '#3178C6',
    lastScanned: 'Yesterday',
    dependencies: 29,
    updates: 3,
    status: 'Pending',
  },
  {
    id: 4,
    name: 'docs-portal',
    description: 'Developer documentation and guides',
    language: 'JavaScript',
    languageColor: '#F1E05A',
    lastScanned: '3 days ago',
    dependencies: 15,
    updates: 2,
    status: 'Active',
  },
]

export const dependencies = [
  { name: 'react', ecosystem: 'npm', current: '18.2.0', latest: '19.0.0', status: 'Major update', statusTone: 'violet' },
  { name: 'express', ecosystem: 'npm', current: '4.18.2', latest: '4.21.2', status: 'Minor update', statusTone: 'cyan' },
  { name: 'axios', ecosystem: 'npm', current: '1.4.0', latest: '1.7.9', status: 'Security risk', statusTone: 'danger' },
  { name: 'vite', ecosystem: 'npm', current: '5.2.0', latest: '6.0.5', status: 'Major update', statusTone: 'violet' },
  { name: 'mongoose', ecosystem: 'npm', current: '8.4.1', latest: '8.9.2', status: 'Minor update', statusTone: 'cyan' },
  { name: 'lucide-react', ecosystem: 'npm', current: '0.468.0', latest: '0.475.0', status: 'Up to date', statusTone: 'success' },
  { name: 'pytest', ecosystem: 'PyPI', current: '8.2.0', latest: '8.3.4', status: 'Minor update', statusTone: 'cyan' },
  { name: 'fastapi', ecosystem: 'PyPI', current: '0.110.0', latest: '0.115.6', status: 'Major update', statusTone: 'violet' },
  { name: 'spring-core', ecosystem: 'Maven', current: '6.1.5', latest: '6.2.1', status: 'Up to date', statusTone: 'success' },
  { name: 'lodash', ecosystem: 'npm', current: '4.17.20', latest: '4.17.21', status: 'Security risk', statusTone: 'danger' },
]

export const intelligenceCards = [
  {
    title: 'New releases',
    description: 'Summarised changes collected from release notes for every tracked package.',
    icon: 'Rocket',
    tone: 'violet',
    example: '12 releases in the last 7 days',
  },
  {
    title: 'Breaking changes',
    description: 'Potentially incompatible API changes highlighted before an upgrade.',
    icon: 'TriangleAlert',
    tone: 'warning',
    example: '3 changes need manual review',
  },
  {
    title: 'Security updates',
    description: 'Advisories and patched versions surfaced with severity context.',
    icon: 'ShieldCheck',
    tone: 'danger',
    example: '2 advisories in preview data',
  },
  {
    title: 'Version changes',
    description: 'Clear current-to-latest version comparisons across every ecosystem.',
    icon: 'GitCompareArrows',
    tone: 'cyan',
    example: '16 version gaps detected',
  },
]

export const recommendations = [
  {
    category: 'Recommended upgrade',
    tone: 'success',
    icon: 'CheckCircle2',
    package: 'vite',
    version: '5.2.0 → 6.0.5',
    repository: 'acme-dashboard',
    summary: 'Example: migration guide suggests a low-risk configuration update.',
    confidence: 'Illustrative',
  },
  {
    category: 'Review compatibility',
    tone: 'warning',
    icon: 'GitPullRequestArrow',
    package: 'react',
    version: '18.2.0 → 19.0.0',
    repository: 'acme-dashboard',
    summary: 'Example: check peer dependencies and rendering behaviour before upgrading.',
    confidence: 'Illustrative',
  },
  {
    category: 'Security investigation',
    tone: 'danger',
    icon: 'ShieldAlert',
    package: 'axios',
    version: '1.4.0 → 1.7.9',
    repository: 'payments-api',
    summary: 'Example: patched version appears to resolve a moderate severity advisory.',
    confidence: 'Illustrative',
  },
  {
    category: 'Upgrade can wait',
    tone: 'neutral',
    icon: 'Clock3',
    package: 'spring-core',
    version: '6.1.5 → 6.2.1',
    repository: 'docs-portal',
    summary: 'Example: no urgent changes detected; schedule with routine maintenance.',
    confidence: 'Illustrative',
  },
]

export const memoryEntries = [
  {
    id: 1,
    type: 'Previous upgrade decisions',
    icon: 'History',
    tone: 'violet',
    title: 'Deferred react 19 rollout',
    detail: 'Example decision · waiting on a third-party component library update.',
    date: 'Sample entry',
  },
  {
    id: 2,
    type: 'Compatibility issues',
    icon: 'Unplug',
    tone: 'danger',
    title: 'Node 20 build incompatibility',
    detail: 'Example issue · legacy build plugin required a temporary workaround.',
    date: 'Sample entry',
  },
  {
    id: 3,
    type: 'Reviewed releases',
    icon: 'FileSearch',
    tone: 'cyan',
    title: 'express 4.21.2 release notes',
    detail: 'Example review · maintenance release with no breaking changes noted.',
    date: 'Sample entry',
  },
  {
    id: 4,
    type: 'Accepted recommendations',
    icon: 'BadgeCheck',
    tone: 'success',
    title: 'Upgraded lodash to 4.17.21',
    detail: 'Example outcome · patch applied without follow-up issues.',
    date: 'Sample entry',
  },
]

export const reportHistory = [
  { id: 1, name: 'Dependency health — November 2026', range: 'Nov 1 – Nov 22, 2026', status: 'Preview', icon: 'FileBarChart2' },
  { id: 2, name: 'Update activity — October 2026', range: 'Oct 1 – Oct 31, 2026', status: 'Preview', icon: 'History' },
  { id: 3, name: 'Security overview — Q3 2026', range: 'Jul 1 – Sep 30, 2026', status: 'Preview', icon: 'ShieldCheck' },
]
