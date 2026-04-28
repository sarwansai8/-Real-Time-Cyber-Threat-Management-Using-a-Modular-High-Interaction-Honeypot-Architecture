/**
 * Honeypot Intelligence Engine — Next-Gen Deception Layer
 * 
 * Advanced techniques beyond basic field traps:
 * 1. JavaScript execution traps (detect headless browsers)
 * 2. Canvas/WebGL fingerprint honeypots
 * 3. Fake API token tracking (canary tokens)
 * 4. DOM mutation observers for automation detection
 * 5. Timing side-channel analysis
 * 6. Fake robots.txt entries
 * 7. Browser capability probing
 * 8. CSS-only bot detection (no JS required)
 */

export interface IntelligenceResult {
  isAutomated: boolean
  confidence: number
  detections: Detection[]
  attackerProfile: AttackerProfile | null
}

export interface Detection {
  technique: string
  category: 'js_trap' | 'canvas_trap' | 'canary_token' | 'dom_mutation' | 'timing' | 'css_trap' | 'browser_probe' | 'protocol'
  triggered: boolean
  score: number
  evidence: string
}

export interface AttackerProfile {
  type: 'script_kiddie' | 'crawler' | 'scanner' | 'advanced_bot' | 'headless_browser' | 'unknown'
  tools: string[]
  sophisticationLevel: number // 1-10
  recommendedAction: 'monitor' | 'challenge' | 'tarpit' | 'block' | 'blackhole'
}

// Canary token registry — tracks fake credentials that bots try to use
const canaryTokenRegistry = new Map<string, { created: number; type: string; uses: number }>()

// Attacker fingerprint database
const attackerDB = new Map<string, { firstSeen: number; events: number; lastSeen: number; blocked: boolean }>()

/**
 * Generate a unique canary token (fake credential that alerts when used)
 */
export function generateCanaryToken(type: 'api_key' | 'jwt' | 'password' | 'db_uri'): string {
  const id = Math.random().toString(36).substring(2, 10)
  let token: string

  switch (type) {
    case 'api_key':
      token = `sk_live_canary_${id}_${Date.now().toString(36)}`
      break
    case 'jwt':
      // Fake JWT that looks real but contains a canary marker
      const header = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')
      const payload = Buffer.from(`{"sub":"admin","iat":${Math.floor(Date.now()/1000)},"canary":"${id}"}`).toString('base64url')
      token = `${header}.${payload}.canary_sig_${id}`
      break
    case 'password':
      token = `Admin@Str0ng!${id}`
      break
    case 'db_uri':
      token = `mongodb+srv://admin:canary_${id}@cluster0.fake.mongodb.net/production`
      break
    default:
      token = `canary_${id}`
  }

  canaryTokenRegistry.set(token, { created: Date.now(), type, uses: 0 })
  return token
}

/**
 * Check if a value matches a canary token (someone is using stolen fake creds)
 */
export function checkCanaryToken(value: string): { isCanary: boolean; type: string; alertLevel: 'critical' | 'high' } | null {
  for (const [token, meta] of canaryTokenRegistry.entries()) {
    if (value.includes(token) || value.includes(token.substring(0, 20))) {
      meta.uses++
      console.error(`🚨 [CANARY] Token triggered! Type: ${meta.type}, Uses: ${meta.uses}`)
      return { isCanary: true, type: meta.type, alertLevel: meta.uses > 3 ? 'critical' : 'high' }
    }
  }
  return null
}

/**
 * Client-side: JavaScript execution traps
 * Detects environments that fake or disable JS features
 */
export function runJSTrapChecks(): Detection[] {
  if (typeof window === 'undefined') return []
  const detections: Detection[] = []

  // Trap 1: Check if `toString` on native functions is overridden (Puppeteer/Selenium signature)
  try {
    const nativeToString = Function.prototype.toString.call(navigator.permissions.query)
    if (!nativeToString.includes('native code')) {
      detections.push({
        technique: 'Native function override detection',
        category: 'js_trap', triggered: true, score: 40,
        evidence: 'navigator.permissions.query toString does not contain "native code"',
      })
    }
  } catch { /* Some browsers don't support permissions API */ }

  // Trap 2: Check for webdriver property
  if ((navigator as any).webdriver === true) {
    detections.push({
      technique: 'WebDriver flag detection',
      category: 'js_trap', triggered: true, score: 50,
      evidence: 'navigator.webdriver is true (Selenium/Puppeteer)',
    })
  }

  // Trap 3: Check for phantom/nightmare properties
  const phantomKeys = ['__nightmare', '_phantom', 'phantom', 'callPhantom', '__selenium_evaluate', '__fxdriver_evaluate']
  for (const key of phantomKeys) {
    if ((window as any)[key] !== undefined) {
      detections.push({
        technique: `Automation framework detection (${key})`,
        category: 'js_trap', triggered: true, score: 45,
        evidence: `window.${key} is defined`,
      })
    }
  }

  // Trap 4: Chrome DevTools protocol detection
  if ((window as any).chrome && !(window as any).chrome.runtime) {
    // Headless Chrome has chrome object but no runtime
    const hasApp = !!(window as any).chrome.app
    const hasRuntime = !!(window as any).chrome.runtime
    if (hasApp && !hasRuntime) {
      detections.push({
        technique: 'Headless Chrome detection',
        category: 'browser_probe', triggered: true, score: 35,
        evidence: 'chrome.app exists but chrome.runtime missing (headless indicator)',
      })
    }
  }

  // Trap 5: Screen dimensions anomaly (headless browsers often have unusual sizes)
  if (screen.width === 0 || screen.height === 0 || window.outerWidth === 0 || window.outerHeight === 0) {
    detections.push({
      technique: 'Zero-dimension screen detection',
      category: 'browser_probe', triggered: true, score: 40,
      evidence: 'Screen or window dimensions are zero (headless browser)',
    })
  }

  // Trap 6: Plugin count (headless browsers have 0 plugins)
  if (navigator.plugins.length === 0 && !/mobile|android|iphone/i.test(navigator.userAgent)) {
    detections.push({
      technique: 'Zero plugins detection',
      category: 'browser_probe', triggered: true, score: 25,
      evidence: 'No browser plugins detected on desktop (headless indicator)',
    })
  }

  // Trap 7: Notification permission behavior
  try {
    if (Notification.permission === 'denied' && !('Notification' in window)) {
      detections.push({
        technique: 'Notification API inconsistency',
        category: 'js_trap', triggered: true, score: 30,
        evidence: 'Notification denied but API not available (spoofed)',
      })
    }
  } catch { /* Ignore */ }

  // Trap 8: Performance.now() precision (bots often have reduced timing precision)
  const t1 = performance.now()
  const t2 = performance.now()
  if (t2 - t1 === 0) {
    // Real browsers always show some delta
    detections.push({
      technique: 'Performance timing precision',
      category: 'timing', triggered: true, score: 20,
      evidence: 'performance.now() shows zero precision (sandboxed environment)',
    })
  }

  return detections
}

/**
 * Client-side: DOM Mutation honeypot
 * Creates invisible DOM elements and watches if automation modifies them
 */
export function setupDOMMutationTrap(callback: (detection: Detection) => void): MutationObserver | null {
  if (typeof window === 'undefined') return null

  // Create a trap element that bots might interact with
  const trapDiv = document.createElement('div')
  trapDiv.id = 'hp-auth-container'
  trapDiv.setAttribute('data-form', 'admin-login')
  trapDiv.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;overflow:hidden;'
  trapDiv.innerHTML = `
    <form id="hp-admin-login" action="/api/admin/auth" method="POST">
      <input type="text" name="admin_username" id="hp-admin-user" autocomplete="off" />
      <input type="password" name="admin_password" id="hp-admin-pass" autocomplete="off" />
      <button type="submit">Login</button>
    </form>
  `
  document.body.appendChild(trapDiv)

  // Watch for any interaction with the trap form
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' || mutation.type === 'childList') {
        callback({
          technique: 'DOM mutation trap triggered',
          category: 'dom_mutation', triggered: true, score: 50,
          evidence: `Trap element "${mutation.target.nodeName}" was modified (type: ${mutation.type})`,
        })
      }
    }
  })

  observer.observe(trapDiv, { attributes: true, childList: true, subtree: true, characterData: true })

  // Also watch for value changes on trap inputs
  const adminUser = document.getElementById('hp-admin-user') as HTMLInputElement
  const adminPass = document.getElementById('hp-admin-pass') as HTMLInputElement

  if (adminUser) {
    adminUser.addEventListener('input', () => {
      callback({
        technique: 'Fake admin form input detected',
        category: 'dom_mutation', triggered: true, score: 60,
        evidence: `Bot typed "${adminUser.value}" into hidden admin username field`,
      })
    })
  }

  if (adminPass) {
    adminPass.addEventListener('input', () => {
      callback({
        technique: 'Fake admin password input detected',
        category: 'dom_mutation', triggered: true, score: 60,
        evidence: 'Bot entered password into hidden admin form',
      })
    })
  }

  // Watch for form submission
  const trapForm = document.getElementById('hp-admin-login')
  if (trapForm) {
    trapForm.addEventListener('submit', (e) => {
      e.preventDefault()
      callback({
        technique: 'Fake admin form submitted',
        category: 'dom_mutation', triggered: true, score: 80,
        evidence: 'Bot attempted to submit hidden admin login form',
      })
    })
  }

  return observer
}

/**
 * Server-side: Generate fake robots.txt entries to trap crawlers
 */
export function generateTrapRobotsTxt(): string {
  return `User-agent: *
Allow: /

# Internal paths (do not index)
Disallow: /api/internal/
Disallow: /admin/secret-panel/
Disallow: /api/v1/debug/
Disallow: /backup/
Disallow: /api/data/export/
Disallow: /.env.production
Disallow: /api/auth/master-token
Disallow: /internal/patient-records/
Disallow: /api/admin/impersonate/
`
}

/**
 * Server-side: Generate fake sitemap entries
 */
export function generateTrapSitemap(): string {
  const trapUrls = [
    '/admin/secret-panel/',
    '/api/v1/debug/config',
    '/internal/patient-records/export',
    '/api/admin/impersonate/user',
    '/backup/database-dump',
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${trapUrls.map(url => `  <url><loc>https://healthgov.example.com${url}</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></url>`).join('\n')}
</urlset>`
}

/**
 * Tarpit response — slows down attackers with deliberately delayed responses
 */
export async function tarpitResponse(delayMs: number = 30000): Promise<void> {
  // Drip-feed data slowly to waste attacker's resources
  const chunks = Math.ceil(delayMs / 1000)
  for (let i = 0; i < chunks; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

/**
 * Profile the attacker based on their behavior patterns
 */
export function profileAttacker(
  ip: string,
  userAgent: string,
  path: string,
  detections: Detection[]
): AttackerProfile {
  const ua = userAgent.toLowerCase()
  const tools: string[] = []
  let sophistication = 1

  // Identify tools
  if (ua.includes('sqlmap')) { tools.push('SQLMap'); sophistication = 3 }
  if (ua.includes('nikto')) { tools.push('Nikto'); sophistication = 4 }
  if (ua.includes('nmap')) { tools.push('Nmap'); sophistication = 5 }
  if (ua.includes('burp')) { tools.push('BurpSuite'); sophistication = 6 }
  if (ua.includes('metasploit')) { tools.push('Metasploit'); sophistication = 7 }
  if (ua.includes('gobuster') || ua.includes('dirbuster')) { tools.push('DirBuster/GoBuster'); sophistication = 4 }
  if (ua.includes('wfuzz')) { tools.push('WFuzz'); sophistication = 5 }
  if (ua.includes('hydra')) { tools.push('Hydra'); sophistication = 5 }
  if (ua.includes('scrapy') || ua.includes('wget') || ua.includes('curl')) { tools.push('Crawler'); sophistication = 2 }
  if (ua.includes('headlesschrome') || ua.includes('phantomjs')) { tools.push('HeadlessBrowser'); sophistication = 6 }

  // Check detection categories for sophistication
  if (detections.some(d => d.category === 'dom_mutation')) sophistication = Math.max(sophistication, 7)
  if (detections.some(d => d.category === 'canary_token')) sophistication = Math.max(sophistication, 8)

  // Determine type
  let type: AttackerProfile['type'] = 'unknown'
  if (tools.includes('SQLMap') || tools.includes('Nikto')) type = 'scanner'
  else if (tools.includes('BurpSuite') || tools.includes('Metasploit')) type = 'advanced_bot'
  else if (tools.includes('HeadlessBrowser')) type = 'headless_browser'
  else if (tools.includes('Crawler')) type = 'crawler'
  else if (detections.length > 0 && sophistication < 4) type = 'script_kiddie'

  // Determine action
  let action: AttackerProfile['recommendedAction'] = 'monitor'
  if (sophistication >= 7) action = 'blackhole'
  else if (sophistication >= 5) action = 'block'
  else if (sophistication >= 3) action = 'tarpit'
  else if (detections.length > 0) action = 'challenge'

  // Track attacker
  const existing = attackerDB.get(ip)
  if (existing) {
    existing.events++
    existing.lastSeen = Date.now()
    if (sophistication >= 5) existing.blocked = true
  } else {
    attackerDB.set(ip, { firstSeen: Date.now(), events: 1, lastSeen: Date.now(), blocked: sophistication >= 5 })
  }

  return { type, tools, sophisticationLevel: sophistication, recommendedAction: action }
}

/**
 * Check if an IP is a known attacker
 */
export function isKnownAttacker(ip: string): boolean {
  const record = attackerDB.get(ip)
  return record ? record.blocked : false
}

/**
 * Get attacker database stats
 */
export function getAttackerStats(): { total: number; blocked: number; active24h: number } {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  let blocked = 0
  let active24h = 0

  for (const [, record] of attackerDB) {
    if (record.blocked) blocked++
    if (now - record.lastSeen < day) active24h++
  }

  return { total: attackerDB.size, blocked, active24h }
}
