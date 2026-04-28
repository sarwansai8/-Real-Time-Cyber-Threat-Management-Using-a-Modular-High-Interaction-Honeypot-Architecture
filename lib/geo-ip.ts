/**
 * Geo-IP Intelligence & Suspicious Login Detection
 * Tracks login locations and alerts on geographic anomalies
 */

export interface GeoLocation {
  ip: string
  country: string
  countryCode: string
  region: string
  city: string
  latitude: number
  longitude: number
  timezone: string
  isp: string
  isProxy: boolean
  isVPN: boolean
  isTor: boolean
}

export interface LoginLocationHistory {
  userId: string
  locations: GeoLocation[]
  lastLogin: GeoLocation | null
  suspiciousLogins: SuspiciousLogin[]
}

export interface SuspiciousLogin {
  current: GeoLocation
  previous: GeoLocation
  distanceKm: number
  timeDiffMinutes: number
  travelSpeedKmh: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reason: string
}

// Known malicious IP ranges (Tor exit nodes, known attacker IPs)
const BLOCKED_RANGES = [
  '185.220.', '185.100.', '198.96.', '171.25.',  // Known Tor exit nodes
  '23.129.', '109.70.', '178.17.', '51.15.',     // VPN/proxy ranges
]

// In-memory location history
const loginHistory = new Map<string, LoginLocationHistory>()

/**
 * Lookup IP geolocation using free IP-API service
 */
export async function lookupGeoIP(ip: string): Promise<GeoLocation> {
  // Skip localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === 'unknown') {
    return {
      ip,
      country: 'Local', countryCode: 'LO', region: 'Local', city: 'Localhost',
      latitude: 0, longitude: 0, timezone: 'UTC', isp: 'Local',
      isProxy: false, isVPN: false, isTor: false,
    }
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,city,lat,lon,timezone,isp,proxy,hosting`, {
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) throw new Error('Geo lookup failed')

    const data = await response.json()
    if (data.status === 'fail') throw new Error(data.message)

    return {
      ip,
      country: data.country || 'Unknown',
      countryCode: data.countryCode || 'XX',
      region: data.region || 'Unknown',
      city: data.city || 'Unknown',
      latitude: data.lat || 0,
      longitude: data.lon || 0,
      timezone: data.timezone || 'UTC',
      isp: data.isp || 'Unknown',
      isProxy: data.proxy || false,
      isVPN: data.hosting || false,
      isTor: BLOCKED_RANGES.some((range) => ip.startsWith(range)),
    }
  } catch {
    return {
      ip,
      country: 'Unknown', countryCode: 'XX', region: 'Unknown', city: 'Unknown',
      latitude: 0, longitude: 0, timezone: 'UTC', isp: 'Unknown',
      isProxy: false, isVPN: false, isTor: BLOCKED_RANGES.some((r) => ip.startsWith(r)),
    }
  }
}

/**
 * Calculate distance between two lat/lng points (Haversine formula)
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Analyze a login attempt for geographic anomalies
 */
export async function analyzeLoginLocation(
  userId: string,
  ip: string,
  loginTime: Date = new Date()
): Promise<{ allowed: boolean; suspicious: SuspiciousLogin | null; location: GeoLocation }> {
  const location = await lookupGeoIP(ip)

  // Block Tor/known malicious IPs
  if (location.isTor) {
    return {
      allowed: false,
      suspicious: {
        current: location, previous: location,
        distanceKm: 0, timeDiffMinutes: 0, travelSpeedKmh: 0,
        riskLevel: 'critical',
        reason: 'Login attempt from Tor exit node — blocked',
      },
      location,
    }
  }

  // Get user history
  let history = loginHistory.get(userId)
  if (!history) {
    history = { userId, locations: [], lastLogin: null, suspiciousLogins: [] }
    loginHistory.set(userId, history)
  }

  // First login — allow
  if (!history.lastLogin) {
    history.lastLogin = location
    history.locations.push(location)
    return { allowed: true, suspicious: null, location }
  }

  // Calculate distance from last login
  const prev = history.lastLogin
  const distanceKm = haversineDistance(prev.latitude, prev.longitude, location.latitude, location.longitude)

  // Calculate time difference
  const lastLoginTime = history.locations.length > 0
    ? new Date(Date.now() - 1000 * 60 * 30) // Assume 30 min ago if unknown
    : new Date()
  const timeDiffMinutes = (loginTime.getTime() - lastLoginTime.getTime()) / (1000 * 60)
  const travelSpeedKmh = timeDiffMinutes > 0 ? (distanceKm / timeDiffMinutes) * 60 : 0

  // Determine risk
  let riskLevel: SuspiciousLogin['riskLevel'] = 'low'
  let reason = ''

  if (distanceKm > 5000 && timeDiffMinutes < 120) {
    riskLevel = 'critical'
    reason = `Impossible travel: ${Math.round(distanceKm)}km in ${Math.round(timeDiffMinutes)} minutes (${Math.round(travelSpeedKmh)} km/h)`
  } else if (prev.countryCode !== location.countryCode) {
    riskLevel = 'high'
    reason = `Login from new country: ${location.country} (previous: ${prev.country})`
  } else if (distanceKm > 500) {
    riskLevel = 'medium'
    reason = `Login from distant location: ${location.city} (${Math.round(distanceKm)}km from usual)`
  } else if (location.isVPN || location.isProxy) {
    riskLevel = 'medium'
    reason = 'Login through VPN/Proxy detected'
  }

  // Update history
  history.lastLogin = location
  history.locations.push(location)
  if (history.locations.length > 50) history.locations.shift()

  if (riskLevel !== 'low') {
    const suspicious: SuspiciousLogin = {
      current: location, previous: prev,
      distanceKm, timeDiffMinutes, travelSpeedKmh,
      riskLevel, reason,
    }
    history.suspiciousLogins.push(suspicious)
    return { allowed: riskLevel !== 'critical', suspicious, location }
  }

  return { allowed: true, suspicious: null, location }
}

/**
 * Check if an IP is from a blocked range
 */
export function isBlockedIP(ip: string): boolean {
  return BLOCKED_RANGES.some((range) => ip.startsWith(range))
}

/**
 * Get login history for a user
 */
export function getLoginHistory(userId: string): LoginLocationHistory | null {
  return loginHistory.get(userId) || null
}
