import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { User } from '@/lib/models'
import { logAudit } from '@/lib/audit-logger'
import { adminUserUpdateSchema, mongoIdSchema, sanitizeObject, validateRequest } from '@/lib/validations'
import { getAuthenticatedUser, getClientIp, getUserAgent, isAdmin } from '@/lib/auth'
import { escapeRegex } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')?.trim() || ''
    const verified = searchParams.get('verified')
    const search = searchParams.get('search')?.trim() || ''

    const query: Record<string, unknown> = {}

    if (role && ['patient', 'admin', 'doctor'].includes(role)) {
      query.role = role
    }

    if (verified === 'true' || verified === 'false') {
      query.verified = verified === 'true'
    }

    if (search) {
      const pattern = escapeRegex(search)
      query.$or = [
        { email: { $regex: pattern, $options: 'i' } },
        { firstName: { $regex: pattern, $options: 'i' } },
        { lastName: { $regex: pattern, $options: 'i' } },
        { phone: { $regex: pattern, $options: 'i' } },
      ]
    }

    const users = await User.find(query)
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .lean()

    await logAudit({
      userId: user.userId,
      action: 'read',
      resource: 'users',
      details: {
        method: 'GET',
        endpoint: '/api/admin/users',
        query: { role, verified, search },
        count: users.length,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'phi_access',
      severity: 'info',
    })

    return NextResponse.json({
      success: true,
      users: users.map((item: any) => ({ ...item, _id: String(item._id) })),
      count: users.length,
    })
  } catch (error: any) {
    console.error('Fetch users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    await connectDB()

    const body = await request.json()
    const validation = validateRequest(adminUserUpdateSchema, sanitizeObject(body))

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { userId, ...updates } = validation.data

    if (userId === user.userId && updates.role && updates.role !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot remove your own admin role' },
        { status: 400 }
      )
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -__v')

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await logAudit({
      userId: user.userId,
      action: 'update',
      resource: 'users',
      resourceId: userId,
      details: {
        method: 'PATCH',
        endpoint: '/api/admin/users',
        changes: updates,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: 'warning',
    })

    return NextResponse.json({ success: true, user: { ...updatedUser.toObject(), _id: userId } })
  } catch (error: any) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userIdValidation = validateRequest(mongoIdSchema, userId)

    if (!userIdValidation.success) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    if (userIdValidation.data === user.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const deletedUser = await User.findByIdAndDelete(userIdValidation.data)

    if (!deletedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await logAudit({
      userId: user.userId,
      action: 'delete',
      resource: 'users',
      resourceId: userIdValidation.data,
      details: {
        method: 'DELETE',
        endpoint: '/api/admin/users',
        deletedEmail: deletedUser.email,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: 'critical',
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error: any) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 500 }
    )
  }
}
