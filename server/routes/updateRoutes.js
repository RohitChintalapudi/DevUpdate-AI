import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  checkAll,
  checkDependency,
  checkRepository,
  dependencyDetails,
  history,
  listRepositories,
  listUpdates,
  overview,
  repositoryDetails,
  status,
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

router.post('/dependency/:dependencyId/check', checkDependency)
router.get('/dependency/:dependencyId', dependencyDetails)
router.get('/history/:dependencyId', history)

export default router
