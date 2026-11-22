import mongoose from 'mongoose'
import {
  RANGE_STATUSES,
  SECURITY_STATUSES,
  UPDATE_STATUSES,
  UPDATE_TYPES,
} from '../services/updateIntelligence/version/ecosystemVersionRules.js'

const { Schema } = mongoose

const affectedRangeSchema = new Schema(
  {
    type: { type: String, default: '' },
    display: { type: String, default: '' },
    introduced: { type: String, default: '' },
    fixed: { type: String, default: '' },
    lastAffected: { type: String, default: '' },
    limit: { type: String, default: '' },
  },
  { _id: false },
)

const vulnerabilitySchema = new Schema(
  {
    id: { type: String, required: true },
    aliases: { type: [String], default: [] },
    cveIds: { type: [String], default: [] },
    ghsaIds: { type: [String], default: [] },
    severity: {
      level: { type: String, default: 'UNKNOWN' },
      score: { type: Number, default: null },
      vector: { type: String, default: '' },
    },
    summary: { type: String, default: '' },
    affectedRanges: { type: [affectedRangeSchema], default: [] },
    fixedVersions: { type: [String], default: [] },
    references: {
      type: [{ type: { type: String, default: '' }, url: { type: String, default: '' } }],
      default: [],
    },
    publishedAt: { type: Date, default: null },
    modifiedAt: { type: Date, default: null },
  },
  { _id: false },
)

const versionHistorySchema = new Schema(
  {
    version: { type: String, required: true },
    publishedAt: { type: Date, default: null },
    deprecated: { type: Boolean, default: false },
    yanked: { type: Boolean, default: false },
  },
  { _id: false },
)

const dependencyUpdateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    dependencyId: { type: Schema.Types.ObjectId, ref: 'Dependency', required: true, index: true },
    ecosystem: { type: String, required: true },
    packageName: { type: String, required: true },
    declaredVersion: { type: String, default: '' },
    resolvedVersion: { type: String, default: '' },
    installedVersion: { type: String, default: '' },
    latestVersion: { type: String, default: '' },
    latestStableVersion: { type: String, default: '' },
    latestCompatibleVersion: { type: String, default: '' },
    classification: {
      type: String,
      enum: ['CORE', 'SUPPORTING', 'DEVELOPMENT', 'TRANSITIVE', 'UNKNOWN'],
      default: 'SUPPORTING',
    },
    researchStatus: {
      type: String,
      enum: ['NOT_RESEARCHED', 'QUEUED', 'RESEARCHING', 'COMPLETED', 'PARTIAL', 'FAILED'],
      default: 'NOT_RESEARCHED',
      index: true,
    },
    researchId: { type: Schema.Types.ObjectId, ref: 'DependencyResearch', default: null },
    latestReleaseDate: { type: Date, default: null },
    updateAvailable: { type: Boolean, default: false },
    updateType: { type: String, enum: UPDATE_TYPES, default: 'UNKNOWN' },
    updateStatus: { type: String, enum: UPDATE_STATUSES, default: 'UNKNOWN_VERSION' },
    rangeStatus: { type: String, enum: RANGE_STATUSES, default: 'UNKNOWN' },
    securityStatus: { type: String, enum: SECURITY_STATUSES, default: 'UNKNOWN' },
    vulnerabilities: { type: [vulnerabilitySchema], default: [] },
    deprecated: { type: Boolean, default: false },
    abandoned: { type: Boolean, default: false },
    yanked: { type: Boolean, default: false },
    registryUrl: { type: String, default: '' },
    lastCheckedAt: { type: Date, default: Date.now },
    nextCheckAt: { type: Date, default: null },
    registryError: { type: String, default: '' },
    securityError: { type: String, default: '' },
    metadata: {
      description: { type: String, default: '' },
      homepage: { type: String, default: '' },
      repositoryUrl: { type: String, default: '' },
      source: { type: String, default: '' },
      distTags: { type: Schema.Types.Mixed, default: {} },
      coordinates: { type: Schema.Types.Mixed, default: {} },
      versionHistory: { type: [versionHistorySchema], default: [] },
      extras: { type: Schema.Types.Mixed, default: {} },
    },
  },
  { timestamps: true },
)

dependencyUpdateSchema.index(
  { userId: 1, dependencyId: 1 },
  { unique: true, name: 'dependency_update_unique' },
)
dependencyUpdateSchema.index({ userId: 1, repositoryId: 1 })
dependencyUpdateSchema.index({ userId: 1, updateStatus: 1 })
dependencyUpdateSchema.index({ userId: 1, securityStatus: 1 })
dependencyUpdateSchema.index({ userId: 1, updateType: 1 })
dependencyUpdateSchema.index({ userId: 1, ecosystem: 1 })
dependencyUpdateSchema.index({ userId: 1, packageName: 1 })
dependencyUpdateSchema.index({ userId: 1, lastCheckedAt: -1 })
dependencyUpdateSchema.index({ userId: 1, nextCheckAt: 1 })
dependencyUpdateSchema.index({ userId: 1, 'vulnerabilities.id': 1 })

dependencyUpdateSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('DependencyUpdate', dependencyUpdateSchema)
