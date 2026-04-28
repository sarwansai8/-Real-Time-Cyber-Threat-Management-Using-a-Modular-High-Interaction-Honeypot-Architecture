'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Search, Filter, Bookmark, Share2, TrendingUp, Clock, Eye } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { EmptyState } from '@/components/ui/empty-state'
import type { HealthUpdateSummary } from '@/lib/types'

export default function HealthUpdatesPage() {
  const [updates, setUpdates] = useState<HealthUpdateSummary[]>([])
  const [selectedUpdate, setSelectedUpdate] = useState<HealthUpdateSummary | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [savedUpdates, setSavedUpdates] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('savedHealthUpdates')
    if (saved) {
      setSavedUpdates(JSON.parse(saved))
    }

    void fetchUpdates()
  }, [])

  const fetchUpdates = async () => {
    try {
      const response = await fetch('/api/health-updates', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to fetch health updates')
      }

      const data = await response.json()
      setUpdates(data.updates || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch health updates'
      toast.error(message)
    }
  }

  const openUpdate = (id: string) => {
    setUpdates((currentUpdates) =>
      currentUpdates.map((update) =>
        update.id === id ? { ...update, views: update.views + 1 } : update
      )
    )

    setSelectedUpdate((current) => {
      if (current?.id === id) {
        return { ...current, views: current.views + 1 }
      }

      const update = updates.find((item) => item.id === id)
      return update ? { ...update, views: update.views + 1 } : null
    })
  }

  const toggleSaveUpdate = (id: string) => {
    const isSaved = savedUpdates.includes(id)
    const updatedSaved = isSaved
      ? savedUpdates.filter((updateId) => updateId !== id)
      : [...savedUpdates, id]

    setSavedUpdates(updatedSaved)
    localStorage.setItem('savedHealthUpdates', JSON.stringify(updatedSaved))

    setUpdates((currentUpdates) =>
      currentUpdates.map((update) =>
        update.id === id
          ? {
              ...update,
              savedCount: update.savedCount + (isSaved ? -1 : 1),
            }
          : update
      )
    )

    if (selectedUpdate?.id === id) {
      setSelectedUpdate({
        ...selectedUpdate,
        savedCount: selectedUpdate.savedCount + (isSaved ? -1 : 1),
      })
    }

    if (isSaved) {
      toast.info('Update removed from saved items')
    } else {
      toast.success('Update saved!', { description: 'You can find it in your saved health updates.' })
    }
  }

  const shareUpdate = async (update: HealthUpdateSummary) => {
    const shareUrl = `${window.location.origin}/health-updates#${update.id}`
    const shareData = {
      title: update.title,
      text: update.summary,
      url: shareUrl,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(`${update.title}\n${update.summary}\n${shareUrl}`)
        toast.success('Link copied', { description: 'The update details were copied to your clipboard.' })
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      toast.error('Unable to share update right now')
    }
  }

  const filteredUpdates = updates.filter((update) => {
    const matchesSearch =
      update.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      update.summary.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || update.category === filterCategory
    const matchesSeverity = filterSeverity === 'all' || update.severity === filterSeverity
    return matchesSearch && matchesCategory && matchesSeverity
  })

  const getSeverityBadge = (severity: HealthUpdateSummary['severity']) => {
    const variants: Record<HealthUpdateSummary['severity'], string> = {
      critical: 'bg-destructive text-destructive-foreground',
      high: 'bg-accent text-accent-foreground',
      medium: 'bg-primary text-primary-foreground',
      low: 'bg-secondary text-secondary-foreground',
    }

    return variants[severity]
  }

  const getCategoryColor = (category: HealthUpdateSummary['category']) => {
    const colors: Record<HealthUpdateSummary['category'], string> = {
      advisory: 'bg-blue-500/10 text-blue-600',
      prevention: 'bg-green-500/10 text-green-600',
      research: 'bg-amber-500/10 text-amber-600',
      outbreak: 'bg-red-500/10 text-red-600',
      vaccination: 'bg-cyan-500/10 text-cyan-600',
    }

    return colors[category]
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Health Updates' }]} />

      <div>
        <h1 className="text-3xl font-bold text-foreground">Health Updates & Advisories</h1>
        <p className="text-muted-foreground mt-1">Official health information and guidance from government health agencies</p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search health updates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <Filter className="w-4 h-4 text-muted-foreground md:mt-2" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="advisory">Advisory</SelectItem>
              <SelectItem value="prevention">Prevention</SelectItem>
              <SelectItem value="research">Research</SelectItem>
              <SelectItem value="outbreak">Outbreak</SelectItem>
              <SelectItem value="vaccination">Vaccination</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity Levels</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {updates.some((update) => update.severity === 'critical') && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-destructive">Critical Health Alert</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  There are critical health alerts that require your immediate attention.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredUpdates.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No updates found"
          description="No health updates match your current search and filter criteria. Try adjusting your filters or search term."
          action={{
            label: 'Clear Filters',
            onClick: () => {
              setSearchTerm('')
              setFilterCategory('all')
              setFilterSeverity('all')
              toast.success('Filters cleared')
            }
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredUpdates.map((update) => (
            <Card
              key={update.id}
              className="border-border/50 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
              onClick={() => openUpdate(update.id)}
            >
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-foreground line-clamp-2">{update.title}</h3>
                        <Badge className={getSeverityBadge(update.severity)} variant="default">
                          {update.severity.charAt(0).toUpperCase() + update.severity.slice(1)}
                        </Badge>
                      </div>
                      <Badge className={`${getCategoryColor(update.category)} mt-2`} variant="outline">
                        {update.category.charAt(0).toUpperCase() + update.category.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">{update.summary}</p>

                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(update.publishedDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {update.views.toLocaleString()} views
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {update.region}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary"
                      onClick={(event) => {
                        event.stopPropagation()
                        openUpdate(update.id)
                      }}
                    >
                      Read Full Article
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleSaveUpdate(update.id)
                        }}
                        className={savedUpdates.includes(update.id) ? 'text-accent' : ''}
                      >
                        <Bookmark className={`w-4 h-4 ${savedUpdates.includes(update.id) ? 'fill-accent' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          event.stopPropagation()
                          void shareUpdate(update)
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {savedUpdates.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm">
              <span className="font-semibold text-primary">{savedUpdates.length}</span> update{savedUpdates.length !== 1 ? 's' : ''} saved for later reading.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedUpdate} onOpenChange={(open) => !open && setSelectedUpdate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedUpdate?.title}</DialogTitle>
            <DialogDescription>{selectedUpdate?.region} health advisory</DialogDescription>
          </DialogHeader>

          {selectedUpdate && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={getSeverityBadge(selectedUpdate.severity)}>
                  {selectedUpdate.severity.charAt(0).toUpperCase() + selectedUpdate.severity.slice(1)}
                </Badge>
                <Badge className={getCategoryColor(selectedUpdate.category)} variant="outline">
                  {selectedUpdate.category.charAt(0).toUpperCase() + selectedUpdate.category.slice(1)}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">{selectedUpdate.summary}</p>
              <div className="text-sm leading-relaxed whitespace-pre-line">{selectedUpdate.content}</div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                <span>{new Date(selectedUpdate.publishedDate).toLocaleDateString()}</span>
                <span>{selectedUpdate.views.toLocaleString()} views</span>
                <span>{selectedUpdate.savedCount.toLocaleString()} saves</span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={() => void shareUpdate(selectedUpdate)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelectedUpdate(null)}>
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
