import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  checkAll,
  checkDependency,
  checkRepository,
  dependencyDetails,
  exportRepositoryPdf,
  getDependencyAnalysisEndpoint,
  getDependencyResearchEndpoint,
  getRepositoryResearchStatusEndpoint,
  history,
  listRepositories,
  listUpdates,
  overview,
  repositoryDependencies,
  repositoryDetails,
  status,
  triggerDependencyAnalysisEndpoint,
  triggerDependencyResearch,
  triggerRepositoryResearch,
  vulnerabilities,
} from '../controllers/updateController.js'

const router = Router()
router.use(protect)

router.get('/overview', overview)
router.get('/repositories', listRepositories)
router.get('/list', listUpdates)
router.get('/vulnerabilities', vulnerabilities)
router.get('/status/:repositoryId', status)

router.post('/check-all', checkAll)
router.post('/repository/:repositoryId/check', checkRepository)
router.get('/repository/:repositoryId', repositoryDetails)
router.get('/repository/:repositoryId/export-pdf', exportRepositoryPdf)
router.post('/repository/:repositoryId/research', triggerRepositoryResearch)
router.get('/repository/:repositoryId/research-status', getRepositoryResearchStatusEndpoint)
router.get('/repository/:repositoryId/dependencies', repositoryDependencies)

router.post('/dependency/:dependencyId/check', checkDependency)
router.get('/dependency/:dependencyId', dependencyDetails)
router.post('/dependency/:dependencyId/research', triggerDependencyResearch)
router.get('/dependency/:dependencyId/research', getDependencyResearchEndpoint)
router.post('/dependency/:dependencyId/analyze', triggerDependencyAnalysisEndpoint)
router.get('/dependency/:dependencyId/analysis', getDependencyAnalysisEndpoint)
router.get('/history/:dependencyId', history)

export default router
