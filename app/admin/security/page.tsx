'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Shield, AlertTriangle, Activity, MapPin, Monitor, Mouse, Keyboard,
  TrendingUp, Eye, Clock, Globe, Trash2, RefreshCw
} from 'lucide-react'
import { getSecurityMonitor, type SecurityEvent } from '@/lib/security-monitor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface DashboardStatistics {
  total: number
  byType: Record<string, number>
  bySeverity: Record<string, number>
  uniqueIPs: number
  avgHumanScore: number
  recentEvents: SecurityEvent[]
}

function normalizeSecurityEvent(rawEvent: any): SecurityEvent {
  return {
    id: rawEvent._id?.toString?.() || rawEvent.id || `event_${rawEvent.timestamp}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: typeof rawEvent.timestamp === 'string'
      ? rawEvent.timestamp
      : new Date(rawEvent.timestamp || Date.now()).toISOString(),
    type: rawEvent.type || 'suspicious_behavior',
    severity: rawEvent.severity || 'medium',
    ipAddress: rawEvent.ipAddress || 'unknown',
    location: {
      country: rawEvent.location?.country || 'Unknown',
      city: rawEvent.location?.city || 'Unknown',
      region: rawEvent.location?.region || 'Unknown',
      timezone: rawEvent.location?.timezone || 'Unknown',
      latitude: rawEvent.location?.latitude,
      longitude: rawEvent.location?.longitude,
    },
    deviceInfo: {
      userAgent: rawEvent.deviceInfo?.userAgent || 'Unknown',
      platform: rawEvent.deviceInfo?.platform || 'Unknown',
      language: rawEvent.deviceInfo?.language || 'Unknown',
      screenResolution: rawEvent.deviceInfo?.screenResolution || 'Unknown',
      timezone: rawEvent.deviceInfo?.timezone || 'Unknown',
      cookiesEnabled: rawEvent.deviceInfo?.cookiesEnabled ?? false,
      doNotTrack: rawEvent.deviceInfo?.doNotTrack ?? false,
    },
    behaviorMetrics: {
      mouseMovements: rawEvent.behaviorMetrics?.mouseMovements ?? 0,
      keystrokes: rawEvent.behaviorMetrics?.keystrokes ?? 0,
      clickCount: rawEvent.behaviorMetrics?.clickCount ?? 0,
      scrollDepth: rawEvent.behaviorMetrics?.scrollDepth ?? 0,
      timeOnPage: rawEvent.behaviorMetrics?.timeOnPage ?? 0,
      humanLikelihood: rawEvent.behaviorMetrics?.humanLikelihood ?? 0,
    },
    honeypotData: rawEvent.honeypotData ? {
      fieldsFilled: rawEvent.honeypotData.fieldsFilled || [],
      suspicionScore: rawEvent.honeypotData.suspicionScore ?? 0,
    } : undefined,
    sessionData: {
      sessionId: rawEvent.sessionData?.sessionId || 'unknown',
      pageViews: rawEvent.sessionData?.pageViews ?? 1,
      referrer: rawEvent.sessionData?.referrer || '',
    },
    details: rawEvent.details || 'Security event recorded',
  }
}

function calculateStatistics(events: SecurityEvent[]): DashboardStatistics {
  const byType = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const bySeverity = events.reduce((acc, event) => {
    acc[event.severity] = (acc[event.severity] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const total = events.length
  const uniqueIPs = new Set(events.map(event => event.ipAddress)).size
  const avgHumanScore = total > 0
    ? Math.round(events.reduce((sum, event) => sum + event.behaviorMetrics.humanLikelihood, 0) / total)
    : 0

  return {
    total,
    byType,
    bySeverity,
    uniqueIPs,
    avgHumanScore,
    recentEvents: events.slice(0, 10),
  }
}

function getLocalSecurityData(filter: {
  type?: SecurityEvent['type']
  severity?: SecurityEvent['severity']
}) {
  const monitor = getSecurityMonitor()
  const events = monitor.getEvents({
    ...filter,
    limit: 50,
  })

  return {
    events,
    statistics: calculateStatistics(events),
  }
}

export default function SecurityDashboardPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null)
  const [filter, setFilter] = useState<{
    type?: SecurityEvent['type']
    severity?: SecurityEvent['severity']
  }>({})
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [dataSource, setDataSource] = useState<'api' | 'local'>('api')

  useEffect(() => {
    void loadData()
  }, [filter])

  const loadData = async () => {
    const params = new URLSearchParams({ limit: '50' })

    if (filter.type) {
      params.set('type', filter.type)
    }

    if (filter.severity) {
      params.set('severity', filter.severity)
    }

    try {
      const response = await fetch(`/api/security-events?${params.toString()}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Security events request failed with ${response.status}`)
      }

      const data = await response.json()
      const normalizedEvents = Array.isArray(data.events)
        ? data.events.map(normalizeSecurityEvent)
        : []

      setEvents(normalizedEvents)
      setStatistics(calculateStatistics(normalizedEvents))
      setDataSource('api')
    } catch {
      if (typeof window !== 'undefined') {
        const localData = getLocalSecurityData(filter)
        setEvents(localData.events)
        setStatistics(localData.statistics)
        setDataSource('local')
      }
    }
  }

  const clearAllEvents = async () => {
    if (!confirm('Are you sure you want to clear all security events?')) {
      return
    }

    try {
      await fetch('/api/security-events?all=true', { method: 'DELETE' })
    } catch {
      // Local cleanup still runs below as a fallback.
    }

    if (typeof window !== 'undefined') {
      const monitor = getSecurityMonitor()
      monitor.clearEvents()
    }

    setSelectedEvent(null)
    await loadData()
  }

  const getSeverityColor = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getTypeIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'login_attempt': return <Eye className="w-4 h-4" />
      case 'honeypot_triggered': return <AlertTriangle className="w-4 h-4" />
      case 'bot_detected': return <Shield className="w-4 h-4" />
      case 'suspicious_behavior': return <Activity className="w-4 h-4" />
      case 'failed_auth': return <AlertTriangle className="w-4 h-4" />
      case 'injection_attempt': return <AlertTriangle className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  if (!statistics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading security data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Security Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Monitor threats, bots, and suspicious activities</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void loadData()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => void clearAllEvents()} variant="destructive" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {dataSource === 'local' && (
        <Alert>
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            Showing local browser events because the persisted security log API was unavailable.
          </AlertDescription>
        </Alert>
      )}

      {(statistics.bySeverity.critical || 0) > 0 && (
        <Alert variant="destructive" className="border-2">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription className="font-medium">
            <strong>{statistics.bySeverity.critical}</strong> critical security events detected!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Total Events</p>
                <p className="text-2xl font-bold text-foreground mt-2">{statistics.total}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Unique IPs</p>
                <p className="text-2xl font-bold text-foreground mt-2">{statistics.uniqueIPs}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Human Score</p>
                <p className="text-2xl font-bold text-foreground mt-2">{statistics.avgHumanScore}%</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">High/Critical</p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {(statistics.bySeverity.critical || 0) + (statistics.bySeverity.high || 0)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Event Types</CardTitle>
          <CardDescription>Distribution of security events by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(statistics.byType).map(([type, count]) => (
              <div key={type} className="text-center p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex justify-center mb-2">{getTypeIcon(type as SecurityEvent['type'])}</div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  {type.replace(/_/g, ' ')}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Select value={filter.type || 'all'} onValueChange={(value) => setFilter(prev => ({ ...prev, type: value === 'all' ? undefined : value as SecurityEvent['type'] }))}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="login_attempt">Login Attempts</SelectItem>
            <SelectItem value="honeypot_triggered">Honeypot</SelectItem>
            <SelectItem value="bot_detected">Bot Detected</SelectItem>
            <SelectItem value="suspicious_behavior">Suspicious</SelectItem>
            <SelectItem value="failed_auth">Failed Auth</SelectItem>
            <SelectItem value="injection_attempt">Injection</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filter.severity || 'all'} onValueChange={(value) => setFilter(prev => ({ ...prev, severity: value === 'all' ? undefined : value as SecurityEvent['severity'] }))}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Security Events ({events.length})</CardTitle>
          <CardDescription>Recent security events and threats</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No security events found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div
                  key={event.id}
                  className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-muted mt-1">
                        {getTypeIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={getSeverityColor(event.severity)}>
                            {event.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {event.type.replace(/_/g, ' ')}
                          </Badge>
                          {event.behaviorMetrics.humanLikelihood < 50 && (
                            <Badge variant="destructive" className="text-xs">
                              Bot Likely {event.behaviorMetrics.humanLikelihood}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground">{event.details}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(event.timestamp)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {event.ipAddress}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location.city}, {event.location.country}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mouse className="w-3 h-3" />
                            {event.behaviorMetrics.mouseMovements} movements
                          </span>
                          <span className="flex items-center gap-1">
                            <Keyboard className="w-3 h-3" />
                            {event.behaviorMetrics.keystrokes} keys
                          </span>
                          <span className="flex items-center gap-1">
                            <Monitor className="w-3 h-3" />
                            {event.deviceInfo.platform}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedEvent?.id === event.id && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-semibold mb-2">Device Information</p>
                          <div className="space-y-1 text-xs">
                            <p><strong>User Agent:</strong> {event.deviceInfo.userAgent}</p>
                            <p><strong>Resolution:</strong> {event.deviceInfo.screenResolution}</p>
                            <p><strong>Timezone:</strong> {event.deviceInfo.timezone}</p>
                            <p><strong>Language:</strong> {event.deviceInfo.language}</p>
                            <p><strong>Cookies:</strong> {event.deviceInfo.cookiesEnabled ? 'Enabled' : 'Disabled'}</p>
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold mb-2">Behavior Analysis</p>
                          <div className="space-y-1 text-xs">
                            <p><strong>Time on Page:</strong> {event.behaviorMetrics.timeOnPage}s</p>
                            <p><strong>Click Count:</strong> {event.behaviorMetrics.clickCount}</p>
                            <p><strong>Scroll Depth:</strong> {event.behaviorMetrics.scrollDepth}</p>
                            <p><strong>Human Likelihood:</strong> {event.behaviorMetrics.humanLikelihood}%</p>
                            {event.honeypotData && (
                              <>
                                <p className="text-red-600 font-semibold mt-2">Honeypot Triggered</p>
                                <p><strong>Fields Filled:</strong> {event.honeypotData.fieldsFilled.join(', ')}</p>
                                <p><strong>Suspicion Score:</strong> {event.honeypotData.suspicionScore}%</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold mb-2 text-sm">Location Details</p>
                        <div className="text-xs space-y-1">
                          <p><strong>Country:</strong> {event.location.country}</p>
                          <p><strong>City:</strong> {event.location.city}</p>
                          <p><strong>Region:</strong> {event.location.region}</p>
                          {event.location.latitude && event.location.longitude && (
                            <p><strong>Coordinates:</strong> {event.location.latitude}, {event.location.longitude}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
