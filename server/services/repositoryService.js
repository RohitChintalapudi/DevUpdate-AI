import GitHubConnection from '../models/GitHubConnection.js'
import Repository from '../models/Repository.js'
import { AppError } from '../utils/errors.js'
import { listAccessibleRepositories } from './githubService.js'

export async function syncRepositories(userId) {
  const connection = await GitHubConnection.findOne({ userId, status: 'CONNECTED' })
  if (!connection) throw new AppError('Connect GitHub before syncing repositories.', 409)

  const repositories = await listAccessibleRepositories(connection.installationId)
  if (repositories.length) {
    await Repository.bulkWrite(
      repositories.map((repository) => ({
        updateOne: {
          filter: { userId, githubRepositoryId: repository.githubRepositoryId },
          update: {
            $set: repository,
            $setOnInsert: {
              selectedForAnalysis: false,
              scanStatus: 'NOT_SCANNED',
              dependencyCount: 0,
              manifestFiles: [],
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    )
  }

  return {
    synced: repositories.length,
    total: await Repository.countDocuments({ userId }),
  }
}
