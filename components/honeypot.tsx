'use client'

import { useEffect, useState } from 'react'
import { getSecurityMonitor } from '@/lib/security-monitor'
import { getAdvancedHoneypot } from '@/lib/advanced-honeypot'
import { getBotDetectionService } from '@/lib/bot-detection'

interface HoneypotProps {
  onTrigger?: (suspicionScore: number, botConfidence?: number) => void
}

/**
 * ENHANCED Honeypot Component - Elite Multi-Layer Bot Trap
 * Combines invisible fields, behavioral analysis, and bot detection
 */
export function Honeypot({ onTrigger }: HoneypotProps) {
  const [values, setValues] = useState({
    // Original 4 fields
    website: '',
    company: '',
    honeypot_phone: '',
    honeypot_address: '',
    
    // NEW: Advanced honeypot fields
    url: '',
    organization: '',
    fax: '',
    businessName: '',
    confirmEmail: '',
    alternateEmail: '',
    secondaryPhone: '',
    apiKey: '',
    securityToken: '',
    verificationCode: '',
    backupEmail: ''
  })

  useEffect(() => {
    // Monitor if any honeypot field gets filled
    const filledFields = Object.entries(values).filter(([_, value]) => value !== '')
    
    // Trigger on even 1 field filled (more aggressive)
    if (filledFields.length >= 1) {
      const suspicionScore = Math.min(filledFields.length * 20, 100) // 20% per field
      
      // Run advanced honeypot check
      const honeypot = getAdvancedHoneypot()
      honeypot.check().then(result => {
        // Run bot detection
        getBotDetectionService().detectBot().then(botResult => {
          // Combine scores
          const combinedConfidence = Math.max(result.confidence, botResult.confidence)
          
          // Log security event
          const monitor = getSecurityMonitor()
          monitor.logEvent(
            'honeypot_triggered',
            combinedConfidence >= 75 ? 'critical' : combinedConfidence >= 50 ? 'high' : 'medium',
            `ELITE HONEYPOT: ${filledFields.length} fields filled | Bot confidence: ${botResult.confidence}% | Behavioral confidence: ${result.confidence}%`,
            {
              fieldsFilled: filledFields.map(([key]) => key),
              suspicionScore
            }
          )

          onTrigger?.(suspicionScore, combinedConfidence)
        })
      })
    }
  }, [values, onTrigger])

  return (
    <>
      {/* Invisible honeypot fields - Multiple hiding strategies */}
      
      {/* Strategy 1: Off-screen positioning */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          overflow: 'hidden'
        }}
        aria-hidden="true"
        role="presentation"
      >
        <input
          type="text"
          name="website"
          id="website"
          value={values.website}
          onChange={(e) => setValues(prev => ({ ...prev, website: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
        />
        <input
          type="text"
          name="url"
          id="url"
          value={values.url}
          onChange={(e) => setValues(prev => ({ ...prev, url: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      {/* Strategy 2: Display none */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <input
          type="text"
          name="company"
          id="company"
          value={values.company}
          onChange={(e) => setValues(prev => ({ ...prev, company: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
        />
        <input
          type="text"
          name="organization"
          id="organization"
          value={values.organization}
          onChange={(e) => setValues(prev => ({ ...prev, organization: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      {/* Strategy 3: Visibility hidden */}
      <div style={{ visibility: 'hidden', position: 'absolute' }} aria-hidden="true">
        <input
          type="tel"
          name="honeypot-phone"
          id="honeypot-phone"
          value={values.honeypot_phone}
          onChange={(e) => setValues(prev => ({ ...prev, honeypot_phone: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
        />
        <input
          type="tel"
          name="fax"
          id="fax"
          value={values.fax}
          onChange={(e) => setValues(prev => ({ ...prev, fax: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      {/* Strategy 4: Opacity 0 */}
      <div style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
        <input
          type="text"
          name="honeypot-address"
          id="honeypot-address"
          value={values.honeypot_address}
          onChange={(e) => setValues(prev => ({ ...prev, honeypot_address: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
        />
        <input
          type="text"
          name="business-name"
          id="business-name"
          value={values.businessName}
          onChange={(e) => setValues(prev => ({ ...prev, businessName: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      {/* Strategy 5: Zero dimensions */}
      <div style={{ width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <input
          type="email"
          name="confirm-email"
          id="confirm-email"
          value={values.confirmEmail}
          onChange={(e) => setValues(prev => ({ ...prev, confirmEmail: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
        />
        <input
          type="email"
          name="alternate-email"
          id="alternate-email"
          value={values.alternateEmail}
          onChange={(e) => setValues(prev => ({ ...prev, alternateEmail: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      {/* Strategy 6: Off-screen with clip */}
      <div style={{ position: 'absolute', clip: 'rect(0,0,0,0)' }} aria-hidden="true">
        <input
          type="tel"
          name="secondary-phone"
          id="secondary-phone"
          value={values.secondaryPhone}
          onChange={(e) => setValues(prev => ({ ...prev, secondaryPhone: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      {/* Strategy 7: Text indent */}
      <div style={{ textIndent: '-9999px', position: 'absolute' }} aria-hidden="true">
        <input
          type="text"
          name="api-key"
          id="api-key"
          value={values.apiKey}
          onChange={(e) => setValues(prev => ({ ...prev, apiKey: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
          placeholder="API Key"
        />
      </div>

      {/* Strategy 8: Hidden attribute */}
      <input
        type="hidden"
        name="security-token"
        id="security-token"
        value={values.securityToken}
        onChange={(e) => setValues(prev => ({ ...prev, securityToken: e.target.value }))}
      />

      {/* Strategy 9: Screen reader only (looks legitimate) */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="verification-code">Verification Code (leave blank)</label>
        <input
          type="text"
          name="verification-code"
          id="verification-code"
          value={values.verificationCode}
          onChange={(e) => setValues(prev => ({ ...prev, verificationCode: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      {/* Strategy 10: Transparent color */}
      <div style={{ color: 'transparent', position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
        <input
          type="email"
          name="backup-email"
          id="backup-email"
          value={values.backupEmail}
          onChange={(e) => setValues(prev => ({ ...prev, backupEmail: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
          style={{ color: 'transparent' }}
        />
      </div>

      {/* Time-based honeypot - forms filled too quickly are suspicious */}
      <input
        type="hidden"
        name="form_start_time"
        value={Date.now()}
      />

      {/* Invisible honeypot links (bots crawl links) */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <a href="/api/internal/admin-users">Admin Panel</a>
        <a href="/api/internal/patient-data">Patient Data</a>
        <a href="/api/internal/config">Configuration</a>
        <a href="/api/internal/backup">Backup</a>
      </div>
    </>
  )
}


/**
 * ENHANCED Hook - Comprehensive validation with bot detection
 */
export function useHoneypotValidation() {
  const [isBot, setIsBot] = useState(false)
  const [botConfidence, setBotConfidence] = useState(0)
  const [formStartTime] = useState(Date.now())

  const validateFormSubmission = async (): Promise<boolean> => {
    const timeTaken = Date.now() - formStartTime

    // Run advanced honeypot check
    const honeypot = getAdvancedHoneypot()
    const honeypotResult = await honeypot.check()

    // Run bot detection
    const botDetector = getBotDetectionService()
    const botResult = await botDetector.detectBot()

    // Combine results
    const combinedConfidence = Math.max(honeypotResult.confidence, botResult.confidence)
    setBotConfidence(combinedConfidence)

    // Form filled too quickly (basic check)
    if (timeTaken < 1000) {
      const monitor = getSecurityMonitor()
      monitor.logEvent(
        'bot_detected',
        'high',
        `Form submitted too quickly: ${timeTaken}ms | Bot confidence: ${combinedConfidence}%`,
        {
          fieldsFilled: [],
          suspicionScore: 100
        }
      )
      setIsBot(true)
      return false
    }

    // Bot detection triggered
    if (botResult.isBot || honeypotResult.isBot) {
      const monitor = getSecurityMonitor()
      monitor.logEvent(
        'bot_detected',
        combinedConfidence >= 75 ? 'critical' : 'high',
        `Bot detected via ${botResult.isBot ? 'fingerprinting' : 'behavioral analysis'} | Confidence: ${combinedConfidence}%`,
        {
          fieldsFilled: [],
          suspicionScore: combinedConfidence
        }
      )
      setIsBot(true)
      return false
    }

    // Block recommendation from honeypot
    if (honeypotResult.recommendation === 'block') {
      setIsBot(true)
      return false
    }

    // Challenge recommendation (could add CAPTCHA here)
    if (honeypotResult.recommendation === 'challenge' && combinedConfidence > 60) {
      setIsBot(true)
      return false
    }

    return true
  }

  return {
    isBot,
    botConfidence,
    validateFormSubmission
  }
}

