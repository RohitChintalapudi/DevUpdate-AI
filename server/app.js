import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/authRoutes.js'
import githubRoutes from './routes/githubRoutes.js'
import repositoryRoutes from './routes/repositoryRoutes.js'
import dependencyRoutes from './routes/dependencyRoutes.js'
import updateRoutes from './routes/updateRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import {
  feedbackRouter,
  historyRouter,
  memoryRouter,
  notificationsRouter,
  reportsRouter,
} from './routes/phase5Routes.js'
import { verifyCsrf } from './middleware/csrfMiddleware.js'
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js'

const app = express()

app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)

const isDev = process.env.NODE_ENV !== 'production'
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      if (isDev && (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))) {
        return callback(null, true)
      }
      return callback(new Error('Origin not allowed by CORS'))
    },
    credentials: true,
  }),
)

app.use(express.json({ limit: '20kb' }))
app.use(cookieParser())
app.use(verifyCsrf)

const limiterMessage = (message) => ({
  success: false,
  message,
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limiterMessage('Too many authentication attempts. Try again in 15 minutes.'),
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: limiterMessage('Too many login attempts. Try again in 15 minutes.'),
})

const githubLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limiterMessage('Too many GitHub authorization requests. Try again in 15 minutes.'),
})

const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limiterMessage('Too many scan requests. Try again in 15 minutes.'),
})

const updateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limiterMessage('Too many update requests. Try again in 15 minutes.'),
})

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AI_API_RATE_LIMIT) || 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limiterMessage('Too many AI requests. Try again in 15 minutes.'),
})

const phase5Limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.PHASE5_API_RATE_LIMIT) || 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limiterMessage('Too many memory, report or notification requests. Try again in 15 minutes.'),
})

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'DevUpdate AI API is running.', time: new Date().toISOString() })
})

app.use('/api/auth', authLimiter)
app.use('/api/auth/login', loginLimiter)
app.use('/api/auth', authRoutes)

app.use('/api/github', githubLimiter)
app.use('/api/github', githubRoutes)

app.post('/api/repositories/sync', scanLimiter)
app.post('/api/repositories/:id/analyze', scanLimiter)
app.use('/api/repositories', repositoryRoutes)
app.use('/api/dependencies', dependencyRoutes)
app.use('/api/updates', updateLimiter)
app.use('/api/updates', updateRoutes)
app.use('/api/ai', aiLimiter)
app.use('/api/ai', aiRoutes)

app.use('/api/memory', phase5Limiter)
app.use('/api/memory', memoryRouter)
app.use('/api/feedback', phase5Limiter)
app.use('/api/feedback', feedbackRouter)
app.use('/api/history', phase5Limiter)
app.use('/api/history', historyRouter)
app.use('/api/reports', phase5Limiter)
app.use('/api/reports', reportsRouter)
app.use('/api/notifications', phase5Limiter)
app.use('/api/notifications', notificationsRouter)

app.use('/api', notFoundHandler)
app.use(errorHandler)

export default app
