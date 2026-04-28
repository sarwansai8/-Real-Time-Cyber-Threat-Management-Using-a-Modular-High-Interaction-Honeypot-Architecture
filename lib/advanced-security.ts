// Advanced Cybersecurity Middleware
// JWT Token Rotation, CSRF Protection, IP Whitelisting, Brute Force Protection

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { getJwtRefreshSecret, getJwtSecret } from './env'

// In-memory store for CSRF tokens (use Redis in production)
const csrfTokens = new Map<string, { token: string; expires: number }>()

// In-memory store for failed login attempts (use Redis in production)
const loginAttempts = new Map<string, { count: number; resetTime: number; locked: boolean }>()

// IP Whitelist for admin routes (optional)
const ADMIN_IP_WHITELIST = process.env.ADMIN_IP_WHITELIST?.split(',') || []

/**
 * Generate CSRF Token
 */
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  csrfTokens.set(sessionId, {
    token,
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  })
  return token
}

/**
 * Validate CSRF Token
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId)
  
  if (!stored) return false
  if (stored.expires < Date.now()) {
    csrfTokens.delete(sessionId)
    return false
  }
  
  return stored.token === token
}

/**
 * CSRF Protection Middleware
 * Validates CSRF token for state-changing operations
 */
export async function csrfProtection(request: NextRequest): Promise<NextResponse | null> {
  // Only protect state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const sessionId = request.cookies.get('session-id')?.value
    const csrfToken = request.headers.get('x-csrf-token')
    
    if (!sessionId || !csrfToken || !validateCSRFToken(sessionId, csrfToken)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token. Possible CSRF attack detected.' },
        { status: 403 }
      )
    }
  }
  
  return null
}

/**
 * JWT Token Rotation
 * Issues new access token when old one is close to expiry
 */
export function shouldRotateToken(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any
    if (!decoded || !decoded.exp) return false
    
    const expiresIn = decoded.exp * 1000 - Date.now()
    const rotationThreshold = 24 * 60 * 60 * 1000 // 1 day
    
    return expiresIn < rotationThreshold
  } catch {
    return false
  }
}

/**
 * Generate new JWT token
 */
export function rotateJWTToken(oldToken: string): string | null {
  try {
    const decoded = jwt.verify(oldToken, getJwtSecret()) as any
    
    // Generate new token with extended expiry
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    )
    
    return newToken
  } catch {
    return null
  }
}

/**
 * JWT Token Refresh Flow
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    getJwtRefreshSecret(),
    { expiresIn: '30d' }
  )
}

export function verifyRefreshToken(refreshToken: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(refreshToken, getJwtRefreshSecret()) as any
    if (decoded.type !== 'refresh') return null
    return { userId: decoded.userId }
  } catch {
    return null
  }
}

/**
 * Brute Force Protection
 * Tracks login attempts and locks accounts temporarily
 */
export function recordLoginAttempt(identifier: string, success: boolean): {
  allowed: boolean
  attemptsLeft: number
  lockoutTime?: number
} {
  const now = Date.now()
  const attempt = loginAttempts.get(identifier)
  
  // Reset if time window passed
  if (attempt && attempt.resetTime < now) {
    loginAttempts.delete(identifier)
  }
  
  if (success) {
    // Clear attempts on successful login
    loginAttempts.delete(identifier)
    return { allowed: true, attemptsLeft: 5 }
  }
  
  // Record failed attempt
  const current = loginAttempts.get(identifier) || {
    count: 0,
    resetTime: now + 15 * 60 * 1000, // 15 minutes
    locked: false,
  }
  
  current.count++
  
  // Lock after 5 failed attempts
  if (current.count >= 5) {
    current.locked = true
    current.resetTime = now + 30 * 60 * 1000 // 30 minutes lockout
    loginAttempts.set(identifier, current)
    
    return {
      allowed: false,
      attemptsLeft: 0,
      lockoutTime: current.resetTime,
    }
  }
  
  loginAttempts.set(identifier, current)
  
  return {
    allowed: true,
    attemptsLeft: 5 - current.count,
  }
}

/**
 * Check if account is locked
 */
export function isAccountLocked(identifier: string): boolean {
  const attempt = loginAttempts.get(identifier)
  
  if (!attempt) return false
  if (attempt.resetTime < Date.now()) {
    loginAttempts.delete(identifier)
    return false
  }
  
  return attempt.locked
}

/**
 * IP Whitelist Check (for admin routes)
 */
export function isIPWhitelisted(request: NextRequest): boolean {
  if (ADMIN_IP_WHITELIST.length === 0) return true // No whitelist configured
  
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  
  return ADMIN_IP_WHITELIST.some(ip => clientIP.includes(ip))
}

/**
 * Admin IP Protection Middleware
 */
export async function adminIPProtection(request: NextRequest): Promise<NextResponse | null> {
  if (!isIPWhitelisted(request)) {
    return NextResponse.json(
      { error: 'Access denied. IP not whitelisted for admin access.' },
      { status: 403 }
    )
  }
  
  return null
}

/**
 * Secure Password Requirements
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0
  
  // Length check
  if (password.length < 12) {
    feedback.push('Password should be at least 12 characters long')
  } else {
    score += 20
  }
  
  // Complexity checks
  if (!/[a-z]/.test(password)) {
    feedback.push('Add lowercase letters')
  } else {
    score += 15
  }
  
  if (!/[A-Z]/.test(password)) {
    feedback.push('Add uppercase letters')
  } else {
    score += 15
  }
  
  if (!/[0-9]/.test(password)) {
    feedback.push('Add numbers')
  } else {
    score += 15
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.push('Add special characters (!@#$%^&*)')
  } else {
    score += 15
  }
  
  // Sequential characters check
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Avoid repeated characters (e.g., "aaa", "111")')
    score -= 10
  } else {
    score += 10
  }
  
  // Common patterns check
  const commonPatterns = ['password', '123456', 'qwerty', 'admin', 'letmein']
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    feedback.push('Avoid common words and patterns')
    score -= 20
  } else {
    score += 10
  }
  
  return {
    valid: score >= 70,
    score: Math.max(0, Math.min(100, score)),
    feedback,
  }
}

/**
 * Prevent timing attacks on string comparison
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Password breach check (placeholder - integrate with Have I Been Pwned API)
 */
export async function isPasswordBreached(password: string): Promise<boolean> {
  // In production, integrate with HIBP API
  // For now, just check against common passwords
  const commonPasswords = [
    'password123',
    'admin123',
    'qwerty123',
    '12345678',
    'password',
  ]
  
  return commonPasswords.includes(password.toLowerCase())
}

/**
 * Clean up expired tokens and attempts
 */
export function cleanupSecurityStore(): void {
  const now = Date.now()
  
  // Clean CSRF tokens
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires < now) {
      csrfTokens.delete(key)
    }
  }
  
  // Clean login attempts
  for (const [key, value] of loginAttempts.entries()) {
    if (value.resetTime < now) {
      loginAttempts.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupSecurityStore, 5 * 60 * 1000)
}

/**
 * SQL Injection Prevention (already handled by Mongoose, but for reference)
 */
export function sanitizeMongoQuery(query: any): any {
  if (typeof query !== 'object' || query === null) return query
  
  const sanitized: any = {}
  
  for (const [key, value] of Object.entries(query)) {
    // Prevent $where and other dangerous operators
    if (key.startsWith('$') && key !== '$regex' && key !== '$in' && key !== '$nin') {
      continue
    }
    
    sanitized[key] = typeof value === 'object' ? sanitizeMongoQuery(value) : value
  }
  
  return sanitized
}

/**
 * Prevent NoSQL Injection in user input
 */
export function sanitizeUserInput(input: any): any {
  if (typeof input === 'string') {
    // Remove MongoDB operators from strings
    return input.replace(/\$/g, '')
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeUserInput)
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      if (!key.startsWith('$')) {
        sanitized[key] = sanitizeUserInput(value)
      }
    }
    return sanitized
  }
  
  return input
}
