import Repository from '../models/Repository.js'
import Dependency from '../models/Dependency.js'
import ScanJob from '../models/ScanJob.js'
import { AppError, asyncHandler } from '../utils/errors.js'
import { sanitizeText, isValidObjectId } from '../utils/sanitize.js'
import { syncRepositories } from '../services/repositoryService.js'
import { queueScan } from '../services/scanService.js'

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function pagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 12))
  return { page, limit, skip: (page - 1) * limit }
}

export const listRepositories = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query)
  const filter = { userId: req.user._id }
  const search = sanitizeText(req.query.search, 120)
  if (search) {
    filter.$or = [
      { name: { $regex: escapeRegex(search), $options: 'i' } },
      { fullName: { $regex: escapeRegex(search), $options: 'i' } },
      { description: { $regex: escapeRegex(search), $options: 'i' } },
    ]
  }
  if (req.query.language) filter.language = sanitizeText(req.query.language, 60)
  if (['public', 'private'].includes(req.query.visibility)) filter.visibility = req.query.visibility
  if (['NOT_SCANNED', 'QUEUED', 'SCANNING', 'COMPLETED', 'FAILED'].includes(req.query.status)) {
    filter.scanStatus = req.query.status
  }

  const sort = {
    updated: { lastUpdated: -1 },
    name: { name: 1 },
    stars: { stars: -1 },
    scanned: { lastScannedAt: -1 },
  }[req.query.sort] || { lastUpdated: -1 }

  const [repositories, total, languages] = await Promise.all([
    Repository.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Repository.countDocuments(filter),
    Repository.distinct('language', { userId: req.user._id, language: { $ne: '' } }),
  ])

  res.json({
    success: true,
    repositories,
    languages: languages.sort((a, b) => a.localeCompare(b)),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  })
})

export const getRepository = asyncHandler(async (req, res) => {
  const id = req.params.id
  if (!isValidObjectId(id)) throw new AppError('Invalid repository id.', 400)
  const repository = await Repository.findOne({ _id: id, userId: req.user._id }).lean()
  if (!repository) throw new AppError('Repository not found.', 404)

  const [latestJob, scanHistory, ecosystems] = await Promise.all([
    ScanJob.findOne({ repositoryId: repository._id, userId: req.user._id }).sort({ createdAt: -1 }).lean(),
    ScanJob.find({ repositoryId: repository._id, userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Dependency.aggregate([
      { $match: { repositoryId: repository._id, userId: req.user._id } },
      { $group: { _id: '$ecosystem', count: { $sum: 1 } } },
      { $project: { _id: 0, ecosystem: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]),
  ])

  res.json({ success: true, repository, latestJob, scanHistory, ecosystems })
})

export const sync = asyncHandler(async (req, res) => {
  const result = await syncRepositories(req.user._id.toString())
  res.json({ success: true, ...result, message: `Synced ${result.synced} accessible repositories.` })
})

export const analyze = asyncHandler(async (req, res) => {
  try {
    const job = await queueScan({
      userId: req.user._id.toString(),
      repositoryId: req.params.id,
      branch: req.body?.branch,
    })
    res.status(202).json({ success: true, scanJob: job, message: 'Repository scan queued.' })
  } catch (error) {
    if (error.statusCode === 409 && error.scanJob) {
      return res.status(409).json({
        success: false,
        message: error.message,
        scanJob: error.scanJob,
      })
    }
    throw error
  }
})

export const scanStatus = asyncHandler(async (req, res) => {
  const id = req.params.id
  if (!isValidObjectId(id)) throw new AppError('Invalid repository id.', 400)
  const repository = await Repository.findOne(
    { _id: id, userId: req.user._id },
    'scanStatus lastScannedAt lastScanError dependencyCount manifestFiles branch',
  ).lean()
  if (!repository) throw new AppError('Repository not found.', 404)
  const latestJob = await ScanJob.findOne({
    repositoryId: repository._id,
    userId: req.user._id,
  })
    .sort({ createdAt: -1 })
    .lean()

  res.json({ success: true, repository, scanJob: latestJob })
})
