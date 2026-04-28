/**
 * Data Loss Prevention (DLP) Scanner
 * Scans API responses and exports to prevent accidental PII leakage
 */

export interface DLPScanResult {
  hasViolations: boolean
  violations: DLPViolation[]
  scannedFields: number
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical'
}

export interface DLPViolation {
  field: string
  type: string
  pattern: string
  value: string // Redacted preview
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: 'redact' | 'block' | 'warn'
}

// PII detection patterns
const PII_PATTERNS: Array<{
  name: string
  pattern: RegExp
  severity: DLPViolation['severity']
  action: DLPViolation['action']
}> = [
  { name: 'SSN (US)', pattern: /\b\d{3}-\d{2}-\d{4}\b/, severity: 'critical', action: 'redact' },
  { name: 'SSN (US, no dash)', pattern: /\b\d{9}\b/, severity: 'high', action: 'warn' },
  { name: 'Credit Card (Visa)', pattern: /\b4\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, severity: 'critical', action: 'redact' },
  { name: 'Credit Card (MC)', pattern: /\b5[1-5]\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, severity: 'critical', action: 'redact' },
  { name: 'Credit Card (Amex)', pattern: /\b3[47]\d{2}[\s-]?\d{6}[\s-]?\d{5}\b/, severity: 'critical', action: 'redact' },
  { name: 'Aadhaar (India)', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, severity: 'critical', action: 'redact' },
  { name: 'PAN Card (India)', pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/, severity: 'high', action: 'redact' },
  { name: 'Phone (US)', pattern: /\b(\+1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/, severity: 'medium', action: 'warn' },
  { name: 'Phone (India)', pattern: /\b(\+91[\s-]?)?\d{10}\b/, severity: 'medium', action: 'warn' },
  { name: 'Email Address', pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/, severity: 'low', action: 'warn' },
  { name: 'Password Hash (bcrypt)', pattern: /\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}/, severity: 'critical', action: 'block' },
  { name: 'Password Hash (SHA)', pattern: /\b[a-f0-9]{64}\b/, severity: 'high', action: 'warn' },
  { name: 'JWT Token', pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/, severity: 'critical', action: 'redact' },
  { name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'critical', action: 'block' },
  { name: 'Private Key', pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/, severity: 'critical', action: 'block' },
  { name: 'API Key Pattern', pattern: /\b(api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*['"]?[a-zA-Z0-9]{20,}['"]?/i, severity: 'critical', action: 'block' },
  { name: 'Medical Record ID', pattern: /\b(MRN|MR#|Medical Record)\s*[:# ]?\s*\d{6,12}\b/i, severity: 'high', action: 'warn' },
]

/**
 * Scan a string for PII patterns
 */
function scanString(value: string, fieldPath: string): DLPViolation[] {
  const violations: DLPViolation[] = []

  for (const { name, pattern, severity, action } of PII_PATTERNS) {
    pattern.lastIndex = 0
    if (pattern.test(value)) {
      // Create redacted preview
      const match = value.match(pattern)
      const matchedValue = match ? match[0] : ''
      const redacted = matchedValue.length > 4
        ? matchedValue.substring(0, 2) + '*'.repeat(matchedValue.length - 4) + matchedValue.substring(matchedValue.length - 2)
        : '****'

      violations.push({
        field: fieldPath,
        type: name,
        pattern: pattern.source,
        value: redacted,
        severity,
        action,
      })
    }
  }

  return violations
}

/**
 * Recursively scan an object for PII
 */
function scanObject(obj: any, path: string = ''): DLPViolation[] {
  const violations: DLPViolation[] = []

  if (typeof obj === 'string') {
    return scanString(obj, path)
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      violations.push(...scanObject(item, `${path}[${index}]`))
    })
    return violations
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = path ? `${path}.${key}` : key

      // Check field name itself for sensitive naming
      const sensitiveFieldNames = ['password', 'passwd', 'secret', 'token', 'ssn', 'creditCard', 'cardNumber']
      if (sensitiveFieldNames.some((s) => key.toLowerCase().includes(s)) && value) {
        violations.push({
          field: fieldPath,
          type: 'Sensitive Field Name',
          pattern: key,
          value: '****',
          severity: 'high',
          action: 'redact',
        })
      }

      violations.push(...scanObject(value, fieldPath))
    }
  }

  return violations
}

/**
 * Scan data for DLP violations
 */
export function scanForPII(data: any): DLPScanResult {
  const violations = scanObject(data)

  let riskLevel: DLPScanResult['riskLevel'] = 'none'
  if (violations.some((v) => v.severity === 'critical')) riskLevel = 'critical'
  else if (violations.some((v) => v.severity === 'high')) riskLevel = 'high'
  else if (violations.some((v) => v.severity === 'medium')) riskLevel = 'medium'
  else if (violations.length > 0) riskLevel = 'low'

  return {
    hasViolations: violations.length > 0,
    violations,
    scannedFields: countFields(data),
    riskLevel,
  }
}

function countFields(obj: any): number {
  if (typeof obj !== 'object' || obj === null) return 1
  return Object.values(obj).reduce((count: number, val) => count + countFields(val), 0)
}

/**
 * Auto-redact sensitive data in an object
 */
export function redactPII(data: any): any {
  const result = scanForPII(data)
  if (!result.hasViolations) return data

  let jsonStr = JSON.stringify(data)

  for (const violation of result.violations) {
    if (violation.action === 'redact' || violation.action === 'block') {
      for (const { pattern } of PII_PATTERNS) {
        jsonStr = jsonStr.replace(pattern, '[REDACTED]')
      }
    }
  }

  try { return JSON.parse(jsonStr) } catch { return data }
}

/**
 * DLP middleware for API responses
 */
export function dlpMiddleware(responseBody: any): { safe: boolean; body: any; violations: DLPViolation[] } {
  const scan = scanForPII(responseBody)

  if (scan.violations.some((v) => v.action === 'block')) {
    return {
      safe: false,
      body: { error: 'Response blocked by DLP policy — contains sensitive data' },
      violations: scan.violations,
    }
  }

  if (scan.violations.some((v) => v.action === 'redact')) {
    return { safe: true, body: redactPII(responseBody), violations: scan.violations }
  }

  return { safe: true, body: responseBody, violations: scan.violations }
}
