import Dependency from '../models/Dependency.js'
import Repository from '../models/Repository.js'
import { AppError, asyncHandler } from '../utils/errors.js'
import { sanitizeText, isValidObjectId } from '../utils/sanitize.js'

const SORT_OPTIONS = {
  name: { packageName: 1 },
  ecosystem: { ecosystem: 1, packageName: 1 },
  extracted: { extractedAt: -1 },
}

function paginate(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  return { page, limit, skip: (page - 1) * limit }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildFilter(query, userId) {
  const filter = { userId, packageName: { $regex: '^[^@]' } }
  const search = sanitizeText(query.search, 120)
  if (search) {
    filter.$and = [
      { packageName: { $regex: '^[^@]' } },
      {
        $or: [
          { packageName: { $regex: escapeRegex(search), $options: 'i' } },
          { sourceManifest: { $regex: escapeRegex(search), $options: 'i' } },
        ],
      },
    ]
    delete filter.packageName
  }
  if (query.ecosystem) filter.ecosystem = sanitizeText(query.ecosystem, 40)
  if (query.repositoryId) {
    if (!isValidObjectId(query.repositoryId)) throw new AppError('Invalid repository filter.', 400)
    filter.repositoryId = query.repositoryId
  }
  if (query.scope === 'development') filter.isDevelopmentDependency = true
  if (query.scope === 'production') filter.isDevelopmentDependency = false
  if (['runtime', 'development', 'build', 'unknown'].includes(query.dependencyType)) {
    filter.dependencyType = query.dependencyType
  }
  return filter
}

export const listDependencies = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query)
  const filter = buildFilter(req.query, req.user._id)
  const sort = SORT_OPTIONS[req.query.sort] || { extractedAt: -1 }

  const [dependencies, total, ecosystems, repositories] = await Promise.all([
    Dependency.find(filter)
      .populate('repositoryId', 'name fullName')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Dependency.countDocuments(filter),
    Dependency.distinct('ecosystem', { userId: req.user._id }),
    Repository.find({ userId: req.user._id }).select('name fullName').sort({ name: 1 }).lean(),
  ])

  res.json({
    success: true,
    dependencies,
    ecosystems: ecosystems.sort((a, b) => a.localeCompare(b)),
    repositories,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  })
})

export const listByRepository = asyncHandler(async (req, res) => {
  const repositoryId = req.params.repositoryId
  if (!isValidObjectId(repositoryId)) throw new AppError('Invalid repository id.', 400)
  const repository = await Repository.findOne({ _id: repositoryId, userId: req.user._id })
  if (!repository) throw new AppError('Repository not found.', 404)

  // Ensure any lingering legacy @ scoped dependencies are removed
  await Dependency.deleteMany({ repositoryId, packageName: /^@/ })

  const { page, limit, skip } = paginate(req.query)
  const filter = buildFilter({ ...req.query, repositoryId }, req.user._id)
  const [dependencies, total] = await Promise.all([
    Dependency.find(filter).sort(SORT_OPTIONS[req.query.sort] || { packageName: 1 }).skip(skip).limit(limit).lean(),
    Dependency.countDocuments(filter),
  ])

  res.json({
    success: true,
    repository: { id: repository._id, name: repository.name, fullName: repository.fullName },
    dependencies,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  })
})
