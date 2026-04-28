/**
 * Medical Record Integrity Verification System
 * SHA-256 Cryptographic Hashing for Tamper Detection
 */

import crypto from 'crypto'

export interface IntegrityMetadata {
  hash: string
  algorithm: string
  timestamp: string
  version: number
  previousHash?: string
  signedBy?: string
}

export interface IntegrityVerification {
  isValid: boolean
  computedHash: string
  storedHash: string
  tampered: boolean
  timestamp: string
  details: string
}

export interface IntegrityAuditEntry {
  recordId: string
  action: 'created' | 'verified' | 'modified' | 'tamper_detected'
  hash: string
  userId: string
  timestamp: string
  ipAddress?: string
}

const integrityAuditLog: IntegrityAuditEntry[] = []

function canonicalize(data: Record<string, any>): string {
  const excluded = ['_id', '__v', 'createdAt', 'updatedAt', 'integrity', 'integrityHash', 'integrityMetadata']
  const filtered: Record<string, any> = {}
  for (const key of Object.keys(data).sort()) {
    if (excluded.includes(key)) continue
    filtered[key] = data[key]
  }
  return JSON.stringify(filtered, null, 0)
}

export function generateRecordHash(recordData: Record<string, any>): string {
  return crypto.createHash('sha256').update(canonicalize(recordData)).digest('hex')
}

export function generateRecordHMAC(recordData: Record<string, any>): string {
  const secret = process.env.INTEGRITY_SECRET || process.env.JWT_SECRET || 'integrity-secret'
  return crypto.createHmac('sha256', secret).update(canonicalize(recordData)).digest('hex')
}

export function createIntegrityMetadata(recordData: Record<string, any>, signedBy: string, previousHash?: string): IntegrityMetadata {
  return {
    hash: generateRecordHMAC(recordData),
    algorithm: 'HMAC-SHA-256',
    timestamp: new Date().toISOString(),
    version: 1,
    previousHash,
    signedBy,
  }
}

export function verifyRecordIntegrity(recordData: Record<string, any>, storedMetadata: IntegrityMetadata): IntegrityVerification {
  const computedHash = generateRecordHMAC(recordData)
  const isValid = computedHash === storedMetadata.hash
  return {
    isValid,
    computedHash,
    storedHash: storedMetadata.hash,
    tampered: !isValid,
    timestamp: new Date().toISOString(),
    details: isValid ? 'Record integrity verified — no tampering detected' : '⚠️ INTEGRITY VIOLATION — Record modified outside authorized channels',
  }
}

export function logIntegrityEvent(entry: IntegrityAuditEntry): void {
  integrityAuditLog.push(entry)
  if (integrityAuditLog.length > 10000) integrityAuditLog.splice(0, integrityAuditLog.length - 10000)
  if (entry.action === 'tamper_detected') {
    console.error(`🚨 [INTEGRITY] Tamper detected on record ${entry.recordId}`)
  }
}

export function getIntegrityAuditLog(recordId?: string): IntegrityAuditEntry[] {
  return recordId ? integrityAuditLog.filter((e) => e.recordId === recordId) : [...integrityAuditLog]
}

export function generateMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return ''
  if (hashes.length === 1) return hashes[0]
  const nextLevel: string[] = []
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i]
    const right = i + 1 < hashes.length ? hashes[i + 1] : left
    nextLevel.push(crypto.createHash('sha256').update(left + right).digest('hex'))
  }
  return generateMerkleRoot(nextLevel)
}

export function batchVerifyIntegrity(records: Array<{ data: Record<string, any>; metadata: IntegrityMetadata; id: string }>) {
  const results = records.map(({ data, metadata, id }) => ({ id, verification: verifyRecordIntegrity(data, metadata) }))
  return {
    totalRecords: records.length,
    verified: results.filter((r) => r.verification.isValid).length,
    tampered: results.filter((r) => r.verification.tampered).length,
    results,
  }
}
