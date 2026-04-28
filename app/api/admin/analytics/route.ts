import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { Appointment, HealthUpdate, MedicalRecord, SecurityEvent, User, Vaccination } from '@/lib/models'
import { AuditLog } from '@/lib/audit-logger'
import { getAuthenticatedUser, isAdmin } from '@/lib/auth'

function buildRecentDayKeys(days: number): string[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (days - index - 1))
    return date.toISOString().slice(0, 10)
  })
}

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    await connectDB()

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const [
      totalUsers,
      totalUpdates,
      totalAppointments,
      totalRecords,
      totalVaccinations,
      totalSecurityEvents,
      totalAuditLogs,
      updateViewsResult,
      criticalAlerts,
      usersByDay,
      updateViewsByDay,
    ] = await Promise.all([
      User.countDocuments(),
      HealthUpdate.countDocuments(),
      Appointment.countDocuments(),
      MedicalRecord.countDocuments(),
      Vaccination.countDocuments(),
      SecurityEvent.countDocuments(),
      AuditLog.countDocuments(),
      HealthUpdate.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      HealthUpdate.countDocuments({ severity: 'critical', status: 'published' }),
      User.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            users: { $sum: 1 },
          },
        },
      ]),
      HealthUpdate.aggregate([
        { $match: { publishedDate: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$publishedDate' } },
            views: { $sum: '$views' },
          },
        },
      ]),
    ])

    const dayKeys = buildRecentDayKeys(7)
    const usersMap = new Map(usersByDay.map((entry) => [entry._id as string, entry.users as number]))
    const viewsMap = new Map(updateViewsByDay.map((entry) => [entry._id as string, entry.views as number]))

    const chartData = dayKeys.map((day) => ({
      day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
      users: usersMap.get(day) || 0,
      views: viewsMap.get(day) || 0,
    }))

    const stats = {
      totalUsers,
      totalUpdates,
      totalViews: updateViewsResult[0]?.total || 0,
      criticalAlerts,
      totalAppointments,
      totalRecords,
      totalVaccinations,
      securityEvents: totalSecurityEvents,
      totalAuditLogs,
    }

    return NextResponse.json({
      success: true,
      stats,
      chartData,
      overview: stats,
    })
  } catch (error: any) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    )
  }
}
