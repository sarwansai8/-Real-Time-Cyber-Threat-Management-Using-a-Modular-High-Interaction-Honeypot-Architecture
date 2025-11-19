/**
 * Enhanced Security Headers Middleware
 * Implements comprehensive security headers for production deployment
 */

export interface SecurityHeadersConfig {
  enableHSTS?: boolean
  enableCSP?: boolean
  enableFrameGuard?: boolean
  contentTypeOptions?: boolean
  referrerPolicy?: string
  permissionsPolicy?: string
}

const defaultConfig: SecurityHeadersConfig = {
  enableHSTS: true,
  enableCSP: true,
  enableFrameGuard: true,
  contentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
}

/**
 * Generate Content Security Policy header
 */
function generateCSP(isDevelopment: boolean): string {
  const directives = [
    "default-src 'self'",
    isDevelopment
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline'", // unsafe-inline needed for Next.js
    "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.github.com wss:",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ]

  return directives.join('; ')
}

/**
 * Apply security headers to a Response
 */
export function applySecurityHeaders(
  response: Response,
  config: SecurityHeadersConfig = defaultConfig
): Response {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const headers = new Headers(response.headers)

  // HTTP Strict Transport Security (HSTS)
  if (config.enableHSTS && !isDevelopment) {
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  // Content Security Policy
  if (config.enableCSP) {
    headers.set('Content-Security-Policy', generateCSP(isDevelopment))
  }

  // X-Frame-Options - Prevent clickjacking
  if (config.enableFrameGuard) {
    headers.set('X-Frame-Options', 'DENY')
  }

  // X-Content-Type-Options - Prevent MIME sniffing
  if (config.contentTypeOptions) {
    headers.set('X-Content-Type-Options', 'nosniff')
  }

  // X-XSS-Protection - Legacy XSS protection
  headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer Policy
  if (config.referrerPolicy) {
    headers.set('Referrer-Policy', config.referrerPolicy)
  }

  // Permissions Policy (formerly Feature-Policy)
  if (config.permissionsPolicy) {
    headers.set('Permissions-Policy', config.permissionsPolicy)
  }

  // Remove server information
  headers.delete('X-Powered-By')
  headers.delete('Server')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Get security headers as object (for Next.js config)
 */
export function getSecurityHeaders(
  config: SecurityHeadersConfig = defaultConfig
): Array<{ key: string; value: string }> {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const headers: Array<{ key: string; value: string }> = []

  if (config.enableHSTS && !isDevelopment) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    })
  }

  if (config.enableCSP) {
    headers.push({
      key: 'Content-Security-Policy',
      value: generateCSP(isDevelopment),
    })
  }

  if (config.enableFrameGuard) {
    headers.push({
      key: 'X-Frame-Options',
      value: 'DENY',
    })
  }

  if (config.contentTypeOptions) {
    headers.push({
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    })
  }

  headers.push({
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  })

  if (config.referrerPolicy) {
    headers.push({
      key: 'Referrer-Policy',
      value: config.referrerPolicy,
    })
  }

  if (config.permissionsPolicy) {
    headers.push({
      key: 'Permissions-Policy',
      value: config.permissionsPolicy,
    })
  }

  return headers
}

