import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSecurityHeaders } from './lib/enhanced-security-headers'
import { evaluateWAFRules } from './lib/waf'

// Edge-safe static list of honeypot decoy paths
const HONEYPOT_PATHS = [
  '/api/admin/users/all',
  '/api/admin/config',
  '/api/admin/debug',
  '/api/admin/logs',
  '/api/admin/impersonate',
  '/api/auth/admin',
  '/api/user/password',
  '/api/auth/token',
  '/api/auth/master-token',
  '/api/auth/service-account',
  '/api/data/export-all',
  '/api/patients/all',
  '/api/records/dump',
  '/api/data/backup',
  '/internal/patient-records',
  '/.env',
  '/.env.production',
  '/api/debug/sql',
  '/api/health/detailed',
  '/.git/config',
  '/server-status',
  '/api/v1/',
  '/api/v2/users',
  '/graphql',
  '/wp-admin',
  '/wp-login.php',
  '/administrator',
  '/phpmyadmin',
]

// Edge-safe check for honeypots
function isHoneypotPath(pathname: string): boolean {
  return HONEYPOT_PATHS.some(path => pathname.includes(path))
}

// Edge-safe Admin IP Whitelist helper
const ADMIN_IP_WHITELIST = process.env.ADMIN_IP_WHITELIST?.split(',') || []
function isIPWhitelisted(request: NextRequest): boolean {
  if (ADMIN_IP_WHITELIST.length === 0) return true // No whitelist configured
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  return ADMIN_IP_WHITELIST.some(ip => clientIP.includes(ip))
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. Honeypot Decoy Trap Capture
  // Intercept bots searching for vulnerabilities (e.g. wp-admin, .env) and rewrite to honeypot
  if (isHoneypotPath(pathname)) {
    console.warn(`[HONEYPOT CAPTURE] Redirected scan request for '${pathname}' to interactive high-interaction honeypot API.`)
    return NextResponse.rewrite(new URL('/api/honeypot', request.url))
  }

  // 2. WAF (Web Application Firewall) Edge Gatekeeping
  // Intercept SQL/XSS injections, malicious scanner User-Agents, and path traversals
  const wafResult = evaluateWAFRules(request)
  if (!wafResult.allowed) {
    console.warn(`[WAF BLOCK] Matched: ${wafResult.reason} | IP: ${request.headers.get('x-forwarded-for') || 'unknown'}`)
    
    // Log security event in the background (non-blocking) via API POST
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    
    fetch(new URL('/api/security-events', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'injection_attempt',
        severity: 'high',
        ipAddress: ip,
        deviceInfo: {
          userAgent,
          platform: 'Unknown',
          language: 'Unknown',
        },
        details: `WAF block triggered. Reason: ${wafResult.reason}. Request Path: ${pathname}`,
      }),
    }).catch(err => console.error('Failed to log WAF block event:', err))

    return new NextResponse(
      JSON.stringify({
        error: 'Blocked by Web Application Firewall (WAF)',
        reason: wafResult.reason,
        code: 'WAF_BLOCKED',
        timestamp: new Date().toISOString(),
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 3. Admin IP Gatekeeper
  // Enforce IP constraints on administration routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!isIPWhitelisted(request)) {
      console.warn(`[IP REJECTION] Admin access denied for IP ${request.headers.get('x-forwarded-for') || 'unknown'}`)
      
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      const userAgent = request.headers.get('user-agent') || 'Unknown'
      
      fetch(new URL('/api/security-events', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'suspicious_behavior',
          severity: 'high',
          ipAddress: ip,
          deviceInfo: {
            userAgent,
            platform: 'Unknown',
            language: 'Unknown',
          },
          details: `Admin route IP restriction block. Access denied for: ${pathname}`,
        }),
      }).catch(err => console.error('Failed to log admin IP restriction event:', err))

      return new NextResponse(
        JSON.stringify({
          error: 'Access denied. IP address not whitelisted for administrative tasks.',
          code: 'ADMIN_IP_RESTRICTED',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // Clone headers and apply pathname header
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  // Create response
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Apply security headers
  const securityHeaders = getSecurityHeaders()
  securityHeaders.forEach(({ key, value }) => {
    response.headers.set(key, value)
  })

  return response
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}


