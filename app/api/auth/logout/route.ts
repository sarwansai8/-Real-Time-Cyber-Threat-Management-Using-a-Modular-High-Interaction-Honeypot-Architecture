import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { logoutSession } from '@/lib/session-manager'
import { logAudit } from '@/lib/audit-logger'
import { getAuthenticatedUser, getAuthTokenFromRequest, getClientIp, getUserAgent } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const token = getAuthTokenFromRequest(request)
  const user = getAuthenticatedUser(request)
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  })

  if (token) {
    try {
      await connectDB()
      await logoutSession(token)

      if (user) {
        await logAudit({
          userId: user.userId,
          action: 'logout',
          resource: 'session',
          resourceId: user.sessionId,
          details: { method: 'POST', endpoint: '/api/auth/logout' },
          ipAddress: getClientIp(request),
          userAgent: getUserAgent(request),
          complianceCategory: 'authentication',
          severity: 'info',
        })
      }
    } catch {
      // Keep logout idempotent even if session cleanup fails.
    }
  }

  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })

  response.cookies.set('refresh-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/api/auth/refresh',
  })

  response.cookies.set('session-id', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })

  return response
}
