/**
 * Session Anomaly Detection — Continuous Session Validation
 * Detects session hijacking by monitoring fingerprint changes mid-session
 */

export interface SessionFingerprint {
  userAgent: string
  language: string
  timezone: string
  screenRes: string
  colorDepth: number
  platform: string
  cookieEnabled: boolean
  doNotTrack: string | null
  timestamp: number
}

export interface SessionAnomalyResult {
  isValid: boolean
  anomalies: SessionAnomaly[]
  riskScore: number
  action: 'allow' | 'warn' | 'challenge' | 'terminate'
}

export interface SessionAnomaly {
  field: string
  expected: string
  actual: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
}

// Store session fingerprints
const sessionFingerprints = new Map<string, SessionFingerprint>()

/**
 * Capture current session fingerprint (client-side)
 */
export function captureSessionFingerprint(): SessionFingerprint {
  if (typeof window === 'undefined') {
    return {
      userAgent: '', language: '', timezone: '', screenRes: '',
      colorDepth: 0, platform: '', cookieEnabled: false, doNotTrack: null,
      timestamp: Date.now(),
    }
  }

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenRes: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    timestamp: Date.now(),
  }
}

/**
 * Register a session fingerprint on login
 */
export function registerSession(sessionId: string, fingerprint: SessionFingerprint): void {
  sessionFingerprints.set(sessionId, fingerprint)
}

/**
 * Validate current fingerprint against stored session
 */
export function validateSession(sessionId: string, currentFingerprint: SessionFingerprint): SessionAnomalyResult {
  const stored = sessionFingerprints.get(sessionId)

  if (!stored) {
    return { isValid: true, anomalies: [], riskScore: 0, action: 'allow' }
  }

  const anomalies: SessionAnomaly[] = []

  // Critical: User-Agent change (strong hijack indicator)
  if (stored.userAgent !== currentFingerprint.userAgent) {
    anomalies.push({
      field: 'userAgent', expected: stored.userAgent, actual: currentFingerprint.userAgent,
      severity: 'critical', description: 'Browser/device changed mid-session',
    })
  }

  // High: Platform change
  if (stored.platform !== currentFingerprint.platform) {
    anomalies.push({
      field: 'platform', expected: stored.platform, actual: currentFingerprint.platform,
      severity: 'high', description: 'Operating system changed mid-session',
    })
  }

  // High: Timezone change (geographic shift)
  if (stored.timezone !== currentFingerprint.timezone) {
    anomalies.push({
      field: 'timezone', expected: stored.timezone, actual: currentFingerprint.timezone,
      severity: 'high', description: 'Timezone changed — possible geographic shift',
    })
  }

  // Medium: Screen resolution change
  if (stored.screenRes !== currentFingerprint.screenRes) {
    anomalies.push({
      field: 'screenRes', expected: stored.screenRes, actual: currentFingerprint.screenRes,
      severity: 'medium', description: 'Screen resolution changed',
    })
  }

  // Medium: Language change
  if (stored.language !== currentFingerprint.language) {
    anomalies.push({
      field: 'language', expected: stored.language, actual: currentFingerprint.language,
      severity: 'medium', description: 'Browser language changed',
    })
  }

  // Low: Color depth change
  if (stored.colorDepth !== currentFingerprint.colorDepth) {
    anomalies.push({
      field: 'colorDepth', expected: String(stored.colorDepth), actual: String(currentFingerprint.colorDepth),
      severity: 'low', description: 'Color depth changed',
    })
  }

  // Calculate risk score
  const severityWeights = { critical: 40, high: 25, medium: 10, low: 5 }
  const riskScore = Math.min(100, anomalies.reduce((sum, a) => sum + severityWeights[a.severity], 0))

  // Determine action
  let action: SessionAnomalyResult['action'] = 'allow'
  if (riskScore >= 60) action = 'terminate'
  else if (riskScore >= 40) action = 'challenge'
  else if (riskScore >= 15) action = 'warn'

  return { isValid: riskScore < 40, anomalies, riskScore, action }
}

/**
 * Remove session on logout
 */
export function destroySession(sessionId: string): void {
  sessionFingerprints.delete(sessionId)
}

/**
 * Get all active session count
 */
export function getActiveSessionCount(): number {
  return sessionFingerprints.size
}

/**
 * Cleanup old sessions (run periodically)
 */
export function cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const now = Date.now()
  let removed = 0
  for (const [id, fp] of sessionFingerprints.entries()) {
    if (now - fp.timestamp > maxAgeMs) {
      sessionFingerprints.delete(id)
      removed++
    }
  }
  return removed
}
