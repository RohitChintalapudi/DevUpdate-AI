import 'dotenv/config'
import { connectDB } from './config/db.js'
import { recoverStaleScans } from './services/scanService.js'
import { recoverStaleUpdateJobs } from './services/updateIntelligence/updateEngine/updateScheduler.js'
import { recoverStaleAiJobs } from './services/ai/jobs/aiScheduler.js'
import { expireStaleMemories } from './services/memory/memoryService.js'
import app from './app.js'

const PORT = process.env.PORT || 5000

async function start() {
  await connectDB()
  await recoverStaleScans().catch((error) => {
    console.warn('[server] Could not recover stale scan jobs:', error.message)
  })
  await recoverStaleUpdateJobs().catch((error) => {
    console.warn('[server] Could not recover stale update jobs:', error.message)
  })
  await recoverStaleAiJobs().catch((error) => {
    console.warn('[server] Could not recover stale AI jobs:', error.message)
  })
  await expireStaleMemories().catch((error) => {
    console.warn('[server] Could not expire stale memories:', error.message)
  })

  // Memory retention is enforced locally. Memento remains a best-effort mirror.
  const retentionTimer = setInterval(() => {
    expireStaleMemories().catch((error) => {
      console.warn('[server] Scheduled memory expiry failed:', error.message)
    })
  }, 24 * 60 * 60 * 1000)
  retentionTimer.unref()

  app.listen(PORT, () => {
    console.log(`[server] DevUpdate AI API listening on http://localhost:${PORT}`)
  })
}

start().catch((error) => {
  console.error('[server] Failed to start:', error.message)
  process.exit(1)
})
