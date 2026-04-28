import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { getActiveSessionCount } from '@/lib/session-anomaly'

const activeSessions = new Map<string, Array<{
  sessionId: string; userId: string; device: string; browser: string
  ip: string; location: string; loginTime: string; lastActive: string; isCurrent: boolean
}>>()

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userSessions = activeSessions.get(user.userId) || []
    if (userSessions.length === 0) {
      const ua = request.headers.get('user-agent') || 'Unknown'
      userSessions.push({
        sessionId: 'current', userId: user.userId,
        device: ua.includes('Mobile') ? 'Mobile' : 'Desktop',
        browser: ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : 'Other',
        ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
        location: 'Current', loginTime: new Date().toISOString(),
        lastActive: new Date().toISOString(), isCurrent: true,
      })
      activeSessions.set(user.userId, userSessions)
    }
    return NextResponse.json({ sessions: userSessions, totalActive: getActiveSessionCount() })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (body.terminateAll) {
      const s = (activeSessions.get(user.userId) || []).filter((s) => s.isCurrent)
      activeSessions.set(user.userId, s)
      return NextResponse.json({ message: 'All other sessions terminated' })
    }
    if (body.sessionId) {
      activeSessions.set(user.userId, (activeSessions.get(user.userId) || []).filter((s) => s.sessionId !== body.sessionId))
      return NextResponse.json({ message: 'Session terminated' })
    }
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
