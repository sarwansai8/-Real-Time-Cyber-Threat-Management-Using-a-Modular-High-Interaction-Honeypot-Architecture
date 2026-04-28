import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { HealthUpdate } from '@/lib/models'
import { logAudit } from '@/lib/audit-logger'
import {
  healthUpdateSchema,
  healthUpdateUpdateSchema,
  mongoIdSchema,
  sanitizeObject,
  validateRequest,
} from '@/lib/validations'
import { getAuthenticatedUser, getClientIp, getUserAgent, isAdmin } from '@/lib/auth'
import { escapeRegex } from '@/lib/utils'
import type { HealthUpdateSummary } from '@/lib/types'

function serializeHealthUpdate(update: any): HealthUpdateSummary {
  return {
    id: String(update._id),
    title: update.title,
    summary: update.summary,
    content: update.content,
    category: update.category,
    severity: update.severity,
    publishedDate: new Date(update.publishedDate).toISOString(),
    publishedBy: update.publishedBy,
    status: update.status,
    region: update.region,
    views: update.views || 0,
    savedCount: update.savedCount || 0,
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    const canManageAll = isAdmin(user)

    await connectDB()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const category = searchParams.get('category')?.trim() || ''
    const severity = searchParams.get('severity')?.trim() || ''
    const status = searchParams.get('status')?.trim() || ''

    const query: Record<string, unknown> = canManageAll ? {} : { status: 'published' }

    if (category && category !== 'all') {
      query.category = category
    }

    if (severity && severity !== 'all') {
      query.severity = severity
    }

    if (canManageAll && status && status !== 'all') {
      query.status = status
    }

    if (search) {
      const pattern = escapeRegex(search)
      query.$or = [
        { title: { $regex: pattern, $options: 'i' } },
        { summary: { $regex: pattern, $options: 'i' } },
        { content: { $regex: pattern, $options: 'i' } },
      ]
    }

    const updates = await HealthUpdate.find(query)
      .sort({ publishedDate: -1, createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      updates: updates.map(serializeHealthUpdate),
      count: updates.length,
    })
  } catch (error: any) {
    console.error('Fetch health updates error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch health updates', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
    }

    await connectDB()

    const body = await request.json()
    const validation = validateRequest(healthUpdateSchema, sanitizeObject(body))

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const update = await HealthUpdate.create({
      ...validation.data,
      publishedBy: user.email,
    })

    await logAudit({
      userId: user.userId,
      action: 'create',
      resource: 'health-updates',
      resourceId: (update as any)._id.toString(),
      details: { method: 'POST', endpoint: '/api/health-updates', title: update.title },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: update.severity === 'critical' ? 'critical' : 'warning',
    })

    return NextResponse.json({ success: true, update: serializeHealthUpdate(update.toObject()) }, { status: 201 })
  } catch (error: any) {
    console.error('Create health update error:', error)
    return NextResponse.json(
      { error: 'Failed to create health update', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
    }

    await connectDB()

    const body = await request.json()
    const validation = validateRequest(healthUpdateUpdateSchema, sanitizeObject(body))

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { id, ...updates } = validation.data
    const update = await HealthUpdate.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )

    if (!update) {
      return NextResponse.json({ error: 'Health update not found' }, { status: 404 })
    }

    await logAudit({
      userId: user.userId,
      action: 'update',
      resource: 'health-updates',
      resourceId: id,
      details: { method: 'PATCH', endpoint: '/api/health-updates', changes: updates },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: update.severity === 'critical' ? 'critical' : 'warning',
    })

    return NextResponse.json({ success: true, update: serializeHealthUpdate(update.toObject()) })
  } catch (error: any) {
    console.error('Update health update error:', error)
    return NextResponse.json(
      { error: 'Failed to update health update', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const idValidation = validateRequest(mongoIdSchema, id)

    if (!idValidation.success) {
      return NextResponse.json({ error: 'Health update ID required' }, { status: 400 })
    }

    const update = await HealthUpdate.findByIdAndDelete(idValidation.data)

    if (!update) {
      return NextResponse.json({ error: 'Health update not found' }, { status: 404 })
    }

    await logAudit({
      userId: user.userId,
      action: 'delete',
      resource: 'health-updates',
      resourceId: idValidation.data,
      details: { method: 'DELETE', endpoint: '/api/health-updates', title: update.title },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: 'critical',
    })

    return NextResponse.json({ success: true, message: 'Health update deleted' })
  } catch (error: any) {
    console.error('Delete health update error:', error)
    return NextResponse.json(
      { error: 'Failed to delete health update', details: error.message },
      { status: 500 }
    )
  }
}
