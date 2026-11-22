import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  analyze,
  getRepository,
  listRepositories,
  scanStatus,
  sync,
} from '../controllers/repositoriesController.js'

const router = Router()
router.use(protect)

router.get('/', listRepositories)
router.post('/sync', sync)
router.get('/:id', getRepository)
router.post('/:id/analyze', analyze)
router.get('/:id/scan-status', scanStatus)

export default router
