// Security Monitoring System - Honeypot & Threat Detection

export interface SecurityEvent {
  id: string
  timestamp: string
  type: 'login_attempt' | 'honeypot_triggered' | 'suspicious_behavior' | 'bot_detected' | 'failed_auth' | 'injection_attempt'
  severity: 'low' | 'medium' | 'high' | 'critical'
  ipAddress: string
  location: {
    country?: string
    city?: string
    region?: string
    timezone?: string
    latitude?: number
    longitude?: number
  }
  deviceInfo: {
    userAgent: string
    platform: string
    language: string
    screenResolution: string
    timezone: string
    cookiesEnabled: boolean
    doNotTrack: boolean
  }
  behaviorMetrics: {
    mouseMovements: number
    keystrokes: number
    clickCount: number
    scrollDepth: number
    timeOnPage: number
    humanLikelihood: number // 0-100 score
  }
  honeypotData?: {
    fieldsFilled: string[]
    suspicionScore: number
  }
  sessionData: {
    sessionId: string
    pageViews: number
    referrer: string
  }
  details: string
}

export interface MouseTrackingData {
  x: number
  y: number
  timestamp: number
  type: 'move' | 'click' | 'scroll'
}

export interface KeystrokeData {
  key: string
  timestamp: number
  duration: number
  isRapid: boolean
}

class SecurityMonitorService {
  private events: SecurityEvent[] = []
  private currentSession: string = ''
  private mouseData: MouseTrackingData[] = []
  private keystrokeData: KeystrokeData[] = []
  private startTime: number = Date.now()
  private lastKeystroke: number = 0

  constructor() {
    if (typeof window !== 'undefined') {
      this.currentSession = this.generateSessionId()
      this.loadStoredEvents()
      this.initializeTracking()
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private loadStoredEvents(): void {
    try {
      const stored = localStorage.getItem('security_events')
      if (stored) {
        this.events = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load security events:', error)
    }
  }

  private saveEvents(): void {
    try {
      // Keep last 500 events
      const recentEvents = this.events.slice(-500)
      localStorage.setItem('security_events', JSON.stringify(recentEvents))
    } catch (error) {
      console.error('Failed to save security events:', error)
    }
  }

  private initializeTracking(): void {
    // Mouse tracking
    document.addEventListener('mousemove', this.trackMouseMove.bind(this))
    document.addEventListener('click', this.trackMouseClick.bind(this))
    document.addEventListener('scroll', this.trackScroll.bind(this))

    // Keyboard tracking
    document.addEventListener('keydown', this.trackKeyDown.bind(this))
    document.addEventListener('keyup', this.trackKeyUp.bind(this))
  }

  private trackMouseMove(e: MouseEvent): void {
    this.mouseData.push({
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now(),
      type: 'move'
    })

    // Keep last 100 movements
    if (this.mouseData.length > 100) {
      this.mouseData = this.mouseData.slice(-100)
    }
  }

  private trackMouseClick(e: MouseEvent): void {
    this.mouseData.push({
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now(),
      type: 'click'
    })
  }

  private trackScroll(): void {
    this.mouseData.push({
      x: window.scrollX,
      y: window.scrollY,
      timestamp: Date.now(),
      type: 'scroll'
    })
  }

  private trackKeyDown(e: KeyboardEvent): void {
    const now = Date.now()
    const timeSinceLastKey = now - this.lastKeystroke
    
    // Safely handle key property
    const keyValue = e.key || 'Unknown'
    
    this.keystrokeData.push({
      key: keyValue.length === 1 ? keyValue : `[${keyValue}]`,
      timestamp: now,
      duration: 0,
      isRapid: timeSinceLastKey < 50 // Less than 50ms = suspicious rapid typing
    })

    this.lastKeystroke = now

    // Keep last 200 keystrokes
    if (this.keystrokeData.length > 200) {
      this.keystrokeData = this.keystrokeData.slice(-200)
    }
  }

  private trackKeyUp(e: KeyboardEvent): void {
    if (this.keystrokeData.length > 0) {
      const lastStroke = this.keystrokeData[this.keystrokeData.length - 1]
      lastStroke.duration = Date.now() - lastStroke.timestamp
    }
  }

  async getIPAddress(): Promise<string> {
    try {
      // Use multiple free IP services as fallback
      const services = [
        'https://api.ipify.org?format=json',
        'https://api.my-ip.io/v1/ip',
        'https://ipapi.co/json/'
      ]

      for (const service of services) {
        try {
          const response = await fetch(service)
          const data = await response.json()
          return data.ip || data.query || 'unknown'
        } catch {
          continue
        }
      }

      return 'unknown'
    } catch {
      return 'unknown'
    }
  }

  async getLocationData(ip: string): Promise<SecurityEvent['location']> {
    try {
      // Free IP geolocation service
      const response = await fetch(`https://ipapi.co/${ip}/json/`)
      const data = await response.json()

      return {
        country: data.country_name || 'Unknown',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        timezone: data.timezone || 'Unknown',
        latitude: data.latitude,
        longitude: data.longitude
      }
    } catch {
      return {
        country: 'Unknown',
        city: 'Unknown',
        region: 'Unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }
  }

  getDeviceInfo(): SecurityEvent['deviceInfo'] {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1'
    }
  }

  getBehaviorMetrics(): SecurityEvent['behaviorMetrics'] {
    const mouseMovements = this.mouseData.filter(d => d.type === 'move').length
    const clicks = this.mouseData.filter(d => d.type === 'click').length
    const scrolls = this.mouseData.filter(d => d.type === 'scroll').length
    const keystrokes = this.keystrokeData.length
    const timeOnPage = Math.floor((Date.now() - this.startTime) / 1000)

    // Calculate human likelihood score
    const humanScore = this.calculateHumanScore(mouseMovements, clicks, keystrokes, timeOnPage)

    return {
      mouseMovements,
      keystrokes,
      clickCount: clicks,
      scrollDepth: scrolls,
      timeOnPage,
      humanLikelihood: humanScore
    }
  }

  private calculateHumanScore(moves: number, clicks: number, keys: number, time: number): number {
    let score = 100

    // No mouse movement in 10+ seconds = suspicious
    if (moves === 0 && time > 10) score -= 30

    // Too many rapid keystrokes = bot
    const rapidKeys = this.keystrokeData.filter(k => k.isRapid).length
    if (rapidKeys > keys * 0.5) score -= 25

    // No clicks at all = suspicious
    if (clicks === 0 && time > 5) score -= 20

    // Perfect timing patterns = bot
    if (this.hasRobotTimingPattern()) score -= 25

    return Math.max(0, Math.min(100, score))
  }

  private hasRobotTimingPattern(): boolean {
    if (this.keystrokeData.length < 10) return false

    // Check if keystrokes have suspiciously consistent timing
    const intervals: number[] = []
    for (let i = 1; i < this.keystrokeData.length; i++) {
      intervals.push(this.keystrokeData[i].timestamp - this.keystrokeData[i - 1].timestamp)
    }

    // Calculate variance - bots have low variance
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length

    return variance < 100 // Very consistent = likely bot
  }

  async logEvent(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    details: string,
    honeypotData?: SecurityEvent['honeypotData']
  ): Promise<void> {
    const ipAddress = await this.getIPAddress()
    const location = await this.getLocationData(ipAddress)

    const event: SecurityEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      severity,
      ipAddress,
      location,
      deviceInfo: this.getDeviceInfo(),
      behaviorMetrics: this.getBehaviorMetrics(),
      honeypotData,
      sessionData: {
        sessionId: this.currentSession,
        pageViews: 1,
        referrer: document.referrer
      },
      details
    }

    this.events.push(event)
    this.saveEvents()

    // Send to MongoDB API (non-blocking)
    this.sendToAPI(event).catch(err => {
      console.error('Failed to send security event to API:', err)
    })

    // Log critical events to console
    if (severity === 'critical' || severity === 'high') {
      console.warn('🚨 Security Alert:', event)
    }
  }

  private async sendToAPI(event: SecurityEvent): Promise<void> {
    try {
      await fetch('/api/security-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: event.type,
          severity: event.severity,
          ipAddress: event.ipAddress,
          location: event.location,
          deviceInfo: event.deviceInfo,
          behaviorMetrics: event.behaviorMetrics,
          honeypotData: event.honeypotData,
          sessionData: event.sessionData,
          details: event.details
        })
      })
    } catch (error) {
      // Silent fail - localStorage backup is primary
      throw error
    }
  }

  getEvents(filter?: {
    type?: SecurityEvent['type']
    severity?: SecurityEvent['severity']
    limit?: number
  }): SecurityEvent[] {
    let filtered = [...this.events]

    if (filter?.type) {
      filtered = filtered.filter(e => e.type === filter.type)
    }

    if (filter?.severity) {
      filtered = filtered.filter(e => e.severity === filter.severity)
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit)
    }

    return filtered.reverse()
  }

  getStatistics() {
    const total = this.events.length
    const byType = this.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const bySeverity = this.events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const uniqueIPs = new Set(this.events.map(e => e.ipAddress)).size
    const avgHumanScore = this.events.reduce((sum, e) => sum + e.behaviorMetrics.humanLikelihood, 0) / total || 0

    return {
      total,
      byType,
      bySeverity,
      uniqueIPs,
      avgHumanScore: Math.round(avgHumanScore),
      recentEvents: this.events.slice(-10)
    }
  }

  clearEvents(): void {
    this.events = []
    localStorage.removeItem('security_events')
  }
}

// Singleton instance
let securityMonitor: SecurityMonitorService | null = null

export function getSecurityMonitor(): SecurityMonitorService {
  if (!securityMonitor && typeof window !== 'undefined') {
    securityMonitor = new SecurityMonitorService()
  }
  return securityMonitor!
}

export { SecurityMonitorService }
