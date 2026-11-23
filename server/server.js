import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import { recoverStaleScans } from './services/scanService.js'
import { recoverStaleUpdateJobs } from './services/updateIntelligence/updateEngine/updateScheduler.js'
import { recoverStaleAiJobs } from './services/ai/jobs/aiScheduler.js'
import { expireStaleMemories } from './services/memory/memoryService.js'
import app from './app.js'

// 1. Process-level safety guards to ensure the server never terminates abruptly
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception caught safely (prevented server crash):', err?.stack || err?.message || err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[server] Unhandled rejection caught safely (prevented server crash):', reason?.stack || reason?.message || reason)
})

const PORT = Number(process.env.PORT) || 5000
let serverInstance = null

async function start() {
  console.log('[server] Initializing DevUpdate AI server...')

  // Connect to MongoDB with automatic backoff retry
  await connectDB().catch((err) => {
    console.error('[server] Initial database connection attempt failed, will continue retrying in background:', err.message)
  })

  // Recover stale background tasks safely without blocking startup
  Promise.allSettled([
    recoverStaleScans(),
    recoverStaleUpdateJobs(),
    recoverStaleAiJobs(),
    expireStaleMemories(),
  ]).then((results) => {
    results.forEach((res, index) => {
      if (res.status === 'rejected') {
        const names = ['scans', 'update jobs', 'AI jobs', 'memory expiry']
        console.warn(`[server] Recovery for ${names[index]} deferred:`, res.reason?.message || res.reason)
      }
    })
  })

  // Memory retention interval (24h)
  const retentionTimer = setInterval(() => {
    expireStaleMemories().catch((error) => {
      console.warn('[server] Scheduled memory expiry failed:', error.message)
    })
  }, 24 * 60 * 60 * 1000)
  retentionTimer.unref()

  // Start HTTP server with port error recovery
  serverInstance = app.listen(PORT, () => {
    console.log(`[server] DevUpdate AI API listening on http://localhost:${PORT}`)
  })

  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[server] Port ${PORT} is in use. Waiting 2.5s before retrying socket binding...`)
      setTimeout(() => {
        try {
          serverInstance.close()
        } catch {
          // ignore
        }
        serverInstance.listen(PORT)
      }, 2500)
    } else {
      console.error('[server] HTTP server encounter error:', err.message || err)
    }
  })
}

// Graceful termination handling
const handleShutdown = async (signal) => {
  console.log(`[server] Received ${signal}. Shutting down gracefully...`)
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('[server] HTTP server closed.')
    })
  }
  try {
    await mongoose.connection.close(false)
    console.log('[server] MongoDB connection closed.')
  } catch {
    // ignore
  }
  setTimeout(() => process.exit(0), 3000).unref()
}

process.on('SIGINT', () => handleShutdown('SIGINT'))
process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('SIGUSR2', () => handleShutdown('SIGUSR2')) // for nodemon/watch restart

start().catch((error) => {
  console.error('[server] Critical startup failure:', error?.stack || error?.message || error)
})
