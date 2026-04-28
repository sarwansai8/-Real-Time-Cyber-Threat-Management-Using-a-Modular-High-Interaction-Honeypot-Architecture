'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AttackEvent {
  id: string
  fromLat: number; fromLng: number
  toLat: number; toLng: number
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: number
  country: string
}

const SERVER_LOCATION = { lat: 20.5937, lng: 78.9629 } // India

const SEVERITY_COLORS = { low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444' }

export function AttackMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [attacks, setAttacks] = useState<AttackEvent[]>([])
  const [stats, setStats] = useState({ total: 0, blocked: 0, countries: 0 })

  // Simulate attack events for demo
  useEffect(() => {
    const locations = [
      { lat: 55.7558, lng: 37.6173, country: 'Russia' },
      { lat: 39.9042, lng: 116.4074, country: 'China' },
      { lat: 37.7749, lng: -122.4194, country: 'USA' },
      { lat: 51.5074, lng: -0.1278, country: 'UK' },
      { lat: -33.8688, lng: 151.2093, country: 'Australia' },
      { lat: 35.6762, lng: 139.6503, country: 'Japan' },
      { lat: 52.52, lng: 13.405, country: 'Germany' },
      { lat: -23.5505, lng: -46.6333, country: 'Brazil' },
    ]

    const types = ['SQL Injection', 'XSS', 'Brute Force', 'Port Scan', 'DDoS', 'Path Traversal']
    const severities: AttackEvent['severity'][] = ['low', 'medium', 'high', 'critical']

    const interval = setInterval(() => {
      const loc = locations[Math.floor(Math.random() * locations.length)]
      const newAttack: AttackEvent = {
        id: Date.now().toString(),
        fromLat: loc.lat, fromLng: loc.lng,
        toLat: SERVER_LOCATION.lat, toLng: SERVER_LOCATION.lng,
        type: types[Math.floor(Math.random() * types.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        timestamp: Date.now(),
        country: loc.country,
      }

      setAttacks((prev) => [...prev.slice(-20), newAttack])
      setStats((prev) => ({
        total: prev.total + 1,
        blocked: prev.blocked + (Math.random() > 0.3 ? 1 : 0),
        countries: new Set([...Array(prev.countries).keys(), loc.country]).size,
      }))
    }, 2000 + Math.random() * 3000)

    return () => clearInterval(interval)
  }, [])

  // Draw map
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    // Clear
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    // Draw grid
    ctx.strokeStyle = 'rgba(100, 100, 255, 0.08)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke() }
    for (let i = 0; i < h; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke() }

    // Convert lat/lng to canvas coords (simple Mercator)
    const toCanvas = (lat: number, lng: number) => ({
      x: ((lng + 180) / 360) * w,
      y: ((90 - lat) / 180) * h,
    })

    // Draw server location (pulsing)
    const server = toCanvas(SERVER_LOCATION.lat, SERVER_LOCATION.lng)
    const pulse = (Date.now() % 2000) / 2000
    ctx.beginPath()
    ctx.arc(server.x, server.y, 6 + pulse * 10, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(34, 197, 94, ${0.3 - pulse * 0.3})`
    ctx.fill()
    ctx.beginPath()
    ctx.arc(server.x, server.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#22c55e'
    ctx.fill()

    // Draw attack arcs
    const now = Date.now()
    for (const attack of attacks) {
      const age = (now - attack.timestamp) / 1000
      if (age > 10) continue // Fade after 10 seconds

      const from = toCanvas(attack.fromLat, attack.fromLng)
      const to = toCanvas(attack.toLat, attack.toLng)
      const progress = Math.min(1, age / 1.5) // 1.5 second animation
      const alpha = Math.max(0, 1 - age / 10)

      // Draw arc
      const midX = (from.x + to.x) / 2
      const midY = Math.min(from.y, to.y) - 30

      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      const cx = from.x + (midX - from.x) * progress * 2
      const cy = from.y + (midY - from.y) * progress * 2
      const ex = from.x + (to.x - from.x) * progress
      const ey = from.y + (to.y - from.y) * progress
      ctx.quadraticCurveTo(cx, cy, ex, ey)
      ctx.strokeStyle = `${SEVERITY_COLORS[attack.severity]}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw source dot
      ctx.beginPath()
      ctx.arc(from.x, from.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = SEVERITY_COLORS[attack.severity]
      ctx.fill()

      // Draw label
      if (age < 3) {
        ctx.font = '10px monospace'
        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.fillText(attack.country, from.x + 6, from.y - 6)
      }
    }

    // Redraw at 30fps
    const frame = requestAnimationFrame(() => {
      const event = new Event('redraw')
      canvas.dispatchEvent(event)
    })

    return () => cancelAnimationFrame(frame)
  }, [attacks])

  // Continuous redraw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let animFrame: number
    const redraw = () => {
      setAttacks((prev) => [...prev]) // Trigger re-render
      animFrame = requestAnimationFrame(redraw)
    }
    animFrame = requestAnimationFrame(redraw)
    return () => cancelAnimationFrame(animFrame)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🌍 Live Attack Map
          <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
        </CardTitle>
        <CardDescription>Real-time visualization of blocked threats</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative rounded-lg overflow-hidden border border-border">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="w-full h-auto"
          />
          {/* Stats overlay */}
          <div className="absolute top-3 left-3 flex gap-2">
            <div className="bg-black/70 backdrop-blur px-3 py-1.5 rounded-md text-xs text-white">
              🔴 Attacks: <strong>{stats.total}</strong>
            </div>
            <div className="bg-black/70 backdrop-blur px-3 py-1.5 rounded-md text-xs text-white">
              🛡️ Blocked: <strong>{stats.blocked}</strong>
            </div>
            <div className="bg-black/70 backdrop-blur px-3 py-1.5 rounded-md text-xs text-white">
              🌍 Countries: <strong>{stats.countries}</strong>
            </div>
          </div>
          {/* Legend */}
          <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur px-3 py-2 rounded-md text-xs text-white flex gap-3">
            {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
              <span key={sev} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {sev}
              </span>
            ))}
          </div>
        </div>

        {/* Recent attacks */}
        <div className="mt-4 max-h-40 overflow-y-auto space-y-1">
          {attacks.slice(-8).reverse().map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-accent/50">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[a.severity] }} />
              <span className="font-mono text-muted-foreground">{new Date(a.timestamp).toLocaleTimeString()}</span>
              <span className="font-medium">{a.type}</span>
              <span className="text-muted-foreground">from {a.country}</span>
              <span className="ml-auto text-green-500 font-semibold">BLOCKED</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
