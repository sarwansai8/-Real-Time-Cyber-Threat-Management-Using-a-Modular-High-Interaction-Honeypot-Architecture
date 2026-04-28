'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, Plus, Calendar, CheckCircle2, AlertCircle, Filter, Download, Zap, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonTable } from '@/components/ui/skeleton-loader'

interface Vaccination {
  id: string
  vaccineName?: string
  name?: string  // Legacy field
  date: string
  provider: string
  batchNumber: string
  nextDueDate?: string
  nextDue?: string  // Legacy field
  status: 'completed' | 'pending' | 'scheduled'
  certificateNumber?: string
  notes?: string
}

export default function VaccinationsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    vaccineName: '',
    date: '',
    provider: '',
    batchNumber: '',
    nextDueDate: '',
    notes: ''
  })

  useEffect(() => {
    fetchVaccinations()
  }, [])

  const fetchVaccinations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/vaccinations')
      if (!response.ok) throw new Error('Failed to fetch vaccinations')
      const data = await response.json()
      setVaccinations(data.vaccinations.map((vac: any) => ({
        id: vac._id,
        vaccineName: vac.vaccineName,
        date: vac.date.split('T')[0],
        provider: vac.provider,
        batchNumber: vac.batchNumber || '',
        nextDueDate: vac.nextDueDate ? vac.nextDueDate.split('T')[0] : '',
        status: vac.nextDueDate && new Date(vac.nextDueDate) > new Date() ? 'scheduled' : 'completed',
        notes: vac.notes || ''
      })))
    } catch (err) {
      console.error('Fetch error:', err)
      setVaccinations([])
      toast.error('Failed to load vaccination records', {
        description: err instanceof Error ? err.message : 'Please try again shortly.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddVaccination = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.vaccineName || !formData.date || !formData.provider) {
      toast.error('Required fields missing', {
        description: 'Please fill in Vaccine Name, Date, and Provider fields.'
      })
      return
    }

    try {
      const response = await fetch('/api/vaccinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaccineName: formData.vaccineName,
          date: formData.date,
          provider: formData.provider,
          batchNumber: formData.batchNumber,
          nextDueDate: formData.nextDueDate || undefined,
          notes: formData.notes
        })
      })

      if (!response.ok) throw new Error('Failed to add vaccination')
      
      // Refresh vaccinations
      await fetchVaccinations()

      // Reset form
      setFormData({
        vaccineName: '',
        date: '',
        provider: '',
        batchNumber: '',
        nextDueDate: '',
        notes: ''
      })
      setIsDialogOpen(false)

      // Add notification
      const notifications = JSON.parse(localStorage.getItem('portalNotifications') || '[]')
      notifications.unshift({
        id: `notif_${Date.now()}`,
        title: 'Vaccination Record Added',
        message: `${formData.vaccineName} vaccination record has been added to your profile`,
        type: 'vaccination',
        timestamp: new Date().toISOString(),
        read: false
      })
      localStorage.setItem('portalNotifications', JSON.stringify(notifications))
      
      toast.success('Vaccination added!', { description: `${formData.vaccineName} has been recorded.` })
    } catch (err: any) {
      console.error('Add vaccination error:', err)
      toast.error('Failed to add vaccination', { description: err.message })
    }
  }

  const getVaccinationName = (vaccination: Vaccination) =>
    vaccination.vaccineName || vaccination.name || 'Vaccination Record'

  const getNextDueValue = (vaccination: Vaccination) =>
    vaccination.nextDueDate || vaccination.nextDue || ''

  const downloadCertificate = (vaccination: Vaccination) => {
    const certificateNumber = vaccination.certificateNumber || `CERT-${vaccination.id}`
    const content = [
      'Vaccination Certificate',
      '======================',
      `Vaccine: ${getVaccinationName(vaccination)}`,
      `Date Administered: ${new Date(vaccination.date).toLocaleDateString()}`,
      `Provider: ${vaccination.provider}`,
      `Batch Number: ${vaccination.batchNumber || 'N/A'}`,
      `Next Due Date: ${getNextDueValue(vaccination) ? new Date(getNextDueValue(vaccination)).toLocaleDateString() : 'N/A'}`,
      `Certificate Number: ${certificateNumber}`,
      `Status: ${vaccination.status}`,
      '',
      vaccination.notes ? `Notes: ${vaccination.notes}` : 'Notes: None'
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${getVaccinationName(vaccination).toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'vaccination'}_certificate.txt`
    anchor.click()
    URL.revokeObjectURL(url)

    toast.success('Certificate downloaded', { description: `${getVaccinationName(vaccination)} certificate is ready.` })
  }

  const filteredVaccinations = vaccinations.filter(vac => {
    const matchesStatus = filterStatus === 'all' || vac.status === filterStatus
    const vaccineName = vac.vaccineName || vac.name || ''
    const notes = vac.notes || ''
    const matchesSearch = searchQuery === '' ||
      vaccineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vac.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notes.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const completedVaccinations = vaccinations.filter(v => v.status === 'completed').length
  const totalVaccinations = vaccinations.length
  const completionPercentage = totalVaccinations > 0 ? (completedVaccinations / totalVaccinations) * 100 : 0

  const pendingVaccinations = vaccinations.filter(v => v.status === 'pending')

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Vaccinations' }]} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vaccination Records</h1>
          <p className="text-muted-foreground mt-1">Track and manage your vaccination history</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Vaccination
        </Button>
      </div>

      {/* Vaccination Status Overview */}
      <Card className="border-secondary/30 bg-gradient-to-br from-secondary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-secondary" />
            Vaccination Status
          </CardTitle>
          <CardDescription>Your immunization completion rate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{completedVaccinations} of {totalVaccinations} Completed</span>
              <span className="text-sm font-bold text-secondary">{Math.round(completionPercentage)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-3 bg-muted" />
          </div>
          {pendingVaccinations.length > 0 && (
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Pending Vaccinations</p>
                <p className="text-xs text-muted-foreground">{pendingVaccinations.length} vaccination(s) awaiting administration</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search vaccinations by name, provider, or notes..."
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
            <SelectItem value="all">All Vaccinations</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vaccinations Timeline */}
      {isLoading ? (
        <SkeletonTable />
      ) : filteredVaccinations.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No vaccinations found"
          description={searchQuery || filterStatus !== 'all'
            ? "Try adjusting your search or filters to find vaccination records."
            : "You haven't recorded any vaccinations yet. Add your first vaccination to start tracking your immunizations."}
          action={{
            label: 'Add Vaccination',
            onClick: () => setIsDialogOpen(true)
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredVaccinations.map((vaccination, idx) => (
            <Card key={vaccination.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="p-3 rounded-lg bg-muted flex-shrink-0">
                      {vaccination.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-secondary" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-accent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{getVaccinationName(vaccination)}</h3>
                        <Badge className={vaccination.status === 'completed' ? 'bg-secondary text-secondary-foreground' : 'bg-accent text-accent-foreground'}>
                          {vaccination.status === 'completed' ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Date Given</p>
                          <p className="font-medium text-sm">{new Date(vaccination.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Provider</p>
                          <p className="font-medium text-sm truncate">{vaccination.provider}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Batch Number</p>
                          <p className="font-mono text-xs">{vaccination.batchNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Next Due</p>
                          <p className="font-medium text-sm">{getNextDueValue(vaccination) ? new Date(getNextDueValue(vaccination)).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">Certificate Number: <span className="font-mono text-foreground">{vaccination.certificateNumber || `CERT-${vaccination.id}`}</span></p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Download Certificate"
                    className="flex-shrink-0"
                    onClick={() => downloadCertificate(vaccination)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Vaccination Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Vaccination Record</DialogTitle>
            <DialogDescription>
              Record a new vaccination in your immunization history
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddVaccination} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vaccineName">Vaccine Name *</Label>
              <Input
                id="vaccineName"
                value={formData.vaccineName}
                onChange={(e) => setFormData(prev => ({ ...prev, vaccineName: e.target.value }))}
                placeholder="e.g., COVID-19, Influenza"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date Administered *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provider Name *</Label>
              <Input
                id="provider"
                value={formData.provider}
                onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                placeholder="Medical facility name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchNumber">Batch Number</Label>
              <Input
                id="batchNumber"
                value={formData.batchNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                placeholder="Vaccine batch/lot number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextDueDate">Next Due Date</Label>
              <Input
                id="nextDueDate"
                type="date"
                value={formData.nextDueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, nextDueDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional information"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-primary text-primary-foreground">
                Add Vaccination
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
