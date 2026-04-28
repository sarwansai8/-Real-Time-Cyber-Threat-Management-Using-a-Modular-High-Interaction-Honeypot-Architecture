import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { Appointment } from '@/lib/models'
import { logAudit } from '@/lib/audit-logger'
import {
  appointmentSchema,
  appointmentUpdateSchema,
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
    const status = searchParams.get('status')?.trim() || ''

    const query: Record<string, unknown> = { userId: user.userId }

    if (status && status !== 'all') {
      query.status = status
    }

    if (search) {
      const pattern = escapeRegex(search)
      query.$or = [
        { doctorName: { $regex: pattern, $options: 'i' } },
        { specialty: { $regex: pattern, $options: 'i' } },
        { location: { $regex: pattern, $options: 'i' } },
        { notes: { $regex: pattern, $options: 'i' } },
      ]
    }

    const skip = (page - 1) * limit

    const [total, appointments] = await Promise.all([
      Appointment.countDocuments(query),
      Appointment.find(query)
        .select('-__v')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ])

    return NextResponse.json({
      success: true,
      appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Fetch appointments error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments', details: error.message },
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
    const validation = validateRequest(appointmentSchema, sanitizeObject(body))

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const appointment = await Appointment.create({
      ...validation.data,
      userId: user.userId,
    })

    await logAudit({
      userId: user.userId,
      action: 'create',
      resource: 'appointments',
      resourceId: (appointment as any)._id.toString(),
      details: { method: 'POST', endpoint: '/api/appointments' },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    return NextResponse.json({ success: true, appointment }, { status: 201 })
  } catch (error: any) {
    console.error('Create appointment error:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment', details: error.message },
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
    const validation = validateRequest(appointmentUpdateSchema, sanitizeObject(body))

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { id, ...updates } = validation.data
    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: updates },
      { new: true, runValidators: true }
    )

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    await logAudit({
      userId: user.userId,
      action: 'update',
      resource: 'appointments',
      resourceId: id,
      details: { method: 'PATCH', endpoint: '/api/appointments', changes: updates },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      severity: 'warning',
    })

    return NextResponse.json({ success: true, appointment })
  } catch (error: any) {
    console.error('Update appointment error:', error)
    return NextResponse.json(
      { error: 'Failed to update appointment', details: error.message },
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
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 })
    }

    const appointment = await Appointment.findOneAndDelete({
      _id: idValidation.data,
      userId: user.userId,
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    await logAudit({
      userId: user.userId,
      action: 'delete',
      resource: 'appointments',
      resourceId: idValidation.data,
      details: { method: 'DELETE', endpoint: '/api/appointments' },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      severity: 'warning',
    })

    return NextResponse.json({ success: true, message: 'Appointment deleted' })
  } catch (error: any) {
    console.error('Delete appointment error:', error)
    return NextResponse.json(
      { error: 'Failed to delete appointment', details: error.message },
      { status: 500 }
    )
  }
}
