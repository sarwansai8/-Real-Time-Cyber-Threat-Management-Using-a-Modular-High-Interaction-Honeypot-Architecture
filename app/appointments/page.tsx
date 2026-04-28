'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, User, Phone, X, Plus, Filter, Search, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonTable } from '@/components/ui/skeleton-loader'

interface Appointment {
  id: string
  doctorName: string
  specialty: string
  date: string
  time: string
  location: string
  status: 'scheduled' | 'completed' | 'cancelled'
  phone: string
  notes: string
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    doctorName: '',
    specialty: 'General Checkup',
    date: '',
    time: '',
    location: '',
    phone: '',
    notes: ''
  })

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/appointments')
      if (!response.ok) throw new Error('Failed to fetch appointments')
      const data = await response.json()
      setAppointments(data.appointments.map((apt: any) => ({
        id: apt._id,
        doctorName: apt.doctorName,
        specialty: apt.specialty,
        date: apt.date.split('T')[0],
        time: apt.time,
        location: apt.location || '',
        status: apt.status,
        phone: apt.phone || '',
        notes: apt.notes || ''
      })))
      if (data.appointments.length === 0) {
        toast.info('No appointments found', { description: 'Schedule your first appointment to get started.' })
      }
    } catch (err: any) {
      console.error('Fetch error:', err)
      setError(err.message)
      toast.error('Failed to load appointments', { description: err.message })
      setAppointments([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.doctorName || !formData.specialty || !formData.date || !formData.time || !formData.location) {
      toast.error('Required fields missing', {
        description: 'Please fill in all appointment details.'
      })
      return
    }

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorName: formData.doctorName,
          specialty: formData.specialty,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          phone: formData.phone,
          notes: formData.notes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to schedule appointment')
      }
      
      toast.success('Appointment scheduled!', {
        description: `${formData.doctorName} on ${new Date(formData.date).toLocaleDateString()} at ${formData.time}`,
      })
      
      // Refresh appointments list
      await fetchAppointments()
      
      // Reset form
      setFormData({
        doctorName: '',
        specialty: 'General Checkup',
        date: '',
        time: '',
        location: '',
        phone: '',
        notes: ''
      })
      setIsDialogOpen(false)

      // Add notification
      const notifications = JSON.parse(localStorage.getItem('portalNotifications') || '[]')
      notifications.unshift({
        id: `notif_${Date.now()}`,
        title: 'Appointment Scheduled',
        message: `Your appointment with ${formData.doctorName} on ${formData.date} has been scheduled`,
        type: 'appointment',
        timestamp: new Date().toISOString(),
        read: false
      })
      localStorage.setItem('portalNotifications', JSON.stringify(notifications))
    } catch (err: any) {
      toast.error('Failed to schedule appointment', { description: err.message })
    }
  }

  const cancelAppointment = async (id: string) => {
    try {
      const response = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'cancelled' })
      })

      if (!response.ok) throw new Error('Failed to cancel appointment')
      
      // Optimistically update UI
      const updated = appointments.map(apt =>
        apt.id === id ? { ...apt, status: 'cancelled' as const } : apt
      )
      setAppointments(updated)
      toast.success('Appointment cancelled', { description: 'The appointment has been cancelled.' })
    } catch (err: any) {
      toast.error('Failed to cancel appointment', { description: err.message })
    }
  }

  const filteredAppointments = appointments.filter(apt => {
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus
    const matchesSearch = searchQuery === '' || 
      apt.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.location.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const upcomingAppointments = appointments.filter(apt => 
    new Date(apt.date) > new Date() && apt.status === 'scheduled'
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-primary text-primary-foreground">Scheduled</Badge>
      case 'completed':
        return <Badge className="bg-secondary text-secondary-foreground">Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  const handleExport = () => {
    window.location.href = '/api/export?type=appointments&format=csv'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage your medical appointments</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" title="Export to CSV">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Appointment
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {upcomingAppointments.length === 0 && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            You don't have any upcoming appointments. Click the button above to schedule one.
          </AlertDescription>
        </Alert>
      )}

      {upcomingAppointments.length > 0 && (
        <Alert className="border-accent/30 bg-accent/5">
          <Calendar className="h-4 w-4 text-accent" />
          <AlertDescription>
            You have <strong>{upcomingAppointments.length}</strong> upcoming appointment{upcomingAppointments.length !== 1 ? 's' : ''} scheduled.
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search appointments by doctor, specialty, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Appointments</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Appointments Grid */}
      {isLoading ? (
        <SkeletonTable />
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No appointments found"
          description={searchQuery || filterStatus !== 'all' 
            ? "Try adjusting your search or filters to find appointments."
            : "You haven't scheduled any appointments yet. Click the button above to get started."}
          action={{
            label: 'Schedule Appointment',
            onClick: () => setIsDialogOpen(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAppointments.map(appointment => (
            <Card
              key={appointment.id}
              className={`border-border/50 hover:shadow-md transition-shadow ${
                appointment.status === 'cancelled' ? 'opacity-60' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{appointment.doctorName}</CardTitle>
                    <CardDescription className="text-xs">{appointment.specialty}</CardDescription>
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">{new Date(appointment.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-medium">{appointment.time}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">{appointment.location}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <Phone className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="font-medium">{appointment.phone}</p>
                  </div>
                </div>

                {appointment.notes && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm mt-1">{appointment.notes}</p>
                  </div>
                )}

                {appointment.status === 'scheduled' && (
                  <Button
                    onClick={() => cancelAppointment(appointment.id)}
                    variant="outline"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive"
                  >
                    <X className="w-3 h-3 mr-2" />
                    Cancel Appointment
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Appointment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
            <DialogDescription>
              Fill in the details below to schedule a new appointment
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSchedule} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doctorName">Doctor Name *</Label>
              <Input
                id="doctorName"
                value={formData.doctorName}
                onChange={(e) => setFormData(prev => ({ ...prev, doctorName: e.target.value }))}
                placeholder="Dr. Smith"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Select value={formData.specialty} onValueChange={(val) => setFormData(prev => ({ ...prev, specialty: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General Checkup">General Checkup</SelectItem>
                  <SelectItem value="Cardiology">Cardiology</SelectItem>
                  <SelectItem value="Dentistry">Dentistry</SelectItem>
                  <SelectItem value="Dermatology">Dermatology</SelectItem>
                  <SelectItem value="Ophthalmology">Ophthalmology</SelectItem>
                  <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Appointment Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Appointment Time *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Clinic address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Doctor's Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-primary text-primary-foreground">
                Schedule
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
