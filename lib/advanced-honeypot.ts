// Advanced Honeypot System - Elite Bot Trap
// Multiple layers of invisible traps to catch sophisticated bots
// Enhanced with Intelligence Engine: JS traps, DOM mutation, canary tokens, attacker profiling

import { getSecurityMonitor } from './security-monitor'
import { runJSTrapChecks, setupDOMMutationTrap, profileAttacker, type Detection, type AttackerProfile } from './honeypot-intelligence'

export interface HoneypotTrap {
  type: 'field' | 'timing' | 'mouse' | 'keyboard' | 'behavioral' | 'api' | 'link'
  triggered: boolean
  score: number
  details: string
}

export interface HoneypotResult {
  isBot: boolean
  confidence: number
  trapsTriggered: HoneypotTrap[]
  totalScore: number
  recommendation: 'allow' | 'challenge' | 'block'
  intelligenceDetections: Detection[]
  attackerProfile: AttackerProfile | null
}

class AdvancedHoneypotSystem {
  private traps: HoneypotTrap[] = []
  private formStartTime: number = Date.now()
  private mouseMovements: number = 0
  private keystrokes: number = 0
  private clicks: number = 0
  private fieldFocusCount: number = 0
  private rapidKeystrokeCount: number = 0
  private lastKeystrokeTime: number = 0
  private mouseEntropy: number = 0
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 }
  private scrollEvents: number = 0
  private copyPasteEvents: number = 0
  private intelligenceDetections: Detection[] = []
  private domMutationObserver: MutationObserver | null = null
  private touchEvents: number = 0
  private accelerometerAvailable: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeTracking()
      this.initializeIntelligence()
    }
  }

  /**
   * Initialize comprehensive tracking
   */
  private initializeTracking(): void {
    // Mouse tracking
    document.addEventListener('mousemove', (e) => {
      this.mouseMovements++
      
      // Calculate mouse entropy (randomness)
      const distance = Math.sqrt(
        Math.pow(e.clientX - this.lastMousePos.x, 2) +
        Math.pow(e.clientY - this.lastMousePos.y, 2)
      )
      this.mouseEntropy += distance
      this.lastMousePos = { x: e.clientX, y: e.clientY }
    })

    // Click tracking
    document.addEventListener('click', () => {
      this.clicks++
    })

    // Keyboard tracking
    document.addEventListener('keydown', (e) => {
      this.keystrokes++
      
      // Detect rapid typing (bot indicator)
      const now = Date.now()
      if (this.lastKeystrokeTime > 0) {
        const timeBetween = now - this.lastKeystrokeTime
        if (timeBetween < 50) { // Less than 50ms = very fast
          this.rapidKeystrokeCount++
        }
      }
      this.lastKeystrokeTime = now
    })

    // Scroll tracking
    document.addEventListener('scroll', () => {
      this.scrollEvents++
    })

    // Copy/Paste tracking (bots often paste)
    document.addEventListener('paste', () => {
      this.copyPasteEvents++
    })

    // Focus tracking
    document.addEventListener('focusin', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || 
          (e.target as HTMLElement).tagName === 'TEXTAREA') {
        this.fieldFocusCount++
      }
    })

    // Touch event tracking (real mobile has touch)
    document.addEventListener('touchstart', () => { this.touchEvents++ })

    // Check for accelerometer (only on real mobile devices)
    if ('DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', () => { this.accelerometerAvailable = true }, { once: true })
    }
  }

  /**
   * Initialize intelligence engine traps
   */
  private initializeIntelligence(): void {
    // Run JS execution traps
    this.intelligenceDetections = runJSTrapChecks()

    // Setup DOM mutation honeypot (hidden admin form)
    this.domMutationObserver = setupDOMMutationTrap((detection) => {
      this.intelligenceDetections.push(detection)
      // Immediate alert on DOM mutation
      const monitor = getSecurityMonitor()
      monitor.logEvent('honeypot_triggered', 'critical', `DOM mutation trap: ${detection.evidence}`)
    })
  }

  /**
   * Check invisible honeypot fields
   */
  checkHoneypotFields(): HoneypotTrap[] {
    const traps: HoneypotTrap[] = []
    const honeypotFields = [
      'website', 'company', 'honeypot-phone', 'honeypot-address',
      'url', 'organization', 'fax', 'business-name',
      'confirm-email', 'alternate-email', 'secondary-phone'
    ]

    honeypotFields.forEach(fieldId => {
      const field = document.getElementById(fieldId) as HTMLInputElement
      if (field && field.value && field.value.trim() !== '') {
        traps.push({
          type: 'field',
          triggered: true,
          score: 35,
          details: `Honeypot field "${fieldId}" was filled`
        })
      }
    })

    return traps
  }

  /**
   * Check form timing (too fast = bot)
   */
  checkTiming(): HoneypotTrap | null {
    const timeElapsed = Date.now() - this.formStartTime

    // Form filled in less than 1 second with data
    if (timeElapsed < 1000 && (this.fieldFocusCount > 0 || this.keystrokes > 0)) {
      return {
        type: 'timing',
        triggered: true,
        score: 50,
        details: `Form filled instantly: ${timeElapsed}ms`
      }
    }

    // Form filled in less than 2 seconds with visible interaction
    if (timeElapsed < 2000 && (this.fieldFocusCount > 0 || this.keystrokes > 0)) {
      return {
        type: 'timing',
        triggered: true,
        score: 30,
        details: `Form submitted in ${timeElapsed}ms (suspiciously fast)`
      }
    }

    return null
  }

  /**
   * Check mouse behavior
   */
  checkMouseBehavior(): HoneypotTrap[] {
    const traps: HoneypotTrap[] = []
    const timeElapsed = (Date.now() - this.formStartTime) / 1000 // seconds

    // No mouse movement at all
    if (this.mouseMovements === 0 && timeElapsed > 3) {
      traps.push({
        type: 'mouse',
        triggered: true,
        score: 30,
        details: 'Zero mouse movements detected'
      })
    }

    // Very few mouse movements for time spent
    if (this.mouseMovements < 5 && timeElapsed > 10) {
      traps.push({
        type: 'mouse',
        triggered: true,
        score: 25,
        details: `Only ${this.mouseMovements} mouse movements in ${timeElapsed}s`
      })
    }

    // Perfect straight line movements (bot-like)
    if (this.mouseEntropy < 100 && this.mouseMovements > 10) {
      traps.push({
        type: 'mouse',
        triggered: true,
        score: 35,
        details: 'Mouse movements show no natural entropy (linear pattern)'
      })
    }

    // No clicks but field interactions
    if (this.clicks === 0 && this.fieldFocusCount > 2) {
      traps.push({
        type: 'mouse',
        triggered: true,
        score: 30,
        details: 'Fields focused without clicking'
      })
    }

    return traps
  }

  /**
   * Check keyboard behavior
   */
  checkKeyboardBehavior(): HoneypotTrap[] {
    const traps: HoneypotTrap[] = []

    // Too many rapid keystrokes (bot typing)
    if (this.rapidKeystrokeCount > 10) {
      traps.push({
        type: 'keyboard',
        triggered: true,
        score: 35,
        details: `${this.rapidKeystrokeCount} keystrokes typed < 50ms apart (robotic)`
      })
    }

    // Perfect timing between keystrokes (bot)
    const avgTimePerKey = this.keystrokes > 0 ? 
      (Date.now() - this.formStartTime) / this.keystrokes : 0
    
    if (avgTimePerKey > 0 && avgTimePerKey < 30) {
      traps.push({
        type: 'keyboard',
        triggered: true,
        score: 30,
        details: `Average ${avgTimePerKey}ms per keystroke (too fast)`
      })
    }

    // Lots of paste events (auto-fill)
    if (this.copyPasteEvents > 3) {
      traps.push({
        type: 'keyboard',
        triggered: true,
        score: 20,
        details: `${this.copyPasteEvents} paste events detected (auto-fill behavior)`
      })
    }

    return traps
  }

  /**
   * Check behavioral patterns
   */
  checkBehavioralPatterns(): HoneypotTrap[] {
    const traps: HoneypotTrap[] = []
    const timeElapsed = (Date.now() - this.formStartTime) / 1000

    // No scrolling on long forms
    if (this.scrollEvents === 0 && timeElapsed > 5) {
      traps.push({
        type: 'behavioral',
        triggered: true,
        score: 15,
        details: 'No scroll events on long form'
      })
    }

    // Perfect sequential field filling (Tab key automation)
    if (this.fieldFocusCount > 3 && this.clicks === 0) {
      traps.push({
        type: 'behavioral',
        triggered: true,
        score: 25,
        details: 'Sequential field filling without clicks (Tab automation)'
      })
    }

    // Instant field completion
    if (this.keystrokes === 0 && this.fieldFocusCount > 0 && this.copyPasteEvents === 0) {
      traps.push({
        type: 'behavioral',
        triggered: true,
        score: 20,
        details: 'Fields filled without typing or paste events'
      })
    }

    // Low interaction score
    const interactionScore = this.calculateInteractionScore()
    if (interactionScore < 30 && timeElapsed > 5) {
      traps.push({
        type: 'behavioral',
        triggered: true,
        score: 30,
        details: `Low human interaction score: ${interactionScore}%`
      })
    }

    return traps
  }

  /**
   * Calculate human interaction score (0-100)
   */
  private calculateInteractionScore(): number {
    let score = 0
    const timeElapsed = (Date.now() - this.formStartTime) / 1000

    // Mouse movement score (30 points)
    if (this.mouseMovements > 50) score += 30
    else if (this.mouseMovements > 20) score += 20
    else if (this.mouseMovements > 5) score += 10

    // Mouse entropy score (20 points)
    if (this.mouseEntropy > 5000) score += 20
    else if (this.mouseEntropy > 2000) score += 15
    else if (this.mouseEntropy > 500) score += 10

    // Keystroke naturalness (20 points)
    const rapidPercentage = this.keystrokes > 0 ? 
      (this.rapidKeystrokeCount / this.keystrokes) * 100 : 0
    
    if (rapidPercentage < 10) score += 20
    else if (rapidPercentage < 30) score += 15
    else if (rapidPercentage < 50) score += 10

    // Click activity (15 points)
    if (this.clicks > 3) score += 15
    else if (this.clicks > 1) score += 10
    else if (this.clicks > 0) score += 5

    // Time spent (15 points)
    if (timeElapsed > 10 && timeElapsed < 300) score += 15
    else if (timeElapsed > 5) score += 10
    else if (timeElapsed > 2) score += 5

    return Math.min(score, 100)
  }

  /**
   * Run comprehensive honeypot check
   */
  async check(): Promise<HoneypotResult> {
    const allTraps: HoneypotTrap[] = []

    // Check all trap types
    allTraps.push(...this.checkHoneypotFields())
    
    const timingTrap = this.checkTiming()
    if (timingTrap) allTraps.push(timingTrap)

    allTraps.push(...this.checkMouseBehavior())
    allTraps.push(...this.checkKeyboardBehavior())
    allTraps.push(...this.checkBehavioralPatterns())

    // NEW: Check mobile spoofing (claiming mobile UA but no touch/accelerometer)
    if (/mobile|android|iphone/i.test(navigator.userAgent) && this.touchEvents === 0) {
      const timeElapsed = (Date.now() - this.formStartTime) / 1000
      if (timeElapsed > 3) {
        allTraps.push({
          type: 'behavioral',
          triggered: true,
          score: 35,
          details: 'Claims mobile User-Agent but zero touch events detected (desktop bot spoofing mobile)'
        })
      }
    }

    // NEW: Add intelligence engine detection scores
    const intelScore = this.intelligenceDetections.reduce((sum, d) => sum + d.score, 0)

    // Calculate total score (combine classic + intelligence)
    const classicScore = allTraps.reduce((sum, trap) => sum + trap.score, 0)
    const totalScore = classicScore + Math.min(intelScore, 80) // Cap intelligence at 80 to avoid false positives
    const confidence = Math.min(totalScore, 100)
    const isBot = confidence >= 50

    // Determine recommendation
    let recommendation: 'allow' | 'challenge' | 'block' = 'allow'
    if (confidence >= 75) recommendation = 'block'
    else if (confidence >= 50) recommendation = 'challenge'

    // Profile the attacker
    let attackerProfile: AttackerProfile | null = null
    if (isBot) {
      attackerProfile = profileAttacker('client', navigator.userAgent, window.location.pathname, this.intelligenceDetections)

      const monitor = getSecurityMonitor()
      monitor.logEvent(
        'honeypot_triggered',
        confidence >= 75 ? 'critical' : confidence >= 50 ? 'high' : 'medium',
        `Advanced honeypot detected ${attackerProfile.type}: ${allTraps.length} traps + ${this.intelligenceDetections.length} intel detections, confidence: ${confidence}%, tools: [${attackerProfile.tools.join(', ')}]`
      )
    }

    return {
      isBot,
      confidence,
      trapsTriggered: allTraps,
      totalScore,
      recommendation,
      intelligenceDetections: this.intelligenceDetections,
      attackerProfile
    }
  }

  /**
   * Get current interaction metrics
   */
  getMetrics() {
    return {
      timeElapsed: Date.now() - this.formStartTime,
      mouseMovements: this.mouseMovements,
      mouseEntropy: this.mouseEntropy,
      keystrokes: this.keystrokes,
      rapidKeystrokes: this.rapidKeystrokeCount,
      clicks: this.clicks,
      scrollEvents: this.scrollEvents,
      copyPasteEvents: this.copyPasteEvents,
      fieldFocusCount: this.fieldFocusCount,
      interactionScore: this.calculateInteractionScore()
    }
  }

  /**
   * Reset tracking for new session
   */
  reset(): void {
    this.traps = []
    this.formStartTime = Date.now()
    this.mouseMovements = 0
    this.keystrokes = 0
    this.clicks = 0
    this.fieldFocusCount = 0
    this.rapidKeystrokeCount = 0
    this.lastKeystrokeTime = 0
    this.mouseEntropy = 0
    this.lastMousePos = { x: 0, y: 0 }
    this.scrollEvents = 0
    this.copyPasteEvents = 0
    this.intelligenceDetections = []
    this.touchEvents = 0
    if (this.domMutationObserver) {
      this.domMutationObserver.disconnect()
      this.domMutationObserver = null
    }
  }
}

// Singleton instance
let honeypotInstance: AdvancedHoneypotSystem | null = null

export function getAdvancedHoneypot(): AdvancedHoneypotSystem {
  if (typeof window === 'undefined') {
    throw new Error('AdvancedHoneypotSystem can only be used in browser')
  }
  
  if (!honeypotInstance) {
    honeypotInstance = new AdvancedHoneypotSystem()
  }
  
  return honeypotInstance
}

export { AdvancedHoneypotSystem }
