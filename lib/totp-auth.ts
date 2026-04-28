/**
 * Two-Factor Authentication (2FA) — TOTP Implementation
 * RFC 6238 Time-Based One-Time Password
 * Compatible with Google Authenticator, Authy, Microsoft Authenticator
 */

import crypto from 'crypto'

const TOTP_PERIOD = 30 // seconds
const TOTP_DIGITS = 6
const TOTP_ALGORITHM = 'sha1'
const TOTP_WINDOW = 1 // Allow 1 period before/after for clock drift
const BACKUP_CODE_COUNT = 8
const BACKUP_CODE_LENGTH = 8

export interface TOTPSecret {
  base32: string
  hex: string
  otpauthUrl: string
}

export interface TwoFactorSetup {
  secret: TOTPSecret
  backupCodes: string[]
  qrCodeUrl: string
}

export interface TwoFactorVerification {
  valid: boolean
  usedBackupCode: boolean
  codeIndex?: number
}

// Base32 encoding/decoding
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buffer: Buffer): string {
  let bits = ''
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0')
  }

  let result = ''
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, '0')
    result += BASE32_CHARS[parseInt(chunk, 2)]
  }

  return result
}

function base32Decode(str: string): Buffer {
  let bits = ''
  for (const char of str.toUpperCase()) {
    const val = BASE32_CHARS.indexOf(char)
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2))
  }

  return Buffer.from(bytes)
}

/**
 * Generate a new TOTP secret for a user
 */
export function generateTOTPSecret(
  userEmail: string,
  issuer: string = 'HealthGov'
): TOTPSecret {
  // Generate 20-byte random secret
  const secretBuffer = crypto.randomBytes(20)
  const base32Secret = base32Encode(secretBuffer)
  const hexSecret = secretBuffer.toString('hex')

  // Build otpauth:// URL for QR code
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedEmail = encodeURIComponent(userEmail)
  const otpauthUrl = `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${base32Secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`

  return {
    base32: base32Secret,
    hex: hexSecret,
    otpauthUrl,
  }
}

/**
 * Generate TOTP code for a given time
 */
function generateTOTP(secret: string, time?: number): string {
  const now = time || Math.floor(Date.now() / 1000)
  const counter = Math.floor(now / TOTP_PERIOD)

  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  counterBuffer.writeUInt32BE(counter & 0xffffffff, 4)

  // HMAC-SHA1
  const secretBuffer = base32Decode(secret)
  const hmac = crypto.createHmac(TOTP_ALGORITHM, secretBuffer)
  hmac.update(counterBuffer)
  const hash = hmac.digest()

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)

  const otp = binary % Math.pow(10, TOTP_DIGITS)
  return otp.toString().padStart(TOTP_DIGITS, '0')
}

/**
 * Verify a TOTP code
 * Allows for clock drift by checking adjacent time windows
 */
export function verifyTOTP(secret: string, code: string): boolean {
  if (!code || code.length !== TOTP_DIGITS) return false

  const now = Math.floor(Date.now() / 1000)

  // Check current time and adjacent windows
  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    const time = now + i * TOTP_PERIOD
    const expectedCode = generateTOTP(secret, time)

    // Timing-safe comparison
    if (
      code.length === expectedCode.length &&
      crypto.timingSafeEqual(Buffer.from(code), Buffer.from(expectedCode))
    ) {
      return true
    }
  }

  return false
}

/**
 * Generate backup recovery codes
 * Each code is a one-time use fallback if the user loses their authenticator
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = []

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = crypto.randomBytes(BACKUP_CODE_LENGTH / 2).toString('hex')
    // Format as XXXX-XXXX for readability
    codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`)
  }

  return codes
}

/**
 * Hash backup codes for secure storage
 */
export function hashBackupCodes(codes: string[]): string[] {
  return codes.map((code) => {
    const normalized = code.replace(/-/g, '').toLowerCase()
    return crypto.createHash('sha256').update(normalized).digest('hex')
  })
}

/**
 * Verify a backup code against stored hashes
 * Returns the index of the matched code (so it can be marked as used)
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: string[],
  usedCodes: number[] = []
): TwoFactorVerification {
  const normalized = code.replace(/-/g, '').toLowerCase()
  const codeHash = crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')

  for (let i = 0; i < hashedCodes.length; i++) {
    if (usedCodes.includes(i)) continue

    if (
      crypto.timingSafeEqual(
        Buffer.from(codeHash),
        Buffer.from(hashedCodes[i])
      )
    ) {
      return { valid: true, usedBackupCode: true, codeIndex: i }
    }
  }

  return { valid: false, usedBackupCode: false }
}

/**
 * Full 2FA setup flow — generates everything needed
 */
export function setup2FA(userEmail: string): TwoFactorSetup {
  const secret = generateTOTPSecret(userEmail)
  const backupCodes = generateBackupCodes()

  // Generate QR code URL using Google Charts API (free, no dependency)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(secret.otpauthUrl)}`

  return {
    secret,
    backupCodes,
    qrCodeUrl,
  }
}

/**
 * Verify 2FA — tries TOTP first, then backup codes
 */
export function verify2FA(
  code: string,
  totpSecret: string,
  hashedBackupCodes: string[] = [],
  usedBackupCodes: number[] = []
): TwoFactorVerification {
  // Try TOTP first
  if (verifyTOTP(totpSecret, code)) {
    return { valid: true, usedBackupCode: false }
  }

  // Try backup codes
  if (hashedBackupCodes.length > 0) {
    return verifyBackupCode(code, hashedBackupCodes, usedBackupCodes)
  }

  return { valid: false, usedBackupCode: false }
}

/**
 * Get current TOTP code (for testing/debugging only)
 */
export function getCurrentTOTP(secret: string): string {
  return generateTOTP(secret)
}

/**
 * Calculate time remaining until current code expires
 */
export function getTimeRemaining(): number {
  const now = Math.floor(Date.now() / 1000)
  return TOTP_PERIOD - (now % TOTP_PERIOD)
}
