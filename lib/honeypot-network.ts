// Honeypot Network - Decoy APIs and Trap Routes
// Fake endpoints that only bots would access

import { NextRequest, NextResponse } from 'next/server'

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
  
  // Credential traps
  { path: '/api/auth/admin', method: 'POST', description: 'Fake admin login', trapType: 'credential' },
  { path: '/api/user/password', method: 'GET', description: 'Fake password endpoint', trapType: 'credential' },
  { path: '/api/auth/token', method: 'GET', description: 'Fake token endpoint', trapType: 'credential' },
  
  // Data traps
  { path: '/api/data/export-all', method: 'GET', description: 'Fake bulk export', trapType: 'data' },
  { path: '/api/patients/all', method: 'GET', description: 'Fake patient list', trapType: 'data' },
  { path: '/api/records/dump', method: 'GET', description: 'Fake database dump', trapType: 'data' },
  
  // Config/Debug traps  
  { path: '/.env', method: 'GET', description: 'Fake env file', trapType: 'config' },
  { path: '/api/debug/sql', method: 'GET', description: 'Fake SQL debug', trapType: 'config' },
  { path: '/api/health/detailed', method: 'GET', description: 'Fake detailed health', trapType: 'config' },
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
        database: 'mongodb://fake:fake@localhost:27017/fake',
        jwt_secret: 'fake_secret_key_do_not_use',
        api_keys: ['fake_key_1', 'fake_key_2'],
        debug: true,
        environment: 'production'
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

  // Log to security events API
  try {
    await fetch('/api/security-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'honeypot_triggered',
        severity: 'critical',
        ipAddress: ip,
        location: {},
        deviceInfo: { userAgent, platform: 'Unknown', language: 'Unknown' },
        behaviorMetrics: {},
        sessionData: { sessionId: 'honeypot', pageViews: 1, referrer: '' },
        details: `Honeypot trap triggered: ${endpoint} (${trapType})`
      })
    })
  } catch (error) {
    console.error('Failed to log honeypot trap:', error)
  }

  // Also store locally
  try {
    const existingTraps = JSON.parse(localStorage.getItem('honeypot_traps') || '[]')
    existingTraps.push(trapData)
    localStorage.setItem('honeypot_traps', JSON.stringify(existingTraps.slice(-100)))
  } catch (e) {
    // Server-side or storage error
  }

  // Log to console (visible in admin logs)
  console.warn('🍯 HONEYPOT TRAP TRIGGERED:', trapData)
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
  // Log the trap trigger
  await logHoneypotTrap(request, trap.path, trap.trapType)

  // Generate fake data
  let fakeData = generateHoneypotData(trap.trapType)

  // For config, admin, and credential traps, sometimes return a fake stack trace to leak "internal" paths
  // This makes attackers think they found a vulnerability (Information Disclosure)
  if (['config', 'admin', 'credential'].includes(trap.trapType) && Math.random() > 0.6) {
    return new NextResponse(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'Unhandled exception in authentication middleware',
        stack: generateFakeStackTrace(),
        debug_trace: `0x${Math.floor(Math.random() * 16777215).toString(16).toUpperCase()}`,
        server_time: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Add realistic headers to make it look legitimate
  const response = NextResponse.json(fakeData, { status: 200 })
  
  response.headers.set('X-Powered-By', 'Express')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Server', 'nginx/1.18.0')
  
  // Add artificial delay to waste bot's time
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

  return response
}

/**
 * Check for suspicious URL patterns that indicate scanning
 */
export function detectScanning(pathname: string): boolean {
  const scanPatterns = [
    // Common vulnerability scanners
    /\.php$/i,
    /\.asp$/i,
    /\.jsp$/i,
    /phpMyAdmin/i,
    /wp-admin/i,
    /wp-login/i,
    /admin\.php/i,
    /config\.php/i,
    
    // Directory traversal
    /\.\./,
    /%2e%2e/i,
    /\.\.%2f/i,
    
    // SQL injection attempts in URL
    /union.*select/i,
    /concat\(/i,
    /or\s+1\s*=\s*1/i,
    
    // Command injection
    /;.*cat\s+\/etc\/passwd/i,
    /\|\|.*ls/i,
    
    // Common exploit paths
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
