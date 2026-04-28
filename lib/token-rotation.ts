// JWT Token Rotation & Security - Short-Lived Access Tokens
// Implements automatic token refresh with device binding

import jwt from 'jsonwebtoken'
import { getBotDetectionService } from './bot-detection'
import { getJwtSecret } from './env'

const ACCESS_TOKEN_EXPIRY = '5m' // 5 minutes (short-lived)
const REFRESH_TOKEN_EXPIRY = '7d' // 7 days
const ROTATION_INTERVAL = 4 * 60 * 1000 // 4 minutes (rotate before expiry)

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
}

export interface TokenPayload {
  userId: string
  email: string
  role: string
  fingerprint?: string
  sessionId?: string
  tokenVersion?: number
}

export interface RefreshTokenData {
  userId: string
  sessionId: string
  fingerprint: string
  version: number
  expiresAt: Date
}

// In-memory token revocation list (use Redis in production)
const revokedTokens = new Set<string>()
const activeRefreshTokens = new Map<string, RefreshTokenData>()

/**
 * Generate access token (short-lived, 5 minutes)
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      fingerprint: payload.fingerprint,
      sessionId: payload.sessionId,
      tokenVersion: payload.tokenVersion || 1,
      type: 'access'
    },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  )
}

/**
 * Generate refresh token (long-lived, 7 days)
 */
export function generateRefreshToken(payload: TokenPayload): string {
  const refreshToken = jwt.sign(
    {
      userId: payload.userId,
      sessionId: payload.sessionId,
      fingerprint: payload.fingerprint,
      tokenVersion: payload.tokenVersion || 1,
      type: 'refresh'
    },
    getJwtSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  )
  
  // Store refresh token metadata
  activeRefreshTokens.set(refreshToken, {
    userId: payload.userId,
    sessionId: payload.sessionId || 'unknown',
    fingerprint: payload.fingerprint || 'unknown',
    version: payload.tokenVersion || 1,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  })
  
  return refreshToken
}

/**
 * Generate token pair (access + refresh)
 */
export async function generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
  // Get device fingerprint if not provided
  let fingerprint = payload.fingerprint
  if (!fingerprint && typeof window !== 'undefined') {
    try {
      const botDetector = getBotDetectionService()
      const deviceFingerprint = await botDetector.generateFingerprint()
      fingerprint = deviceFingerprint.id
    } catch (e) {
      // Server-side or fingerprinting unavailable
      fingerprint = 'server-generated'
    }
  }
  
  const enhancedPayload = { ...payload, fingerprint }
  
  const accessToken = generateAccessToken(enhancedPayload)
  const refreshToken = generateRefreshToken(enhancedPayload)
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 300, // 5 minutes in seconds
    tokenType: 'Bearer'
  }
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    // Check if token is revoked
    if (revokedTokens.has(token)) {
      return null
    }
    
    const decoded = jwt.verify(token, getJwtSecret()) as any
    
    // Verify token type
    if (decoded.type !== 'access') {
      return null
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      fingerprint: decoded.fingerprint,
      sessionId: decoded.sessionId,
      tokenVersion: decoded.tokenVersion
    }
  } catch (error) {
    return null
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    // Check if token is revoked
    if (revokedTokens.has(token)) {
      return null
    }
    
    const decoded = jwt.verify(token, getJwtSecret()) as any
    
    // Verify token type
    if (decoded.type !== 'refresh') {
      return null
    }
    
    // Check if token exists in active tokens
    const tokenData = activeRefreshTokens.get(token)
    if (!tokenData) {
      return null
    }
    
    // Check if token is expired
    if (tokenData.expiresAt < new Date()) {
      activeRefreshTokens.delete(token)
      return null
    }
    
    return {
      userId: decoded.userId,
      email: '', // Not stored in refresh token
      role: '', // Not stored in refresh token
      fingerprint: decoded.fingerprint,
      sessionId: decoded.sessionId,
      tokenVersion: decoded.tokenVersion
    }
  } catch (error) {
    return null
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  currentFingerprint?: string
): Promise<TokenPair | null> {
  const payload = verifyRefreshToken(refreshToken)
  
  if (!payload) {
    return null
  }
  
  // Verify device fingerprint matches (prevent token theft)
  if (currentFingerprint && payload.fingerprint && 
      currentFingerprint !== payload.fingerprint) {
    console.error('🚨 TOKEN THEFT DETECTED: Fingerprint mismatch')
    
    // Revoke all tokens for this user
    revokeAllUserTokens(payload.userId)
    
    return null
  }
  
  // Get user data from database (you'll need to implement this)
  // For now, we'll create a new token pair with same fingerprint
  const newTokenPair = await generateTokenPair({
    userId: payload.userId,
    email: payload.email || 'unknown@example.com',
    role: payload.role || 'user',
    fingerprint: payload.fingerprint,
    sessionId: payload.sessionId,
    tokenVersion: (payload.tokenVersion || 1) + 1
  })
  
  // Revoke old refresh token
  activeRefreshTokens.delete(refreshToken)
  revokedTokens.add(refreshToken)
  
  return newTokenPair
}

/**
 * Revoke specific token
 */
export function revokeToken(token: string): void {
  revokedTokens.add(token)
  activeRefreshTokens.delete(token)
}

/**
 * Revoke all tokens for a user
 */
export function revokeAllUserTokens(userId: string): void {
  // Revoke all refresh tokens for this user
  for (const [token, data] of activeRefreshTokens.entries()) {
    if (data.userId === userId) {
      revokedTokens.add(token)
      activeRefreshTokens.delete(token)
    }
  }
}

/**
 * Revoke all tokens for a session
 */
export function revokeSessionTokens(sessionId: string): void {
  for (const [token, data] of activeRefreshTokens.entries()) {
    if (data.sessionId === sessionId) {
      revokedTokens.add(token)
      activeRefreshTokens.delete(token)
    }
  }
}

/**
 * Clean up expired tokens
 */
export function cleanupExpiredTokens(): void {
  const now = new Date()
  
  for (const [token, data] of activeRefreshTokens.entries()) {
    if (data.expiresAt < now) {
      activeRefreshTokens.delete(token)
    }
  }
  
  // Clear revoked tokens after 7 days
  if (revokedTokens.size > 10000) {
    revokedTokens.clear()
  }
}

/**
 * Client-side: Auto-refresh token before expiry
 */
export class TokenRotationManager {
  private refreshTimer: NodeJS.Timeout | null = null
  private accessToken: string = ''
  private refreshToken: string = ''
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.loadTokensFromStorage()
    }
  }
  
  /**
   * Initialize with tokens
   */
  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    
    // Save to storage
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
    }
    
    // Start auto-refresh
    this.startAutoRefresh()
  }
  
  /**
   * Get current access token
   */
  getAccessToken(): string {
    return this.accessToken
  }
  
  /**
   * Load tokens from storage
   */
  private loadTokensFromStorage(): void {
    const accessToken = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')
    
    if (accessToken && refreshToken) {
      this.accessToken = accessToken
      this.refreshToken = refreshToken
      this.startAutoRefresh()
    }
  }
  
  /**
   * Start automatic token refresh
   */
  private startAutoRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
    
    // Refresh every 4 minutes (before 5-minute expiry)
    this.refreshTimer = setInterval(() => {
      this.performRefresh()
    }, ROTATION_INTERVAL)
  }
  
  /**
   * Perform token refresh
   */
  private async performRefresh(): Promise<void> {
    try {
      // Get current fingerprint
      const botDetector = getBotDetectionService()
      const fingerprint = await botDetector.generateFingerprint()
      
      // Call refresh endpoint
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
          fingerprint: fingerprint.id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        this.setTokens(data.accessToken, data.refreshToken)
        console.log('✅ Token refreshed successfully')
      } else {
        console.error('❌ Token refresh failed')
        this.logout()
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error)
      this.logout()
    }
  }
  
  /**
   * Logout and clear tokens
   */
  logout(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
    
    this.accessToken = ''
    this.refreshToken = ''
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }
}

// Singleton instance
let tokenManager: TokenRotationManager | null = null

export function getTokenManager(): TokenRotationManager {
  if (typeof window === 'undefined') {
    throw new Error('TokenRotationManager can only be used in browser')
  }
  
  if (!tokenManager) {
    tokenManager = new TokenRotationManager()
  }
  
  return tokenManager
}

// Run cleanup every hour
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredTokens, 3600000)
}
