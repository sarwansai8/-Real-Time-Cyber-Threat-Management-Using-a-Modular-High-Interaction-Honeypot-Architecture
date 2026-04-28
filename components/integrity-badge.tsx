'use client'

import { Shield, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react'

interface IntegrityBadgeProps {
  isVerified: boolean
  hash?: string
  timestamp?: string
  compact?: boolean
}

export function IntegrityBadge({ isVerified, hash, timestamp, compact = false }: IntegrityBadgeProps) {
  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          isVerified
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }`}
        title={hash ? `Hash: ${hash.substring(0, 16)}...` : undefined}
      >
        {isVerified ? (
          <>
            <ShieldCheck className="h-3 w-3" />
            Verified
          </>
        ) : (
          <>
            <ShieldAlert className="h-3 w-3" />
            Tampered
          </>
        )}
      </span>
    )
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${
        isVerified
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
      }`}
    >
      {isVerified ? (
        <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 animate-pulse" />
      )}

      <div className="flex-1">
        <p className={`text-sm font-semibold ${isVerified ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
          {isVerified ? '✓ Integrity Verified' : '⚠ Integrity Violation Detected'}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {hash && (
            <p className="text-xs text-muted-foreground font-mono">
              SHA-256: {hash.substring(0, 16)}...
            </p>
          )}
          {timestamp && (
            <p className="text-xs text-muted-foreground">
              Verified: {new Date(timestamp).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <Shield className={`h-4 w-4 ${isVerified ? 'text-green-400' : 'text-red-400'}`} />
    </div>
  )
}
