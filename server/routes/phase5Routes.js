import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  decisionList,
  decisionOptions,
  decisionRecord,
  historyCompare,
  historyComparisonDetail,
  historyComparisons,
  historyDependency,
  memoryContext,
  memoryCreate,
  memoryDelete,
  memoryDetail,
  memoryExpire,
  memoryList,
  memoryRebuild,
  memoryStatus,
  memoryUpdate,
  notificationDelete,
  notificationDetailRead,
  notificationList,
  notificationPreferences,
  notificationPreferencesUpdate,
  notificationRead,
  notificationReadAll,
  notificationRecent,
  notificationUnreadCount,
  reportDelete,
  reportDetail,
  reportExport,
  reportGenerate,
  reportList,
  reportOptions,
} from '../controllers/phase5Controller.js'

export const memoryRouter = Router()
memoryRouter.use(protect)
memoryRouter.get('/status', memoryStatus)
memoryRouter.get('/repositories/:repositoryId', memoryList)
memoryRouter.post('/repositories/:repositoryId', memoryCreate)
memoryRouter.get('/repositories/:repositoryId/context', memoryContext)
memoryRouter.post('/repositories/:repositoryId/rebuild', memoryRebuild)
memoryRouter.post('/expire', memoryExpire)
memoryRouter.get('/items/:memoryId', memoryDetail)
memoryRouter.patch('/items/:memoryId', memoryUpdate)
memoryRouter.delete('/items/:memoryId', memoryDelete)

export const feedbackRouter = Router()
feedbackRouter.use(protect)
feedbackRouter.get('/options', decisionOptions)
feedbackRouter.get('/repositories/:repositoryId', decisionList)
feedbackRouter.post('/analyses/:analysisId', decisionRecord)

export const historyRouter = Router()
historyRouter.use(protect)
historyRouter.get('/repositories/:repositoryId', historyComparisons)
historyRouter.get('/dependencies/:dependencyId', historyDependency)
historyRouter.get('/dependencies/:dependencyId/comparison', historyComparisonDetail)
historyRouter.post('/analyses/:analysisId/compare', historyCompare)

export const reportsRouter = Router()
reportsRouter.use(protect)
reportsRouter.get('/options', reportOptions)
reportsRouter.post('/', reportGenerate)
reportsRouter.get('/', reportList)
reportsRouter.get('/:reportId', reportDetail)
reportsRouter.get('/:reportId/export', reportExport)
reportsRouter.delete('/:reportId', reportDelete)

export const notificationsRouter = Router()
notificationsRouter.use(protect)
notificationsRouter.get('/', notificationList)
notificationsRouter.get('/recent', notificationRecent)
notificationsRouter.get('/unread-count', notificationUnreadCount)
notificationsRouter.get('/preferences', notificationPreferences)
notificationsRouter.patch('/preferences', notificationPreferencesUpdate)
notificationsRouter.patch('/read', notificationRead)
notificationsRouter.patch('/read-all', notificationReadAll)
notificationsRouter.patch('/:notificationId/read', notificationDetailRead)
notificationsRouter.delete('/:notificationId', notificationDelete)
