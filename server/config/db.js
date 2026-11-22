import mongoose from 'mongoose'

export async function connectDB() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    throw new Error('MONGO_URI is not defined. Add it to server/.env')
  }

  mongoose.set('strictQuery', true)

  try {
    const connection = await mongoose.connect(uri)
    const host = connection.connection.host
    console.log(`[db] MongoDB connected${host ? ` (${host})` : ''}`)
    return connection
  } catch (error) {
    console.error('[db] MongoDB connection failed:', error.message)
    throw error
  }
}
