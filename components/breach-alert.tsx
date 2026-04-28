'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Shield, ShieldCheck, Search, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BreachInfo {
  name: string; domain: string; breachDate: string; pwnCount: number; dataClasses: string[]
}

export function BreachAlert({ email }: { email?: string }) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{ breached: boolean; breachCount: number; breaches: BreachInfo[] } | null>(null)
  const [passwordResult, setPasswordResult] = useState<{ breached: boolean; occurrences: number; recommendation: string } | null>(null)
  const [password, setPassword] = useState('')

  const checkEmail = async () => {
    if (!email) return
    setChecking(true)
    try {
      const res = await fetch('/api/security/breach-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', value: email }),
      })
      const data = await res.json()
      setResult(data)
    } catch (e) { console.error(e) }
    setChecking(false)
  }

  const checkPassword = async () => {
    if (!password) return
    setChecking(true)
    try {
      const res = await fetch('/api/security/breach-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', value: password }),
      })
      const data = await res.json()
      setPasswordResult(data.breach)
    } catch (e) { console.error(e) }
    setChecking(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Dark Web Breach Monitor
        </CardTitle>
        <CardDescription>Check if your credentials appeared in known data breaches</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Check */}
        {email && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground flex-1">Email: {email}</span>
            <button onClick={checkEmail} disabled={checking}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Scan Email
            </button>
          </div>
        )}

        {result && (
          <div className={`p-3 rounded-lg border ${result.breached ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.breached ? (
                <><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-sm font-semibold text-red-700 dark:text-red-400">Found in {result.breachCount} breach(es)</span></>
              ) : (
                <><ShieldCheck className="h-4 w-4 text-green-500" /><span className="text-sm font-semibold text-green-700 dark:text-green-400">No breaches found</span></>
              )}
            </div>
            {result.breaches?.map((b, i) => (
              <div key={i} className="text-xs text-muted-foreground mt-1">
                • <strong>{b.name}</strong> ({b.breachDate}) — {b.pwnCount.toLocaleString()} accounts — {b.dataClasses.join(', ')}
              </div>
            ))}
          </div>
        )}

        {/* Password Check */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <input type="password" placeholder="Check a password..." value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 px-3 py-2 rounded-md border bg-background text-sm" />
          <button onClick={checkPassword} disabled={checking || !password}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50">
            Check
          </button>
        </div>

        {passwordResult && (
          <div className={`p-3 rounded-lg ${passwordResult.breached ? 'bg-red-50 dark:bg-red-950/30' : 'bg-green-50 dark:bg-green-950/30'}`}>
            <p className="text-sm">{passwordResult.recommendation}</p>
            {passwordResult.breached && (
              <p className="text-xs text-muted-foreground mt-1">Seen {passwordResult.occurrences.toLocaleString()} times in breaches</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
