import mongoose from 'mongoose'

let listenersAttached = false

function attachConnectionListeners() {
  if (listenersAttached) return
  listenersAttached = true

  mongoose.connection.on('connected', () => {
    const host = mongoose.connection.host || 'remote'
    console.log(`[db] MongoDB connected (${host})`)
  })

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected. Mongoose will attempt to reconnect automatically.')
  })

  mongoose.connection.on('reconnected', () => {
    console.log('[db] MongoDB reconnected successfully.')
  })

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err.message || err)
  })
}

export async function connectDB(maxRetries = 10, retryDelayMs = 2500) {
  const uri = process.env.MONGO_URI
  if (!uri) {
    throw new Error('MONGO_URI is not defined. Add it to server/.env')
  }

  mongoose.set('strictQuery', true)
  attachConnectionListeners()

  // If already connected, return current connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  const options = {
    serverSelectionTimeoutMS: 15000,
    heartbeatFrequencyMS: 10000,
    maxPoolSize: 25,
    minPoolSize: 2,
    retryWrites: true,
    retryReads: true,
  }

  let attempt = 0
  while (attempt < maxRetries) {
    attempt += 1
    try {
      const connection = await mongoose.connect(uri, options)
      const host = connection.connection.host
      if (attempt > 1) {
        console.log(`[db] MongoDB connected on attempt ${attempt} (${host})`)
      }

      // Non-blocking purge of any legacy scoped @ dependencies across collections
      setImmediate(async () => {
        try {
          const collections = await mongoose.connection.db.listCollections().toArray()
          const names = new Set(collections.map((c) => c.name))
          if (names.has('dependencies')) {
            await mongoose.connection.db.collection('dependencies').deleteMany({ packageName: /^@/ })
          }
          if (names.has('dependencyupdates')) {
            await mongoose.connection.db.collection('dependencyupdates').deleteMany({ packageName: /^@/ })
          }
        } catch {
          // ignore background cleanup error
        }
      })

      return connection
    } catch (error) {
      console.warn(`[db] MongoDB connection attempt ${attempt}/${maxRetries} failed: ${error.message}`)
      if (attempt >= maxRetries) {
        console.error('[db] Maximum MongoDB connection retries exceeded.')
        throw error
      }
      const backoff = Math.min(retryDelayMs * Math.pow(1.3, attempt - 1), 15000)
      console.log(`[db] Retrying MongoDB connection in ${Math.round(backoff / 1000)}s...`)
      await new Promise((resolve) => setTimeout(resolve, backoff))
    }
  }
}
