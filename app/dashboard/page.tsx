'use client'

import { useAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, FileText, Heart, AlertCircle, Clock, CheckCircle2, TrendingUp, Download, Zap, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { SkeletonStats } from '@/components/ui/skeleton-loader'
import { SpeedDial } from '@/components/ui/speed-dial'
import { AppointmentTrendChart, HealthMetricsChart, VaccinationProgress, RecordTypesChart } from '@/components/dashboard-charts'
import { KeyboardHint } from '@/components/keyboard-hint'

// Lazy load NotificationCenter for better initial load
const NotificationCenter = dynamic(() => import('@/components/notification-center').then(mod => ({ default: mod.NotificationCenter })), {
  ssr: false
})

interface QuickStat {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [upcomingAppointments, setUpcomingAppointments] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [lastVaccination, setLastVaccination] = useState('')
  const [statsLoaded, setStatsLoaded] = useState(false)

  useEffect(() => {
    if (!user) {
      return
    }

    void fetchDashboardStats()
    toast.success(`Welcome back, ${user.firstName}!`, {
      description: 'Your health dashboard is ready.',
    })
  }, [user])

  const fetchDashboardStats = async () => {
    try {
      // Fetch appointments
      const apptResponse = await fetch('/api/appointments')
      if (apptResponse.ok) {
        const apptData = await apptResponse.json()
        const upcoming = apptData.appointments.filter((a: any) => 
          new Date(a.date) > new Date() && a.status === 'scheduled'
        ).length
        setUpcomingAppointments(upcoming)
      }

      // Fetch medical records count
      const recordsResponse = await fetch('/api/medical-records')
      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json()
        setTotalRecords(recordsData.records.length)
      }

      // Fetch vaccinations
      const vacResponse = await fetch('/api/vaccinations')
      if (vacResponse.ok) {
        const vacData = await vacResponse.json()
        if (vacData.vaccinations.length > 0) {
          const sorted = vacData.vaccinations.sort((a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )
          setLastVaccination(new Date(sorted[0].date).toLocaleDateString())
        } else {
          setLastVaccination('Up to date')
        }
      }

      setStatsLoaded(true)
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      toast.error('Failed to load some dashboard data', {
        description: 'Some information may be unavailable.',
      })
      setStatsLoaded(true)
    }
  }

  const stats: QuickStat[] = [
    {
      label: 'Upcoming Appointments',
      value: upcomingAppointments,
      icon: Calendar,
      color: 'text-primary'
    },
    {
      label: 'Medical Records',
      value: totalRecords || '0',
      icon: FileText,
      color: 'text-secondary'
    },
    {
      label: 'Vaccinations',
      value: lastVaccination || 'Up to date',
      icon: Heart,
      color: 'text-accent'
    },
    {
      label: 'Health Status',
      value: 'Excellent',
      icon: CheckCircle2,
      color: 'text-green-600'
    }
  ]

  const recentActivity = [
    {
      type: 'record',
      title: 'Medical Record Accessed',
      description: 'Your blood test results from Nov 10 were accessed',
      time: '2 hours ago',
      icon: FileText
    },
    {
      type: 'appointment',
      title: 'Appointment Confirmed',
      description: 'Dr. Smith - General Checkup - Nov 20, 2:00 PM',
      time: '1 day ago',
      icon: Calendar
    },
    {
      type: 'vaccination',
      title: 'Vaccination Record Updated',
      description: 'Flu vaccine record added to your profile',
      time: '3 days ago',
      icon: Heart
    },
    {
      type: 'alert',
      title: 'Health Advisory',
      description: 'New health advisory released for your region',
      time: '5 days ago',
      icon: AlertCircle
    }
  ]

  const speedDialActions = [
    {
      icon: <Calendar className="w-5 h-5" />,
      label: 'Schedule Appointment',
      onClick: () => router.push('/appointments')
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: 'Add Medical Record',
      onClick: () => router.push('/medical-records')
    },
    {
      icon: <Heart className="w-5 h-5" />,
      label: 'Add Vaccination',
      onClick: () => router.push('/vaccinations')
    },
    {
      icon: <Download className="w-5 h-5" />,
      label: 'Export Data',
      onClick: () => {
        window.location.href = '/api/export?type=summary&format=txt'
        toast.success('Export started', { description: 'Your health summary is downloading.' })
      }
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header with Notification */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome, {user?.firstName}</h1>
          <p className="text-muted-foreground mt-1">Here's your health dashboard overview</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            onClick={() => window.location.href = '/api/export?type=summary&format=txt'}
            variant="outline"
            size="sm"
            title="Export Health Summary"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Summary
          </Button>
          <NotificationCenter />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Card key={idx} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-2">{stat.value}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Quick Actions & Alerts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks and services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button asChild variant="outline" className="h-auto p-4 flex-col items-start">
                  <Link href="/appointments">
                    <Calendar className="w-5 h-5 mb-2" />
                    <span className="text-sm font-medium">Schedule Appointment</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto p-4 flex-col items-start">
                  <Link href="/medical-records">
                    <FileText className="w-5 h-5 mb-2" />
                    <span className="text-sm font-medium">View Records</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto p-4 flex-col items-start">
                  <Link href="/vaccinations">
                    <Heart className="w-5 h-5 mb-2" />
                    <span className="text-sm font-medium">Vaccination Status</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto p-4 flex-col items-start">
                  <Link href="/health-updates">
                    <AlertCircle className="w-5 h-5 mb-2" />
                    <span className="text-sm font-medium">Health News</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your recent actions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, idx) => {
                  const Icon = activity.icon
                  return (
                    <div key={idx} className="flex gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                      <div className="p-2 rounded-lg bg-muted h-fit">
                        <Icon className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Health Status & Alerts */}
        <div className="space-y-6">
          {/* Health Status */}
          <Card className="border-border/50 bg-gradient-to-br from-secondary/5 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-secondary" />
                Your Health Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall</span>
                  <Badge className="bg-green-600 text-white">Excellent</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vaccinations</span>
                  <Badge className="bg-secondary text-secondary-foreground">Current</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-secondary h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Appointments</span>
                  <Badge className="bg-primary text-primary-foreground">Scheduled</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Alerts */}
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-accent" />
                Important Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-xs text-muted-foreground">
                You have no critical alerts at this time.
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Reminder:</strong> Schedule your annual checkup before year end.
              </p>
            </CardContent>
          </Card>

          {/* Profile Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Patient ID</p>
                <p className="font-mono text-xs">{user?.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Blood Type</p>
                <p className="font-medium">{user?.bloodType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-xs">{new Date(user?.registeredDate || '').toLocaleDateString()}</p>
              </div>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link href="/profile">Edit Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Speed Dial FAB */}
      <SpeedDial actions={speedDialActions} />
      
      {/* Keyboard Shortcut Hint */}
      <KeyboardHint />
    </div>
  )
}
