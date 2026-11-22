import PDFDocument from 'pdfkit'
import AIAnalysis from '../../models/AIAnalysis.js'
import DependencyUpdate from '../../models/DependencyUpdate.js'
import HistoricalComparison from '../../models/HistoricalComparison.js'
import Report from '../../models/Report.js'
import Repository from '../../models/Repository.js'
import { REPORT_FORMATS, REPORT_TYPES, PHASE5_LIMITS } from '../../constants/phase5Constants.js'
import { AppError } from '../../utils/errors.js'
import { sanitizeText } from '../../utils/sanitize.js'

const MAX_PDF_ROWS = 500
const MAX_PDF_COLUMNS = 10

const COLUMNS = {
  HEALTH: [
    'repository', 'fullName', 'scanStatus', 'lastScannedAt', 'updateCheckStatus',
    'dependencyCount', 'outdatedCount', 'vulnerableCount', 'language',
  ],
  DEPENDENCY_UPDATE: [
    'packageName', 'ecosystem', 'installedVersion', 'latestStableVersion',
    'updateType', 'updateStatus', 'rangeStatus', 'securityStatus', 'deprecated',
    'lastCheckedAt', 'registryError', 'securityError',
  ],
  SECURITY: [
    'packageName', 'ecosystem', 'installedVersion', 'securityStatus', 'advisoryId',
    'severity', 'summary', 'fixedVersions', 'securityError',
  ],
  AI_RECOMMENDATION: [
    'packageName', 'installedVersion', 'targetVersion', 'analysisStatus',
    'recommendation', 'riskLevel', 'evidenceCount', 'recommendationReason',
    'completedAt', 'limitations',
  ],
  HISTORICAL_COMPARISON: [
    'packageName', 'previousAnalysisDate', 'currentAnalysisDate', 'previousVersion',
    'currentVersion', 'riskPrevious', 'riskCurrent', 'recommendationPrevious',
    'recommendationCurrent', 'summary',
  ],
}

function iso(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function text(value, max = 800) {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map((item) => text(item, 300)).filter(Boolean).join('; ').slice(0, max)
  if (typeof value === 'object') return JSON.stringify(value).slice(0, max)
  return String(value).slice(0, max)
}

export function flattenReportValue(value) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return iso(value)
  if (Array.isArray(value)) return value.map(flattenReportValue).filter(Boolean).join('; ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function csvCell(value) {
  const valueText = flattenReportValue(value).replace(/"/g, '""')
  return /[",\r\n]/.test(valueText) ? `"${valueText}"` : valueText
}

export function buildReportFilename(reportType, format, generatedAt = new Date()) {
  const date = iso(generatedAt).slice(0, 10)
  const safeType = sanitizeText(reportType, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const extension = format === 'PDF' ? 'pdf' : format === 'CSV' ? 'csv' : 'json'
  return `devupdate-${safeType || 'report'}-${date}.${extension}`
}

export function reportCsv(report) {
  const columns = report?.data?.columns || []
  const rows = report?.data?.rows || []
  const lines = [columns.map(csvCell).join(',')]
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column])).join(','))
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

function reportPdf(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 38, size: 'A4', layout: 'landscape', info: {
      Title: report.title || 'DevUpdate AI report',
      Author: 'DevUpdate AI',
      Subject: report.data?.meta?.reportType || 'Report',
    } })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const columns = (report.data?.columns || []).slice(0, MAX_PDF_COLUMNS)
    const rows = report.data?.rows || []
    const included = rows.slice(0, MAX_PDF_ROWS)
    const pageWidth = doc.page.width - 76
    const columnWidth = pageWidth / Math.max(1, columns.length)
    const headerHeight = 24
    const rowHeight = 27

    doc.fillColor('#111827').fontSize(15).text(report.title || 'DevUpdate AI report')
    doc.fillColor('#4b5563').fontSize(8).text([
      `Type: ${report.data?.meta?.reportType || report.reportType}`,
      `Generated: ${iso(report.data?.meta?.generatedAt || report.generatedAt)}`,
      `Rows: ${included.length}${rows.length > included.length ? ` of ${rows.length} (CSV contains all rows)` : ''}`,
    ].join('   ·   '))
    if (columns.length < (report.data?.columns || []).length) {
      doc.fontSize(7).fillColor('#6b7280').text('PDF shows the first columns only; CSV contains every column.')
    }
    doc.moveDown(0.6)

    const summary = report.data?.summary || {}
    const summaryText = Object.entries(summary)
      .slice(0, 12)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1')}: ${flattenReportValue(value)}`)
      .join('   ·   ')
    if (summaryText) {
      doc.fontSize(7.5).fillColor('#374151').text(summaryText, { width: pageWidth })
      doc.moveDown(0.4)
    }

    let y = doc.y + 6
    const drawHeader = () => {
      doc.rect(38, y, pageWidth, headerHeight).fill('#e5e7eb')
      doc.fillColor('#111827').fontSize(7).font('Helvetica-Bold')
      columns.forEach((column, index) => {
        doc.text(String(column).replace(/([A-Z])/g, ' $1'), 42 + index * columnWidth, y + 7, {
          width: columnWidth - 8,
          height: 12,
          ellipsis: true,
        })
      })
      y += headerHeight
      doc.font('Helvetica').fontSize(6.5).fillColor('#1f2937')
    }

    drawHeader()
    included.forEach((row, rowIndex) => {
      if (y + rowHeight > doc.page.height - 40) {
        doc.addPage()
        y = 38
        drawHeader()
      }
      if (rowIndex % 2 === 1) {
        doc.rect(38, y, pageWidth, rowHeight).fill('#f9fafb')
      }
      columns.forEach((column, index) => {
        doc.text(flattenReportValue(row[column]), 42 + index * columnWidth, y + 6, {
          width: columnWidth - 8,
          height: rowHeight - 10,
          ellipsis: true,
        })
      })
      doc.moveTo(38, y + rowHeight).lineTo(38 + pageWidth, y + rowHeight).strokeColor('#e5e7eb').stroke()
      y += rowHeight
    })

    if (!included.length) {
      doc.fontSize(9).fillColor('#6b7280').text('No records matched this report scope.', 42, y + 12)
    }

    doc.end()
  })
}

function matchFor(userId, repositoryId) {
  const query = { userId }
  if (repositoryId) query.repositoryId = repositoryId
  return query
}

async function countBy(model, match, field) {
  const rows = await model.aggregate([
    { $match: match },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ])
  return Object.fromEntries(rows.map((row) => [String(row._id || 'UNKNOWN'), row.count]))
}

async function healthData(match, repositoryId) {
  const repositories = await Repository.find(match).sort({ fullName: 1 }).lean()
  const updateMatch = { ...match }
  const statusCounts = await countBy(DependencyUpdate, updateMatch, 'updateStatus')
  const securityCounts = await countBy(DependencyUpdate, updateMatch, 'securityStatus')
  const rows = repositories.map((repository) => ({
    repository: String(repository._id),
    fullName: repository.fullName || '',
    scanStatus: repository.scanStatus || 'NOT_SCANNED',
    lastScannedAt: iso(repository.lastScannedAt),
    updateCheckStatus: repository.updateCheckStatus || 'NOT_CHECKED',
    dependencyCount: repository.dependencyCount || 0,
    outdatedCount: repository.outdatedCount || 0,
    vulnerableCount: repository.vulnerableCount || 0,
    language: repository.language || '',
  }))
  return {
    rows,
    summary: {
      repositories: repositories.length,
      scannedRepositories: repositories.filter((row) => row.scanStatus === 'COMPLETED').length,
      failedScans: repositories.filter((row) => row.scanStatus === 'FAILED').length,
      trackedDependencies: Object.values(statusCounts).reduce((total, count) => total + count, 0),
      vulnerableDependencies: securityCounts.VULNERABLE || 0,
      securityDataUnavailable: securityCounts.SECURITY_DATA_UNAVAILABLE || 0,
      updateStatusCounts: statusCounts,
      securityStatusCounts: securityCounts,
    },
  }
}

async function dependencyUpdateData(match) {
  const total = await DependencyUpdate.countDocuments(match)
  const rows = await DependencyUpdate.find(match)
    .sort({ lastCheckedAt: -1 })
    .limit(PHASE5_LIMITS.maxReportRows)
    .lean()
  const statusCounts = await countBy(DependencyUpdate, match, 'updateStatus')
  const typeCounts = await countBy(DependencyUpdate, match, 'updateType')
  return {
    total,
    rows: rows.map((row) => ({
      packageName: row.packageName || '',
      ecosystem: row.ecosystem || '',
      installedVersion: row.installedVersion || '',
      latestStableVersion: row.latestStableVersion || row.latestVersion || '',
      updateType: row.updateType || 'UNKNOWN',
      updateStatus: row.updateStatus || 'UNKNOWN_VERSION',
      rangeStatus: row.rangeStatus || 'UNKNOWN',
      securityStatus: row.securityStatus || 'UNKNOWN',
      deprecated: Boolean(row.deprecated),
      lastCheckedAt: iso(row.lastCheckedAt),
      registryError: row.registryError || '',
      securityError: row.securityError || '',
    })),
    summary: {
      dependencies: total,
      updateStatusCounts: statusCounts,
      updateTypeCounts: typeCounts,
      registryErrors: await DependencyUpdate.countDocuments({ ...match, registryError: { $ne: '' } }),
      securityDataUnavailable: statusCounts.SECURITY_DATA_UNAVAILABLE || 0,
    },
  }
}

async function securityData(match) {
  const total = await DependencyUpdate.countDocuments(match)
  const rows = await DependencyUpdate.find(match)
    .sort({ 'vulnerabilities.severity.level': -1, packageName: 1 })
    .limit(PHASE5_LIMITS.maxReportRows)
    .lean()
  const securityCounts = await countBy(DependencyUpdate, match, 'securityStatus')
  const flatRows = []
  for (const row of rows) {
    const advisories = row.vulnerabilities || []
    if (!advisories.length) {
      flatRows.push({
        packageName: row.packageName || '',
        ecosystem: row.ecosystem || '',
        installedVersion: row.installedVersion || '',
        securityStatus: row.securityStatus || 'UNKNOWN',
        advisoryId: '',
        severity: '',
        summary: row.securityStatus === 'SECURITY_DATA_UNAVAILABLE'
          ? 'Advisory data was unavailable; vulnerability status is unknown.'
          : row.securityStatus === 'NO_KNOWN_VULNERABILITY'
            ? 'No known vulnerability for the checked installed version.'
            : 'No advisory details were returned.',
        fixedVersions: '',
        securityError: row.securityError || '',
      })
      continue
    }
    for (const advisory of advisories.slice(0, 20)) {
      flatRows.push({
        packageName: row.packageName || '',
        ecosystem: row.ecosystem || '',
        installedVersion: row.installedVersion || '',
        securityStatus: row.securityStatus || 'UNKNOWN',
        advisoryId: advisory.id || '',
        severity: advisory.severity?.level || 'UNKNOWN',
        summary: text(advisory.summary, 800),
        fixedVersions: advisory.fixedVersions || [],
        securityError: row.securityError || '',
      })
    }
  }
  return {
    total,
    rows: flatRows.slice(0, PHASE5_LIMITS.maxReportRows),
    summary: {
      dependenciesChecked: total,
      advisoryRecords: flatRows.filter((row) => row.advisoryId).length,
      vulnerableDependencies: securityCounts.VULNERABLE || 0,
      noKnownVulnerability: securityCounts.NO_KNOWN_VULNERABILITY || 0,
      securityDataUnavailable: securityCounts.SECURITY_DATA_UNAVAILABLE || 0,
      unknown: securityCounts.UNKNOWN || 0,
    },
  }
}

async function aiRecommendationData(match) {
  const total = await AIAnalysis.countDocuments(match)
  const rows = await AIAnalysis.find(match)
    .sort({ createdAt: -1 })
    .limit(PHASE5_LIMITS.maxReportRows)
    .lean()
  const recommendationCounts = await countBy(AIAnalysis, match, 'recommendation')
  const statusCounts = await countBy(AIAnalysis, match, 'analysisStatus')
  const riskCounts = await countBy(AIAnalysis, match, 'riskLevel')
  return {
    total,
    rows: rows.map((row) => ({
      packageName: row.packageName || '',
      installedVersion: row.installedVersion || '',
      targetVersion: row.targetVersion || '',
      analysisStatus: row.analysisStatus || 'QUEUED',
      recommendation: row.recommendation || 'INSUFFICIENT_EVIDENCE',
      riskLevel: row.riskLevel || 'UNKNOWN',
      evidenceCount: (row.evidence || []).length,
      recommendationReason: text(row.recommendationReason, 800),
      completedAt: iso(row.completedAt),
      limitations: row.limitations || [],
    })),
    summary: {
      analyses: total,
      recommendationCounts,
      statusCounts,
      riskCounts,
      insufficientEvidence: recommendationCounts.INSUFFICIENT_EVIDENCE || 0,
    },
  }
}

async function historicalComparisonData(match) {
  const total = await HistoricalComparison.countDocuments(match)
  const rows = await HistoricalComparison.find(match)
    .sort({ createdAt: -1 })
    .limit(PHASE5_LIMITS.maxReportRows)
    .lean()
  return {
    total,
    rows: rows.map((row) => ({
      packageName: row.changes?.newReleaseInformation?.to
        ? String(row.changes.newReleaseInformation.to)
        : '',
      previousAnalysisDate: iso(row.previousAnalysisDate),
      currentAnalysisDate: iso(row.currentAnalysisDate),
      previousVersion: row.changes?.version?.previousTargetVersion || '',
      currentVersion: row.changes?.version?.currentTargetVersion || '',
      riskPrevious: row.changes?.risk?.previous || 'UNKNOWN',
      riskCurrent: row.changes?.risk?.current || 'UNKNOWN',
      recommendationPrevious: row.changes?.recommendation?.previous || 'INSUFFICIENT_EVIDENCE',
      recommendationCurrent: row.changes?.recommendation?.current || 'INSUFFICIENT_EVIDENCE',
      summary: text(row.summary, 800),
    })),
    summary: {
      comparisons: total,
      recommendationChanges: rows.filter((row) => row.changes?.recommendation?.changed).length,
      riskChanges: rows.filter((row) => row.changes?.risk?.changed).length,
      withPreviousAnalysis: rows.filter((row) => row.changes?.previousAnalysisAvailable).length,
    },
  }
}

async function buildReportData({ userId, repositoryId, reportType }) {
  const match = matchFor(userId, repositoryId)
  let result
  if (reportType === 'HEALTH') result = await healthData(match, repositoryId)
  else if (reportType === 'DEPENDENCY_UPDATE') result = await dependencyUpdateData(match)
  else if (reportType === 'SECURITY') result = await securityData(match)
  else if (reportType === 'AI_RECOMMENDATION') result = await aiRecommendationData(match)
  else result = await historicalComparisonData(match)

  const repository = repositoryId
    ? await Repository.findOne({ _id: repositoryId, userId }).select('fullName').lean()
    : null

  return {
    meta: {
      reportType,
      repositoryId: repositoryId || null,
      repositoryName: repository?.fullName || '',
      generatedAt: new Date().toISOString(),
      source: 'MongoDB',
      totalRows: result.total ?? result.rows.length,
      includedRows: result.rows.length,
      truncated: Boolean(result.total && result.total > result.rows.length),
    },
    summary: result.summary,
    columns: COLUMNS[reportType],
    rows: result.rows,
  }
}

async function assertRepositoryAccess(userId, repositoryId) {
  if (!repositoryId) return
  const exists = await Repository.exists({ _id: repositoryId, userId })
  if (!exists) throw new AppError('Repository not found.', 404)
}

export async function generateReport({
  userId,
  repositoryId = null,
  reportType,
  title,
  actor = 'USER',
}) {
  if (!REPORT_TYPES.includes(reportType)) throw new AppError('Invalid report type.', 400)
  await assertRepositoryAccess(userId, repositoryId)
  const data = await buildReportData({ userId, repositoryId, reportType })
  const defaultTitle = `${reportType.replace(/_/g, ' ').toLowerCase()}${repositoryId ? ` — ${data.meta.repositoryName}` : ' — all repositories'}`
  const report = await Report.create({
    userId,
    repositoryId: repositoryId || null,
    reportType,
    title: sanitizeText(title, 240) || defaultTitle,
    data,
    generatedAt: new Date(data.meta.generatedAt),
    metadata: { generatedBy: String(actor) },
  })
  return report
}

export async function listReports({ userId, repositoryId, reportType, page = 1, limit = 20 }) {
  const query = { userId }
  if (repositoryId) query.repositoryId = repositoryId
  if (reportType) query.reportType = reportType
  const size = Math.min(100, Math.max(1, Number(limit) || 20))
  const current = Math.max(1, Number(page) || 1)
  const [items, total] = await Promise.all([
    Report.find(query).sort({ generatedAt: -1 }).skip((current - 1) * size).limit(size).lean(),
    Report.countDocuments(query),
  ])
  return { items, total, page: current, limit: size, pages: Math.ceil(total / size) }
}

export async function getReport({ userId, reportId }) {
  const report = await Report.findOne({ _id: reportId, userId }).lean()
  if (!report) throw new AppError('Report not found.', 404)
  return report
}

export async function deleteReport({ userId, reportId }) {
  const result = await Report.deleteOne({ _id: reportId, userId })
  if (!result.deletedCount) throw new AppError('Report not found.', 404)
  return { deleted: true }
}

export async function exportReport({ userId, reportId, format }) {
  if (!REPORT_FORMATS.includes(format)) throw new AppError('Invalid report format.', 400)
  const report = await getReport({ userId, reportId })
  const filename = buildReportFilename(report.reportType, format, report.generatedAt)

  if (format === 'JSON') {
    return {
      filename,
      contentType: 'application/json; charset=utf-8',
      body: Buffer.from(JSON.stringify({
        success: true,
        id: String(report._id),
        title: report.title,
        reportType: report.reportType,
        data: report.data,
      }, null, 2)),
    }
  }

  if (format === 'CSV') {
    return {
      filename,
      contentType: 'text/csv; charset=utf-8',
      body: Buffer.from(reportCsv(report), 'utf8'),
    }
  }

  return {
    filename,
    contentType: 'application/pdf',
    body: await reportPdf(report),
  }
}

export function getReportOptions() {
  return {
    types: REPORT_TYPES,
    formats: REPORT_FORMATS,
    maxRows: PHASE5_LIMITS.maxReportRows,
    pdfRowLimit: MAX_PDF_ROWS,
  }
}
