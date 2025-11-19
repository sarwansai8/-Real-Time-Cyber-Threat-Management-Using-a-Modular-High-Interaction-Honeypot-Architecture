import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Health Check Endpoint
 * Used for monitoring, load balancers, and container orchestration
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        api: 'ok',
        database: 'checking',
        memory: 'ok',
      },
      responseTime: 0,
    }

    // Check memory usage
    const memUsage = process.memoryUsage()
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    }

    // Warn if memory usage is high
    if (memUsageMB.heapUsed > 500) {
      health.checks.memory = 'warning'
      logger.warn('High memory usage detected', { memUsageMB })
    }

    // Check database connection
    try {
      const db = await connectDB()
      if (db.connection.readyState === 1) {
        health.checks.database = 'ok'
      } else {
        health.checks.database = 'degraded'
        health.status = 'degraded'
      }
    } catch (error) {
      health.checks.database = 'error'
      health.status = 'unhealthy'
      logger.error('Database health check failed', error)
    }

    // Calculate response time
    health.responseTime = Date.now() - startTime

    // Determine HTTP status code
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503

    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    logger.error('Health check endpoint error', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        responseTime: Date.now() - startTime,
      },
      { status: 503 }
    )
  }
}

// Support HEAD requests for simple health checks
export async function HEAD(request: NextRequest) {
  try {
    const db = await connectDB()
    if (db.connection.readyState === 1) {
      return new NextResponse(null, { status: 200 })
    } else {
      return new NextResponse(null, { status: 503 })
    }
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}

