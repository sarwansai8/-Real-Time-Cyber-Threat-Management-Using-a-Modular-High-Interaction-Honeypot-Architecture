/**
 * AI-Powered Threat Intelligence System
 * Machine learning-based attack pattern recognition
 * Real-time threat scoring and adaptive blocking
 */

import { logger } from './logger'

export interface ThreatSignature {
  id: string
  name: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  patterns: RegExp[]
  indicators: string[]
  ttl: number // Time to live in cache (ms)
  category: 'sql_injection' | 'xss' | 'path_traversal' | 'command_injection' | 'dos' | 'reconnaissance' | 'brute_force'
}

export interface ThreatIntelligence {
  ip: string
  threatScore: number // 0-100
  reputation: 'clean' | 'suspicious' | 'malicious' | 'known_attacker'
  attacks: AttackPattern[]
  firstSeen: Date
  lastSeen: Date
  requestCount: number
  blockedCount: number
  countries: string[]
  userAgents: string[]
  attackVectors: string[]
}

export interface AttackPattern {
  type: string
  timestamp: Date
  payload: string
  endpoint: string
  method: string
  blocked: boolean
}

export interface RiskAssessment {
  overallRisk: number // 0-100
  factors: RiskFactor[]
  recommendation: 'allow' | 'monitor' | 'challenge' | 'block' | 'blacklist'
  confidence: number
  autoBlock: boolean
}

interface RiskFactor {
  factor: string
  score: number
  weight: number
  description: string
}

// Known attack patterns (continuously updated)
const THREAT_SIGNATURES: ThreatSignature[] = [
  {
    id: 'sql-001',
    name: 'SQL Injection - Classic',
    severity: 'critical',
    patterns: [
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bOR\b\s+1\s*=\s*1)/i,
      /('|\"|;|--|\*|\/\*).*(\bDROP\b|\bDELETE\b|\bUPDATE\b)/i,
      /\bEXEC\b.*\bxp_/i,
    ],
    indicators: ['union', 'select', 'drop', 'delete', 'exec', 'xp_cmdshell'],
    ttl: 3600000,
    category: 'sql_injection'
  },
  {
    id: 'xss-001',
    name: 'Cross-Site Scripting',
    severity: 'high',
    patterns: [
      /<script[^>]*>.*<\/script>/i,
      /javascript:/i,
      /on\w+\s*=\s*["'][^"']*["']/i,
      /<iframe[^>]*>/i,
      /eval\(/i,
    ],
    indicators: ['<script', 'javascript:', 'onerror=', 'onload=', 'eval('],
    ttl: 3600000,
    category: 'xss'
  },
  {
    id: 'path-001',
    name: 'Path Traversal',
    severity: 'high',
    patterns: [
      /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/i,
      /\/etc\/passwd/i,
      /\/windows\/system32/i,
      /\.\.%252f/i,
    ],
    indicators: ['../', '..\\', '/etc/passwd', 'system32'],
    ttl: 3600000,
    category: 'path_traversal'
  },
  {
    id: 'cmd-001',
    name: 'Command Injection',
    severity: 'critical',
    patterns: [
      /[;&|`$(){}[\]<>]/,
      /\b(wget|curl|nc|netcat|bash|sh|cmd|powershell)\b/i,
    ],
    indicators: ['wget', 'curl', 'nc', 'bash', 'cmd.exe', 'powershell'],
    ttl: 3600000,
    category: 'command_injection'
  },
  {
    id: 'recon-001',
    name: 'Reconnaissance Scanning',
    severity: 'medium',
    patterns: [
      /\/(admin|administrator|wp-admin|phpmyadmin|config|\.git|\.env)/i,
      /\.(sql|bak|old|backup|conf|log)$/i,
    ],
    indicators: ['/admin', '/.git', '/.env', 'phpmyadmin', '.sql', '.bak'],
    ttl: 1800000,
    category: 'reconnaissance'
  }
]

class ThreatIntelligenceEngine {
  private threatDatabase: Map<string, ThreatIntelligence> = new Map()
  private ipReputationCache: Map<string, { score: number; timestamp: number }> = new Map()
  private blockList: Set<string> = new Set()
  private attackHistory: AttackPattern[] = []
  private readonly BLOCK_THRESHOLD = 75 // Auto-block above this score
  private readonly SUSPICIOUS_THRESHOLD = 50

  constructor() {
    this.loadBlockList()
    this.startCleanupTask()
  }

  /**
   * Analyze request for threats using ML-like pattern matching
   */
  analyzeRequest(
    ip: string,
    method: string,
    path: string,
    query: string,
    body: any,
    headers: Record<string, string>
  ): RiskAssessment {
    const factors: RiskFactor[] = []
    let overallRisk = 0

    // Get or create threat profile
    let threat = this.threatDatabase.get(ip)
    if (!threat) {
      threat = {
        ip,
        threatScore: 0,
        reputation: 'clean',
        attacks: [],
        firstSeen: new Date(),
        lastSeen: new Date(),
        requestCount: 0,
        blockedCount: 0,
        countries: [],
        userAgents: [],
        attackVectors: []
      }
      this.threatDatabase.set(ip, threat)
    }

    threat.lastSeen = new Date()
    threat.requestCount++

    // Factor 1: Known malicious IP
    if (this.blockList.has(ip)) {
      factors.push({
        factor: 'Known Malicious IP',
        score: 100,
        weight: 1.0,
        description: 'IP is on permanent block list'
      })
      overallRisk = 100
      threat.reputation = 'known_attacker'
    }

    // Factor 2: Request frequency (rate limiting bypass detection)
    const requestRate = this.calculateRequestRate(ip)
    if (requestRate > 100) { // More than 100 req/min
      const score = Math.min(100, requestRate / 2)
      factors.push({
        factor: 'Abnormal Request Rate',
        score,
        weight: 0.7,
        description: `${requestRate} requests per minute`
      })
      overallRisk += score * 0.7
    }

    // Factor 3: Signature-based detection
    const fullRequest = `${path}${query}${JSON.stringify(body)}`
    for (const signature of THREAT_SIGNATURES) {
      for (const pattern of signature.patterns) {
        if (pattern.test(fullRequest)) {
          const score = this.getSeverityScore(signature.severity)
          factors.push({
            factor: signature.name,
            score,
            weight: 0.9,
            description: `Attack pattern detected: ${signature.category}`
          })
          overallRisk += score * 0.9

          // Log attack
          threat.attacks.push({
            type: signature.category,
            timestamp: new Date(),
            payload: fullRequest.substring(0, 200),
            endpoint: path,
            method,
            blocked: false
          })

          if (!threat.attackVectors.includes(signature.category)) {
            threat.attackVectors.push(signature.category)
          }
        }
      }
    }

    // Factor 4: Suspicious user agent
    const userAgent = headers['user-agent'] || ''
    if (this.isSuspiciousUserAgent(userAgent)) {
      factors.push({
        factor: 'Suspicious User Agent',
        score: 40,
        weight: 0.5,
        description: 'Bot or scanner detected'
      })
      overallRisk += 20
    }

    // Factor 5: Honeypot interaction
    if (path.includes('/api/admin/') || path.includes('/.env') || path.includes('/.git')) {
      factors.push({
        factor: 'Honeypot Triggered',
        score: 80,
        weight: 1.0,
        description: 'Attempted to access trap endpoint'
      })
      overallRisk += 80
    }

    // Factor 6: Historical behavior
    if (threat.attacks.length > 5) {
      const score = Math.min(100, threat.attacks.length * 10)
      factors.push({
        factor: 'Attack History',
        score,
        weight: 0.8,
        description: `${threat.attacks.length} previous attacks detected`
      })
      overallRisk += score * 0.8
    }

    // Factor 7: Missing or spoofed headers
    const headerScore = this.analyzeHeaders(headers)
    if (headerScore > 0) {
      factors.push({
        factor: 'Header Anomalies',
        score: headerScore,
        weight: 0.6,
        description: 'Suspicious or missing headers'
      })
      overallRisk += headerScore * 0.6
    }

    // Normalize overall risk to 0-100
    overallRisk = Math.min(100, overallRisk)
    threat.threatScore = overallRisk

    // Update reputation
    if (overallRisk >= this.BLOCK_THRESHOLD) {
      threat.reputation = 'malicious'
    } else if (overallRisk >= this.SUSPICIOUS_THRESHOLD) {
      threat.reputation = 'suspicious'
    }

    // Determine recommendation
    let recommendation: RiskAssessment['recommendation'] = 'allow'
    let autoBlock = false

    if (overallRisk >= this.BLOCK_THRESHOLD) {
      recommendation = 'block'
      autoBlock = true
      this.blockList.add(ip)
      threat.blockedCount++
    } else if (overallRisk >= 60) {
      recommendation = 'challenge'
    } else if (overallRisk >= this.SUSPICIOUS_THRESHOLD) {
      recommendation = 'monitor'
    }

    // Log high-risk activity
    if (overallRisk >= this.SUSPICIOUS_THRESHOLD) {
      logger.security(`High-risk activity detected from ${ip}`, {
        risk: overallRisk,
        factors: factors.map(f => f.factor),
        recommendation
      })
    }

    return {
      overallRisk,
      factors,
      recommendation,
      confidence: this.calculateConfidence(factors),
      autoBlock
    }
  }

  /**
   * Calculate request rate for an IP
   */
  private calculateRequestRate(ip: string): number {
    const threat = this.threatDatabase.get(ip)
    if (!threat) return 0

    const now = Date.now()
    const oneMinuteAgo = now - 60000

    // Count recent requests (simplified - in production use sliding window)
    const timeSinceFirstSeen = now - threat.firstSeen.getTime()
    const minutesSinceFirstSeen = timeSinceFirstSeen / 60000

    return minutesSinceFirstSeen > 0 ? threat.requestCount / minutesSinceFirstSeen : 0
  }

  /**
   * Analyze HTTP headers for anomalies
   */
  private analyzeHeaders(headers: Record<string, string>): number {
    let score = 0

    // Missing common headers
    if (!headers['user-agent']) score += 30
    if (!headers['accept']) score += 20
    if (!headers['accept-language']) score += 15

    // Suspicious header values
    const userAgent = headers['user-agent'] || ''
    if (userAgent.length < 10) score += 25

    // Check for automation indicators
    if (headers['x-requested-with']?.includes('Python')) score += 20
    if (headers['x-requested-with']?.includes('curl')) score += 20

    return Math.min(100, score)
  }

  /**
   * Detect bot/scanner user agents
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const botPatterns = [
      /bot|crawler|spider|scraper/i,
      /curl|wget|python|java|go-http/i,
      /nmap|nikto|sqlmap|burp|metasploit/i,
      /scanner|probe|exploit/i
    ]

    return botPatterns.some(pattern => pattern.test(userAgent))
  }

  /**
   * Get numeric score from severity level
   */
  private getSeverityScore(severity: ThreatSignature['severity']): number {
    const scores = {
      low: 30,
      medium: 50,
      high: 75,
      critical: 95
    }
    return scores[severity]
  }

  /**
   * Calculate confidence in the assessment
   */
  private calculateConfidence(factors: RiskFactor[]): number {
    if (factors.length === 0) return 50

    // More factors = higher confidence
    const factorConfidence = Math.min(100, 50 + (factors.length * 10))

    // High-weight factors increase confidence
    const avgWeight = factors.reduce((sum, f) => sum + f.weight, 0) / factors.length
    const weightConfidence = avgWeight * 50

    return Math.min(100, (factorConfidence + weightConfidence) / 2)
  }

  /**
   * Get threat intelligence for an IP
   */
  getThreatIntelligence(ip: string): ThreatIntelligence | null {
    return this.threatDatabase.get(ip) || null
  }

  /**
   * Get all high-risk IPs
   */
  getHighRiskIPs(): ThreatIntelligence[] {
    return Array.from(this.threatDatabase.values())
      .filter(t => t.threatScore >= this.SUSPICIOUS_THRESHOLD)
      .sort((a, b) => b.threatScore - a.threatScore)
  }

  /**
   * Manually block an IP
   */
  blockIP(ip: string, reason: string): void {
    this.blockList.add(ip)
    const threat = this.threatDatabase.get(ip)
    if (threat) {
      threat.reputation = 'known_attacker'
      threat.threatScore = 100
    }
    logger.security(`IP ${ip} manually blocked: ${reason}`)
  }

  /**
   * Unblock an IP
   */
  unblockIP(ip: string): void {
    this.blockList.delete(ip)
    const threat = this.threatDatabase.get(ip)
    if (threat) {
      threat.reputation = 'clean'
      threat.threatScore = 0
    }
    logger.info(`IP ${ip} unblocked`)
  }

  /**
   * Load blocklist from storage
   */
  private loadBlockList(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('threat_blocklist')
        if (stored) {
          const ips = JSON.parse(stored)
          ips.forEach((ip: string) => this.blockList.add(ip))
          logger.info(`Loaded ${ips.length} IPs from blocklist`)
        }
      } catch (e) {
        logger.error('Failed to load blocklist', e)
      }
    }
  }

  /**
   * Save blocklist to storage
   */
  private saveBlockList(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const ips = Array.from(this.blockList)
        localStorage.setItem('threat_blocklist', JSON.stringify(ips))
      } catch (e) {
        logger.error('Failed to save blocklist', e)
      }
    }
  }

  /**
   * Cleanup old entries
   */
  private startCleanupTask(): void {
    if (typeof window === 'undefined') return

    setInterval(() => {
      const now = Date.now()
      const oneHourAgo = now - 3600000

      // Remove old entries from threat database
      for (const [ip, threat] of this.threatDatabase.entries()) {
        if (threat.lastSeen.getTime() < oneHourAgo && threat.threatScore < this.SUSPICIOUS_THRESHOLD) {
          this.threatDatabase.delete(ip)
        }
      }

      // Clear old attack history
      this.attackHistory = this.attackHistory.filter(
        attack => now - attack.timestamp.getTime() < 86400000 // 24 hours
      )

      this.saveBlockList()
    }, 300000) // Run every 5 minutes
  }

  /**
   * Export threat intelligence report
   */
  exportThreatReport(): any {
    return {
      timestamp: new Date().toISOString(),
      totalIPs: this.threatDatabase.size,
      blockedIPs: this.blockList.size,
      highRiskIPs: this.getHighRiskIPs().length,
      recentAttacks: this.attackHistory.slice(-100),
      topThreats: this.getHighRiskIPs().slice(0, 10),
      attackVectorDistribution: this.getAttackVectorStats()
    }
  }

  /**
   * Get attack vector statistics
   */
  private getAttackVectorStats(): Record<string, number> {
    const stats: Record<string, number> = {}

    for (const threat of this.threatDatabase.values()) {
      for (const vector of threat.attackVectors) {
        stats[vector] = (stats[vector] || 0) + 1
      }
    }

    return stats
  }
}

// Export singleton instance
export const threatIntelligence = new ThreatIntelligenceEngine()

