import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { Appointment, MedicalRecord, User, Vaccination } from '@/lib/models'
import {
  formatAppointmentsForExport,
  formatMedicalRecordsForExport,
  formatVaccinationsForExport,
  generateCSV,
  generateHealthSummary,
} from '@/lib/export-utils'
import { logAudit } from '@/lib/audit-logger'
import { getAuthenticatedUser, getClientIp, getUserAgent } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const format = searchParams.get('format') || 'csv'

    const userData = await User.findById(user.userId).select('-password').lean()
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let content = ''
    let filename = ''
    let contentType = ''
    let exportedCount = 0

    switch (type) {
      case 'appointments': {
        const appointments = await Appointment.find({ userId: user.userId }).sort({ date: -1 }).lean()
        const formatted = formatAppointmentsForExport(appointments)
        content = generateCSV(formatted, Object.keys(formatted[0] || {}))
        filename = `appointments_${new Date().toISOString().split('T')[0]}.csv`
        contentType = 'text/csv'
        exportedCount = appointments.length
        break
      }

      case 'records': {
        const records = await MedicalRecord.find({ userId: user.userId }).sort({ date: -1 }).lean()
        const formatted = formatMedicalRecordsForExport(records)
        content = generateCSV(formatted, Object.keys(formatted[0] || {}))
        filename = `medical_records_${new Date().toISOString().split('T')[0]}.csv`
        contentType = 'text/csv'
        exportedCount = records.length
        break
      }

      case 'vaccinations': {
        const vaccinations = await Vaccination.find({ userId: user.userId }).sort({ date: -1 }).lean()
        const formatted = formatVaccinationsForExport(vaccinations)
        content = generateCSV(formatted, Object.keys(formatted[0] || {}))
        filename = `vaccinations_${new Date().toISOString().split('T')[0]}.csv`
        contentType = 'text/csv'
        exportedCount = vaccinations.length
        break
      }

      case 'summary': {
        const [appointments, records, vaccinations] = await Promise.all([
          Appointment.find({ userId: user.userId }).sort({ date: -1 }).lean(),
          MedicalRecord.find({ userId: user.userId }).sort({ date: -1 }).lean(),
          Vaccination.find({ userId: user.userId }).sort({ date: -1 }).lean(),
        ])

        content = generateHealthSummary({
          user: {
            ...userData,
            registeredDate: userData.createdAt,
          },
          appointments,
          records,
          vaccinations,
        })
        filename = `health_summary_${new Date().toISOString().split('T')[0]}.txt`
        contentType = format === 'txt' ? 'text/plain' : 'text/plain'
        exportedCount = appointments.length + records.length + vaccinations.length
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    await logAudit({
      userId: user.userId,
      action: 'export',
      resource: type || 'export',
      details: {
        method: 'GET',
        endpoint: '/api/export',
        format,
        count: exportedCount,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'export',
      severity: 'critical',
    })

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Export failed', details: error.message },
      { status: 500 }
    )
  }
}
