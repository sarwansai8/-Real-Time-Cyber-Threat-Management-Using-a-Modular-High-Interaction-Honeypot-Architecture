import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { Vaccination } from '@/lib/models'
import { logAudit } from '@/lib/audit-logger'
import {
  mongoIdSchema,
  sanitizeObject,
  validateRequest,
  vaccinationSchema,
  vaccinationUpdateSchema,
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

    const query: Record<string, unknown> = { userId: user.userId }

    if (search) {
      const pattern = escapeRegex(search)
      query.$or = [
        { vaccineName: { $regex: pattern, $options: 'i' } },
        { provider: { $regex: pattern, $options: 'i' } },
        { notes: { $regex: pattern, $options: 'i' } },
      ]
    }

    const skip = (page - 1) * limit

    const [total, vaccinations] = await Promise.all([
      Vaccination.countDocuments(query),
      Vaccination.find(query)
        .select('-__v')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ])

    return NextResponse.json({
      success: true,
      vaccinations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Fetch vaccinations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vaccinations', details: error.message },
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
    const validation = validateRequest(vaccinationSchema, sanitizeObject(body))

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const vaccination = await Vaccination.create({
      ...validation.data,
      userId: user.userId,
    })

    await logAudit({
      userId: user.userId,
      action: 'create',
      resource: 'vaccinations',
      resourceId: (vaccination as any)._id.toString(),
      details: { method: 'POST', endpoint: '/api/vaccinations', vaccineName: vaccination.vaccineName },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: 'warning',
    })

    return NextResponse.json({ success: true, vaccination }, { status: 201 })
  } catch (error: any) {
    console.error('Create vaccination error:', error)
    return NextResponse.json(
      { error: 'Failed to create vaccination', details: error.message },
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
    const validation = validateRequest(vaccinationUpdateSchema, sanitizeObject(body))

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { id, ...updates } = validation.data
    const vaccination = await Vaccination.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: updates },
      { new: true, runValidators: true }
    )

    if (!vaccination) {
      return NextResponse.json({ error: 'Vaccination not found' }, { status: 404 })
    }

    await logAudit({
      userId: user.userId,
      action: 'update',
      resource: 'vaccinations',
      resourceId: id,
      details: { method: 'PATCH', endpoint: '/api/vaccinations', changes: updates },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: 'warning',
    })

    return NextResponse.json({ success: true, vaccination })
  } catch (error: any) {
    console.error('Update vaccination error:', error)
    return NextResponse.json(
      { error: 'Failed to update vaccination', details: error.message },
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
      return NextResponse.json({ error: 'Vaccination ID required' }, { status: 400 })
    }

    const vaccination = await Vaccination.findOneAndDelete({
      _id: idValidation.data,
      userId: user.userId,
    })

    if (!vaccination) {
      return NextResponse.json({ error: 'Vaccination not found' }, { status: 404 })
    }

    await logAudit({
      userId: user.userId,
      action: 'delete',
      resource: 'vaccinations',
      resourceId: idValidation.data,
      details: { method: 'DELETE', endpoint: '/api/vaccinations', vaccineName: vaccination.vaccineName },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: 'warning',
    })

    return NextResponse.json({ success: true, message: 'Vaccination deleted' })
  } catch (error: any) {
    console.error('Delete vaccination error:', error)
    return NextResponse.json(
      { error: 'Failed to delete vaccination', details: error.message },
      { status: 500 }
    )
  }
}
