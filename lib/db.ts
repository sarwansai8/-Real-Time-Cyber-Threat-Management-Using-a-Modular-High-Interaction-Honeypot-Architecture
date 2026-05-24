import mongoose from 'mongoose'
import { logger } from './logger'

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null }

if (!global.mongooseCache) {
  global.mongooseCache = cached
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn
  }

  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    throw new Error('Please define MONGODB_URI environment variable in .env.local')
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        logger.database('MongoDB connected successfully')
        return mongoose
      })
      .catch((error) => {
        logger.error('MongoDB connection error', error)
        cached.promise = null
        throw error
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectDB
