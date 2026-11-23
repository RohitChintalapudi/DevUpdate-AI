import PDFDocument from 'pdfkit'

function safeDate(value) {
  if (!value) return new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })
    : d.toLocaleDateString('en-US', { dateStyle: 'medium' })
}

function truncate(str, max = 200) {
  if (!str) return ''
  const s = String(str).trim()
  return s.length > max ? s.slice(0, max - 3) + '...' : s
}

export function generateRepositoryIntelligencePdf({
  repository = {},
  updates = [],
  researchRecords = [],
  analysisRecords = [],
  user = {},
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      layout: 'portrait',
      bufferPages: true,
      info: {
        Title: `${repository.fullName || repository.name || 'Repository'} - Dependency Intelligence Audit`,
        Author: 'DevUpdate AI',
        Subject: 'Dependency Update & Firecrawl Research Report',
        Creator: 'DevUpdate AI Autonomous Engine',
      },
    })

    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = doc.page.width - 80 // 595.28 - 80 = 515.28
    const leftMargin = 40

    // Index research and analysis records by packageName or id
    const researchByPackage = new Map()
    for (const r of researchRecords) {
      if (r.packageName) researchByPackage.set(r.packageName.toLowerCase(), r)
      if (r.dependencyId) researchByPackage.set(String(r.dependencyId), r)
    }

    const analysisByPackage = new Map()
    for (const a of analysisRecords) {
      if (a.packageName) analysisByPackage.set(a.packageName.toLowerCase(), a)
      if (a.dependencyId) analysisByPackage.set(String(a.dependencyId), a)
    }

    // Filter out dependencies starting with '@' so PDF stays clean and focused on primary packages
    const cleanUpdates = (updates || []).filter((u) => u.packageName && !u.packageName.startsWith('@'))

    // Categorize updates into canonical 3 statuses:
    // 1. Needs Upgrade (Minor / Patch / Update Available)
    // 2. Outdated (Major shifts)
    // 3. Up to Date (Latest stable verified)
    const needsUpgrade = []
    const outdated = []
    const upToDate = []

    for (const u of cleanUpdates) {
      const type = (u.updateType || '').toUpperCase()
      const status = (u.updateStatus || '').toUpperCase()

      if (status === 'UP_TO_DATE' || (type === 'NONE' && u.latestStableVersion && u.installedVersion === u.latestStableVersion)) {
        upToDate.push(u)
      } else if (type === 'MAJOR' || status === 'OUTDATED') {
        outdated.push(u)
      } else {
        needsUpgrade.push(u)
      }
    }

    let researchedCount = 0
    for (const u of cleanUpdates) {
      if (u.researchStatus === 'COMPLETED' || u.researchId || researchByPackage.has((u.packageName || '').toLowerCase())) {
        researchedCount += 1
      }
    }

    function checkAddPage(neededHeight = 60) {
      if (doc.y + neededHeight > doc.page.height - 50) {
        doc.addPage()
        drawPageBorder()
      }
    }

    function drawPageBorder() {
      // Subtle top header line
      doc.save()
      doc.rect(leftMargin, 20, pageWidth, 2).fill('#0284c7')
      doc.restore()
    }

    // --- 1. Top Cover / Header Banner ---
    drawPageBorder()

    // Header Background Box
    doc.roundedRect(leftMargin, 30, pageWidth, 68, 6).fill('#0f172a')

    // DevUpdate AI Brand text
    doc.fillColor('#38bdf8').fontSize(9).font('Helvetica-Bold')
      .text('DEVUPDATE AI  •  ECOSYSTEM RADAR & FIRECRAWL REPORT', leftMargin + 16, 42)

    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
      .text(repository.fullName || repository.name || 'Repository Dependency Intelligence', leftMargin + 16, 56, {
        width: pageWidth - 32,
        ellipsis: true,
      })

    const branch = repository.defaultBranch || repository.branch || 'main'
    const genDate = safeDate(new Date())
    doc.fillColor('#94a3b8').fontSize(8.5).font('Helvetica')
      .text(`Branch: ${branch}   |   Language: ${repository.language || 'Multi-language'}   |   Generated: ${genDate}`, leftMargin + 16, 78)

    doc.y = 110

    // --- 2. Executive Metrics Summary Cards ---
    const cardGap = 8
    const numCards = 5
    const cardWidth = (pageWidth - cardGap * (numCards - 1)) / numCards
    const cardHeight = 44

    const metrics = [
      { label: 'TOTAL DEPS', value: cleanUpdates.length, color: '#475569', bg: '#f1f5f9' },
      { label: 'NEEDS UPGRADE', value: needsUpgrade.length, color: '#d97706', bg: '#fef3c7' },
      { label: 'OUTDATED', value: outdated.length, color: '#e11d48', bg: '#ffe4e6' },
      { label: 'UP TO DATE', value: upToDate.length, color: '#059669', bg: '#d1fae5' },
      { label: 'RESEARCHED', value: researchedCount, color: '#0284c7', bg: '#e0f2fe' },
    ]

    metrics.forEach((m, idx) => {
      const cx = leftMargin + idx * (cardWidth + cardGap)
      const cy = doc.y

      doc.roundedRect(cx, cy, cardWidth, cardHeight, 4).fill(m.bg)
      doc.rect(cx, cy, cardWidth, 2).fill(m.color)

      doc.fillColor(m.color).fontSize(14).font('Helvetica-Bold')
        .text(String(m.value), cx + 8, cy + 8, { width: cardWidth - 16, align: 'center' })

      doc.fillColor('#475569').fontSize(6.5).font('Helvetica-Bold')
        .text(m.label, cx + 4, cy + 28, { width: cardWidth - 8, align: 'center' })
    })

    doc.y += cardHeight + 16

    // --- 3. Section 1: Dependencies Needing Upgrade ---
    if (needsUpgrade.length > 0) {
      checkAddPage(50)
      doc.roundedRect(leftMargin, doc.y, pageWidth, 22, 4).fill('#fef3c7')
      doc.fillColor('#92400e').fontSize(10).font('Helvetica-Bold')
        .text(`1. DEPENDENCIES NEEDING UPGRADE (${needsUpgrade.length} PACKAGES)`, leftMargin + 10, doc.y + 6)
      doc.y += 28

      doc.fillColor('#64748b').fontSize(8).font('Helvetica')
        .text('These dependencies have non-breaking minor/patch updates available. Upgrading is recommended to gain bug fixes, performance improvements, and security enhancements.', leftMargin, doc.y, { width: pageWidth })
      doc.y += 14

      for (const item of needsUpgrade) {
        checkAddPage(65)
        const research = researchByPackage.get((item.packageName || '').toLowerCase()) || {}
        const analysis = analysisByPackage.get((item.packageName || '').toLowerCase()) || {}

        const itemBoxY = doc.y
        doc.roundedRect(leftMargin, itemBoxY, pageWidth, 56, 4).strokeColor('#e2e8f0').stroke()

        // Package header line
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
          .text(item.packageName, leftMargin + 10, itemBoxY + 8)

        // Version shift badge
        const installed = item.installedVersion || '0.0.0'
        const target = item.latestCompatibleVersion || item.latestStableVersion || item.latestVersion || 'latest'
        doc.fillColor('#d97706').fontSize(8.5).font('Helvetica-Bold')
          .text(`${installed}  ->  ${target}  [${(item.updateType || 'MINOR').toUpperCase()}]`, leftMargin + 180, itemBoxY + 9)

        // Ecosystem & security
        const secStatus = item.securityStatus === 'VULNERABLE' ? 'VULNERABLE (Action Required)' : 'No Known Vulnerabilities'
        doc.fillColor(item.securityStatus === 'VULNERABLE' ? '#e11d48' : '#059669').fontSize(7.5).font('Helvetica-Bold')
          .text(secStatus, leftMargin + 370, itemBoxY + 9, { align: 'right', width: pageWidth - 380 })

        // Recommended Action / Step
        const upgradeCmd = item.ecosystem === 'PyPI'
          ? `pip install ${item.packageName}==${target}`
          : `npm install ${item.packageName}@${target}`

        doc.fillColor('#0369a1').fontSize(8).font('Helvetica-Bold')
          .text('Recommended Step:', leftMargin + 10, itemBoxY + 24)

        const recommendation = analysis.recommendationReason ||
          research.migrationGuideSummary ||
          `Run '${upgradeCmd}' to update cleanly within your semver range without breaking changes.`

        doc.fillColor('#334155').fontSize(7.5).font('Helvetica')
          .text(truncate(recommendation, 175), leftMargin + 105, itemBoxY + 24, { width: pageWidth - 115 })

        // AI Guidance / Action Note
        const steps = analysis.migrationPlan?.length
          ? analysis.migrationPlan.map((s, i) => `${i + 1}. ${s.action}`).join(' | ')
          : 'Run regression tests after updating dependencies to verify runtime compatibility.'

        doc.fillColor('#64748b').fontSize(7).font('Helvetica-Oblique')
          .text(`AI Action Plan: ${truncate(steps, 180)}`, leftMargin + 10, itemBoxY + 40, { width: pageWidth - 20 })

        doc.y = itemBoxY + 62
      }
      doc.y += 10
    }

    // --- 4. Section 2: Outdated Dependencies (Major Versions) ---
    if (outdated.length > 0) {
      checkAddPage(50)
      doc.roundedRect(leftMargin, doc.y, pageWidth, 22, 4).fill('#ffe4e6')
      doc.fillColor('#9f1239').fontSize(10).font('Helvetica-Bold')
        .text(`2. OUTDATED DEPENDENCIES - MAJOR VERSION SHIFTS (${outdated.length} PACKAGES)`, leftMargin + 10, doc.y + 6)
      doc.y += 28

      doc.fillColor('#64748b').fontSize(8).font('Helvetica')
        .text('These packages are behind by one or more major versions. Major version leaps frequently include breaking API changes and architectural updates. Review official Firecrawl research findings before upgrading.', leftMargin, doc.y, { width: pageWidth })
      doc.y += 14

      for (const item of outdated) {
        checkAddPage(80)
        const research = researchByPackage.get((item.packageName || '').toLowerCase()) || {}
        const analysis = analysisByPackage.get((item.packageName || '').toLowerCase()) || {}

        const itemBoxY = doc.y
        doc.roundedRect(leftMargin, itemBoxY, pageWidth, 74, 4).strokeColor('#fecdd3').stroke()

        // Package header line
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
          .text(item.packageName, leftMargin + 10, itemBoxY + 8)

        // Version shift badge
        const installed = item.installedVersion || '0.0.0'
        const target = item.latestStableVersion || item.latestVersion || 'latest'
        doc.fillColor('#e11d48').fontSize(8.5).font('Helvetica-Bold')
          .text(`${installed}  ->  ${target}  [MAJOR SHIFT]`, leftMargin + 180, itemBoxY + 9)

        // Firecrawl Research Status Badge
        const hasResearch = Boolean(research.packageInfo || research.breakingChanges?.length || research.findings?.length)
        doc.fillColor(hasResearch ? '#0284c7' : '#64748b').fontSize(7.5).font('Helvetica-Bold')
          .text(hasResearch ? 'Firecrawl Docs Researched' : 'Registry Verified', leftMargin + 370, itemBoxY + 9, { align: 'right', width: pageWidth - 380 })

        // Breaking Changes Summary from Firecrawl
        let breakingText = 'None documented in release notes'
        if (research.breakingChanges?.length) {
          breakingText = research.breakingChanges.map((b) => b.title || b.description).filter(Boolean).join('; ')
        } else if (analysis.breakingChanges?.length) {
          breakingText = analysis.breakingChanges.map((b) => b.title || b.description).filter(Boolean).join('; ')
        }

        doc.fillColor('#e11d48').fontSize(7.5).font('Helvetica-Bold')
          .text('Breaking Risks:', leftMargin + 10, itemBoxY + 24)
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica')
          .text(truncate(breakingText, 170), leftMargin + 95, itemBoxY + 24, { width: pageWidth - 105 })

        // Step-by-Step AI Suggestion
        let stepsText = '1. Review breaking changes changelog  2. Update import statements  3. Execute automated test suite'
        if (analysis.migrationPlan?.length) {
          stepsText = analysis.migrationPlan.map((s, idx) => `${idx + 1}. ${s.action}`).join('   ')
        } else if (research.migrationPlan?.length) {
          stepsText = research.migrationPlan.map((s, idx) => `${idx + 1}. ${s.action}`).join('   ')
        }

        doc.fillColor('#0369a1').fontSize(7.5).font('Helvetica-Bold')
          .text('AI Migration Steps:', leftMargin + 10, itemBoxY + 39)
        doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica')
          .text(truncate(stepsText, 180), leftMargin + 105, itemBoxY + 39, { width: pageWidth - 115 })

        // Official documentation or migration guide URL
        const guideUrl = research.migrationIntelligence?.migrationGuideUrl ||
          research.packageInfo?.documentationUrl ||
          research.packageInfo?.websiteUrl ||
          'https://www.npmjs.com/package/' + item.packageName

        doc.fillColor('#64748b').fontSize(7).font('Helvetica-Oblique')
          .text(`Official Doc: ${truncate(guideUrl, 95)}`, leftMargin + 10, itemBoxY + 56, { width: pageWidth - 20 })

        doc.y = itemBoxY + 80
      }
      doc.y += 10
    }

    // --- 5. Section 3: Up to Date Dependencies ---
    if (upToDate.length > 0) {
      checkAddPage(50)
      doc.roundedRect(leftMargin, doc.y, pageWidth, 22, 4).fill('#d1fae5')
      doc.fillColor('#065f46').fontSize(10).font('Helvetica-Bold')
        .text(`3. UP TO DATE DEPENDENCIES (${upToDate.length} PACKAGES)`, leftMargin + 10, doc.y + 6)
      doc.y += 28

      doc.fillColor('#64748b').fontSize(8).font('Helvetica')
        .text('These packages are verified to be running on the latest official stable version. No immediate upgrade action is required.', leftMargin, doc.y, { width: pageWidth })
      doc.y += 12

      // Draw clean 4-column compact table for Up to Date packages
      const colWidths = [190, 75, 100, 150]
      checkAddPage(20)

      const tableHeadY = doc.y
      doc.rect(leftMargin, tableHeadY, pageWidth, 18).fill('#f1f5f9')
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold')
      doc.text('PACKAGE NAME', leftMargin + 8, tableHeadY + 5, { width: colWidths[0] - 8 })
      doc.text('ECOSYSTEM', leftMargin + colWidths[0], tableHeadY + 5, { width: colWidths[1] - 8 })
      doc.text('INSTALLED / STABLE', leftMargin + colWidths[0] + colWidths[1], tableHeadY + 5, { width: colWidths[2] - 8 })
      doc.text('STATUS', leftMargin + colWidths[0] + colWidths[1] + colWidths[2], tableHeadY + 5, { width: colWidths[3] - 8 })
      doc.y = tableHeadY + 18

      upToDate.forEach((u, i) => {
        checkAddPage(18)
        const rowY = doc.y
        if (i % 2 === 1) {
          doc.rect(leftMargin, rowY, pageWidth, 16).fill('#f8fafc')
        }

        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica')
          .text(u.packageName, leftMargin + 8, rowY + 4, { width: colWidths[0] - 8, ellipsis: true })

        doc.fillColor('#64748b').fontSize(7).font('Helvetica')
          .text(u.ecosystem || 'npm', leftMargin + colWidths[0], rowY + 4, { width: colWidths[1] - 8 })

        doc.fillColor('#059669').fontSize(7.5).font('Helvetica-Bold')
          .text(u.installedVersion || u.latestStableVersion || 'latest', leftMargin + colWidths[0] + colWidths[1], rowY + 4, { width: colWidths[2] - 8 })

        doc.fillColor('#059669').fontSize(7).font('Helvetica')
          .text('Up to Date (Clean)', leftMargin + colWidths[0] + colWidths[1] + colWidths[2], rowY + 4, { width: colWidths[3] - 8 })

        doc.moveTo(leftMargin, rowY + 16).lineTo(leftMargin + pageWidth, rowY + 16).strokeColor('#f1f5f9').stroke()
        doc.y = rowY + 16
      })
      doc.y += 14
    }

    // --- 6. Footer & Page Numbers on all pages ---
    const totalPages = doc.bufferedPageRange().count
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i)
      doc.save()

      // Footer divider
      doc.moveTo(leftMargin, doc.page.height - 35)
        .lineTo(leftMargin + pageWidth, doc.page.height - 35)
        .strokeColor('#cbd5e1')
        .stroke()

      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
        .text('Generated by DevUpdate AI  •  Powered by Firecrawl & AI Intelligence Engine', leftMargin, doc.page.height - 26, {
          width: pageWidth - 100,
        })

      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica-Bold')
        .text(`Page ${i + 1} of ${totalPages}`, leftMargin + pageWidth - 80, doc.page.height - 26, {
          width: 80,
          align: 'right',
        })
      doc.restore()
    }

    doc.end()
  })
}
