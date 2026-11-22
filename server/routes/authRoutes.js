import { Router } from 'express'
import {
  login,
  logout,
  me,
  session,
  signup,
  updateProfile,
} from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'
import { issueCsrfToken } from '../middleware/csrfMiddleware.js'

const router = Router()

router.get('/csrf', issueCsrfToken)
router.get('/session', session)
router.post('/signup', signup)
router.post('/login', login)
router.post('/logout', logout)
router.get('/me', protect, me)
router.patch('/me', protect, updateProfile)

export default router
