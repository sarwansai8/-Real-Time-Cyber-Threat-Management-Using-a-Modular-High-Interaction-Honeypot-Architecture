'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, Edit2, Trash2, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { HealthUpdateSummary } from '@/lib/types'

type HealthUpdateForm = {
  title: string
  summary: string
  content: string
  category: HealthUpdateSummary['category']
  severity: HealthUpdateSummary['severity']
  region: HealthUpdateSummary['region']
  status: HealthUpdateSummary['status']
}

const defaultFormData: HealthUpdateForm = {
  title: '',
  summary: '',
  content: '',
  category: 'advisory',
  severity: 'high',
  region: 'National',
  status: 'published',
}

export default function AdminHealthUpdatesPage() {
  const [updates, setUpdates] = useState<HealthUpdateSummary[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<HealthUpdateForm>(defaultFormData)

  useEffect(() => {
    void fetchUpdates()
  }, [])

  const fetchUpdates = async () => {
    try {
      const response = await fetch('/api/health-updates?status=all', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load health updates')
      }

      const data = await response.json()
      setUpdates(data.updates || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load health updates'
      toast.error(message)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData(defaultFormData)
  }

  const handleSave = async () => {
    if (!formData.title || !formData.summary || !formData.content) {
      toast.error('Please fill in the required fields.')
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/health-updates', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...formData } : formData),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to save health update')
      }

      await fetchUpdates()
      resetForm()
      setIsDialogOpen(false)
      toast.success(editingId ? 'Health update saved.' : 'Health update created.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save health update'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (update: HealthUpdateSummary) => {
    setFormData({
      title: update.title,
      summary: update.summary,
      content: update.content,
      category: update.category,
      severity: update.severity,
      region: update.region,
      status: update.status,
    })
    setEditingId(update.id)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this update?')) {
      return
    }

    try {
      const response = await fetch(`/api/health-updates?id=${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Unable to delete health update')
      }

      await fetchUpdates()
      toast.success('Health update deleted.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete health update'
      toast.error(message)
    }
  }

  const getSeverityColor = (severity: HealthUpdateSummary['severity']) => {
    const colors: Record<HealthUpdateSummary['severity'], string> = {
      critical: 'bg-destructive/10 text-destructive',
      high: 'bg-accent/10 text-accent',
      medium: 'bg-primary/10 text-primary',
      low: 'bg-secondary/10 text-secondary',
    }

    return colors[severity]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Health Updates</h1>
          <p className="text-muted-foreground mt-1">Create and manage published health advisories</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setIsDialogOpen(true)
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Update
        </Button>
      </div>

      <div className="space-y-4">
        {updates.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="pt-12 pb-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No health updates yet</p>
            </CardContent>
          </Card>
        ) : (
          updates.map((update) => (
            <Card key={update.id} className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-semibold text-foreground line-clamp-2">{update.title}</h3>
                      <Badge className={getSeverityColor(update.severity)}>{update.severity}</Badge>
                      <Badge variant="outline">{update.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{update.summary}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {update.views} views
                      </div>
                      <div>{update.region}</div>
                      <div>{new Date(update.publishedDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(update)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => void handleDelete(update.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Create'} Health Update</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the health advisory details.' : 'Add a new health update or advisory.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Update title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary *</Label>
              <Input
                id="summary"
                value={formData.summary}
                onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
                placeholder="Brief summary"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Full content"
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value: HealthUpdateSummary['category']) => setFormData((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advisory">Advisory</SelectItem>
                    <SelectItem value="prevention">Prevention</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="outbreak">Outbreak</SelectItem>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select value={formData.severity} onValueChange={(value: HealthUpdateSummary['severity']) => setFormData((prev) => ({ ...prev, severity: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Select value={formData.region} onValueChange={(value: HealthUpdateSummary['region']) => setFormData((prev) => ({ ...prev, region: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="National">National</SelectItem>
                    <SelectItem value="Regional">Regional</SelectItem>
                    <SelectItem value="International">International</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: HealthUpdateSummary['status']) => setFormData((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={() => void handleSave()} className="flex-1 bg-primary text-primary-foreground" disabled={isSaving}>
              {isSaving ? 'Saving...' : `${editingId ? 'Update' : 'Create'} Update`}
            </Button>
            <Button
              onClick={() => {
                setIsDialogOpen(false)
                resetForm()
              }}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
