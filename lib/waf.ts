/**
 * Web Application Firewall (WAF) Rules Engine
 * Middleware-level protection that blocks attacks before they reach app code
 */

import { NextRequest } from 'next/server'

export interface WAFRule {
  id: string
  name: string
  enabled: boolean
  priority: number
  condition: WAFCondition
  action: 'block' | 'log' | 'challenge' | 'rate_limit'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface WAFCondition {
  type: 'path' | 'header' | 'body_size' | 'user_agent' | 'method' | 'query' | 'rate' | 'country'
  operator: 'contains' | 'equals' | 'regex' | 'gt' | 'lt' | 'in' | 'not_in'
  value: string | number | string[]
}

export interface WAFResult {
  allowed: boolean
  matchedRules: WAFRule[]
  action: string
  reason: string
}

// WAF Rules Configuration
const WAF_RULES: WAFRule[] = [
  // Block scanner tools
  {
    id: 'waf-001', name: 'Block Security Scanners', enabled: true, priority: 1,
    condition: { type: 'user_agent', operator: 'regex', value: 'nikto|sqlmap|nmap|masscan|nessus|burp|metasploit|dirbuster|gobuster|wfuzz|hydra|medusa' },
    action: 'block', severity: 'critical',
  },
  // Block path traversal
  {
    id: 'waf-002', name: 'Block Path Traversal', enabled: true, priority: 1,
    condition: { type: 'path', operator: 'regex', value: '\\.\\.[\\/\\\\]|%2e%2e|%252e' },
    action: 'block', severity: 'critical',
  },
  // Block access to sensitive files
  {
    id: 'waf-003', name: 'Block Sensitive Files', enabled: true, priority: 1,
    condition: { type: 'path', operator: 'regex', value: '\\.(env|git|svn|htaccess|htpasswd|bak|sql|log|conf|ini|yml|yaml|toml|xml|swp)$' },
    action: 'block', severity: 'high',
  },
  // Block admin probe paths
  {
    id: 'waf-004', name: 'Block Admin Probes', enabled: true, priority: 2,
    condition: { type: 'path', operator: 'regex', value: '(wp-admin|wp-login|phpmyadmin|adminer|phpinfo|server-status|server-info|\\.well-known/security)' },
    action: 'block', severity: 'medium',
  },
  // Block oversized payloads (DoS protection)
  {
    id: 'waf-005', name: 'Block Oversized Payloads', enabled: true, priority: 1,
    condition: { type: 'body_size', operator: 'gt', value: 10485760 }, // 10MB
    action: 'block', severity: 'high',
  },
  // Block empty User-Agent
  {
    id: 'waf-006', name: 'Block Empty User-Agent', enabled: true, priority: 3,
    condition: { type: 'user_agent', operator: 'equals', value: '' },
    action: 'log', severity: 'low',
  },
  // Block HTTP methods not used by the app
  {
    id: 'waf-007', name: 'Block Unused Methods', enabled: true, priority: 2,
    condition: { type: 'method', operator: 'in', value: ['TRACE', 'TRACK', 'CONNECT', 'PROPFIND'] },
    action: 'block', severity: 'medium',
  },
  // Block SQL injection in query strings
  {
    id: 'waf-008', name: 'Block SQL in Query', enabled: true, priority: 1,
    condition: { type: 'query', operator: 'regex', value: '(union\\s+select|or\\s+1\\s*=\\s*1|drop\\s+table|insert\\s+into|delete\\s+from|update\\s+.*\\s+set)' },
    action: 'block', severity: 'critical',
  },
  // Block XSS in query strings
  {
    id: 'waf-009', name: 'Block XSS in Query', enabled: true, priority: 1,
    condition: { type: 'query', operator: 'regex', value: '(<script|javascript:|on\\w+\\s*=|<iframe|<object|<embed|<form)' },
    action: 'block', severity: 'critical',
  },
  // Block shell commands in requests
  {
    id: 'waf-010', name: 'Block Shell Commands', enabled: true, priority: 1,
    condition: { type: 'query', operator: 'regex', value: '(;\\s*(ls|cat|wget|curl|bash|sh|nc|python|perl|ruby|php)|\\|\\s*(ls|cat|id|whoami))' },
    action: 'block', severity: 'critical',
  },
]

// Request rate tracking per IP
const requestRates = new Map<string, { count: number; windowStart: number }>()
const RATE_WINDOW = 60000 // 1 minute
const RATE_LIMIT = 200 // max requests per minute

/**
 * Evaluate a request against all WAF rules
 */
export function evaluateWAFRules(request: NextRequest): WAFResult {
  const matchedRules: WAFRule[] = []
  const path = request.nextUrl.pathname
  const query = request.nextUrl.search
  const userAgent = request.headers.get('user-agent') || ''
  const method = request.method
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

  // Check rate limit
  const now = Date.now()
  const rateEntry = requestRates.get(ip) || { count: 0, windowStart: now }
  if (now - rateEntry.windowStart > RATE_WINDOW) {
    rateEntry.count = 0
    rateEntry.windowStart = now
  }
  rateEntry.count++
  requestRates.set(ip, rateEntry)

  if (rateEntry.count > RATE_LIMIT) {
    matchedRules.push({
      id: 'waf-rate', name: 'Rate Limit Exceeded', enabled: true, priority: 0,
      condition: { type: 'rate', operator: 'gt', value: RATE_LIMIT },
      action: 'block', severity: 'high',
    })
  }

  // Evaluate each rule
  for (const rule of WAF_RULES.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority)) {
    let matches = false

    switch (rule.condition.type) {
      case 'path':
        matches = testCondition(path, rule.condition)
        break
      case 'query':
        matches = testCondition(query, rule.condition)
        break
      case 'user_agent':
        matches = testCondition(userAgent, rule.condition)
        break
      case 'method':
        matches = testCondition(method, rule.condition)
        break
      case 'body_size':
        matches = typeof rule.condition.value === 'number' && contentLength > rule.condition.value
        break
    }

    if (matches) {
      matchedRules.push(rule)
    }
  }

  // Determine final action (most severe rule wins)
  const blocked = matchedRules.some((r) => r.action === 'block')
  const reason = matchedRules.map((r) => r.name).join(', ')

  return {
    allowed: !blocked,
    matchedRules,
    action: blocked ? 'block' : matchedRules.length > 0 ? 'log' : 'allow',
    reason: reason || 'Clean request',
  }
}

function testCondition(value: string, condition: WAFCondition): boolean {
  switch (condition.operator) {
    case 'contains':
      return value.toLowerCase().includes(String(condition.value).toLowerCase())
    case 'equals':
      return value === String(condition.value)
    case 'regex':
      try { return new RegExp(String(condition.value), 'i').test(value) } catch { return false }
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(value)
    default:
      return false
  }
}

/**
 * Get WAF statistics
 */
export function getWAFStats(): { totalRules: number; enabledRules: number; blockedIPs: number } {
  const blockedIPs = Array.from(requestRates.entries()).filter(([, v]) => v.count > RATE_LIMIT).length
  return { totalRules: WAF_RULES.length, enabledRules: WAF_RULES.filter((r) => r.enabled).length, blockedIPs }
}

// Cleanup rate data every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [ip, data] of requestRates.entries()) {
      if (now - data.windowStart > RATE_WINDOW * 5) requestRates.delete(ip)
    }
  }, 300000)
}
