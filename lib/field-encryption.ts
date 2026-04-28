/**
 * AES-256-GCM Field-Level Encryption
 * Encrypts sensitive medical data before storing in MongoDB
 * 
 * Architecture:
 * - Master key from env (ENCRYPTION_MASTER_KEY)
 * - Per-user keys derived via PBKDF2
 * - Each field encrypted independently with unique IV
 * - GCM mode provides both encryption and authentication
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128-bit IV
const AUTH_TAG_LENGTH = 16 // 128-bit auth tag
const SALT_LENGTH = 32
const KEY_LENGTH = 32 // 256-bit key
const PBKDF2_ITERATIONS = 100000

export interface EncryptedField {
  ct: string   // Ciphertext (base64)
  iv: string   // Initialization vector (base64)
  tag: string  // GCM auth tag (base64)
  v: number    // Version for future algorithm upgrades
}

export interface EncryptionConfig {
  masterKey: string
  userId: string
}

/**
 * Get the master encryption key from environment
 */
function getMasterKey(): Buffer {
  const key = process.env.ENCRYPTION_MASTER_KEY || process.env.JWT_SECRET
  if (!key) {
    throw new Error('ENCRYPTION_MASTER_KEY is not configured')
  }
  // Ensure 32 bytes
  return crypto.createHash('sha256').update(key).digest()
}

/**
 * Derive a per-user encryption key using PBKDF2
 */
export function deriveUserKey(userId: string, salt?: string): { key: Buffer; salt: string } {
  const masterKey = getMasterKey()
  const keySalt = salt || crypto.randomBytes(SALT_LENGTH).toString('hex')

  const derivedKey = crypto.pbkdf2Sync(
    Buffer.concat([masterKey, Buffer.from(userId)]),
    Buffer.from(keySalt, 'hex'),
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha512'
  )

  return { key: derivedKey, salt: keySalt }
}

/**
 * Encrypt a single field value
 */
export function encryptField(plaintext: string, encryptionKey: Buffer): EncryptedField {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string')
  }

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  return {
    ct: encrypted,
    iv: iv.toString('base64'),
    tag: authTag.toString('base64'),
    v: 1,
  }
}

/**
 * Decrypt a single field value
 */
export function decryptField(encrypted: EncryptedField, encryptionKey: Buffer): string {
  if (!encrypted || !encrypted.ct || !encrypted.iv || !encrypted.tag) {
    throw new Error('Invalid encrypted field format')
  }

  const iv = Buffer.from(encrypted.iv, 'base64')
  const authTag = Buffer.from(encrypted.tag, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted.ct, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Check if a value is an encrypted field
 */
export function isEncryptedField(value: any): value is EncryptedField {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.ct === 'string' &&
    typeof value.iv === 'string' &&
    typeof value.tag === 'string' &&
    typeof value.v === 'number'
  )
}

// Fields that should be encrypted in medical records
const SENSITIVE_FIELDS = [
  'diagnosis',
  'medications',
  'labResults',
  'notes',
  'description',
  'allergies',
  'conditions',
  'treatmentPlan',
  'prescriptions',
  'ssn',
  'insuranceId',
]

/**
 * Encrypt sensitive fields in a medical record object
 */
export function encryptMedicalRecord(
  record: Record<string, any>,
  userId: string,
  userSalt?: string
): { encrypted: Record<string, any>; salt: string } {
  const { key, salt } = deriveUserKey(userId, userSalt)
  const encrypted = { ...record }

  for (const field of SENSITIVE_FIELDS) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encryptField(encrypted[field], key)
    }
  }

  return { encrypted, salt }
}

/**
 * Decrypt sensitive fields in a medical record object
 */
export function decryptMedicalRecord(
  record: Record<string, any>,
  userId: string,
  userSalt: string
): Record<string, any> {
  const { key } = deriveUserKey(userId, userSalt)
  const decrypted = { ...record }

  for (const field of SENSITIVE_FIELDS) {
    if (isEncryptedField(decrypted[field])) {
      try {
        decrypted[field] = decryptField(decrypted[field], key)
      } catch (error) {
        console.error(`Failed to decrypt field '${field}':`, error)
        decrypted[field] = '[DECRYPTION_FAILED]'
      }
    }
  }

  return decrypted
}

/**
 * Re-encrypt fields when master key is rotated
 */
export function reEncryptRecord(
  record: Record<string, any>,
  userId: string,
  oldSalt: string,
  newSalt?: string
): { encrypted: Record<string, any>; salt: string } {
  // Decrypt with old key
  const decrypted = decryptMedicalRecord(record, userId, oldSalt)
  // Re-encrypt with new key
  return encryptMedicalRecord(decrypted, userId, newSalt)
}

/**
 * Encrypt a generic string (for non-record data like notes)
 */
export function encryptString(plaintext: string): EncryptedField {
  const key = getMasterKey()
  return encryptField(plaintext, key)
}

/**
 * Decrypt a generic string
 */
export function decryptString(encrypted: EncryptedField): string {
  const key = getMasterKey()
  return decryptField(encrypted, key)
}

/**
 * Generate a secure encryption key for export/backup
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}
