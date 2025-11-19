/**
 * Database Indexes Setup Script
 * Creates indexes for optimal query performance
 * Run this script after database migration or setup
 */

import connectDB from './db'
import mongoose from 'mongoose'
import { logger } from './logger'

async function createIndexes() {
  try {
    logger.database('Connecting to database...')
    await connectDB()

    const db = mongoose.connection.db
    if (!db) {
      throw new Error('Database connection not established')
    }

    logger.database('Creating indexes...')

    // Users Collection Indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true })
    await db.collection('users').createIndex({ role: 1 })
    await db.collection('users').createIndex({ verified: 1 })
    await db.collection('users').createIndex({ createdAt: -1 })
    logger.info('✓ Users indexes created')

    // Appointments Collection Indexes
    await db.collection('appointments').createIndex({ userId: 1, date: -1 })
    await db.collection('appointments').createIndex({ status: 1, date: 1 })
    await db.collection('appointments').createIndex({ date: 1, time: 1 })
    await db.collection('appointments').createIndex({ createdAt: -1 })
    logger.info('✓ Appointments indexes created')

    // Medical Records Collection Indexes
    await db.collection('medicalrecords').createIndex({ userId: 1, date: -1 })
    await db.collection('medicalrecords').createIndex({ type: 1 })
    await db.collection('medicalrecords').createIndex({ confidential: 1 })
    await db.collection('medicalrecords').createIndex({ userId: 1, type: 1 })
    await db.collection('medicalrecords').createIndex({ createdAt: -1 })
    logger.info('✓ Medical Records indexes created')

    // Vaccinations Collection Indexes
    await db.collection('vaccinations').createIndex({ userId: 1, date: -1 })
    await db.collection('vaccinations').createIndex({ nextDueDate: 1 })
    await db.collection('vaccinations').createIndex({ userId: 1, vaccineName: 1 })
    await db.collection('vaccinations').createIndex({ createdAt: -1 })
    logger.info('✓ Vaccinations indexes created')

    // Health Updates Collection Indexes
    await db.collection('healthupdates').createIndex({ publishedDate: -1 })
    await db.collection('healthupdates').createIndex({ category: 1, publishedDate: -1 })
    await db.collection('healthupdates').createIndex({ severity: 1, publishedDate: -1 })
    await db.collection('healthupdates').createIndex({ views: -1 })
    logger.info('✓ Health Updates indexes created')

    // Audit Logs Collection Indexes (Critical for compliance)
    await db.collection('auditlogs').createIndex({ timestamp: -1 })
    await db.collection('auditlogs').createIndex({ userId: 1, timestamp: -1 })
    await db.collection('auditlogs').createIndex({ userEmail: 1, timestamp: -1 })
    await db.collection('auditlogs').createIndex({ action: 1, timestamp: -1 })
    await db.collection('auditlogs').createIndex({ resource: 1, timestamp: -1 })
    await db.collection('auditlogs').createIndex({ ipAddress: 1, timestamp: -1 })
    await db.collection('auditlogs').createIndex({ sensitiveData: 1, timestamp: -1 })
    // TTL index to auto-delete logs older than 7 years (HIPAA requirement)
    await db.collection('auditlogs').createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 220752000 } // 7 years in seconds
    )
    logger.info('✓ Audit Logs indexes created')

    // Security Events Collection Indexes
    await db.collection('securityevents').createIndex({ timestamp: -1 })
    await db.collection('securityevents').createIndex({ ipAddress: 1, timestamp: -1 })
    await db.collection('securityevents').createIndex({ type: 1, timestamp: -1 })
    await db.collection('securityevents').createIndex({ severity: 1, timestamp: -1 })
    await db.collection('securityevents').createIndex({ userId: 1, timestamp: -1 })
    // TTL index to auto-delete events older than 90 days
    await db.collection('securityevents').createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 7776000 } // 90 days in seconds
    )
    logger.info('✓ Security Events indexes created')

    // Sessions Collection Indexes (if using session store)
    await db.collection('sessions').createIndex({ userId: 1 })
    await db.collection('sessions').createIndex({ expiresAt: 1 })
    // TTL index to auto-delete expired sessions
    await db.collection('sessions').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    )
    logger.info('✓ Sessions indexes created')

    logger.database('All indexes created successfully!')

    // List all indexes for verification
    const collections = await db.listCollections().toArray()
    logger.info('\n📋 Index Summary:')
    for (const collection of collections) {
      const indexes = await db.collection(collection.name).indexes()
      logger.info(`\n${collection.name}: ${indexes.length} indexes`)
    }

    await mongoose.connection.close()
    logger.database('Database connection closed')
  } catch (error) {
    logger.error('Failed to create indexes', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  createIndexes()
    .then(() => {
      logger.info('Index creation completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Index creation failed', error)
      process.exit(1)
    })
}

export default createIndexes

