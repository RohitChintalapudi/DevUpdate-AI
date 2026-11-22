import mongoose from 'mongoose'

const { Schema } = mongoose

const researchFindingSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    sourceType: {
      type: String,
      enum: [
        'OFFICIAL_DOCS',
        'REPOSITORY',
        'CHANGELOG',
        'RELEASE_NOTES',
        'MIGRATION_GUIDE',
        'API_DOCS',
        'SECURITY_ADVISORY',
        'REGISTRY',
      ],
      default: 'OFFICIAL_DOCS',
    },
    publishedAt: { type: Date, default: null },
    retrievedAt: { type: Date, default: Date.now },
    versionRange: { type: String, default: '' },
    evidence: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 1, default: 0.8 },
  },
  { _id: false },
)

const breakingChangeSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN'], default: 'MEDIUM' },
    sourceUrl: { type: String, default: '' },
    affectedApis: { type: [String], default: [] },
    mitigation: { type: String, default: '' },
  },
  { _id: false },
)

const migrationStepSchema = new Schema(
  {
    order: { type: Number, required: true },
    action: { type: String, required: true },
    details: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
  },
  { _id: false },
)

const dependencyResearchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    dependencyId: { type: Schema.Types.ObjectId, ref: 'Dependency', required: true, index: true },
    updateId: { type: Schema.Types.ObjectId, ref: 'DependencyUpdate', default: null, index: true },
    packageName: { type: String, required: true, index: true },
    ecosystem: { type: String, required: true },
    installedVersion: { type: String, default: '' },
    targetVersion: { type: String, default: '' },

    packageInfo: {
      name: { type: String, default: '' },
      description: { type: String, default: '' },
      websiteUrl: { type: String, default: '' },
      repositoryUrl: { type: String, default: '' },
      documentationUrl: { type: String, default: '' },
      registryUrl: { type: String, default: '' },
    },

    releaseIntelligence: {
      recentReleases: {
        type: [
          new Schema(
            {
              version: { type: String, default: '' },
              releaseDate: { type: Date, default: null },
              summary: { type: String, default: '' },
            },
            { _id: false },
          ),
        ],
        default: [],
      },
      changesIntroduced: { type: [String], default: [] },
      newFeatures: { type: [String], default: [] },
      bugFixes: { type: [String], default: [] },
      deprecations: { type: [String], default: [] },
      breakingChanges: { type: [String], default: [] },
      securityFixes: { type: [String], default: [] },
    },

    migrationIntelligence: {
      migrationGuideUrl: { type: String, default: '' },
      hasMigrationGuide: { type: Boolean, default: false },
      configChanges: { type: [String], default: [] },
      removedApis: { type: [String], default: [] },
      renamedApis: { type: [String], default: [] },
      changedDefaults: { type: [String], default: [] },
      runtimeRequirements: { type: [String], default: [] },
      steps: { type: [migrationStepSchema], default: [] },
    },

    findings: { type: [researchFindingSchema], default: [] },
    breakingChanges: { type: [breakingChangeSchema], default: [] },
    sourceUrls: { type: [String], default: [] },

    researchStatus: {
      type: String,
      enum: ['NOT_RESEARCHED', 'QUEUED', 'RESEARCHING', 'COMPLETED', 'PARTIAL', 'FAILED'],
      default: 'NOT_RESEARCHED',
      index: true,
    },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    error: { type: String, default: '' },
    researchedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true },
)

dependencyResearchSchema.index(
  { userId: 1, repositoryId: 1, dependencyId: 1 },
  { unique: true, name: 'dependency_research_user_repo_dep_unique' },
)

dependencyResearchSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('DependencyResearch', dependencyResearchSchema)
