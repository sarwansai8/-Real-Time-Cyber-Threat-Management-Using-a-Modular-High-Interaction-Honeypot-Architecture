import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { MedicalRecord } from '@/lib/models'
import { logAudit } from '@/lib/audit-logger'
import {
  medicalRecordSchema,
  medicalRecordUpdateSchema,
  mongoIdSchema,
  sanitizeObject,
  validateRequest,
} from '@/lib/validations'
import { getAuthenticatedUser, getClientIp, getUserAgent } from '@/lib/auth'
import { escapeRegex } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = Math.max(Number.parseInt(searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.min(Math.max(Number.parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 100)
    const search = searchParams.get('search')?.trim() || ''
    const type = searchParams.get('type')?.trim() || ''

    const query: Record<string, unknown> = { userId: user.userId }

    if (type && type !== 'all') {
      query.type = type
    }

    if (search) {
      const pattern = escapeRegex(search)
      query.$or = [
        { title: { $regex: pattern, $options: 'i' } },
        { provider: { $regex: pattern, $options: 'i' } },
        { description: { $regex: pattern, $options: 'i' } },
      ]
    }

    const skip = (page - 1) * limit

    const [total, records] = await Promise.all([
      MedicalRecord.countDocuments(query),
      MedicalRecord.find(query)
        .select('-__v')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ])

    return NextResponse.json({
      success: true,
      records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Fetch medical records error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch medical records', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const validation = validateRequest(medicalRecordSchema, sanitizeObject(body))

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const record = await MedicalRecord.create({
      ...validation.data,
      userId: user.userId,
    })

    await logAudit({
      userId: user.userId,
      action: 'create',
      resource: 'medical-records',
      resourceId: (record as any)._id.toString(),
      details: { method: 'POST', endpoint: '/api/medical-records', title: record.title },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: 'warning',
    })

    return NextResponse.json({ success: true, record }, { status: 201 })
  } catch (error: any) {
    console.error('Create medical record error:', error)
    return NextResponse.json(
      { error: 'Failed to create medical record', details: error.message },
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
    const validation = validateRequest(medicalRecordUpdateSchema, sanitizeObject(body))

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { id, ...updates } = validation.data
    const record = await MedicalRecord.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: updates },
      { new: true, runValidators: true }
    )

    if (!record) {
      return NextResponse.json({ error: 'Medical record not found' }, { status: 404 })
    }

    await logAudit({
      userId: user.userId,
      action: 'update',
      resource: 'medical-records',
      resourceId: id,
      details: { method: 'PATCH', endpoint: '/api/medical-records', changes: updates },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: 'warning',
    })

    return NextResponse.json({ success: true, record })
  } catch (error: any) {
    console.error('Update medical record error:', error)
    return NextResponse.json(
      { error: 'Failed to update medical record', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const idValidation = validateRequest(mongoIdSchema, id)

    if (!idValidation.success) {
      return NextResponse.json({ error: 'Medical record ID required' }, { status: 400 })
    }

    const record = await MedicalRecord.findOneAndDelete({
      _id: idValidation.data,
      userId: user.userId,
    })

    if (!record) {
      return NextResponse.json({ error: 'Medical record not found' }, { status: 404 })
    }

    await logAudit({
      userId: user.userId,
      action: 'delete',
      resource: 'medical-records',
      resourceId: idValidation.data,
      details: { method: 'DELETE', endpoint: '/api/medical-records', title: record.title },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: 'critical',
    })

    return NextResponse.json({ success: true, message: 'Medical record deleted' })
  } catch (error: any) {
    console.error('Delete medical record error:', error)
    return NextResponse.json(
      { error: 'Failed to delete medical record', details: error.message },
      { status: 500 }
    )
  }
}
