import connectDB from './db'
import { logger } from './logger'
import { SecurityEvent } from './models'

export const SECURITY_EVENT_TYPES = [
  'login_attempt',
  'honeypot_triggered',
  'suspicious_behavior',
  'bot_detected',
  'failed_auth',
  'injection_attempt',
] as const

export const SECURITY_EVENT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const

export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number]
export type SecurityEventSeverity = (typeof SECURITY_EVENT_SEVERITIES)[number]

type RequestLike = Pick<Request, 'headers'>

interface SecurityEventInput {
  type?: string
  eventType?: string
  severity?: string
  timestamp?: Date | string
  ipAddress?: string
  location?: {
    country?: string
    city?: string
    region?: string
    timezone?: string
    latitude?: number
    longitude?: number
  }
  deviceInfo?: {
    userAgent?: string
    platform?: string
    language?: string
    screenResolution?: string
    timezone?: string
    cookiesEnabled?: boolean
    doNotTrack?: boolean
  }
  behaviorMetrics?: {
    mouseMovements?: number
    keystrokes?: number
    clickCount?: number
    scrollDepth?: number
    timeOnPage?: number
    humanLikelihood?: number
  }
  honeypotData?: {
    fieldsFilled?: string[]
    suspicionScore?: number
  }
  sessionData?: {
    sessionId?: string
    pageViews?: number
    referrer?: string
  }
  details?: string
  description?: string
}

interface NormalizeSecurityEventOptions {
  request?: RequestLike
  fallbackType?: SecurityEventType
  fallbackSeverity?: SecurityEventSeverity
  fallbackDetails?: string
}

function isSecurityEventType(value?: string): value is SecurityEventType {
  return SECURITY_EVENT_TYPES.includes(value as SecurityEventType)
}

function isSecurityEventSeverity(value?: string): value is SecurityEventSeverity {
  return SECURITY_EVENT_SEVERITIES.includes(value as SecurityEventSeverity)
}

function getHeader(headers: Headers | undefined, name: string): string | undefined {
  const value = headers?.get(name)
  if (!value) {
    return undefined
  }

  if (name === 'x-forwarded-for') {
    return value.split(',')[0]?.trim() || undefined
  }

  return value
}

function parseTimestamp(timestamp?: Date | string): Date {
  if (timestamp instanceof Date && !Number.isNaN(timestamp.getTime())) {
    return timestamp
  }

  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return new Date()
}

export function normalizeSecurityEventInput(
  input: SecurityEventInput,
  options: NormalizeSecurityEventOptions = {}
) {
  const headers = options.request?.headers
  const rawType = input.type ?? input.eventType
  const type = isSecurityEventType(rawType) ? rawType : options.fallbackType ?? 'suspicious_behavior'
  const severity = isSecurityEventSeverity(input.severity)
    ? input.severity
    : options.fallbackSeverity ?? 'medium'
  const userAgent = input.deviceInfo?.userAgent || getHeader(headers, 'user-agent') || 'Unknown'
  const acceptLanguage = getHeader(headers, 'accept-language')
  const referrer = input.sessionData?.referrer || getHeader(headers, 'referer') || ''

  return {
    type,
    severity,
    timestamp: parseTimestamp(input.timestamp),
    ipAddress:
      input.ipAddress ||
      getHeader(headers, 'x-forwarded-for') ||
      getHeader(headers, 'x-real-ip') ||
      'unknown',
    location: {
      country: input.location?.country,
      city: input.location?.city,
      region: input.location?.region,
      timezone: input.location?.timezone,
      latitude: input.location?.latitude,
      longitude: input.location?.longitude,
    },
    deviceInfo: {
      userAgent,
      platform: input.deviceInfo?.platform || 'Unknown',
      language: input.deviceInfo?.language || acceptLanguage?.split(',')[0] || 'Unknown',
      screenResolution: input.deviceInfo?.screenResolution || 'Unknown',
      timezone: input.deviceInfo?.timezone || 'Unknown',
      cookiesEnabled: input.deviceInfo?.cookiesEnabled ?? false,
      doNotTrack: input.deviceInfo?.doNotTrack ?? false,
    },
    behaviorMetrics: {
      mouseMovements: input.behaviorMetrics?.mouseMovements ?? 0,
      keystrokes: input.behaviorMetrics?.keystrokes ?? 0,
      clickCount: input.behaviorMetrics?.clickCount ?? 0,
      scrollDepth: input.behaviorMetrics?.scrollDepth ?? 0,
      timeOnPage: input.behaviorMetrics?.timeOnPage ?? 0,
      humanLikelihood: input.behaviorMetrics?.humanLikelihood ?? 0,
    },
    honeypotData: input.honeypotData
      ? {
          fieldsFilled: input.honeypotData.fieldsFilled ?? [],
          suspicionScore: input.honeypotData.suspicionScore ?? 0,
        }
      : undefined,
    sessionData: {
      sessionId: input.sessionData?.sessionId || 'server',
      pageViews: input.sessionData?.pageViews ?? 1,
      referrer,
    },
    details:
      input.details ||
      input.description ||
      options.fallbackDetails ||
      `Security event recorded: ${type.replace(/_/g, ' ')}`,
  }
}

export async function createSecurityEvent(
  input: SecurityEventInput,
  options: NormalizeSecurityEventOptions = {}
) {
  const normalizedEvent = normalizeSecurityEventInput(input, options)

  try {
    await connectDB()
    return await SecurityEvent.create(normalizedEvent)
  } catch (error) {
    logger.error('Failed to persist security event', error, {
      type: normalizedEvent.type,
      severity: normalizedEvent.severity,
      ipAddress: normalizedEvent.ipAddress,
    })
    throw error
  }
}
