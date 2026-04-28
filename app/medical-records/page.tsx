'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Eye, Filter, Plus, Calendar, User, Search, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonTable } from '@/components/ui/skeleton-loader'

interface MedicalRecord {
  id: string
  title: string
  type: 'lab' | 'prescription' | 'diagnosis' | 'imaging' | 'other'
  date: string
  provider: string
  description: string
  fileSize: string
  confidential: boolean
}

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    type: 'lab' as const,
    provider: '',
    description: '',
    confidential: false
  })

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/medical-records')
      if (!response.ok) throw new Error('Failed to fetch records')
      const data = await response.json()
      setRecords(data.records.map((rec: any) => ({
        id: rec._id,
        title: rec.title,
        type: rec.type,
        date: rec.date.split('T')[0],
        provider: rec.provider,
        description: rec.description || '',
        fileSize: rec.fileSize || '1.5 MB',
        confidential: rec.confidential
      })))
    } catch (err) {
      console.error('Fetch error:', err)
      setRecords([])
      toast.error('Failed to load medical records', {
        description: err instanceof Error ? err.message : 'Please try again shortly.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.provider) {
      toast.error('Required fields missing', {
        description: 'Please fill in Title and Provider fields.'
      })
      return
    }

    try {
      const response = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          type: formData.type,
          provider: formData.provider,
          description: formData.description,
          confidential: formData.confidential,
          date: new Date().toISOString()
        })
      })

      if (!response.ok) throw new Error('Failed to add record')
      
      // Refresh records
      await fetchRecords()

      // Reset form
      setFormData({
        title: '',
        type: 'lab',
        provider: '',
        description: '',
        confidential: false
      })
      setIsDialogOpen(false)
      toast.success('Record added successfully!', { description: formData.title })
    } catch (err: any) {
      console.error('Add record error:', err)
      toast.error('Failed to add record', { description: err.message })
    }
  }

  const deleteRecord = async (id: string) => {
    try {
      const response = await fetch(`/api/medical-records?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete record')
      
      // Optimistically update UI
      const updated = records.filter(r => r.id !== id)
      setRecords(updated)
      toast.success('Record deleted', { description: 'The medical record has been removed.' })
    } catch (err: any) {
      toast.error('Failed to delete record', { description: err.message })
    }
  }

  const downloadRecord = (record: MedicalRecord) => {
    const content = [
      `Medical Record: ${record.title}`,
      `Type: ${getTypeLabel(record.type)}`,
      `Date: ${new Date(record.date).toLocaleDateString()}`,
      `Provider: ${record.provider}`,
      `Confidential: ${record.confidential ? 'Yes' : 'No'}`,
      '',
      'Description',
      record.description || 'No description provided.'
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${record.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'medical_record'}.txt`
    anchor.click()
    URL.revokeObjectURL(url)

    toast.success('Record downloaded', { description: `${record.title} has been downloaded.` })
  }

  const filteredRecords = records.filter(r => {
    const matchesType = filterType === 'all' || r.type === filterType
    const matchesSearch = searchQuery === '' ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  const getTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      lab: 'bg-primary/10 text-primary',
      prescription: 'bg-secondary/10 text-secondary',
      diagnosis: 'bg-accent/10 text-accent',
      imaging: 'bg-blue-500/10 text-blue-600',
      other: 'bg-muted'
    }
    return variants[type] || variants.other
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      lab: 'Lab Test',
      prescription: 'Prescription',
      diagnosis: 'Diagnosis',
      imaging: 'Imaging',
      other: 'Other'
    }
    return labels[type] || 'Other'
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Medical Records' }]} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Medical Records</h1>
          <p className="text-muted-foreground mt-1">Access your complete medical documentation</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Record
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search records by title, provider, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Records</SelectItem>
            <SelectItem value="lab">Lab Tests</SelectItem>
            <SelectItem value="prescription">Prescriptions</SelectItem>
            <SelectItem value="diagnosis">Diagnoses</SelectItem>
            <SelectItem value="imaging">Imaging</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Records Grid */}
      {isLoading ? (
        <SkeletonTable />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No medical records found"
          description={searchQuery || filterType !== 'all'
            ? "Try adjusting your search or filters to find records."
            : "You haven't added any medical records yet. Upload or add your first record to start tracking your health."}
          action={{
            label: 'Add Record',
            onClick: () => setIsDialogOpen(true)
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredRecords.map(record => (
            <Card key={record.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="p-3 rounded-lg bg-muted flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{record.title}</h3>
                        <Badge className={getTypeBadge(record.type)}>
                          {getTypeLabel(record.type)}
                        </Badge>
                        {record.confidential && (
                          <Badge variant="outline" className="border-destructive text-destructive">
                            Confidential
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Date</p>
                          <p className="font-medium text-sm">{new Date(record.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Provider</p>
                          <p className="font-medium text-sm">{record.provider}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">File Size</p>
                          <p className="font-medium text-sm">{record.fileSize}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className="font-medium text-sm">Verified</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{record.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      title="View"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Download"
                      onClick={() => downloadRecord(record)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Delete "${record.title}"?`)) {
                          void deleteRecord(record.id)
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Record Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Medical Record</DialogTitle>
            <DialogDescription>
              Upload or add a new medical record to your portfolio
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRecord} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Record Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Blood Test Results"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Record Type</Label>
              <Select value={formData.type} onValueChange={(val: any) => setFormData(prev => ({ ...prev, type: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lab">Lab Test</SelectItem>
                  <SelectItem value="prescription">Prescription</SelectItem>
                  <SelectItem value="diagnosis">Diagnosis</SelectItem>
                  <SelectItem value="imaging">Imaging</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provider Name *</Label>
              <Input
                id="provider"
                value={formData.provider}
                onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                placeholder="Medical facility or doctor name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the record"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confidential"
                checked={formData.confidential}
                onChange={(e) => setFormData(prev => ({ ...prev, confidential: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="confidential" className="text-sm font-normal cursor-pointer">
                Mark as confidential/sensitive information
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-primary text-primary-foreground">
                Add Record
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRecord?.title}</DialogTitle>
            <DialogDescription>
              Detailed medical record information
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium">{getTypeLabel(selectedRecord.type)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(selectedRecord.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p className="font-medium">{selectedRecord.provider}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Confidential</p>
                  <p className="font-medium">{selectedRecord.confidential ? 'Yes' : 'No'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="leading-relaxed">{selectedRecord.description || 'No description provided.'}</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={() => downloadRecord(selectedRecord)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelectedRecord(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
