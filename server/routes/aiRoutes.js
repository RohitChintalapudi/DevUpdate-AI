import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  analysisDetail,
  analyzeDependency,
  analyzeRepository,
  cancelJob,
  chat,
  conversationDetail,
  conversations,
  jobStatus,
  overview,
  recommendations,
  removeConversation,
  repositoryJobStatus,
  researchDependency,
  researchDocuments,
  serviceStatus,
} from '../controllers/aiController.js'

const router = Router()
router.use(protect)

router.get('/overview', overview)
router.get('/status', serviceStatus)
router.get('/recommendations', recommendations)

router.post('/analyze/repository/:repositoryId', analyzeRepository)
router.post('/analyze/dependency/:repositoryId/:dependencyId', analyzeDependency)
router.post('/research/dependency/:repositoryId/:dependencyId', researchDependency)
router.get('/research/documents', researchDocuments)

router.get('/jobs/repository/:repositoryId', repositoryJobStatus)
router.get('/jobs/:jobId', jobStatus)
router.post('/jobs/:jobId/cancel', cancelJob)

router.get('/analysis/:analysisId', analysisDetail)

router.get('/chat/:repositoryId/conversations', conversations)
router.get('/chat/:repositoryId/conversations/:conversationId', conversationDetail)
router.delete('/chat/conversations/:conversationId', removeConversation)
router.post('/chat/:repositoryId', chat)

export default router
