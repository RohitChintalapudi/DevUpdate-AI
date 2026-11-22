import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  callback,
  connect,
  disconnect,
  status,
} from '../controllers/githubController.js'

const router = Router()

// GitHub redirects here with a top-level GET, so this route intentionally does
// not require the JSON-only protect middleware; it validates its own signed state.
router.get('/callback', callback)
router.get('/connect', protect, connect)
router.get('/status', protect, status)
router.delete('/disconnect', protect, disconnect)

export default router
