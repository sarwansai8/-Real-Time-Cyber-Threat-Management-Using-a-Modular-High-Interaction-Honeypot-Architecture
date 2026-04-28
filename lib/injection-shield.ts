// SQL/NoSQL Injection Shield - Advanced Query Protection
// Detects and blocks injection attempts in MongoDB queries

import { createSecurityEvent } from './security-events'

export interface InjectionAttempt {
  detected: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'sql' | 'nosql' | 'operator' | 'regex' | 'code'
  patterns: string[]
  input: string
  blocked: boolean
}

/**
 * Dangerous MongoDB operators that should never come from user input
 */
const DANGEROUS_OPERATORS = [
  '$where',        // JavaScript execution
  '$function',     // JavaScript execution
  '$accumulator',  // JavaScript execution
  '$expr',         // Can be used for complex injection
  '$$',            // System variables
]

/**
 * Suspicious operators that need validation
 */
const SUSPICIOUS_OPERATORS = [
  '$regex',        // Can cause ReDoS
  '$ne',           // Negation attacks
  '$nin',          // NOT IN attacks
  '$gt',           // Greater than (timing attacks)
  '$lt',           // Less than (timing attacks)
  '$gte',          // Greater than or equal
  '$lte',          // Less than or equal
  '$or',           // OR injection
  '$and',          // AND injection
  '$nor',          // NOR injection
  '$not',          // NOT injection
]

/**
 * SQL injection patterns
 */
const SQL_INJECTION_PATTERNS = [
  // Classic SQL injection
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
  /(UNION\s+SELECT)/gi,
  /(OR\s+1\s*=\s*1)/gi,
  /(AND\s+1\s*=\s*1)/gi,
  /('\s*(OR|AND)\s*')/gi,
  /(--|#|\/\*|\*\/)/g, // SQL comments
  /(\bxp_cmdshell\b)/gi,

  // Advanced SQL injection
  /(\bCONCAT\s*\()/gi,
  /(\bCHAR\s*\()/gi,
  /(\bCAST\s*\()/gi,
  /(\bCONVERT\s*\()/gi,
  /(;\s*DROP\s+TABLE)/gi,
  /(WAITFOR\s+DELAY)/gi,
  /(BENCHMARK\s*\()/gi,
  /(SLEEP\s*\()/gi,
]

/**
 * NoSQL injection patterns
 */
const NOSQL_INJECTION_PATTERNS = [
  // MongoDB operators in strings
  /\$where/gi,
  /\$function/gi,
  /\$accumulator/gi,
  /\$regex/gi,
  /\$expr/gi,

  // JavaScript injection
  /(function\s*\()/gi,
  /(=\s*>)/g, // Arrow functions
  /(this\.\w+)/gi,
  /(return\s+)/gi,

  // Object injection
  /(\{\s*\$)/g,
  /(\[\s*\$)/g,

  // Null byte injection
  /(%00|\\x00|\\u0000)/gi,
]

/**
 * Code injection patterns
 */
const CODE_INJECTION_PATTERNS = [
  // JavaScript execution
  /(<script)/gi,
  /(javascript:)/gi,
  /(onerror\s*=)/gi,
  /(onload\s*=)/gi,
  /(eval\s*\()/gi,
  /(setTimeout\s*\()/gi,
  /(setInterval\s*\()/gi,

  // Command injection
  /(;|&&|\|\||`|\$\()/g,
  /(\.\.\/|\.\.\\)/g, // Path traversal
  /(%2e%2e|%252e)/gi,
]

/**
 * Detect SQL injection attempts
 */
function detectSQLInjection(input: string): { detected: boolean; patterns: string[] } {
  const patterns: string[] = []

  for (const pattern of SQL_INJECTION_PATTERNS) {
    pattern.lastIndex = 0
    if (pattern.test(input)) {
      patterns.push(pattern.source)
    }
  }

  return {
    detected: patterns.length > 0,
    patterns
  }
}

/**
 * Detect NoSQL injection attempts
 */
function detectNoSQLInjection(input: string): { detected: boolean; patterns: string[] } {
  const patterns: string[] = []

  for (const pattern of NOSQL_INJECTION_PATTERNS) {
    pattern.lastIndex = 0
    if (pattern.test(input)) {
      patterns.push(pattern.source)
    }
  }

  return {
    detected: patterns.length > 0,
    patterns
  }
}

/**
 * Detect code injection attempts
 */
function detectCodeInjection(input: string): { detected: boolean; patterns: string[] } {
  const patterns: string[] = []

  for (const pattern of CODE_INJECTION_PATTERNS) {
    pattern.lastIndex = 0
    if (pattern.test(input)) {
      patterns.push(pattern.source)
    }
  }

  return {
    detected: patterns.length > 0,
    patterns
  }
}

/**
 * Validate MongoDB query object for dangerous operators
 */
export function validateMongoQuery(query: any): InjectionAttempt | null {
  const issues: string[] = []

  function checkObject(obj: any, path = ''): void {
    if (typeof obj !== 'object' || obj === null) {
      return
    }

    for (const key in obj) {
      const fullPath = path ? `${path}.${key}` : key

      // Check for dangerous operators
      if (DANGEROUS_OPERATORS.includes(key)) {
        issues.push(`Dangerous operator detected: ${key} at ${fullPath}`)
      }

      // Check for $regex with user input (ReDoS risk)
      if (key === '$regex' && typeof obj[key] === 'string') {
        const regexStr = obj[key]
        if (/(.*\+.*\+)|(.*\*.*\*)|(\(.*\+.*\).*\+)/.test(regexStr)) {
          issues.push(`Potential ReDoS in $regex: ${fullPath}`)
        }
      }

      if (typeof obj[key] === 'object') {
        checkObject(obj[key], fullPath)
      }

      if (typeof obj[key] === 'string') {
        const sqlCheck = detectSQLInjection(obj[key])
        const nosqlCheck = detectNoSQLInjection(obj[key])
        const codeCheck = detectCodeInjection(obj[key])

        if (sqlCheck.detected) {
          issues.push(`SQL injection attempt in ${fullPath}: ${obj[key]}`)
        }
        if (nosqlCheck.detected) {
          issues.push(`NoSQL injection attempt in ${fullPath}: ${obj[key]}`)
        }
        if (codeCheck.detected) {
          issues.push(`Code injection attempt in ${fullPath}: ${obj[key]}`)
        }
      }
    }
  }

  checkObject(query)

  if (issues.length > 0) {
    return {
      detected: true,
      severity: 'critical',
      type: 'nosql',
      patterns: issues,
      input: JSON.stringify(query),
      blocked: true
    }
  }

  return null
}

/**
 * Sanitize user input (remove dangerous characters/patterns)
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return String(input)
  }

  let sanitized = input

  sanitized = sanitized.replace(/\$/g, '')
  sanitized = sanitized.replace(/--|#|\/\*|\*\//g, '')
  sanitized = sanitized.replace(/;/g, '')
  sanitized = sanitized.replace(/\x00/g, '')
  sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return sanitized.trim()
}

/**
 * Comprehensive injection detection
 */
export function detectInjection(input: string): InjectionAttempt {
  const sqlCheck = detectSQLInjection(input)
  const nosqlCheck = detectNoSQLInjection(input)
  const codeCheck = detectCodeInjection(input)

  const allPatterns = [
    ...sqlCheck.patterns,
    ...nosqlCheck.patterns,
    ...codeCheck.patterns
  ]

  const detected = allPatterns.length > 0

  let type: 'sql' | 'nosql' | 'code' | 'operator' | 'regex' = 'sql'
  if (nosqlCheck.detected) type = 'nosql'
  else if (codeCheck.detected) type = 'code'

  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  if (allPatterns.length > 5) severity = 'critical'
  else if (allPatterns.length > 3) severity = 'high'
  else if (allPatterns.length > 1) severity = 'medium'

  return {
    detected,
    severity,
    type,
    patterns: allPatterns,
    input,
    blocked: detected && severity !== 'low'
  }
}

/**
 * Middleware for Express/Next.js to validate request body
 */
export function injectionShieldMiddleware(data: any): InjectionAttempt | null {
  function checkValue(value: any, path = ''): InjectionAttempt | null {
    if (typeof value === 'string') {
      const result = detectInjection(value)
      if (result.detected && result.blocked) {
        return { ...result, input: `${path}: ${value}` }
      }
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const result = checkValue(value[i], `${path}[${i}]`)
        if (result) return result
      }
    } else if (typeof value === 'object' && value !== null) {
      const queryCheck = validateMongoQuery(value)
      if (queryCheck) return queryCheck

      for (const key in value) {
        const result = checkValue(value[key], path ? `${path}.${key}` : key)
        if (result) return result
      }
    }

    return null
  }

  return checkValue(data)
}

/**
 * Safe query builder for MongoDB
 */
export function buildSafeQuery(conditions: Record<string, any>): Record<string, any> {
  const safeQuery: Record<string, any> = {}

  for (const [key, value] of Object.entries(conditions)) {
    if (key.startsWith('$')) {
      console.warn(`Blocked dangerous operator in query: ${key}`)
      continue
    }

    if (typeof value === 'string') {
      safeQuery[key] = sanitizeInput(value)
    } else if (typeof value === 'object' && value !== null) {
      safeQuery[key] = buildSafeQuery(value)
    } else {
      safeQuery[key] = value
    }
  }

  return safeQuery
}

/**
 * Log injection attempt
 */
export async function logInjectionAttempt(
  attempt: InjectionAttempt,
  context: { userId?: string; endpoint: string; ipAddress: string; userAgent?: string }
): Promise<void> {
  console.error('[SECURITY] Injection attempt detected:', {
    ...attempt,
    ...context,
    timestamp: new Date().toISOString()
  })

  try {
    await createSecurityEvent({
      type: 'injection_attempt',
      severity: attempt.severity,
      ipAddress: context.ipAddress,
      location: {},
      deviceInfo: {
        userAgent: context.userAgent || 'Unknown',
        platform: 'Unknown',
        language: 'Unknown',
      },
      behaviorMetrics: {},
      sessionData: { sessionId: 'server', pageViews: 1, referrer: context.endpoint },
      details: `${attempt.type.toUpperCase()} injection attempt: ${attempt.patterns.join(', ')}`,
    })
  } catch (error) {
    console.error('Failed to log injection attempt:', error)
  }
}

/**
 * Rate limit injection attempts (block after 3 attempts)
 */
const injectionAttempts = new Map<string, { count: number; firstAttempt: number }>()

export function trackInjectionAttempt(ipAddress: string): boolean {
  const now = Date.now()
  const existing = injectionAttempts.get(ipAddress)

  if (existing) {
    if (now - existing.firstAttempt > 3600000) {
      injectionAttempts.set(ipAddress, { count: 1, firstAttempt: now })
      return false
    }

    existing.count++

    if (existing.count >= 3) {
      console.error(`[SECURITY] IP blocked for injection attempts: ${ipAddress}`)
      return true
    }
  } else {
    injectionAttempts.set(ipAddress, { count: 1, firstAttempt: now })
  }

  return false
}
