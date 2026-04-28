// Honeypot Network - Decoy APIs and Trap Routes
// Fake endpoints that only bots would access
// Enhanced with: canary tokens, tarpitting, GraphQL traps, advanced profiling

import { NextRequest, NextResponse } from 'next/server'
import { createSecurityEvent } from './security-events'
import { generateCanaryToken, checkCanaryToken, tarpitResponse, profileAttacker, isKnownAttacker, type Detection } from './honeypot-intelligence'

export interface HoneypotEndpoint {
  path: string
  method: string
  description: string
  trapType: 'admin' | 'api' | 'credential' | 'data' | 'config'
}

// List of honeypot trap endpoints
export const HONEYPOT_ENDPOINTS: HoneypotEndpoint[] = [
  // Admin traps
  { path: '/api/admin/users/all', method: 'GET', description: 'Fake admin user list', trapType: 'admin' },
  { path: '/api/admin/config', method: 'GET', description: 'Fake config endpoint', trapType: 'config' },
  { path: '/api/admin/debug', method: 'GET', description: 'Fake debug endpoint', trapType: 'admin' },
  { path: '/api/admin/logs', method: 'GET', description: 'Fake logs endpoint', trapType: 'admin' },
  { path: '/api/admin/impersonate', method: 'POST', description: 'Fake user impersonation', trapType: 'admin' },

  // Credential traps
  { path: '/api/auth/admin', method: 'POST', description: 'Fake admin login', trapType: 'credential' },
  { path: '/api/user/password', method: 'GET', description: 'Fake password endpoint', trapType: 'credential' },
  { path: '/api/auth/token', method: 'GET', description: 'Fake token endpoint', trapType: 'credential' },
  { path: '/api/auth/master-token', method: 'GET', description: 'Fake master token', trapType: 'credential' },
  { path: '/api/auth/service-account', method: 'POST', description: 'Fake service auth', trapType: 'credential' },

  // Data traps
  { path: '/api/data/export-all', method: 'GET', description: 'Fake bulk export', trapType: 'data' },
  { path: '/api/patients/all', method: 'GET', description: 'Fake patient list', trapType: 'data' },
  { path: '/api/records/dump', method: 'GET', description: 'Fake database dump', trapType: 'data' },
  { path: '/api/data/backup', method: 'GET', description: 'Fake data backup', trapType: 'data' },
  { path: '/internal/patient-records', method: 'GET', description: 'Fake internal records', trapType: 'data' },

  // Config/Debug traps
  { path: '/.env', method: 'GET', description: 'Fake env file', trapType: 'config' },
  { path: '/.env.production', method: 'GET', description: 'Fake production env', trapType: 'config' },
  { path: '/api/debug/sql', method: 'GET', description: 'Fake SQL debug', trapType: 'config' },
  { path: '/api/health/detailed', method: 'GET', description: 'Fake detailed health', trapType: 'config' },
  { path: '/.git/config', method: 'GET', description: 'Fake git config', trapType: 'config' },
  { path: '/server-status', method: 'GET', description: 'Fake Apache status', trapType: 'config' },

  // API versioning traps (attackers probe for old APIs)
  { path: '/api/v1/', method: 'GET', description: 'Fake API v1', trapType: 'api' },
  { path: '/api/v2/users', method: 'GET', description: 'Fake API v2 users', trapType: 'api' },

  // GraphQL introspection trap
  { path: '/graphql', method: 'POST', description: 'Fake GraphQL endpoint', trapType: 'api' },

  // Common CMS traps
  { path: '/wp-admin', method: 'GET', description: 'WordPress admin probe', trapType: 'admin' },
  { path: '/wp-login.php', method: 'GET', description: 'WordPress login probe', trapType: 'credential' },
  { path: '/administrator', method: 'GET', description: 'Joomla admin probe', trapType: 'admin' },
  { path: '/phpmyadmin', method: 'GET', description: 'phpMyAdmin probe', trapType: 'config' },
]

/**
 * Generate fake but convincing data for honeypot responses
 */
export function generateHoneypotData(trapType: string): any {
  switch (trapType) {
    case 'admin':
      return {
        users: [
          { id: 1, email: 'admin@fake.com', role: 'admin', password: 'hashed_fake_pass_123' },
          { id: 2, email: 'user@fake.com', role: 'user', password: 'hashed_fake_pass_456' }
        ],
        total: 2,
        timestamp: new Date().toISOString()
      }

    case 'credential':
      return {
        token: 'fake_jwt_token_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        refresh_token: 'fake_refresh_token_abcdef123456',
        expires_in: 3600,
        admin: true
      }

    case 'data':
      return {
        records: [
          { id: 1, name: 'Fake Patient', ssn: '123-45-6789', diagnosis: 'Fake Data' },
          { id: 2, name: 'Decoy User', ssn: '987-65-4321', diagnosis: 'Honeypot' }
        ],
        total: 2,
        exported_at: new Date().toISOString()
      }

    case 'config':
      return {
        database: generateCanaryToken('db_uri'),
        jwt_secret: `canary_jwt_${Date.now().toString(36)}`,
        api_keys: [generateCanaryToken('api_key'), generateCanaryToken('api_key')],
        encryption_key: `enc_${Math.random().toString(36).substring(2, 34)}`,
        aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
        aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/canary_key',
        debug: true,
        environment: 'production',
        redis_url: 'redis://admin:canary_pwd@10.0.1.42:6379/0',
        smtp_password: `smtp_canary_${Date.now().toString(36)}`,
      }

    case 'api':
      // Fake GraphQL introspection response
      return {
        data: {
          __schema: {
            types: [
              { name: 'User', fields: ['id', 'email', 'password_hash', 'ssn', 'role'] },
              { name: 'Patient', fields: ['id', 'name', 'diagnosis', 'medications', 'insurance_id'] },
              { name: 'AdminAction', fields: ['id', 'action', 'target_user', 'timestamp'] },
            ],
            queryType: { name: 'Query' },
            mutationType: { name: 'Mutation' },
          }
        }
      }

    default:
      return { message: 'Fake API Response', data: null }
  }
}

/**
 * Generate a fake stack trace to confuse attackers
 */
export function generateFakeStackTrace(): string {
  const errors = [
    'Error: Database connection failed at /var/www/html/internal/db.js:42:15',
    'TypeError: Cannot read property "admin" of undefined at /app/server/auth/middleware.js:128:22',
    'ReferenceError: SECRET_KEY is not defined at /opt/api/config/secrets.ts:15:5',
    'SyntaxError: Unexpected token < in JSON at position 0 at /usr/src/app/api/parser.js:88:12'
  ]
  return errors[Math.floor(Math.random() * errors.length)]
}

/**
 * Detect malicious payloads in request body
 */
export function detectPayloadThreats(body: any): string[] {
  const threats: string[] = []
  const payloadStr = JSON.stringify(body).toLowerCase()

  if (payloadStr.includes('union select') || payloadStr.includes('or 1=1')) {
    threats.push('SQL Injection')
  }
  if (payloadStr.includes('..//') || payloadStr.includes('../')) {
    threats.push('Directory Traversal')
  }
  if (payloadStr.includes('<script>') || payloadStr.includes('javascript:')) {
    threats.push('XSS')
  }
  if (payloadStr.includes('eval(') || payloadStr.includes('exec(')) {
    threats.push('Remote Code Execution')
  }

  return threats
}

/**
 * Log honeypot trap trigger
 */
export async function logHoneypotTrap(
  request: NextRequest,
  endpoint: string,
  trapType: string
): Promise<void> {
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown'
  const userAgent = request.headers.get('user-agent') || 'Unknown'

  const trapData = {
    timestamp: new Date().toISOString(),
    endpoint,
    trapType,
    method: request.method,
    ip,
    userAgent,
    severity: 'critical',
    threat: 'Attacker attempting unauthorized access'
  }

  try {
    await createSecurityEvent(
      {
        type: 'honeypot_triggered',
        severity: 'critical',
        ipAddress: ip,
        location: {},
        deviceInfo: {
          userAgent,
          platform: 'Unknown',
          language: 'Unknown',
        },
        behaviorMetrics: {},
        sessionData: { sessionId: 'honeypot', pageViews: 1, referrer: '' },
        details: `Honeypot trap triggered: ${endpoint} (${trapType})`,
      },
      { request }
    )
  } catch (error) {
    console.error('Failed to log honeypot trap:', error)
  }

  if (typeof window !== 'undefined') {
    try {
      const existingTraps = JSON.parse(localStorage.getItem('honeypot_traps') || '[]')
      existingTraps.push(trapData)
      localStorage.setItem('honeypot_traps', JSON.stringify(existingTraps.slice(-100)))
    } catch {
      // Ignore browser storage failures
    }
  }

  console.warn('[HONEYPOT] Trap triggered:', trapData)
}

/**
 * Check if request path is a honeypot trap
 */
export function isHoneypotPath(pathname: string): HoneypotEndpoint | null {
  return HONEYPOT_ENDPOINTS.find(trap => pathname.includes(trap.path)) || null
}

/**
 * Generate honeypot response
 */
export async function generateHoneypotResponse(
  request: NextRequest,
  trap: HoneypotEndpoint
): Promise<NextResponse> {
  await logHoneypotTrap(request, trap.path, trap.trapType)

  const fakeData = generateHoneypotData(trap.trapType)

  // Determine response strategy based on attacker sophistication
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'Unknown'
  const detections: Detection[] = [{ technique: 'Honeypot endpoint access', category: 'canary_token', triggered: true, score: 50, evidence: `Accessed ${trap.path}` }]
  const profile = profileAttacker(ip, userAgent, trap.path, detections)

  // For advanced attackers: tarpit (slow response to waste their time)
  if (profile.recommendedAction === 'tarpit' || profile.recommendedAction === 'blackhole') {
    await tarpitResponse(15000) // 15 second delay
  }

  if (['config', 'admin', 'credential'].includes(trap.trapType) && Math.random() > 0.6) {
    return new NextResponse(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'Unhandled exception in authentication middleware',
        stack: generateFakeStackTrace(),
        debug_trace: `0x${Math.floor(Math.random() * 16777215).toString(16).toUpperCase()}`,
        server_time: new Date().toISOString(),
        request_id: `req_${Math.random().toString(36).substring(2, 14)}`,
        node_version: 'v18.17.0',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const response = NextResponse.json(fakeData, { status: 200 })

  // Fake server headers to mislead attackers
  response.headers.set('X-Powered-By', 'Express')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Server', 'nginx/1.18.0')
  response.headers.set('X-Request-ID', `req_${Math.random().toString(36).substring(2)}`)
  response.headers.set('X-RateLimit-Remaining', String(Math.floor(Math.random() * 100)))

  // Random delay (2-5 seconds) to simulate real DB queries
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

  return response
}

/**
 * Check for suspicious URL patterns that indicate scanning
 */
export function detectScanning(pathname: string): boolean {
  const scanPatterns = [
    /\.php$/i,
    /\.asp$/i,
    /\.jsp$/i,
    /phpMyAdmin/i,
    /wp-admin/i,
    /wp-login/i,
    /admin\.php/i,
    /config\.php/i,
    /\.\./,
    /%2e%2e/i,
    /\.\.%2f/i,
    /union.*select/i,
    /concat\(/i,
    /or\s+1\s*=\s*1/i,
    /;.*cat\s+\/etc\/passwd/i,
    /\|\|.*ls/i,
    /\.git/,
    /\.svn/,
    /\.env/,
    /backup/i,
    /dump\.sql/i,
  ]

  return scanPatterns.some(pattern => pattern.test(pathname))
}

/**
 * Generate invisible honeypot links for HTML pages
 */
export function generateHoneypotLinks(): string[] {
  return [
    '<a href="/api/admin/users/all" style="display:none;" aria-hidden="true">Admin Users</a>',
    '<a href="/api/admin/config" style="position:absolute;left:-9999px;" aria-hidden="true">Config</a>',
    '<a href="/.env" style="opacity:0;pointer-events:none;" aria-hidden="true">Environment</a>',
    '<a href="/api/data/export-all" style="visibility:hidden;" aria-hidden="true">Export</a>',
  ]
}

/**
 * Add honeypot meta tags (bots often scan meta tags)
 */
export function generateHoneypotMeta(): string[] {
  return [
    '<meta name="admin-panel" content="/fake-admin">',
    '<meta name="api-endpoint" content="/api/fake-data">',
    '<meta name="debug-mode" content="enabled">',
  ]
}
