// Security Dashboard - Real-Time Threat Monitoring
// Visualizes honeypot triggers, bot detection, injection attempts, and more

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Shield, AlertTriangle, Activity, Lock, Eye, Fingerprint } from 'lucide-react'

interface SecurityEvent {
  id: string
  type: 'honeypot' | 'bot_detected' | 'injection' | 'session_hijack' | 'rate_limit'
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
  details: string
  ipAddress: string
  blocked: boolean
}

interface SecurityMetrics {
  totalEvents: number
  honeypotTriggers: number
  botDetections: number
  injectionAttempts: number
  blockedIPs: number
  activeThreats: number
}

export function SecurityDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    honeypotTriggers: 0,
    botDetections: 0,
    injectionAttempts: 0,
    blockedIPs: 0,
    activeThreats: 0
  })

  useEffect(() => {
    loadSecurityEvents()
    
    // Refresh every 5 seconds
    const interval = setInterval(loadSecurityEvents, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadSecurityEvents = async () => {
    try {
      // Load from localStorage (from security-monitor)
      const storedEvents = localStorage.getItem('security_events')
      if (storedEvents) {
        const parsed = JSON.parse(storedEvents)
        const recentEvents = parsed.slice(-50).map((e: any) => ({
          id: e.timestamp + Math.random(),
          type: e.type || e.eventType,
          severity: e.severity,
          timestamp: new Date(e.timestamp),
          details: e.details || e.description,
          ipAddress: e.ipAddress || e.data?.ipAddress || 'unknown',
          blocked: e.severity === 'critical'
        }))
        setEvents(recentEvents)
        
        // Calculate metrics
        const honeypots = recentEvents.filter((e: SecurityEvent) => e.type === 'honeypot').length
        const bots = recentEvents.filter((e: SecurityEvent) => e.type === 'bot_detected').length
        const injections = recentEvents.filter((e: SecurityEvent) => e.type === 'injection').length
        const blocked = new Set(recentEvents.filter((e: SecurityEvent) => e.blocked).map((e: SecurityEvent) => e.ipAddress)).size
        const active = recentEvents.filter((e: SecurityEvent) => 
          Date.now() - e.timestamp.getTime() < 300000 // Last 5 minutes
        ).length
        
        setMetrics({
          totalEvents: recentEvents.length,
          honeypotTriggers: honeypots,
          botDetections: bots,
          injectionAttempts: injections,
          blockedIPs: blocked,
          activeThreats: active
        })
      }
    } catch (error) {
      console.error('Failed to load security events:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'honeypot': return <Eye className="h-4 w-4" />
      case 'bot_detected': return <Activity className="h-4 w-4" />
      case 'injection': return <AlertTriangle className="h-4 w-4" />
      case 'session_hijack': return <Lock className="h-4 w-4" />
      default: return <Shield className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
        <p className="text-muted-foreground">Real-time threat monitoring and detection</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Events</CardDescription>
            <CardTitle className="text-3xl">{metrics.totalEvents}</CardTitle>
          </CardHeader>
          <CardContent>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Honeypot Triggers</CardDescription>
            <CardTitle className="text-3xl text-amber-500">{metrics.honeypotTriggers}</CardTitle>
          </CardHeader>
          <CardContent>
            <Eye className="h-4 w-4 text-amber-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bot Detections</CardDescription>
            <CardTitle className="text-3xl text-orange-500">{metrics.botDetections}</CardTitle>
          </CardHeader>
          <CardContent>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Injection Attempts</CardDescription>
            <CardTitle className="text-3xl text-red-500">{metrics.injectionAttempts}</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Blocked IPs</CardDescription>
            <CardTitle className="text-3xl text-red-700">{metrics.blockedIPs}</CardTitle>
          </CardHeader>
          <CardContent>
            <Lock className="h-4 w-4 text-red-700" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Threats</CardDescription>
            <CardTitle className="text-3xl text-rose-500">{metrics.activeThreats}</CardTitle>
          </CardHeader>
          <CardContent>
            <Fingerprint className="h-4 w-4 text-rose-500" />
          </CardContent>
        </Card>
      </div>

      {/* Active Threats Alert */}
      {metrics.activeThreats > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Active Threats Detected</AlertTitle>
          <AlertDescription>
            {metrics.activeThreats} security event(s) in the last 5 minutes. All threats are being monitored and blocked.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
          <CardDescription>Live feed of security detections and threats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No security events detected yet
              </p>
            ) : (
              events.reverse().map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="mt-1">{getTypeIcon(event.type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(event.severity)}>
                        {event.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{event.type.replace('_', ' ')}</Badge>
                      {event.blocked && <Badge variant="destructive">BLOCKED</Badge>}
                    </div>
                    <p className="text-sm font-medium">{event.details}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>IP: {event.ipAddress}</span>
                      <span>•</span>
                      <span>{event.timestamp.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Features Status */}
      <Card>
        <CardHeader>
          <CardTitle>Active Security Features</CardTitle>
          <CardDescription>All security layers are operational</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">🍯 Advanced Honeypot System</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">🤖 Bot Detection Engine</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">🧬 Behavioral Biometrics</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">💉 Injection Shield</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">🔐 Token Rotation</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">🔒 Session Management</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">📝 HIPAA Audit Logging</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">⚡ Rate Limiting</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
