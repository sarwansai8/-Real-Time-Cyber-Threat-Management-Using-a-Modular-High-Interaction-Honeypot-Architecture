import { NextRequest, NextResponse } from 'next/server'
import { generateHoneypotResponse, HONEYPOT_ENDPOINTS, detectPayloadThreats } from '../../../lib/honeypot-network'

// Simple, feature-flagged honeypot endpoint. Guarded by ENABLE_HONEYPOT env var.
export async function GET(request: Request) {
  try {
    if (process.env.ENABLE_HONEYPOT !== 'true') {
      return new NextResponse(null, { status: 404 })
    }

    // Use first matching trap or a generic trap
    const url = new URL(request.url)
    const pathname = url.pathname
    const trap = HONEYPOT_ENDPOINTS.find(t => pathname.includes(t.path)) || HONEYPOT_ENDPOINTS[0]

    // Adapt types: lib expects NextRequest
    return await generateHoneypotResponse(request as unknown as NextRequest, trap)
  } catch (err) {
    console.error('Honeypot handler error:', err)
    return new NextResponse(null, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (process.env.ENABLE_HONEYPOT !== 'true') {
      return new NextResponse(null, { status: 404 })
    }

    const url = new URL(request.url)
    const pathname = url.pathname
    const trap = HONEYPOT_ENDPOINTS.find(t => pathname.includes(t.path)) || HONEYPOT_ENDPOINTS.find(t => t.trapType === 'credential') || HONEYPOT_ENDPOINTS[0]

    // Advanced: Check for malicious payload
    try {
      const clone = request.clone()
      const body = await clone.json()
      const threats = detectPayloadThreats(body)

      if (threats.length > 0) {
        console.warn(`[HONEYPOT] Detected threats in payload: ${threats.join(', ')}`)
        // Aggressive Tarpit: 5-10s delay for malicious payloads
        await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000))
      }
    } catch (e) {
      // Ignore body parsing errors
    }

    return await generateHoneypotResponse(request as unknown as NextRequest, trap as any)
  } catch (err) {
    console.error('Honeypot handler error:', err)
    return new NextResponse(null, { status: 500 })
  }
}
