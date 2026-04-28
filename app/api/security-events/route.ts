import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { SecurityEvent } from '@/lib/models'
import connectDB from '@/lib/db'
import { createSecurityEvent } from '@/lib/security-events'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || 
                 request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) return null
  
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch {
    return null
  }
}

// GET - Fetch security events (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromToken(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity')
    const eventType = searchParams.get('type') || searchParams.get('eventType')
    const limit = parseInt(searchParams.get('limit') || '100')
    
    let query: any = {}
    if (severity) query.severity = severity
    if (eventType) query.type = eventType

    const events = await SecurityEvent.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({ success: true, events })

  } catch (error: any) {
    console.error('Fetch security events error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security events', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Log security event
export async function POST(request: NextRequest) {
  try {
    // Security events can be logged by anyone (for tracking suspicious activity)
    // But we'll verify the request has some basic auth or is from our app
    
    await connectDB()
    
    const body = await request.json()
    const event = await createSecurityEvent(body, { request })

    return NextResponse.json({ success: true, event }, { status: 201 })

  } catch (error: any) {
    console.error('Log security event error:', error)
    return NextResponse.json(
      { error: 'Failed to log security event', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete old security events (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromToken(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const deleteAll = searchParams.get('all') === 'true'
    const days = parseInt(searchParams.get('days') || '30')

    let result

    if (deleteAll || days <= 0) {
      result = await SecurityEvent.deleteMany({})
    } else {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      result = await SecurityEvent.deleteMany({
        timestamp: { $lt: cutoffDate }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: deleteAll || days <= 0
        ? `Deleted ${result.deletedCount} security events`
        : `Deleted ${result.deletedCount} events older than ${days} days`
    })

  } catch (error: any) {
    console.error('Delete security events error:', error)
    return NextResponse.json(
      { error: 'Failed to delete security events', details: error.message },
      { status: 500 }
    )
  }
}
