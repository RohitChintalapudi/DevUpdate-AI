import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { connectDB } from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import { verifyCsrf } from './middleware/csrfMiddleware.js'
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js'

const app = express()
const PORT = process.env.PORT || 5000

app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error('Origin not allowed by CORS'))
    },
    credentials: true,
  }),
)

app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())
app.use(verifyCsrf)

// Brute-force protection for authentication endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Try again in 15 minutes.' },
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
})

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'DevUpdate AI API is running.', time: new Date().toISOString() })
})

app.use('/api/auth', authLimiter)
app.use('/api/auth/login', loginLimiter)
app.use('/api/auth', authRoutes)

app.use('/api', notFoundHandler)
app.use(errorHandler)

async function start() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`[server] DevUpdate AI API listening on http://localhost:${PORT}`)
  })
}

start().catch((error) => {
  console.error('[server] Failed to start:', error.message)
  process.exit(1)
})
