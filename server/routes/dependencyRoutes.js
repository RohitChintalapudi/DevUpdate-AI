import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  listByRepository,
  listDependencies,
} from '../controllers/dependenciesController.js'

const router = Router()
router.use(protect)

router.get('/', listDependencies)
router.get('/:repositoryId', listByRepository)

export default router
