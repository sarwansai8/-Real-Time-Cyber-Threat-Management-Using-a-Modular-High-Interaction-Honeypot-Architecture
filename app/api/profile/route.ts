import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { User } from '@/lib/models'
import { logAudit } from '@/lib/audit-logger'
import { profileUpdateSchema, sanitizeObject, validateRequest } from '@/lib/validations'
import { getAuthenticatedUser, getClientIp, getUserAgent, toPublicUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const userProfile = await User.findById(user.userId).select('-password -__v').lean()

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user: toPublicUser(userProfile as any) })
  } catch (error: any) {
    console.error('Fetch profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const validation = validateRequest(profileUpdateSchema, sanitizeObject(body))

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const updatedUser = await User.findByIdAndUpdate(
      user.userId,
      { $set: validation.data },
      { new: true, runValidators: true }
    ).select('-password -__v')

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await logAudit({
      userId: user.userId,
      action: 'update',
      resource: 'profile',
      resourceId: user.userId,
      details: { updatedFields: Object.keys(validation.data) },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    return NextResponse.json({ success: true, user: toPublicUser(updatedUser.toObject() as any) })
  } catch (error: any) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile', details: error.message },
      { status: 500 }
    )
  }
}
