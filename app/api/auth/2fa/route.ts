import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { setup2FA, verify2FA, hashBackupCodes } from '@/lib/totp-auth'
import connectDB from '@/lib/db'

// GET — Get 2FA status
export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const mongoose = await connectDB()
    const db = mongoose.connection.db
    if (!db) return NextResponse.json({ error: 'DB not ready' }, { status: 500 })

    const userDoc = await db.collection('users').findOne({ email: user.email })

    return NextResponse.json({
      enabled: userDoc?.twoFactorEnabled || false,
      hasBackupCodes: (userDoc?.twoFactorBackupCodes?.length || 0) > 0,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get 2FA status' }, { status: 500 })
  }
}

// POST — Enable/Verify/Disable 2FA
export async function POST(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { action, code } = body

    const mongoose = await connectDB()
    const db = mongoose.connection.db
    if (!db) return NextResponse.json({ error: 'DB not ready' }, { status: 500 })

    if (action === 'setup') {
      const setupData = setup2FA(user.email)
      await db.collection('users').updateOne(
        { email: user.email },
        { $set: { twoFactorSecret: setupData.secret.base32, twoFactorPending: true } }
      )
      return NextResponse.json({
        qrCodeUrl: setupData.qrCodeUrl,
        secret: setupData.secret.base32,
        backupCodes: setupData.backupCodes,
        otpauthUrl: setupData.secret.otpauthUrl,
      })
    }

    if (action === 'verify') {
      const userDoc = await db.collection('users').findOne({ email: user.email })
      if (!userDoc?.twoFactorSecret) return NextResponse.json({ error: '2FA not set up' }, { status: 400 })

      const result = verify2FA(code, userDoc.twoFactorSecret)
      if (!result.valid) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })

      const backupCodes = body.backupCodes || []
      await db.collection('users').updateOne(
        { email: user.email },
        { $set: { twoFactorEnabled: true, twoFactorPending: false, twoFactorBackupCodes: hashBackupCodes(backupCodes), twoFactorUsedBackupCodes: [] } }
      )
      return NextResponse.json({ success: true, message: '2FA enabled successfully' })
    }

    if (action === 'disable') {
      const userDoc = await db.collection('users').findOne({ email: user.email })
      if (!userDoc?.twoFactorSecret) return NextResponse.json({ error: '2FA not enabled' }, { status: 400 })

      const result = verify2FA(code, userDoc.twoFactorSecret)
      if (!result.valid) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })

      await db.collection('users').updateOne(
        { email: user.email },
        { $set: { twoFactorEnabled: false, twoFactorPending: false }, $unset: { twoFactorSecret: 1, twoFactorBackupCodes: 1 } }
      )
      return NextResponse.json({ success: true, message: '2FA disabled' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('2FA error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
